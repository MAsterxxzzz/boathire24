import { notFound, permanentRedirect } from 'next/navigation'
import { Metadata } from 'next'
import Image from 'next/image'
import locationRedirects from '@/lib/location-redirects.json'
import { createClient } from '@/lib/supabase/server'
import { attachRatings } from '@/lib/ratings'
import BoatCard from '@/components/search/BoatCard'
import SearchBar from '@/components/search/SearchBar'
import TrustBar from '@/components/ui/TrustBar'
import { MapPin, Anchor, Ship } from 'lucide-react'
import type { BoatWithDetails, LocationRow } from '@/types/database'
import { getLandingPage, getLandingSlugs, LANDING_PAGES } from '@/lib/landing/pages'
import { CATEGORIES } from '@/lib/landing/categories'
import { prettyCity } from '@/lib/pretty-city'
import { hasEs } from '@/lib/landing/pages-es'
import LandingView from '@/components/landing/LandingView'
import CashDiscountPromo from '@/components/promo/CashDiscountPromo'

interface Props {
  params: Promise<{ location: string }>
}

// Pre-render the keyword landing pages at build; Supabase locations still resolve on-demand.
export async function generateStaticParams() {
  return getLandingSlugs().map((location) => ({ location }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location } = await params
  const supabase = await createClient()
  const { data: locRaw } = await supabase
    .from('locations')
    .select('id, name, city, country, description')
    .eq('slug', location)
    .single()
  const loc = locRaw as (Pick<LocationRow, 'name' | 'city' | 'country' | 'description'> & { id: string }) | null
  if (loc) {
    // Inventory-driven meta: real count + real from-price. Zero-boat pages are
    // noindexed (they flip back to indexable automatically when a boat lands)
    // so 360 identical "coming soon" shells stop polluting the index.
    const { data: invRaw } = await supabase
      .from('boats')
      .select('id, boat_pricing(price)')
      .eq('location_id', loc.id)
      .eq('status', 'active')
    const inv = (invRaw ?? []) as { id: string; boat_pricing: { price: number }[] }[]
    const prices = inv.flatMap((b) => (b.boat_pricing ?? []).map((p) => p.price)).filter((p) => p > 0)
    const fromPrice = prices.length ? Math.min(...prices) : null
    const n = inv.length
    // Clean display name — some locations store a raw geocoded address as `city`.
    const cityName = prettyCity(loc.city)
    // Layout template appends "| BoatHire24" — never hardcode it here.
    return {
      title: `Boat Rental ${cityName} — Yachts & Catamarans`,
      description: n > 0
        ? `Boat rental in ${cityName}${fromPrice ? ` from €${fromPrice.toLocaleString('en')}` : ''} — compare ${n} verified boat${n !== 1 ? 's' : ''} with licensed skipper included. Instant booking on BoatHire24.`
        : loc.description ?? `Boat rental in ${cityName}, ${loc.country} — launching soon on BoatHire24. Motor yachts, catamarans and speedboats with licensed skipper.`,
      alternates: { canonical: `https://boathire24.com/${location}` },
      ...(n === 0 ? { robots: { index: false, follow: true } } : {}),
    }
  }
  const lp = getLandingPage(location)
  if (lp) {
    const isCanonical = !lp.canonicalSlug || lp.canonicalSlug === lp.slug
    return {
      title: lp.title,
      description: lp.metaDescription,
      alternates: {
        // canonicalSlug consolidates near-duplicate variants onto one primary
        // page (kills keyword cannibalization) while keeping the page live.
        canonical: `https://boathire24.com/${lp.canonicalSlug || lp.slug}`,
        // hreflang only on canonical pages — alternates pointing at a page
        // whose canonical is elsewhere send Google contradictory signals.
        ...(isCanonical && hasEs(lp.slug) ? {
          languages: {
            'en': `https://boathire24.com/${lp.slug}`,
            'es-ES': `https://boathire24.com/es/${lp.slug}`,
            'x-default': `https://boathire24.com/${lp.slug}`,
          },
        } : {}),
      },
      openGraph: {
        title: lp.title,
        description: lp.metaDescription,
        type: 'article',
        siteName: 'BoatHire24',
        ...(lp.heroImage ? { images: [{ url: lp.heroImage }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: lp.title,
        description: lp.metaDescription,
        ...(lp.heroImage ? { images: [lp.heroImage] } : {}),
      },
    }
  }
  return { title: 'Page not found' }
}

export default async function LocationPage({ params }: Props) {
  const { location } = await params
  const supabase = await createClient()

  const { data: locDataRaw } = await supabase
    .from('locations')
    .select('*')
    .eq('slug', location)
    .single()
  const loc = locDataRaw as LocationRow | null
  if (!loc) {
    // A retired geocoded-address slug (after the location normalizer runs) →
    // 301 to its clean slug so the old indexed URL keeps its equity. Dormant
    // until the normalizer applies: while the old row exists, this never hits.
    const redir = (locationRedirects as Record<string, string>)[location]
    if (redir) permanentRedirect(`/${redir}`)
    const lp = getLandingPage(location)
    if (lp) return <LandingView page={lp} />
    notFound()
  }

  const { data: rawBoats } = await supabase
    .from('boats')
    .select(`*, boat_images(*), boat_pricing(*), boat_features(*), locations(*), profiles(id, full_name, avatar_url, verification_status)`)
    .eq('location_id', loc!.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const boats = await attachRatings(supabase, (rawBoats ?? []) as any[]) as BoatWithDetails[]

  // Real "from" price across this location's fleet — a concrete fact for the answer box + AI citation.
  const fleetPrices = boats.flatMap((b) => ((b as any).boat_pricing ?? []).map((p: any) => p.price as number)).filter((p) => p > 0)
  const fromPrice = fleetPrices.length ? Math.min(...fleetPrices) : null

  // Clean display name — some locations store a raw geocoded address as `city`
  // (same fix as the boat detail page; see lib/pretty-city.ts).
  const cityName = prettyCity(loc.city)

  // Which type-landing pages actually have inventory here → link to them
  // (crawlable internal links, and the highest-intent long-tail keywords).
  const typeChips = CATEGORIES
    .map((cat) => ({ cat, n: boats.filter((b) => cat.types.includes((b as any).type) && !!(b as any).is_fishing_trip === !!cat.fishing).length }))
    .filter((c) => c.n > 0)

  // Keyword landing pages that target this city → crawlable "guides" links,
  // completing the hub: /{city} <-> its landing pages (which already CTA back here).
  const deaccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  const norm = (s: string) => deaccent(s.toLowerCase()).replace(/[^a-z0-9]+/g, ' ').trim()
  const cityTokens = [prettyCity(loc.city), loc.slug.replace(/-mr[a-z0-9]+$/i, '')]
    .map(norm).filter((t) => t.length >= 4)
  const cityGuides = cityTokens.length
    ? LANDING_PAGES
        .filter((p) => !p.canonicalSlug || p.canonicalSlug === p.slug)
        .filter((p) => {
          const hay = ' ' + norm(`${p.slug} ${p.keyword ?? ''}`) + ' '
          return cityTokens.some((t) => hay.includes(' ' + t + ' '))
        })
        .slice(0, 8)
    : []

  const gold = '#74cfe8'
  const goldFaint = 'rgba(116,207,232,0.12)'
  const goldBorder = 'rgba(116,207,232,0.22)'

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', height: '380px', overflow: 'hidden' }}>
        {loc.image_url ? (
          <Image src={loc.image_url} alt={loc.name} fill priority sizes="100vw" style={{ objectFit: 'cover', opacity: 0.45 }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#0a1a32,#071122)' }} />
        )}
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(7,16,30,0.3) 0%, rgba(7,16,30,0.75) 100%)' }} />
        {/* Gold radial glow */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(116,207,232,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(244,244,242,0.65)', marginBottom: '14px' }}>
            <MapPin style={{ width: '13px', height: '13px' }} /> {loc.country}
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.1, marginBottom: '14px' }}>
            Boat Rental <span style={{ color: gold }}>{cityName}</span>
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(244,244,242,0.62)', maxWidth: '540px', lineHeight: 1.65 }}>
            {loc.description ?? `Discover ${boats.length} verified boats in ${cityName}. Instant book, licensed skipper included.`}
          </p>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div style={{ borderBottom: '1px solid rgba(116,207,232,0.10)', background: 'rgba(116,207,232,0.04)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 24px', display: 'flex', gap: '36px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { value: `${boats.length}`, label: 'boats available' },
            { value: fromPrice ? `From €${fromPrice.toLocaleString('en')}` : 'From €230', label: 'per trip' },
            { value: '✓ Skipper', label: 'always included' },
            { value: 'Instant', label: 'confirmation' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: gold, marginBottom: '2px' }}>{s.value}</p>
              <p style={{ fontSize: '12px', color: 'rgba(244,244,242,0.42)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search + Results ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px 96px' }}>

        {/* All-inclusive / escrow trust bar */}
        <div style={{ marginBottom: '28px' }}>
          <TrustBar />
        </div>

        {/* Search bar */}
        <div style={{ marginBottom: '28px' }}>
          <SearchBar defaultLocation={cityName} />
        </div>

        {/* Browse by type — links to /{city}/{type}-rental landing pages */}
        {typeChips.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '44px' }}>
            {typeChips.map(({ cat, n }) => (
              <a
                key={cat.slug}
                href={`/${loc.slug}/${cat.slug}`}
                style={{ fontSize: '13px', fontWeight: 600, color: gold, background: goldFaint, border: `1px solid ${goldBorder}`, borderRadius: '99px', padding: '7px 15px', textDecoration: 'none' }}
              >
                {cat.label} in {cityName} ({n})
              </a>
            ))}
          </div>
        )}

        {/* Results header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f4f4f2' }}>
            {boats.length > 0 ? (
              <>{boats.length} boat{boats.length !== 1 ? 's' : ''} in {cityName}</>
            ) : (
              <>Coming soon to {cityName}</>
            )}
          </h2>
          {boats.length > 0 && (
            <span style={{ fontSize: '13px', color: 'rgba(244,244,242,0.40)', background: goldFaint, border: `1px solid ${goldBorder}`, borderRadius: '99px', padding: '4px 14px' }}>
              All include licensed skipper
            </span>
          )}
        </div>

        {/* Boats grid or empty state */}
        {boats.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '80px', paddingBottom: '80px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: goldFaint, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Ship style={{ width: '28px', height: '28px', color: gold }} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f4f4f2', marginBottom: '10px' }}>
              Coming soon to {cityName}
            </h3>
            <p style={{ fontSize: '15px', color: 'rgba(244,244,242,0.45)', maxWidth: '360px', margin: '0 auto 28px', lineHeight: 1.6 }}>
              We&apos;re onboarding boats in this destination. Check back soon — or explore another location.
            </p>
            <a href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 28px', borderRadius: '99px', background: 'linear-gradient(135deg,#8fdcf0,#74cfe8,#4fb8d6)', color: '#07101e', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
              Browse all destinations
            </a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {boats.map((boat) => (
              <BoatCard key={boat.id} boat={boat} />
            ))}
          </div>
        )}

        {cityGuides.length > 0 && (
          <section style={{ marginTop: '64px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f4f4f2', marginBottom: '18px' }}>Guides &amp; tips for {cityName}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {cityGuides.map((g) => (
                <a key={g.slug} href={`/${g.slug}`} style={{ display: 'block', padding: '14px 16px', borderRadius: '12px', background: '#0c1828', border: '1px solid rgba(116,207,232,0.15)', textDecoration: 'none', color: '#f4f4f2', fontSize: '14px', fontWeight: 600, lineHeight: 1.4 }}>
                  {g.h1 || g.title}
                </a>
              ))}
            </div>
          </section>
        )}

        {loc.city === 'Marbella' && (
          <section style={{ marginTop: '32px' }}>
            <a
              href="https://boatrentalinmarbella.com"
              target="_blank"
              rel="noopener"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 18px', borderRadius: '12px', background: '#0c1828', border: `1px solid ${goldBorder}`, textDecoration: 'none', color: 'rgba(244,244,242,0.75)', fontSize: '14px', fontWeight: 600 }}
            >
              Read our full local Marbella boat rental guide <span style={{ color: gold }}>→</span>
            </a>
          </section>
        )}
      </div>

      {/* Schema.org — destination + service + breadcrumb (hierarchy signal for search + LLMs) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'TouristDestination',
              name: `Boat Rental ${cityName}`,
              description: loc.description,
              geo: { '@type': 'GeoCoordinates', latitude: loc.lat, longitude: loc.lng },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'Service',
              serviceType: 'Boat & yacht charter',
              name: `Boat rental in ${cityName}`,
              areaServed: { '@type': 'City', name: cityName, address: { '@type': 'PostalAddress', addressCountry: loc.country } },
              provider: { '@type': 'Organization', name: 'BoatHire24', url: 'https://boathire24.com' },
              url: `https://boathire24.com/${loc.slug}`,
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boathire24.com' },
                { '@type': 'ListItem', position: 2, name: `Boat Rental ${cityName}`, item: `https://boathire24.com/${loc.slug}` },
              ],
            },
          ]),
        }}
      />

      {/* Wire-transfer / cash discount promo — Marbella only */}
      {loc.city === 'Marbella' && <CashDiscountPromo />}
    </div>
  )
}
