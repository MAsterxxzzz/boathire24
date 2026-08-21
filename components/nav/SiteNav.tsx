'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, User, LogOut, LayoutDashboard, Ship, Menu, Search, Compass, HelpCircle, Anchor, Layers, ShieldCheck, Settings, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/ui/Logo'
import LanguageSwitcher from '@/components/nav/LanguageSwitcher'
import HeroSearchPill from '@/components/home/HeroSearchPill'
import { LOCALES, translations, type Locale } from '@/lib/i18n/translations'
import type { User as SupabaseUser } from '@supabase/supabase-js'

// The three core links stay visible on any normal laptop; the other six need
// >=1450px of room. The hamburger menu always carries the full nine.
const PRIMARY_NAV = new Set(['/about', '/search', '/become-a-host'])

const gold = '#74cfe8'
const text = '#f4f4f2'
const muted = 'rgba(244,244,242,0.60)'

function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/)
  const val = match?.[1] as Locale
  return LOCALES.find((l) => l.code === val) ? val : 'en'
}

export default function SiteNav() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [locale, setLocale] = useState<Locale>('en')
  const [isAdmin, setIsAdmin] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        fetch('/api/me').then(r => r.json()).then(d => setIsAdmin(d.is_admin === true))
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetch('/api/me').then(r => r.json()).then(d => setIsAdmin(d.is_admin === true))
      } else {
        setIsAdmin(false)
      }
    })
    setLocale(getLocaleFromCookie())
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })

    // Close dropdown on outside click
    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [])

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    window.location.replace('/')
  }

  const initial = user?.user_metadata?.full_name?.[0]?.toUpperCase()
    ?? user?.email?.[0]?.toUpperCase()
    ?? 'U'

  return (
    <header
      style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: scrolled ? 'rgba(7,16,30,0.97)' : 'rgba(7,16,30,0.92)',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        borderBottom: '1px solid rgba(116,207,232,0.15)',
        boxShadow: scrolled ? '0 8px 28px rgba(0,0,0,0.45)' : 'none',
        transition: 'background 0.3s, box-shadow 0.3s',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <Logo size={52} />
            <span style={{ fontWeight: 800, fontSize: '22px', letterSpacing: '-0.01em', color: '#f4f4f2', whiteSpace: 'nowrap' }}>
              BoatHire<span style={{ color: '#74cfe8' }}>24</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }} className="hidden-mobile">
            {[
              { href: '/about',         label: translations[locale].nav.about },
              { href: '/search',        label: translations[locale].nav.explore },
              { href: '/destinations',  label: 'Destinations' },
              { href: '/fishing-trips', label: 'Fishing trips' },
              { href: '/boat-tours', label: 'Boat tours' },
              { href: '/jet-ski-marbella', label: 'Jet ski' },
              { href: '/how-it-works',  label: translations[locale].nav.howItWorks },
              { href: '/blog',          label: translations[locale].nav.blog },
              { href: '/become-a-host', label: translations[locale].nav.listYourBoat },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={PRIMARY_NAV.has(l.href) ? 'nav-primary' : 'nav-secondary'}
                style={{
                  fontSize: '13.5px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
                  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                  padding: '7px 11px',
                  borderRadius: '8px',
                  ...(pathname === l.href
                    ? { color: '#07101e', background: gold, border: '1px solid transparent' }
                    : { color: gold, background: 'transparent', border: '1px solid rgba(116,207,232,0.18)' }),
                }}
                onMouseEnter={(e) => {
                  if (pathname !== l.href) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(116,207,232,0.12)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(116,207,232,0.40)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== l.href) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(116,207,232,0.18)'
                  }
                }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="hidden-mobile">
            {/* Instagram chip — full footer style. Decorative, not core nav, so it only
                shows once there's genuine room (>=1500px) — it was the main thing
                squeezing the nav links into mid-word wrapping at normal desktop widths. */}
            <a
              href="https://www.instagram.com/boathire24"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow @BoatHire24 on Instagram"
              className="hidden-tablet"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '2px', borderRadius: '50px',
                background: 'linear-gradient(135deg,#fdf497 0%,#fdf497 5%,#fd5949 45%,#d6249f 60%,#285AEB 90%)',
                textDecoration: 'none', flexShrink: 0,
                boxShadow: '0 3px 14px rgba(214,36,159,0.30),0 2px 8px rgba(253,89,73,0.18)', transition: 'transform 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 8px 5px 5px', borderRadius: '50px', background: 'linear-gradient(180deg, rgba(7,16,30,0.95) 0%, rgba(7,16,30,0.92) 100%)', color: '#f4f4f2', fontSize: '13px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '7px', background: 'linear-gradient(135deg,#FED576 0%,#F47133 30%,#BC3081 65%,#4C63D2 100%)', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/>
                  </svg>
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>@BoatHire24</span>
                <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '50px', background: 'linear-gradient(135deg,#fd5949,#d6249f)', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Follow</span>
              </span>
            </a>
            <LanguageSwitcher />
            {user ? (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                {/* User pill button */}
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '6px 6px 6px 14px',
                    borderRadius: '99px',
                    border: dropdownOpen ? '1px solid rgba(116,207,232,0.50)' : '1px solid rgba(116,207,232,0.25)',
                    background: dropdownOpen ? 'rgba(116,207,232,0.08)' : 'rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: dropdownOpen ? '0 0 0 3px rgba(116,207,232,0.10)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!dropdownOpen) {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(116,207,232,0.45)'
                      ;(e.currentTarget as HTMLElement).style.background = 'rgba(116,207,232,0.06)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!dropdownOpen) {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(116,207,232,0.25)'
                      ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                    }
                  }}
                >
                  {/* Hamburger lines */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '16px' }}>
                    <div style={{ height: '1.5px', background: 'rgba(244,244,242,0.70)', borderRadius: '2px', transition: 'all 0.2s', width: dropdownOpen ? '100%' : '100%' }} />
                    <div style={{ height: '1.5px', background: 'rgba(244,244,242,0.70)', borderRadius: '2px', width: '75%' }} />
                    <div style={{ height: '1.5px', background: 'rgba(244,244,242,0.70)', borderRadius: '2px', width: '50%' }} />
                  </div>
                  {/* Avatar */}
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)',
                    color: '#07101e', fontSize: '13px', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(116,207,232,0.35)',
                    flexShrink: 0,
                  }}>
                    {initial}
                  </div>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 10px)',
                    width: '230px', borderRadius: '16px', padding: '8px 0', zIndex: 50,
                    background: '#0c1828',
                    border: '1px solid rgba(116,207,232,0.20)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.65)',
                  }}>
                    {/* User email header */}
                    <div style={{ padding: '10px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '4px' }}>
                      <div style={{ fontSize: '11px', color: 'rgba(244,244,242,0.40)', marginBottom: '2px' }}>Signed in as</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.user_metadata?.full_name ?? user.email}
                      </div>
                    </div>

                    {[
                      { href: '/dashboard',          Icon: LayoutDashboard, label: 'My trips' },
                      { href: '/host',               Icon: Ship,            label: 'Host dashboard' },
                      { href: '/host/fleet',         Icon: Layers,          label: 'Fleet Manager' },
                      { href: '/dashboard/messages', Icon: User,            label: 'Messages' },
                      { href: '/settings#whatsapp',  Icon: MessageCircle,   label: 'WhatsApp alerts' },
                      { href: '/settings',           Icon: Settings,        label: 'Settings' },
                      ...(isAdmin ? [{ href: '/admin', Icon: ShieldCheck, label: 'Admin' }] : []),
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '14px', color: 'rgba(244,244,242,0.75)', textDecoration: 'none', transition: 'background 0.12s, color 0.12s' }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(116,207,232,0.07)'
                          ;(e.currentTarget as HTMLElement).style.color = gold
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'transparent'
                          ;(e.currentTarget as HTMLElement).style.color = 'rgba(244,244,242,0.75)'
                        }}
                        onClick={() => setDropdownOpen(false)}
                      >
                        <item.Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                        {item.label}
                      </Link>
                    ))}

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '6px 0' }} />

                    <button
                      onClick={signOut}
                      style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '10px', padding: '10px 16px', fontSize: '14px', color: 'rgba(244,244,242,0.60)', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.12s, color 0.12s', textAlign: 'left' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'
                        ;(e.currentTarget as HTMLElement).style.color = '#f87171'
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent'
                        ;(e.currentTarget as HTMLElement).style.color = 'rgba(244,244,242,0.60)'
                      }}
                    >
                      <LogOut style={{ width: 15, height: 15, flexShrink: 0 }} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  style={{ fontSize: '14px', fontWeight: 500, color: muted, textDecoration: 'none', padding: '8px 4px', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = text }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = muted }}
                >
                  {translations[locale].nav.login}
                </Link>
                <Link
                  href="/signup"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '10px 22px', borderRadius: '99px',
                    background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)',
                    color: '#07101e', fontSize: '14px', fontWeight: 700,
                    textDecoration: 'none', whiteSpace: 'nowrap',
                    boxShadow: '0 2px 14px rgba(116,207,232,0.28)',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 22px rgba(116,207,232,0.45)'
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 14px rgba(116,207,232,0.28)'
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                  }}
                >
                  {translations[locale].nav.getStarted}
                </Link>
              </>
            )}
          </div>

          {/* Mobile: Instagram icon + hamburger */}
          <div style={{ display: 'none', alignItems: 'center', gap: '10px' }} className="show-mobile">
            <a
              href="https://www.instagram.com/boathire24"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow @BoatHire24 on Instagram"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px', borderRadius: '50px', background: 'linear-gradient(135deg,#fdf497 0%,#fdf497 5%,#fd5949 45%,#d6249f 60%,#285AEB 90%)', textDecoration: 'none', flexShrink: 0, boxShadow: '0 3px 14px rgba(214,36,159,0.30),0 2px 8px rgba(253,89,73,0.18)' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px 4px 4px', borderRadius: '50px', background: 'linear-gradient(180deg, rgba(7,16,30,0.95) 0%, rgba(7,16,30,0.92) 100%)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '7px', background: 'linear-gradient(135deg,#FED576 0%,#F47133 30%,#BC3081 65%,#4C63D2 100%)', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/>
                  </svg>
                </span>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '50px', background: 'linear-gradient(135deg,#fd5949,#d6249f)', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Follow</span>
              </span>
            </a>
            <button
              onClick={() => setOpen(!open)}
              style={{ padding: '8px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(244,244,242,0.70)', cursor: 'pointer', display: 'inline-flex' }}
            >
              {open
                ? <X style={{ width: 20, height: 20 }} />
                : <Menu style={{ width: 20, height: 20 }} />
              }
            </button>
          </div>
        </div>

        {/* ── Airbnb-style centered search band (homepage only) ── */}
        {pathname === '/' && (
          <div style={{ borderTop: '1px solid rgba(116,207,232,0.10)', paddingTop: '16px', paddingBottom: '18px', display: 'flex', justifyContent: 'center' }}>
            <HeroSearchPill compact />
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: 'rgba(7,16,30,0.98)', borderTop: '1px solid rgba(116,207,232,0.10)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 20px 24px' }}>
            {[
              { href: '/about',         label: translations[locale].nav.about },
              { href: '/search',        label: translations[locale].nav.explore },
              { href: '/destinations',  label: 'Destinations' },
              { href: '/fishing-trips', label: 'Fishing trips' },
              { href: '/boat-tours', label: 'Boat tours' },
              { href: '/jet-ski-marbella', label: 'Jet ski' },
              { href: '/how-it-works',  label: translations[locale].nav.howItWorks },
              { href: '/blog',          label: translations[locale].nav.blog },
              { href: '/become-a-host', label: translations[locale].nav.listYourBoat },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  display: 'block', padding: '13px 16px', fontSize: '15px', fontWeight: 700,
                  textDecoration: 'none', borderRadius: '10px', marginBottom: '8px',
                  ...(pathname === l.href
                    ? { color: '#07101e', background: gold, border: '1px solid transparent' }
                    : { color: gold, background: 'transparent', border: '1px solid rgba(116,207,232,0.18)' }),
                }}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div style={{ paddingTop: '14px', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <LanguageSwitcher />
              <a
                href="https://www.instagram.com/boathire24"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow @BoatHire24 on Instagram"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '11px', background: 'linear-gradient(135deg,#FED576 0%,#F47133 30%,#BC3081 65%,#4C63D2 100%)', textDecoration: 'none', flexShrink: 0, boxShadow: '0 2px 10px rgba(214,36,159,0.30)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/>
                </svg>
              </a>
            </div>

            {user && (
              <>
                <Link href="/dashboard" style={{ display: 'block', padding: '13px 0', fontSize: '15px', fontWeight: 500, color: 'rgba(244,244,242,0.75)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }} onClick={() => setOpen(false)}>My trips</Link>
                <Link href="/host" style={{ display: 'block', padding: '13px 0', fontSize: '15px', fontWeight: 500, color: 'rgba(244,244,242,0.75)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }} onClick={() => setOpen(false)}>Host dashboard</Link>
                <Link href="/host/fleet" style={{ display: 'block', padding: '13px 0', fontSize: '15px', fontWeight: 500, color: 'rgba(244,244,242,0.75)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }} onClick={() => setOpen(false)}>Fleet Manager</Link>
                <Link href="/dashboard/messages" style={{ display: 'block', padding: '13px 0', fontSize: '15px', fontWeight: 500, color: 'rgba(244,244,242,0.75)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }} onClick={() => setOpen(false)}>Messages</Link>
                <Link href="/settings#whatsapp" style={{ display: 'block', padding: '13px 0', fontSize: '15px', fontWeight: 500, color: 'rgba(244,244,242,0.75)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }} onClick={() => setOpen(false)}>WhatsApp alerts</Link>
                <Link href="/settings" style={{ display: 'block', padding: '13px 0', fontSize: '15px', fontWeight: 500, color: 'rgba(244,244,242,0.75)', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }} onClick={() => setOpen(false)}>Settings</Link>
                {isAdmin && (
                  <Link href="/admin" style={{ display: 'block', padding: '13px 0', fontSize: '15px', fontWeight: 600, color: gold, textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)' }} onClick={() => setOpen(false)}>🔒 Admin</Link>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: '10px', paddingTop: '16px' }}>
              {user ? (
                <>
                  <span style={{ flex: 1, padding: '11px 16px', borderRadius: '10px', background: 'rgba(116,207,232,0.08)', border: '1px solid rgba(116,207,232,0.20)', color: gold, fontSize: '14px', fontWeight: 600, textAlign: 'center' }}>
                    {user.user_metadata?.full_name ?? user.email?.split('@')[0]}
                  </span>
                  <button
                    onClick={signOut}
                    style={{ flex: 1, padding: '11px 16px', borderRadius: '10px', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" style={{ flex: 1, display: 'block', textAlign: 'center', padding: '11px 16px', borderRadius: '10px', border: '1px solid rgba(116,207,232,0.25)', color: 'rgba(244,244,242,0.75)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }} onClick={() => setOpen(false)}>
                    Log in
                  </Link>
                  <Link href="/signup" style={{ flex: 1, display: 'block', textAlign: 'center', padding: '11px 16px', borderRadius: '10px', background: 'linear-gradient(135deg, #8fdcf0 0%, #74cfe8 60%, #4fb8d6 100%)', color: '#07101e', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }} onClick={() => setOpen(false)}>
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Responsive styles injected */}
      <style>{`
        /* The full 9-item nav + auth cluster wrapped mid-word (e.g. "About"/"us")
           even at 1440px, so the whole bar used to fold into the hamburger below
           1450px — which hid every link on a normal laptop. Instead: the three
           core links (About us · Explore boats · List your boat) show from 1024px,
           and the other six only appear once there is genuine room at 1450px.
           The hamburger still carries all nine at any width. */
        @media (min-width: 1024px) {
          .hidden-mobile { display: flex !important; }
          .show-mobile { display: none !important; }
          .nav-secondary { display: none !important; }
        }
        @media (max-width: 1023.98px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
        /* Must follow the 1024 block: at >=1450px both match and the later wins. */
        @media (min-width: 1450px) {
          .nav-secondary { display: inline-flex !important; }
        }
        .hidden-tablet { display: none !important; }
        @media (min-width: 1500px) {
          .hidden-tablet { display: inline-flex !important; }
        }
      `}</style>
    </header>
  )
}
