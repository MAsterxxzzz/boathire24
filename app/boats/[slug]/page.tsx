import { notFound, permanentRedirect } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSvc } from '@supabase/supabase-js'
import Gallery from '@/components/listing/Gallery'
import Reviews from '@/components/listing/Reviews'
import AvailabilityCalendar from '@/components/listing/AvailabilityCalendar'
import BookingWidget from '@/components/booking/BookingWidget'
import QuoteRequestCard from '@/components/booking/QuoteRequestCard'
import MobileBookBar from '@/components/booking/MobileBookBar'
import { formatPrice } from '@/lib/utils/pricing'
import { MapPin, Users, Ruler, Anchor, Star, Check, Waves, Zap } from 'lucide-react'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import CashDiscountPromo from '@/components/promo/CashDiscountPromo'
import SLUG_REDIRECTS from '@/lib/slug-redirects.json'
import TrustBar from '@/components/ui/TrustBar'
import RelatedBoats from '@/components/listing/RelatedBoats'
import { attachRatings } from '@/lib/ratings'
import { CATEGORIES } from '@/lib/landing/categories'
import { prettyCity } from '@/lib/pretty-city'
import type { BoatWithDetails } from '@/types/database'

const TYPE_LABELS: Record<string, string> = {
  motor_yacht: 'Motor yacht',
  catamaran: 'Catamaran',
  sailing: 'Sailing boat',
  speedboat: 'Speedboat',
  fishing: 'Fishing boat',
  rib: 'RIB',
  luxury: 'Luxury yacht',
  jet_ski: 'Jet ski',
  jet_car: 'Jet car',
  gulet: 'Gulet',
}

const gold = '#74cfe8'
const goldFaint = 'rgba(116,207,232,0.12)'
const goldBorder = 'rgba(116,207,232,0.22)'
const textMuted = 'rgba(244,244,242,0.55)'
const card = '#0c1828'

async function getBoat(slug: string): Promise<BoatWithDetails | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('boats')
    .select(`
      *,
      boat_images(*),
      boat_pricing(*),
      boat_features(*),
      locations(*),
      profiles(id, full_name, avatar_url, verification_status)
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !data) return null
  return { ...(data as any), avg_rating: 0, review_count: 0 } as BoatWithDetails
}

// Preview path for non-active (draft/paused) boats — only admins or the boat's
// own host may view these. Uses the service-role client to bypass RLS.
async function getBoatPreview(slug: string, viewerId: string): Promise<BoatWithDetails | null> {
  const admin = createSvc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await admin
    .from('boats')
    .select(`*, boat_images(*), boat_pricing(*), boat_features(*), locations(*), profiles(id, full_name, avatar_url, verification_status)`)
    .eq('slug', slug).maybeSingle()
  if (!data) return null
  const boat = data as any
  const { data: me } = await admin.from('profiles').select('is_admin').eq('id', viewerId).single()
  const allowed = (me as { is_admin?: boolean } | null)?.is_admin || boat.host_id === viewerId
  if (!allowed) return null
  return { ...boat, avg_rating: 0, review_count: 0 } as BoatWithDetails
}

// An old (migrated) slug → the boat's current slug, for a 301. Keeps every URL
// that was ever shared or indexed alive instead of 404-ing. Slugs never change
// on rename, so this one-time backfill map is complete; new boats get a fresh
// unique slug at creation and never need an entry here.
function resolveRedirect(slug: string): string | null {
  return (SLUG_REDIRECTS as Record<string, string>)[slug] ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const boat = await getBoat(slug)
  if (!boat) return { title: 'Boat not found' }
  const lowestPrice = [...boat.boat_pricing].sort((a, b) => a.price - b.price)[0]
  const heroImg = boat.boat_images.find((i) => i.is_hero) ?? boat.boat_images[0]
  const typeLabel = TYPE_LABELS[boat.type] ?? boat.type
  // Keyword + price + capacity in the meta — what a buyer scans for in the SERP.
  const description = [
    `Rent ${boat.name}, a ${typeLabel.toLowerCase()} in ${boat.locations.city}`,
    `up to ${boat.capacity_pax} guests`,
    lowestPrice ? `from ${lowestPrice.currency === 'EUR' ? '€' : lowestPrice.currency + ' '}${lowestPrice.price.toLocaleString('en')}` : null,
    'licensed skipper included. Book online with instant confirmation.',
  ].filter(Boolean).join(' · ')
  return {
    title: `${boat.name} — ${typeLabel} in ${boat.locations.city}`,
    description,
    alternates: { canonical: `https://boathire24.com/boats/${boat.slug}` },
    openGraph: {
      title: `${boat.name} — ${typeLabel} in ${boat.locations.city}`,
      description: boat.tagline ?? description,
      images: [{
        url: heroImg?.storage_url ?? 'https://boathire24.com/opengraph-image',
        alt: `${boat.name} — ${typeLabel} in ${boat.locations.city}`,
      }],
    },
  }
}

export default async function BoatDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  let boat = await getBoat(slug)
  let isPreview = false
  if (!boat) {
    // Not publicly live — allow admins/owner to preview a draft.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      boat = await getBoatPreview(slug, user.id)
      isPreview = !!boat
    }
  }
  if (!boat) {
    // Maybe this is an old slug — 301 forward to the current one before 404.
    const current = resolveRedirect(slug)
    if (current && current !== slug) permanentRedirect(`/boats/${current}`)
    notFound()
  }

  // Get reviews
  const { data: reviewsRaw } = await supabase
    .from('reviews')
    .select('*, profiles(full_name, avatar_url)')
    .eq('boat_id', boat.id)
    .eq('type', 'renter_review')
    .order('created_at', { ascending: false })
    .limit(12)
  const reviews = reviewsRaw as any[] | null

  // Get blocked/booked availability
  const { data: unavailabilityRaw } = await supabase
    .from('availability')
    .select('date, status')
    .eq('boat_id', boat.id)
    .in('status', ['blocked', 'booked'])
  const unavailability = unavailabilityRaw as { date: string; status: string }[] | null

  const blockedDates = (unavailability ?? []).map((a) => a.date)
  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
    : 0

  const sortedPricing = [...boat.boat_pricing].sort((a, b) => (a.duration_hours ?? 0) - (b.duration_hours ?? 0))

  // Product.image: genuine photos of THIS boat only. Generic stock (Pexels,
  // Unsplash) never enters the schema. Own uploads first; sister-domain shots
  // (imported Marbella fleet — real photos of the actual boat) are the fallback
  // for boats with no Supabase uploads, so stock never wins by default.
  const GENERIC_STOCK = /images\.pexels\.com|images\.unsplash\.com/
  const ownPhotos = boat.boat_images.filter(
    (i) => !GENERIC_STOCK.test(i.storage_url) && !/boatrentalinmarbella\.com/.test(i.storage_url)
  )
  const genuinePhotos = ownPhotos.length
    ? ownPhotos
    : boat.boat_images.filter((i) => !GENERIC_STOCK.test(i.storage_url))
  const schemaImages = (genuinePhotos.length ? genuinePhotos : boat.boat_images)
    .map((i) => i.storage_url)
    .slice(0, 8)

  // Sibling boats in the same location → internal-link rails at the bottom of the
  // page (spreads crawl equity through the location silo, and cross-sells if the
  // boat this visitor landed on is booked). Same boat-type first, then the rest.
  const { data: siblingRaw } = await supabase
    .from('boats')
    .select(`*, boat_images(*), boat_pricing(*), boat_features(*), locations(*), profiles(id, full_name, avatar_url, verification_status)`)
    .eq('status', 'active')
    .eq('location_id', boat.location_id)
    .neq('id', boat.id)
    .limit(12)
  const siblings = await attachRatings(supabase, (siblingRaw ?? []) as any[]) as BoatWithDetails[]
  const sameType = siblings.filter((b) => b.type === boat.type && !!(b as any).is_fishing_trip === !!(boat as any).is_fishing_trip)
  const otherInCity = siblings.filter((b) => !sameType.some((s) => s.id === b.id))
  const boatCategory = CATEGORIES.find((c) => c.types.includes(boat.type) && !!c.fishing === !!(boat as any).is_fishing_trip)
  const typeLabelPlural = `${TYPE_LABELS[boat.type] ?? boat.type}s`
  // Clean display name — 37 locations still store a raw geocoded address as `city`.
  const cityName = prettyCity(boat.locations.city)

  const specItems = [
    { icon: Users,  value: String(boat.capacity_pax),  label: 'Guests' },
    ...(boat.length_m   ? [{ icon: Ruler,  value: `${boat.length_m}m`,    label: 'Length'     }] : []),
    ...(boat.cabins     ? [{ icon: Anchor, value: String(boat.cabins),    label: 'Cabins'     }] : []),
    ...(boat.model_year ? [{ icon: Waves,  value: String(boat.model_year), label: 'Model year' }] : []),
  ]

  return (
    <div style={{ background: '#07101e', color: '#f4f4f2', minHeight: '100vh' }}>
      {isPreview && (
        <div style={{ background: 'rgba(245,158,11,0.14)', borderBottom: '1px solid rgba(245,158,11,0.35)', color: '#fbbf24', fontSize: '13px', fontWeight: 700, textAlign: 'center', padding: '10px 16px' }}>
          👁 Preview — this listing is <strong>{boat.status}</strong> and not visible to the public yet.
        </div>
      )}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 24px 96px' }}>

        {/* ── Breadcrumb ── */}
        <nav style={{ fontSize: '13px', color: 'rgba(244,244,242,0.40)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <a href="/" style={{ color: 'rgba(244,244,242,0.40)', textDecoration: 'none' }}>Home</a>
          <span>/</span>
          <a href={`/${boat.locations.slug}`} style={{ color: 'rgba(244,244,242,0.40)', textDecoration: 'none' }}>{cityName}</a>
          <span>/</span>
          <span style={{ color: '#f4f4f2' }}>{boat.name}</span>
        </nav>

        {/* ── Title row ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: '#f4f4f2', lineHeight: 1.15, marginBottom: '8px' }}>
              {boat.name}
            </h1>
            {boat.tagline && (
              <p style={{ fontSize: '16px', color: textMuted, marginBottom: '12px' }}>{boat.tagline}</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '14px', color: textMuted, flexWrap: 'wrap' }}>
              {reviews && reviews.length > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Star style={{ width: '15px', height: '15px', fill: gold, color: gold }} />
                  <span style={{ fontWeight: 600, color: '#f4f4f2' }}>{avgRating.toFixed(1)}</span>
                  <span>({reviews.length} reviews)</span>
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin style={{ width: '14px', height: '14px', color: gold }} />
                {cityName}, {boat.locations.country}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {(boat.profiles as { verification_status?: string } | null)?.verification_status === 'verified' && (
              <VerifiedBadge variant="pill" size="md" />
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, padding: '6px 16px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}` }}>
              {TYPE_LABELS[boat.type] ?? boat.type}
            </span>
            {boat.instant_book && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, padding: '6px 16px', borderRadius: '99px', background: 'rgba(37,211,102,0.12)', color: '#5edb8a', border: '1px solid rgba(94,219,138,0.40)' }}>
                <Zap style={{ width: '12px', height: '12px' }} /> Instant book
              </span>
            )}
          </div>
        </div>

        {/* All-inclusive / escrow trust bar — reinforce the price promise near the CTA */}
        <div style={{ marginBottom: '28px' }}>
          <TrustBar />
        </div>

        {/* ── Two-column layout (gallery + content left, booking widget right — widget aligns with image top) ── */}
        <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* ── Main content ── */}
          <div style={{ flex: '2 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '40px' }}>

            {/* Gallery */}
            <Gallery images={boat.boat_images} boatName={boat.name} />

            {/* Quick specs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
              {specItems.map((spec) => (
                <div key={spec.label} style={{ textAlign: 'center', padding: '20px 12px', background: card, borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <spec.icon style={{ width: '22px', height: '22px', color: gold, margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontWeight: 700, fontSize: '17px', color: '#f4f4f2', marginBottom: '3px' }}>{spec.value}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(244,244,242,0.40)' }}>{spec.label}</div>
                </div>
              ))}
            </div>

            {/* Inclusions */}
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f4f4f2', marginBottom: '18px' }}>What&apos;s included</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                {boat.includes_skipper && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(244,244,242,0.78)' }}>
                    <Check style={{ width: '16px', height: '16px', color: '#5edb8a', flexShrink: 0 }} />
                    Licensed skipper
                  </div>
                )}
                {boat.includes_fuel && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(244,244,242,0.78)' }}>
                    <Check style={{ width: '16px', height: '16px', color: '#5edb8a', flexShrink: 0 }} />
                    Fuel
                  </div>
                )}
                {boat.includes_drinks && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(244,244,242,0.78)' }}>
                    <Check style={{ width: '16px', height: '16px', color: '#5edb8a', flexShrink: 0 }} />
                    Drinks &amp; snacks
                  </div>
                )}
                {boat.boat_features.filter((f) => !f.feature.startsWith('__REFUND_POLICY__::')).map((f) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(244,244,242,0.78)' }}>
                    <Check style={{ width: '16px', height: '16px', color: '#5edb8a', flexShrink: 0 }} />
                    {f.feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

            {/* Description */}
            {boat.description && (
              <>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f4f4f2', marginBottom: '14px' }}>About this boat</h2>
                  <p style={{ fontSize: '15px', color: textMuted, lineHeight: 1.78, whiteSpace: 'pre-line' }}>{boat.description}</p>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />
              </>
            )}

            {/* Pricing table */}
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f4f4f2', marginBottom: '18px' }}>Pricing</h2>
              <div style={{ overflow: 'hidden', borderRadius: '14px', border: `1px solid ${goldBorder}` }}>
                <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: goldFaint }}>
                      <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 600, color: 'rgba(244,244,242,0.65)' }}>Duration</th>
                      <th style={{ textAlign: 'right', padding: '12px 18px', fontWeight: 600, color: 'rgba(244,244,242,0.65)' }}>Price</th>
                      <th style={{ textAlign: 'right', padding: '12px 18px', fontWeight: 600, color: 'rgba(244,244,242,0.65)' }}>Per hour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPricing.map((p, i) => (
                      <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: i % 2 !== 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                        <td style={{ padding: '13px 18px', color: 'rgba(244,244,242,0.70)' }}>
                          {p.duration_hours
                            ? `${p.duration_hours} hours`
                            : `${p.duration_days} day${p.duration_days !== 1 ? 's' : ''}`}
                        </td>
                        <td style={{ padding: '13px 18px', textAlign: 'right', fontWeight: 700, color: '#f4f4f2' }}>
                          {formatPrice(p.price, p.currency)}
                        </td>
                        <td style={{ padding: '13px 18px', textAlign: 'right', color: textMuted }}>
                          {p.duration_hours ? formatPrice(Math.round(p.price / p.duration_hours), p.currency) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(244,244,242,0.32)', marginTop: '10px' }}>
                All-inclusive prices · no extra fees at checkout.
              </p>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

            {/* Availability */}
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f4f4f2', marginBottom: '18px' }}>Availability</h2>
              <AvailabilityCalendar blockedDates={blockedDates} mode="view" />
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

            {/* Reviews */}
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f4f4f2', marginBottom: '24px' }}>
                Reviews
                {reviews && reviews.length > 0 && (
                  <span style={{ fontSize: '14px', fontWeight: 500, color: textMuted, marginLeft: '10px' }}>
                    ({reviews.length})
                  </span>
                )}
              </h2>
              <Reviews reviews={(reviews as any) ?? []} avgRating={avgRating} />
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

            {/* Cancellation & refund policy */}
            {(() => {
              const refundRow = boat.boat_features.find((f) => f.feature.startsWith('__REFUND_POLICY__::'))
              const custom = refundRow ? refundRow.feature.slice('__REFUND_POLICY__::'.length) : null
              const policy = custom ? 'custom' : ((boat as { cancellation_policy?: string }).cancellation_policy ?? 'moderate')
              const PRESETS: Record<string, { label: string; lines: string[] }> = {
                flexible: { label: 'Flexible', lines: ['Full refund if cancelled up to 24 hours before departure.', 'Within 24 hours: no refund.'] },
                moderate: { label: 'Moderate', lines: ['Full refund if cancelled up to 5 days before departure.', 'Within 5 days: 50% refund.', 'Within 24 hours: no refund.'] },
                strict:   { label: 'Strict',   lines: ['50% refund if cancelled up to 14 days before departure.', 'Within 14 days: no refund.'] },
              }
              const preset = PRESETS[policy]
              return (
                <>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f4f4f2', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Cancellation &amp; refund policy
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: goldFaint, color: gold, border: `1px solid ${goldBorder}`, textTransform: 'capitalize' }}>
                        {policy === 'custom' ? 'Custom' : preset?.label ?? policy}
                      </span>
                    </h2>
                    <div style={{ background: card, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px 20px' }}>
                      {policy === 'custom' && custom ? (
                        <p style={{ fontSize: '14px', color: 'rgba(244,244,242,0.78)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>{custom}</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {(preset?.lines ?? PRESETS.moderate.lines).map((line, i) => (
                            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <span style={{ color: gold, flexShrink: 0, fontSize: '13px', marginTop: '1px' }}>•</span>
                              <span style={{ fontSize: '14px', color: 'rgba(244,244,242,0.78)', lineHeight: 1.6 }}>{line}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <p style={{ fontSize: '12px', color: textMuted, marginTop: '14px', marginBottom: 0, paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        ⚓ Weather cancellations called by the skipper are always fully refundable or rescheduled free of charge.
                      </p>
                    </div>
                  </div>
                </>
              )
            })()}

            {/* Host */}
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f4f4f2', marginBottom: '18px' }}>Hosted by</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: goldFaint, border: `1px solid ${goldBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: gold, flexShrink: 0 }}>
                  {boat.profiles.full_name?.[0]?.toUpperCase() ?? 'H'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#f4f4f2', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {boat.profiles.full_name ?? 'Host'}
                    {(boat.profiles as { verification_status?: string } | null)?.verification_status === 'verified' && (
                      <VerifiedBadge variant="inline" />
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: textMuted, marginTop: '2px' }}>
                    {(boat.profiles as { verification_status?: string } | null)?.verification_status === 'verified'
                      ? 'Verified owner · documents checked by BoatHire24'
                      : 'Host on BoatHire24'}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ── Booking widget sidebar ── */}
          <div id="book" style={{ flex: '1 1 340px', position: 'sticky', top: '24px' }}>
            {sortedPricing.length === 0 ? (
              /* No price set yet → enquiry form that notifies the owner (email + WhatsApp) */
              <QuoteRequestCard boatId={boat.id} boatName={boat.name} />
            ) : (
              <BookingWidget
                boat={{ ...boat, avg_rating: avgRating, review_count: reviews?.length ?? 0 }}
                blockedDates={blockedDates}
              />
            )}
          </div>

        </div>

        {/* ── Related / sibling boats — internal-link rails back into the location silo ── */}
        {siblings.length > 0 && (
          <div style={{ marginTop: '72px', display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {sameType.length > 0 && (
              <RelatedBoats
                title={`Other ${typeLabelPlural.toLowerCase()} in ${cityName}`}
                boats={sameType}
                viewAll={boatCategory
                  ? { href: `/${boat.locations.slug}/${boatCategory.slug}`, label: `All ${boatCategory.label.toLowerCase()} in ${cityName}` }
                  : { href: `/${boat.locations.slug}`, label: `All boats in ${cityName}` }}
              />
            )}
            {otherInCity.length > 0 && (
              <RelatedBoats
                title={`More boats in ${cityName}`}
                boats={otherInCity}
                viewAll={{ href: `/${boat.locations.slug}`, label: `All boats in ${cityName}` }}
              />
            )}
          </div>
        )}
      </div>

      {/* Phone-width: price + CTA pinned to the bottom (widget is below the fold) */}
      <MobileBookBar
        fromPrice={sortedPricing.length ? sortedPricing.reduce((m, p) => Math.min(m, p.price), Number.MAX_SAFE_INTEGER) : null}
        currency={sortedPricing[0]?.currency ?? 'EUR'}
        priceOnRequest={sortedPricing.length === 0}
      />

      {/* Schema.org JSON-LD — Product+Offer with real location & specs, plus breadcrumb.
          Richer entity data is the single biggest lever for being cited by LLM answer engines. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: boat.name,
              description: boat.description ?? boat.tagline ?? undefined,
              image: schemaImages,
              category: TYPE_LABELS[boat.type] ?? boat.type,
              ...(boat.builder ? { brand: { '@type': 'Brand', name: boat.builder } } : {}),
              additionalProperty: [
                { '@type': 'PropertyValue', name: 'Vessel type', value: TYPE_LABELS[boat.type] ?? boat.type },
                { '@type': 'PropertyValue', name: 'Maximum guests', value: String(boat.capacity_pax) },
                ...(boat.length_m ? [{ '@type': 'PropertyValue', name: 'Length', value: `${boat.length_m}m` }] : []),
                ...(boat.model_year ? [{ '@type': 'PropertyValue', name: 'Model year', value: String(boat.model_year) }] : []),
              ],
              ...(boat.locations ? {
                areaServed: {
                  '@type': 'City',
                  name: boat.locations.city,
                  address: { '@type': 'PostalAddress', addressLocality: boat.locations.city, addressCountry: boat.locations.country },
                },
              } : {}),
              ...(sortedPricing.length ? {
                offers: {
                  '@type': 'AggregateOffer',
                  lowPrice: Math.min(...sortedPricing.map((p) => p.price)),
                  highPrice: Math.max(...sortedPricing.map((p) => p.price)),
                  priceCurrency: sortedPricing[0].currency,
                  offerCount: sortedPricing.length,
                  availability: 'https://schema.org/InStock',
                  seller: { '@type': 'Organization', name: 'BoatHire24', url: 'https://boathire24.com' },
                },
              } : {}),
              ...(reviews && reviews.length > 0 ? {
                aggregateRating: { '@type': 'AggregateRating', ratingValue: avgRating.toFixed(1), reviewCount: reviews.length, bestRating: '5', worstRating: '1' },
              } : {}),
            },
            ...(boat.locations ? [{
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boathire24.com' },
                { '@type': 'ListItem', position: 2, name: `Boat Rental ${boat.locations.city}`, item: `https://boathire24.com/${boat.locations.slug}` },
                { '@type': 'ListItem', position: 3, name: boat.name, item: `https://boathire24.com/boats/${boat.slug}` },
              ],
            }] : []),
          ]),
        }}
      />

      {/* Wire-transfer / cash discount promo — Marbella fleet only */}
      {boat.locations?.city === 'Marbella' && <CashDiscountPromo />}
    </div>
  )
}
