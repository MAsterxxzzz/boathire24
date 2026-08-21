import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Anchor, Shield, Zap, Star, Users, MapPin, Clock, ChevronRight, Waves } from 'lucide-react'
import CashDiscountPromo from '@/components/promo/CashDiscountPromo'
import HeroSlideshow from '@/components/home/HeroSlideshow'
import HappyCustomersMarquee from '@/components/home/HappyCustomersMarquee'
import { prettyCity } from '@/lib/pretty-city'
import { getSiteStats, heroVideoDescription } from '@/lib/site-stats'

// Live fleet counts in the meta/OG description — same source of truth as the
// hero, footer and sitemap, so the SERP snippet never contradicts the page.
export async function generateMetadata(): Promise<Metadata> {
  const stats = await getSiteStats()
  return {
    title: 'BoatHire24 — Book Verified Boat Charters Worldwide',
    description: `Find and book ${stats.boats} verified boats, yachts and catamarans in Marbella, Puerto Banús, Phuket and ${stats.destinations} destinations. Licensed skippers, instant booking, secure payments. No surprises.`,
    keywords: ['boat rental', 'yacht charter', 'boat hire', 'Marbella', 'Ibiza', 'Miami', 'Puerto Banús', 'catamaran charter', 'speedboat hire'],
    alternates: { canonical: 'https://boathire24.com' },
    openGraph: {
      title: 'BoatHire24 — Book Verified Boat Charters Worldwide',
      description: `${stats.boats} verified yachts, catamarans & speedboats in ${stats.destinations} destinations. Licensed skippers, instant booking, secure payments.`,
      url: 'https://boathire24.com',
      type: 'website',
      siteName: 'BoatHire24',
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Luxury yacht charter in Marbella' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'BoatHire24 — Book Verified Boat Charters Worldwide',
      description: `${stats.boats} verified yachts, catamarans & speedboats in ${stats.destinations} destinations. Licensed skippers, instant booking.`,
      images: ['/opengraph-image'],
    },
  }
}

/* ── helpers ── */
const Gold = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: '#74cfe8' }}>{children}</span>
)
const GoldBtn = ({ href, children, large }: { href: string; children: React.ReactNode; large?: boolean }) => (
  <Link
    href={href}
    className={`inline-flex items-center gap-2 font-bold whitespace-nowrap rounded-full transition-all hover:scale-[1.03] active:scale-[0.97] ${large ? 'text-base' : 'text-sm'}`}
    style={{
      background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)',
      color: '#07101e',
      boxShadow: '0 6px 28px rgba(116,207,232,0.30)',
      paddingTop: large ? '18px' : '14px',
      paddingBottom: large ? '18px' : '14px',
      paddingLeft: large ? '56px' : '32px',
      paddingRight: large ? '56px' : '32px',
    }}
  >
    {children}
  </Link>
)
const GhostBtn = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link
    href={href}
    className="inline-flex items-center gap-2 text-base font-semibold whitespace-nowrap rounded-full transition-all hover:text-[#74cfe8] hover:border-[rgba(116,207,232,0.55)]"
    style={{
      border: '1px solid rgba(116,207,232,0.35)',
      color: 'rgba(244,244,242,0.82)',
      paddingTop: '17px',
      paddingBottom: '17px',
      paddingLeft: '48px',
      paddingRight: '48px',
    }}
  >
    {children}
  </Link>
)
const SectionHeader = ({ eyebrow, title, sub }: { eyebrow?: string; title: React.ReactNode; sub?: string }) => (
  <div style={{ textAlign: 'center', marginBottom: '56px' }}>
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 16px' }}>
      {eyebrow && (
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', padding: '5px 14px',
          borderRadius: '99px', background: 'rgba(116,207,232,0.12)',
          color: '#74cfe8', border: '1px solid rgba(116,207,232,0.22)',
          marginBottom: '20px',
        }}>
          {eyebrow}
        </span>
      )}
      <h2 style={{
        fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 800,
        color: '#f4f4f2', lineHeight: 1.15,
        marginBottom: sub ? '16px' : '0',
      }}>
        {title}
      </h2>
      {sub && (
        <p style={{ fontSize: '16px', color: 'rgba(244,244,242,0.58)', lineHeight: 1.75, margin: '0 auto' }}>
          {sub}
        </p>
      )}
    </div>
  </div>
)

/* ── data ── */
const BOAT_TYPES = [
  { slug: 'motor_yacht', icon: '🛥️', label: 'Motor Yacht',     desc: 'Purpose-built for performance and comfort. Ideal for day charters where speed, a generous sun deck, and a well-appointed saloon matter most.' },
  { slug: 'catamaran',   icon: '⛵',  label: 'Catamaran',       desc: 'Unmatched stability and deck space. Wide beam means more room, a roomier saloon, and twin hulls that barely feel the swell.' },
  { slug: 'sailing',     icon: '🌊',  label: 'Sailing Yacht',   desc: 'Wind-powered and soul-stirring. Choose sail when you want to feel the ocean properly — no engine noise, no fuel bill, just speed and silence.' },
  { slug: 'speedboat',   icon: '⚡',  label: 'Speedboat',       desc: 'When ten knots is not fast enough. Our speedboat fleet gets you to your anchorage, beach club, or island stop in record time.' },
  { slug: 'fishing',     icon: '🎣',  label: 'Sport Fishing',   desc: 'Fully rigged with professional tackle, fighting chairs, and local captains who know where the tuna, dorado, and marlin run.' },
  { slug: 'luxury',      icon: '👑',  label: 'Superyacht',      desc: 'Step aboard something extraordinary. Full crew, private chef, tender garage — the absolute pinnacle of the charter experience.' },
  { slug: 'gulet',       icon: '⚓',  label: 'Gulet',           desc: 'Traditional hand-built wooden sailing yachts with multiple cabins and full crew — the heart of a Mediterranean "blue voyage", with relaxed multi-day cruising along the Turkish, Greek and Croatian coasts.' },
]

const DESTINATIONS = [
  {
    slug: 'marbella', city: 'Marbella', country: 'Spain', count: 'View fleet',
    image: 'https://images.unsplash.com/photo-1589642073293-d0d511afb66e?w=800&q=80',
    desc: 'Puerto Banús sits at the heart of the Costa del Sol with year-round sunshine, calm Mediterranean water, and a backdrop of the Sierra Blanca mountains. Charter anything from a sleek day speedboat to a 30-metre superyacht, cruise east to the limestone cliffs of Nerja, or anchor off the private beach clubs of Estepona. The season runs April through November — July and August deliver the finest light and the most glamorous sunsets on the coast.',
  },
  {
    slug: 'ibiza', city: 'Ibiza', country: 'Spain', count: 'View fleet',
    image: 'https://images.unsplash.com/photo-1677280790582-6d1cfe9fcc51?w=800&q=80',
    desc: 'The Balearic flagship of the European charter scene. Ibiza by boat means discovering sea caves at Cala d\'Hort, floating off the ivory sands of Ses Salines, and reaching the cathedral rock of Es Vedrà by sundown from 200 metres offshore. The island\'s north coast is a different world from the party south — pine-scented silence, anchor-out lunches, and water clarity you only find half a mile from shore. Season: June through September.',
  },
  {
    slug: 'miami', city: 'Miami', country: 'USA', count: 'View fleet',
    image: 'https://images.unsplash.com/photo-1722937293268-62237f5e5435?w=800&q=80',
    desc: 'The year-round charter capital of the Americas. Miami\'s Biscayne Bay offers warm water, access to the Florida Keys, and a skyline backdrop that makes every sunset photographic. Charter a centre console for the Sandbar scene, step up to a sport cruiser for an overnight to Key Largo, or commission a full superyacht for Art Basel week when the world\'s most serious collectors are on the water.',
  },
]

const TRUST_ITEMS = [
  { icon: Shield, title: 'Fully Verified Fleet',       body: 'Every boat on BoatHire24 passes a physical inspection before accepting a booking. We check the vessel against maritime authority records, verify the skipper\'s licence for the operating zone, and confirm insurance is current. No exceptions — not even for high-revenue listings.' },
  { icon: Anchor, title: 'Real, Transparent Pricing',  body: 'The price on every listing is the all-inclusive price you pay. No service fees added at checkout, no fuel surcharges on departure day, no administration fees buried in small print, and no negotiation required. What you see is what you pay.' },
  { icon: Zap,    title: 'Instant Confirmation',        body: 'Instant-book listings confirm the moment you pay. No waiting for a broker to consult a handwritten diary. Your confirmation, with the captain\'s number and marina coordinates, arrives before you close the browser tab.' },
  { icon: Shield, title: 'Protected Payments',          body: 'Stripe holds your payment in escrow until 24 hours after your charter day. If the host cancels for any reason, your full payment is returned automatically. BoatHire24\'s dispute team is available seven days a week for anything more complex.' },
  { icon: Clock,  title: '24/7 Charter Support',        body: 'Our operations team monitors every active charter. If something goes wrong at sea — mechanical issue, weather change, medical event — you have a direct line to BoatHire24 support from the moment you board. We coordinate, communicate, and resolve.' },
]

const TESTIMONIALS = [
  { name: 'James R.',      location: 'London',    rating: 5, text: 'We chartered an Azimut 50 out of Puerto Banús for my wife\'s fortieth birthday. Twelve guests, eight hours, one perfect day. The booking took less than ten minutes. Our skipper — a local who has sailed this coast for twenty years — took us to three anchoring spots that don\'t exist on any tourist map. We\'ve already booked again for next August.' },
  { name: 'Sophie & Marc', location: 'Amsterdam', rating: 5, text: 'As people who have used traditional brokers before, BoatHire24 is a completely different world. Everything is on screen: the real boat, the real price, the real availability. We found a catamaran in Ibiza, booked the same afternoon, and sailed two days later. Zero email chains. Zero spreadsheets. Zero surprises. The boat was exactly as advertised.' },
  { name: 'Aoife K.',      location: 'Dublin',    rating: 5, text: 'I was nervous booking a boat online for the first time — visions of turning up to a marina and finding nothing there. The verification badges, the real photographs, and the full price transparency before I entered my card number made all the difference. The whole experience, from booking to mooring back up, was genuinely outstanding.' },
]

const FAQS = [
  { q: 'Is a skipper always included?',         a: 'Yes, always. Every booking made through BoatHire24 includes a licensed, insured skipper as standard. We do not offer bareboat (self-sail) charters. This protects every guest, keeps every host covered under their maritime insurance, and ensures local knowledge comes with every charter.' },
  { q: 'What happens if the weather is bad?',   a: 'Your skipper begins monitoring forecasts 72 hours before departure. If sustained wind exceeds Force 6, they will recommend postponing. BoatHire24\'s weather policy provides a full credit or refund in these circumstances — no arguments, no fees. We would rather you sail on a beautiful day than a dangerous one.' },
  { q: 'What should I bring on a charter?',     a: 'SPF 50 sunscreen, a wide-brim hat, soft-sole non-marking shoes, a light windproof layer for the return leg, and a waterproof phone case. Most boats provide towels and snorkel equipment — check the amenities tab on each listing. The skipper can arrange food and drinks if requested in advance.' },
  { q: 'How far ahead should I book?',          a: 'For peak season — June through September — in popular destinations like Marbella and Ibiza, we recommend four to eight weeks in advance. Shoulder season has more availability and lower prices. Use the Instant Book filter to find vessels that confirm today.' },
  { q: 'How are my payments protected?',        a: 'All payments are processed by Stripe and held in escrow until 24 hours after your charter. If your host cancels for any reason, the full amount returns automatically within five to seven business days. BoatHire24\'s dispute team handles anything more complex. We never touch your card details directly.' },
  { q: 'Can I bring my dog?',                   a: 'Many hosts genuinely love welcoming dogs aboard. Use the Pet Friendly filter on the search page, or message the host before booking — some breeds or sizes may need individual agreement. The final decision always rests with the boat owner, and we ask all guests to respect that.' },
]

/* ══════════════════════════════════════════════════ PAGE ══ */
// Live headline stats — real active-boat and destination counts (shared source
// of truth in lib/site-stats.ts), so the site never under-reports the fleet.
export const revalidate = 3600

// Live top destinations for the homepage tiles — real cities, real counts, real
// slugs. Replaces the old hardcoded Marbella/Ibiza/Miami cards (Miami had 0 boats
// and a fabricated "30+ boats" count that linked a noindexed shell).
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1589642073293-d0d511afb66e?w=800&q=80',
  'https://images.unsplash.com/photo-1677280790582-6d1cfe9fcc51?w=800&q=80',
  'https://images.unsplash.com/photo-1722937293268-62237f5e5435?w=800&q=80',
]

interface TopDest { slug: string; city: string; country: string; image_url: string | null; description: string | null; count: number }

async function getTopDestinations(): Promise<TopDest[]> {
  try {
    // Raw REST fetch (not the cookie-based server client) so the homepage stays
    // statically ISR-cached — createClient() awaits cookies(), which would force
    // per-request dynamic rendering and defeat `export const revalidate = 3600`.
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/boats?select=location_id,locations(slug,city,country,image_url,description)&status=eq.active&limit=5000`,
      { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` }, next: { revalidate: 3600 } },
    )
    if (!res.ok) return []
    const rows = (await res.json()) as { location_id: string | null; locations: { slug: string; city: string; country: string; image_url: string | null; description: string | null } | null }[]
    const map = new Map<string, TopDest>()
    for (const r of rows) {
      const l = r.locations
      if (!l?.slug) continue
      const e = map.get(l.slug) ?? { slug: l.slug, city: l.city, country: l.country, image_url: l.image_url ?? null, description: l.description ?? null, count: 0 }
      e.count++
      map.set(l.slug, e)
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 6)
  } catch {
    return []
  }
}

export default async function HomePage() {
  const [stats, topDestinations] = await Promise.all([getSiteStats(), getTopDestinations()])
  // Prefer live inventory; fall back to the curated cards only if the query fails.
  const destTiles = topDestinations.length
    ? topDestinations.map((d, i) => ({
        slug: d.slug,
        city: prettyCity(d.city),
        country: d.country,
        count: `${d.count} boat${d.count !== 1 ? 's' : ''}`,
        image: d.image_url || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length],
        desc: d.description || `Compare ${d.count} verified boat${d.count !== 1 ? 's' : ''} in ${prettyCity(d.city)}, ${d.country} — licensed skipper included, all-inclusive pricing and instant online booking.`,
      }))
    : DESTINATIONS
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const videoSchema = [
    {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: 'Luxury yacht & boat charter — Marbella, Costa del Sol',
      description: heroVideoDescription(stats.destinations),
      thumbnailUrl: 'https://boathire24.com/video/hero-1.jpg',
      contentUrl: 'https://boathire24.com/video/hero-1.mp4',
      uploadDate: '2026-01-01',
      publisher: { '@type': 'Organization', name: 'BoatHire24', logo: { '@type': 'ImageObject', url: 'https://boathire24.com/brand-logo.jpg' } },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: 'Rent a yacht on the Costa del Sol — BoatHire24',
      description: 'Luxury boat and yacht rentals on the Costa del Sol with instant booking and verified listings.',
      thumbnailUrl: 'https://boathire24.com/video/hero-2.jpg',
      contentUrl: 'https://boathire24.com/video/hero-2.mp4',
      uploadDate: '2026-01-01',
      publisher: { '@type': 'Organization', name: 'BoatHire24', logo: { '@type': 'ImageObject', url: 'https://boathire24.com/brand-logo.jpg' } },
    },
  ]

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2' }}>
      {/* Structured data (Organization + WebSite are emitted once site-wide from layout.tsx) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }} />

      {/* ══ 1 · HERO ══ */}
      <section className="relative" style={{ height: 'calc(100svh - 64px)', minHeight: '600px', maxHeight: '900px' }}>
        <HeroSlideshow />
        <div className="relative z-10 container h-full flex flex-col justify-center">
          <div className="max-w-2xl">
            <p className="eyebrow mb-5">Verified boats · Licensed skippers · {stats.destinations} destinations worldwide</p>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6" style={{ color: '#f4f4f2' }}>
              Find Your Perfect<br /><Gold>Boat Charter.</Gold>
            </h1>
            <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed" style={{ color: 'rgba(244,244,242,0.72)' }}>
              From Marbella to Miami — browse verified yachts, catamarans, speedboats, and sailing boats.
              Instant booking. Licensed skippers. Secure payments. Zero surprises.
            </p>
            <div className="flex flex-wrap gap-4">
              <GoldBtn href="/search" large><Waves className="w-5 h-5" /> Explore Available Boats</GoldBtn>
              <GhostBtn href="/how-it-works">How it works <ChevronRight className="w-4 h-4" /></GhostBtn>
            </div>
          </div>
        </div>
        {/* Stats bar */}
        <div className="absolute bottom-0 left-0 right-0 z-10" style={{ background: 'rgba(7,16,30,0.82)', borderTop: '1px solid rgba(116,207,232,0.12)', backdropFilter: 'blur(8px)' }}>
          <div className="container">
            <div className="grid grid-cols-3 pt-8 pb-6 gap-4">
              {[{ n: `${stats.boats}`, l: 'Boats listed' }, { n: `${stats.destinations}`, l: 'Destinations' }, { n: '100%', l: 'Licensed skippers' }].map((s) => (
                <div key={s.l} className="text-center">
                  <div className="text-2xl font-bold" style={{ color: '#74cfe8' }}>{s.n}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(244,244,242,0.50)' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <HappyCustomersMarquee />

      {/* ══ 2 · BOAT TYPES ══ */}
      <section className="section">
        <div className="container">
          <SectionHeader eyebrow="Choose your vessel" title={<>Charter by <Gold>Vessel Type</Gold></>} sub="Every charter begins with the right boat. We carry verified listings across every category — from open-deck speedboats for a sun-soaked afternoon to full-crew superyachts for a week-long expedition. Each vessel type offers a fundamentally different experience on the water, and choosing correctly is the single biggest factor in whether your day exceeds expectations or falls short of them." />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {BOAT_TYPES.map((t) => (
              <Link key={t.slug} href={`/search?type=${t.slug}`} className="group glass-card block" style={{ padding: '28px 28px 32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="text-3xl">{t.icon}</div>
                <h3 className="font-bold" style={{ color: '#f4f4f2' }}>{t.label}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(244,244,242,0.55)' }}>{t.desc}</p>
                <div className="text-xs font-semibold flex items-center gap-1 group-hover:text-[#74cfe8] transition-colors" style={{ color: 'rgba(116,207,232,0.70)', marginTop: '4px' }}>
                  Browse {t.label}s <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-line" />

      {/* ══ 3 · HOW IT WORKS ══ */}
      <section className="section">
        <div className="container">
          <SectionHeader eyebrow="Simple process" title={<>Three Steps to <Gold>Open Water</Gold></>} sub="We removed everything that makes boat charters complicated — brokers, back-and-forth emails, hidden fees, and 48-hour response times. BoatHire24 puts you directly in front of the boat, the price, and the calendar." />
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: '01', icon: MapPin,  title: 'Search & Discover',  body: `Browse our verified fleet across ${stats.destinations} destinations. Filter by boat type, guest capacity, departure port, price range, and available dates so you only see boats that match your exact requirements. Every listing carries real photographs, accurate specifications, and honest pricing — no registration required to see what you will actually pay.` },
              { n: '02', icon: Shield,  title: 'Book Securely',      body: 'Select your date and duration from the live availability calendar. The price you see is the all-inclusive price you pay — no service fees added at checkout, no surprises. Pay securely with your credit card, Apple Pay, or Google Pay. Funds are held by Stripe and released to the host only after your charter day, protecting your money at every step of the process.' },
              { n: '03', icon: Anchor,  title: 'Set Sail',           body: 'Your confirmation arrives instantly with the captain\'s direct contact number, marina coordinates in Google Maps format, and a pre-departure checklist. Arrive at the marina, meet your fully licensed and locally experienced skipper, and cast off. Navigation, safety, and local knowledge are entirely handled for you from that moment forward. Your only job is to decide where to go next and enjoy every second of it.' },
            ].map((step) => (
              <div key={step.n} className="glass-card" style={{ padding: '28px 28px 36px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold" style={{ color: 'rgba(116,207,232,0.18)' }}>{step.n}</span>
                  <step.icon className="w-6 h-6" style={{ color: '#74cfe8' }} />
                </div>
                <h3 className="text-xl font-bold" style={{ color: '#f4f4f2' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(244,244,242,0.60)' }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-line" />

      {/* ══ 4 · DESTINATIONS ══ */}
      <section className="section">
        <div className="container">
          <SectionHeader eyebrow="Active fleet locations" title={<>Where Will <Gold>You Sail?</Gold></>} sub="BoatHire24 maintains an active, inspected fleet in the world's most desirable charter destinations — each curated for water quality, boat availability, and year-round viability." />
          <div className="grid md:grid-cols-3 gap-6">
            {destTiles.map((dest) => (
              <Link key={dest.slug} href={`/${dest.slug}`} className="group glass-card overflow-hidden block">
                <div className="relative aspect-[4/3] overflow-hidden" style={{ background: '#0a1420' }}>
                  <Image src={dest.image} alt={dest.city} width={800} height={600} loading="lazy" sizes="(max-width: 768px) 100vw, 33vw" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,16,30,0.80) 0%, transparent 55%)' }} />
                  <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                    <div>
                      <div className="font-bold text-lg" style={{ color: '#f4f4f2' }}>{dest.city}</div>
                      <div className="text-sm" style={{ color: 'rgba(244,244,242,0.60)' }}>{dest.country}</div>
                    </div>
                    <span className="text-sm font-bold px-4 py-2 rounded-full" style={{ background: '#74cfe8', color: '#07101e' }}>{dest.count}</span>
                  </div>
                </div>
                <div style={{ padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(244,244,242,0.58)' }}>{dest.desc}</p>
                  <div className="text-xs font-semibold flex items-center gap-1 group-hover:text-[#74cfe8] transition-colors" style={{ color: 'rgba(116,207,232,0.65)' }}>
                    View fleet in {dest.city} <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link href="/destinations" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#74cfe8', textDecoration: 'none' }}>
              View all {stats.destinations} destinations <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══ 5 · WHY BOATAWAY ══ */}
      <section className="section" style={{ background: 'linear-gradient(135deg,#0c1927 0%,#0e2040 50%,#0c1927 100%)', borderTop: '1px solid rgba(116,207,232,0.18)', borderBottom: '1px solid rgba(116,207,232,0.18)' }}>
        <div className="container">
          <SectionHeader eyebrow="Our commitment" title={<>Why Charter with <Gold>BoatHire24?</Gold></>} sub="The charter market has a transparency problem — prices hidden behind enquiry forms, stock-photo listings, and invented availability. We built BoatHire24 to fix every one of those problems from the ground up." />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TRUST_ITEMS.map((item) => (
              <div key={item.title} className="glass-card" style={{ padding: '32px' }}>
                <item.icon className="w-6 h-6 mb-4" style={{ color: '#74cfe8' }} />
                <h3 className="font-bold mb-2" style={{ color: '#f4f4f2' }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(244,244,242,0.58)' }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 6 · TESTIMONIALS ══ */}
      <section className="section">
        <div className="container">
          <SectionHeader eyebrow="Guest reviews" title={<>What Our <Gold>Guests Say</Gold></>} />
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="glass-card p-7 flex flex-col gap-5">
                <div className="flex gap-0.5">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-[#74cfe8] text-[#74cfe8]" />)}</div>
                <p className="text-sm leading-relaxed flex-1" style={{ color: 'rgba(244,244,242,0.72)' }}>&ldquo;{t.text}&rdquo;</p>
                <div>
                  <div className="font-semibold text-sm" style={{ color: '#f4f4f2' }}>{t.name}</div>
                  <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'rgba(244,244,242,0.45)' }}><MapPin className="w-3 h-3" /> {t.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-line" />

      {/* ══ 7 · BLOG PREVIEW ══ */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 16px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', padding: '5px 14px',
                borderRadius: '99px', background: 'rgba(116,207,232,0.12)',
                color: '#74cfe8', border: '1px solid rgba(116,207,232,0.22)',
                marginBottom: '20px',
              }}>
                Editorial
              </span>
              <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.15, marginBottom: '16px' }}>
                From the <Gold>Captain&apos;s Log</Gold>
              </h2>
              <p style={{ fontSize: '16px', color: 'rgba(244,244,242,0.55)', lineHeight: 1.75 }}>
                Practical guides, destination deep-dives, and insider knowledge from the BoatHire24 fleet.
              </p>
            </div>
            <div style={{ marginTop: '20px' }}>
              <Link href="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#74cfe8', textDecoration: 'none' }}>
                All articles <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { slug: 'ultimate-guide-renting-yacht-marbella',  tag: 'Destination guide',   read: '8 min', img: 'https://images.unsplash.com/photo-1528154291023-a6525fabe5b4?w=600&q=80',  title: 'The Ultimate Guide to Renting a Yacht in Marbella',                excerpt: 'Everything first-time charterers need to know — what to bring, what to expect from your skipper, how to read a weather window, and which departure port suits which itinerary on the Costa del Sol.' },
              { slug: 'catamaran-vs-motor-yacht',                tag: 'Boat guide',           read: '6 min', img: 'https://images.unsplash.com/photo-1562281302-809108fd533c?w=600&q=80',  title: 'Catamaran vs Motor Yacht: Which Charter Suits Your Group?',        excerpt: 'Two fundamentally different philosophies. Catamarans win on deck space and stability; motor yachts win on speed and amenity. We break down every trade-off by group size, budget, and occasion.' },
              { slug: 'best-anchorages-costa-del-sol',           tag: 'Insider knowledge',   read: '7 min', img: 'https://images.unsplash.com/photo-1625528193934-4cb230e7267d?w=600&q=80',  title: 'Ten Anchorages on the Costa del Sol Only Reachable by Boat',      excerpt: 'These spots don\'t appear on Google Maps and are completely inaccessible from shore. Compiled by BoatHire24\'s fleet captains who sail this coast every single week of the season.' },
            ].map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group glass-card overflow-hidden block">
                <div className="relative aspect-[16/9] overflow-hidden" style={{ background: '#0a1420' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.img} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div style={{ padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="flex items-center justify-between">
                    <span className="eyebrow text-xs">{post.tag}</span>
                    <span className="text-xs" style={{ color: 'rgba(244,244,242,0.40)' }}>{post.read} read</span>
                  </div>
                  <h3 className="font-bold leading-snug" style={{ color: '#f4f4f2' }}>{post.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(244,244,242,0.55)' }}>{post.excerpt}</p>
                  <div className="text-xs font-semibold flex items-center gap-1 group-hover:text-[#f4f4f2] transition-colors" style={{ color: '#74cfe8' }}>Read article <ChevronRight className="w-3.5 h-3.5" /></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 8 · HOST CTA ══ */}
      <section className="section" style={{ background: 'linear-gradient(135deg,#0c1927 0%,#091322 100%)', borderTop: '1px solid rgba(116,207,232,0.15)', borderBottom: '1px solid rgba(116,207,232,0.15)' }}>
        <div className="container">
          <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center', padding: '0 16px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', padding: '5px 14px',
              borderRadius: '99px', background: 'rgba(116,207,232,0.12)',
              color: '#74cfe8', border: '1px solid rgba(116,207,232,0.22)',
              marginBottom: '20px',
            }}>
              For boat owners
            </span>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.15, marginBottom: '24px' }}>
              Own a Boat? <Gold>Start Earning.</Gold>
            </h2>
            <p style={{ fontSize: '16px', lineHeight: 1.75, color: 'rgba(244,244,242,0.65)', marginBottom: '16px' }}>The most expensive thing about owning a boat is the time it spends tied to a dock. BoatHire24 turns idle marina days into income — without changing your schedule or your relationship with the vessel. You set the dates you want to share and the dates you want to keep. We handle everything else: guest communication, payment processing, and all booking logistics from enquiry to confirmation.</p>
            <p style={{ fontSize: '16px', lineHeight: 1.75, color: 'rgba(244,244,242,0.65)', marginBottom: '16px' }}>Boat owners across {stats.destinations} destinations use BoatHire24 to manage their charter income — you set the price, we bring the bookings and handle payment. A well-listed boat in a busy marina can earn several thousand euros per month in peak season. Your earnings depend on your boat, your availability, and your location.</p>
            <p style={{ fontSize: '16px', lineHeight: 1.75, color: 'rgba(244,244,242,0.65)', marginBottom: '40px' }}>Listing your boat costs nothing. You pay a 15% commission only when a booking is confirmed and the guest boards. That fee covers Stripe payment processing, guest insurance, and access to BoatHire24&apos;s 24/7 operations support. Connect your bank account via Stripe Express, set your availability calendar, and receive your first booking enquiry within days of going live. Whether you have one Sunseeker or an entire fleet, BoatHire24 is built to grow with your operation.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', marginBottom: '48px' }}>
              <GoldBtn href="/become-a-host" large>List Your Boat — It&apos;s Free</GoldBtn>
              <GhostBtn href="/how-it-works">Learn how hosting works</GhostBtn>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[{ n: '€0', l: 'To list your boat' }, { n: '15%', l: 'Commission only on bookings' }, { n: '24/7', l: 'Host support line' }].map((s) => (
                <div key={s.l}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#74cfe8' }}>{s.n}</div>
                  <div style={{ fontSize: '12px', marginTop: '4px', color: 'rgba(244,244,242,0.45)' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ 9 · CHARTER PROMISE ══ */}
      <section className="section">
        <div className="container max-w-4xl">
          <SectionHeader
            eyebrow="The BoatHire24 standard"
            title={<>Our Charter <Gold>Promise</Gold></>}
          />
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h3 className="text-lg font-bold mb-3" style={{ color: '#f4f4f2' }}>Every boat is what it says it is.</h3>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(244,244,242,0.60)' }}>
                The photographs on every BoatHire24 listing were taken by a member of our team or a verified partner
                photographer — never stock imagery, never borrowed from a sister vessel. The specifications were
                checked against the vessel's technical documentation. The capacity figure reflects the vessel's
                actual certified limit, not a sales estimate. What you see on the listing is the boat you will
                board on the day of your charter. We stake our reputation on that guarantee.
              </p>
              <h3 className="text-lg font-bold mb-3" style={{ color: '#f4f4f2' }}>Your skipper is genuinely qualified.</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(244,244,244,0.60)' }}>
                Before any skipper is permitted to take bookings through BoatHire24, we verify their coastal or
                offshore qualification with the issuing maritime authority, confirm their insurance is current
                and valid for the vessel class they are operating, and check that their experience profile
                matches the routes they are offering. We repeat this verification annually. A BoatHire24 skipper
                badge is not a courtesy title — it represents a genuine compliance check that most charter
                platforms do not perform at all.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-3" style={{ color: '#f4f4f2' }}>You will not be surprised by the price.</h3>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(244,244,242,0.60)' }}>
                Hidden fees are the most common complaint in the charter industry. A listing advertises €400
                for a half-day. The guest arrives and discovers a €60 fuel surcharge, a €30 port fee, and a
                €20 &quot;cleaning deposit.&quot; The total was never €400. On BoatHire24, the listing price is
                the all-inclusive price. No service fees added at checkout, no additional charges at the
                dock, no surcharges added after booking, and no &quot;extras&quot; that were not disclosed
                in the listing. The price we show is the price you pay.
              </p>
              <h3 className="text-lg font-bold mb-3" style={{ color: '#f4f4f2' }}>If something goes wrong, we are responsible.</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(244,244,242,0.60)' }}>
                Charter platforms that act purely as directories disclaim all responsibility when things go wrong.
                BoatHire24 does not. Our operations team is reachable by phone and WhatsApp from the moment you board
                until the moment you step back onto the dock. If a mechanical issue cancels your day, we find a
                replacement vessel or issue a full refund — same day. If your host does not show, we are on the
                phone within fifteen minutes arranging an alternative. We do not hide behind terms and conditions
                when our guests need us to act. That is the BoatHire24 standard and it is non-negotiable.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="gold-line" />

      {/* ══ 10 · FAQ ══ */}
      <section className="section" style={{ background: 'rgba(116,207,232,0.025)' }}>
        <div className="container" style={{ maxWidth: '760px', marginLeft: 'auto', marginRight: 'auto' }}>
          <SectionHeader eyebrow="Questions answered" title={<>Common <Gold>Questions</Gold></>} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {FAQS.map((faq, i) => (
              <details key={faq.q} className="glass-card group" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', cursor: 'pointer', listStyle: 'none', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(116,207,232,0.13)', color: '#74cfe8', fontSize: '12px', fontWeight: 700, flexShrink: 0, letterSpacing: '0.03em' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '15px', color: '#f4f4f2', lineHeight: 1.4 }}>{faq.q}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 shrink-0 transition-transform group-open:rotate-90" style={{ color: '#74cfe8' }} />
                </summary>
                <div style={{ padding: '4px 28px 26px 78px' }}>
                  <p style={{ fontSize: '14px', lineHeight: '1.75', color: 'rgba(244,244,242,0.62)' }}>{faq.a}</p>
                </div>
              </details>
            ))}
          </div>

          {/* Still have questions card */}
          <div style={{ marginTop: '44px', background: 'rgba(116,207,232,0.07)', border: '1px solid rgba(116,207,232,0.20)', borderRadius: '20px', padding: '36px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '30px', marginBottom: '14px', lineHeight: 1 }}>💬</div>
            <h3 style={{ fontWeight: 700, fontSize: '18px', color: '#f4f4f2', marginBottom: '10px' }}>Still have questions?</h3>
            <p style={{ fontSize: '14px', color: 'rgba(244,244,242,0.55)', lineHeight: '1.65', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '22px' }}>
              Our charter specialists are on hand 7 days a week, 08:00–22:00. Reach us by WhatsApp, email, or phone — we typically reply within the hour.
            </p>
            <GhostBtn href="/contact">Contact support</GhostBtn>
          </div>
        </div>
      </section>

      {/* Wire-transfer / cash discount promo (Marbella deal) — shown on the main page */}
      <CashDiscountPromo />
    </div>
  )
}
