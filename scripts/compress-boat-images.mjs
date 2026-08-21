#!/usr/bin/env node
/**
 * Shrink the `boat-images` bucket below the Supabase storage quota.
 *
 * WHY: the bucket hit 1528 MB / 3560 objects against the free tier's 1 GB cap, which
 * put the whole project into `exceed_storage_size_quota` restriction — every REST and
 * storage call returned HTTP 402, so /search rendered "0 boats" and boat pages 404'd.
 * 303 files >= 1 MB hold 892 MB of that (the worst single photo is 18 MB).
 *
 * WHAT: re-encodes each oversized image IN PLACE at the same path and the same format
 * (JPEG stays JPEG, PNG stays PNG). Nothing in `boat_images.storage_url` changes, so no
 * DB writes and no broken URLs. Originals are copied to a local backup dir BEFORE any
 * overwrite, so a bad run is reversible.
 *
 * NOTE: this cannot run while the project is restricted — reads 402 as well as writes.
 * Lift the quota first (upgrade the plan, or free space), then run this to get the
 * bucket back down so the plan can be dropped again.
 *
 * Usage:
 *   export SUPABASE_URL=https://<ref>.supabase.co
 *   export SUPABASE_SERVICE_ROLE_KEY=<service role key>     # never hardcode it
 *   node scripts/compress-boat-images.mjs                   # dry run, uploads nothing
 *   node scripts/compress-boat-images.mjs --apply
 *   node scripts/compress-boat-images.mjs --apply --limit 20 --min-kb 500
 */
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

const URL_BASE = process.env.SUPABASE_URL?.replace(/\/$/, '')
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_BASE || !KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.')
  process.exit(1)
}

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const BUCKET = 'boat-images'
const MAX_EDGE = Number(argVal('--max-edge', 1920))   // long edge, px
const QUALITY = Number(argVal('--quality', 80))
const MIN_BYTES = Number(argVal('--min-kb', 300)) * 1024 // ignore anything already small
const LIMIT = Number(argVal('--limit', 0))               // 0 = no cap
const BACKUP = path.resolve(argVal('--backup', '.image-backup'))
const MIN_GAIN = 0.10                                    // skip if it saves < 10%

function argVal(flag, dflt) {
  const i = args.indexOf(flag)
  return i !== -1 && args[i + 1] ? args[i + 1] : dflt
}
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const mb = (b) => (b / 1048576).toFixed(1) + ' MB'

/** The storage list API returns one folder level at a time, so walk it recursively. */
async function listAll(prefix = '') {
  const out = []
  for (let offset = 0; ; offset += 100) {
    const res = await fetch(`${URL_BASE}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }),
    })
    if (!res.ok) throw new Error(`list ${prefix || '/'} -> HTTP ${res.status} ${await res.text()}`)
    const page = await res.json()
    if (!page.length) break
    for (const e of page) {
      const full = prefix ? `${prefix}/${e.name}` : e.name
      // A folder placeholder has no id/metadata; recurse into it.
      if (!e.id && !e.metadata) out.push(...await listAll(full))
      else out.push({ name: full, size: e.metadata?.size ?? 0, mime: e.metadata?.mimetype ?? '' })
    }
    if (page.length < 100) break
  }
  return out
}

async function main() {
  console.log(`Listing ${BUCKET} …`)
  const all = await listAll()
  const total = all.reduce((s, o) => s + o.size, 0)
  console.log(`  ${all.length} objects, ${mb(total)} total\n`)

  // Only formats sharp can round-trip safely in place. GIFs are often animated and
  // re-encoding them loses frames, so they are listed but never touched.
  let targets = all.filter((o) => o.size >= MIN_BYTES && /jpe?g|png/i.test(o.mime))
  targets.sort((a, b) => b.size - a.size)
  if (LIMIT) targets = targets.slice(0, LIMIT)

  const skippedGif = all.filter((o) => /gif/i.test(o.mime) && o.size >= MIN_BYTES)
  if (skippedGif.length) {
    console.log(`Skipping ${skippedGif.length} GIF(s), ${mb(skippedGif.reduce((s, o) => s + o.size, 0))} — `
      + `re-encoding can drop animation frames. Review by hand.\n`)
  }
  console.log(`${targets.length} candidate(s) >= ${(MIN_BYTES / 1024) | 0} KB`)
  console.log(APPLY ? 'MODE: APPLY (will overwrite)\n' : 'MODE: DRY RUN (nothing is uploaded)\n')

  let before = 0, after = 0, done = 0, failed = 0, skipped = 0
  for (const o of targets) {
    try {
      const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${encodeURI(o.name)}`, { headers: h })
      if (!res.ok) throw new Error(`download HTTP ${res.status}`)
      const orig = Buffer.from(await res.arrayBuffer())

      const img = sharp(orig, { failOn: 'none' }).rotate() // honour EXIF orientation
      const meta = await img.metadata()
      const isPng = /png/i.test(o.mime)
      let pipe = img
      if (Math.max(meta.width ?? 0, meta.height ?? 0) > MAX_EDGE) {
        pipe = pipe.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      }
      // Keep the format so the object's path, extension and MIME stay valid.
      const outBuf = isPng
        ? await pipe.png({ compressionLevel: 9, palette: true }).toBuffer()
        : await pipe.jpeg({ quality: QUALITY, mozjpeg: true, progressive: true }).toBuffer()

      const gain = 1 - outBuf.length / orig.length
      before += orig.length
      if (gain < MIN_GAIN) {
        after += orig.length; skipped++
        console.log(`  skip  ${o.name} — only ${(gain * 100).toFixed(0)}% smaller`)
        continue
      }
      after += outBuf.length

      if (APPLY) {
        const dest = path.join(BACKUP, o.name)
        await fs.mkdir(path.dirname(dest), { recursive: true })
        await fs.writeFile(dest, orig)                    // backup BEFORE overwrite
        const up = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${encodeURI(o.name)}`, {
          method: 'PUT',
          headers: { ...h, 'Content-Type': o.mime, 'x-upsert': 'true', 'cache-control': '3600' },
          body: outBuf,
        })
        if (!up.ok) throw new Error(`upload HTTP ${up.status} ${await up.text()}`)
      }
      done++
      console.log(`  ${APPLY ? 'done' : 'plan'}  ${o.name}  ${mb(orig.length)} -> ${mb(outBuf.length)}  (-${(gain * 100).toFixed(0)}%)`)
    } catch (err) {
      failed++
      console.log(`  FAIL  ${o.name}: ${err.message}`)
    }
  }

  const untouched = total - before
  console.log(`\n${'-'.repeat(60)}`)
  console.log(`processed   ${done}   skipped ${skipped}   failed ${failed}`)
  console.log(`candidates  ${mb(before)} -> ${mb(after)}`)
  console.log(`BUCKET      ${mb(total)} -> ${mb(untouched + after)}`)
  if (!APPLY) console.log(`\nDry run — nothing changed. Re-run with --apply to write.`)
  else console.log(`\nOriginals backed up under ${BACKUP}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
