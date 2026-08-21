'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Slide-in "Pay by Wire Transfer or Cash, Get a Discount!" promo — mirrors the
 * boatrentalinmarbella.com popup. Shown only on Marbella boat listings (gated by the
 * caller). Slides in after 4s, dismissible, and stays hidden for 24h via localStorage.
 */
const WHATSAPP = '358400406194' // Marbella boat-hire WhatsApp
const WA_TEXT = encodeURIComponent(
  "Hi, I'd like to book a boat in Marbella and pay by wire transfer or cash for the 15% discount",
)
// Bumped with the 5% -> 15% / wire-transfer change so visitors who dismissed the old
// offer are shown the new one instead of sitting out the remaining 24h window.
const KEY = 'cashPromoDismissed_v2'

export default function CashDiscountPromo() {
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(KEY)
      if (dismissed && Date.now() - parseInt(dismissed, 10) < 86400000) return
    } catch {}
    timer.current = setTimeout(() => setVisible(true), 1200)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [])

  function hide() {
    setVisible(false)
    try { localStorage.setItem(KEY, String(Date.now())) } catch {}
  }

  return (
    <div
      role="dialog"
      aria-label="Wire transfer or cash discount offer"
      aria-hidden={!visible}
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 9998, maxWidth: 340,
        width: 'calc(100% - 40px)',
        transform: visible ? 'translateY(0)' : 'translateY(140%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg,#1a1208 0%,#0c1828 100%)',
        border: '2px solid', borderImage: 'linear-gradient(135deg,#fde68a,#fbbf24,#74cfe8,#92400e) 1',
        borderRadius: 18, padding: '22px 22px 20px',
        boxShadow: '0 24px 60px rgba(116,207,232,0.32),0 8px 24px rgba(0,0,0,0.50)', overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, background: 'radial-gradient(circle,rgba(251,191,36,0.25) 0%,transparent 70%)', pointerEvents: 'none' }} />

        <button onClick={hide} aria-label="Close promo" style={{
          position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(244,244,242,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 14, lineHeight: 1, padding: 0, zIndex: 2,
        }}>×</button>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 50,
          background: 'linear-gradient(135deg,#fbbf24,#74cfe8)', color: '#1a1208', fontSize: 10,
          fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 12,
          boxShadow: '0 2px 8px rgba(251,191,36,0.30)',
        }}>
          <span style={{ fontSize: 13 }}>💰</span> Limited offer
        </div>

        <h3 style={{ fontSize: 22, fontWeight: 800, color: '#f4f4f2', margin: '0 0 6px', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
          Renting a Boat in Marbella?<br />
          <span style={{ background: 'linear-gradient(135deg,#fde68a 0%,#fbbf24 40%,#74cfe8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Pay by Wire or Cash — Get 15% Off!</span>
        </h3>

        <p style={{ fontSize: 13, color: 'rgba(244,244,242,0.62)', margin: '0 0 16px', lineHeight: 1.5 }}>
          Booking a boat in <strong style={{ color: '#74cfe8' }}>Marbella</strong>? Skip the card fees — pay by <strong style={{ color: '#fbbf24' }}>bank transfer</strong> or in <strong style={{ color: '#fbbf24' }}>cash</strong> to your skipper and we&apos;ll knock <strong style={{ color: '#fbbf24' }}>15% off</strong> your charter.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href={`https://wa.me/${WHATSAPP}?text=${WA_TEXT}`} target="_blank" rel="nofollow noopener" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 50,
            background: 'linear-gradient(135deg,#25d366 0%,#128c7e 100%)', color: '#fff', fontSize: 13,
            fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 14px rgba(37,211,102,0.32)', flex: 1, justifyContent: 'center',
          }}>💬 Claim discount</a>
          <button onClick={hide} style={{ padding: '10px 16px', borderRadius: 50, background: 'transparent', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(244,244,242,0.65)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Later</button>
        </div>

        <p style={{ fontSize: 10, color: 'rgba(244,244,242,0.35)', margin: '10px 0 0', lineHeight: 1.4 }}>
          * 15% off Marbella charters paid by bank/wire transfer, or in EUR cash at the marina. Mention &quot;wire or cash discount&quot; when booking.
        </p>
      </div>
    </div>
  )
}
