#!/usr/bin/env node
/**
 * Delete `boat-images` objects that no `boat_images` row points at.
 *
 * As of 2026-08-21: 854 objects / 293 MB of dead weight, left behind by re-imports
 * (see the "re-import orphan-duplicate trap" in docs/website-import-playbook.md).
 *
 * MATCHING — get this right or you delete live photos. A reference is turned into an
 * object path by stripping the query string FIRST, then the URL prefix. 62 rows carry a
 * `?` suffix; an exact match without stripping it reports 904 orphans instead of 854 and
 * the extra 50 are live boat photos. `boat_images.storage_url` is the only column in the
 * database that references this bucket (locations.image_url / profiles.avatar_url were
 * checked and reference it zero times).
 *
 * IRREVERSIBLE: while the project is quota-restricted the objects cannot be downloaded,
 * so there is no way to back them up first. --apply is a one-way door.
 *
 * NOTE: this cannot run while the project is restricted. DELETE returns 402 exactly like
 * read and write do (verified against a single 5 KB orphan), so the quota has to be
 * lifted before any cleanup is possible.
 *
 * Usage:
 *   export SUPABASE_URL=https://<ref>.supabase.co
 *   export SUPABASE_SERVICE_ROLE_KEY=<service role key>     # never hardcode it
 *   node scripts/purge-orphan-images.mjs                    # dry run, deletes nothing
 *   node scripts/purge-orphan-images.mjs --apply
 */
const URL_BASE = process.env.SUPABASE_URL?.replace(/\/$/, '')
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_BASE || !KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.')
  process.exit(1)
}
const APPLY = process.argv.includes('--apply')
const BUCKET = 'boat-images'
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const mb = (b) => (b / 1048576).toFixed(1) + ' MB'

/** Same normalisation the audit query uses: query string off first, then the prefix. */
const toPath = (url) => String(url).trim().split('?')[0].replace(/^.*\/boat-images\//, '')

async function referencedPaths() {
  const set = new Set()
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${URL_BASE}/rest/v1/boat_images?select=storage_url`, {
      headers: { ...h, Range: `${from}-${from + 999}`, Prefer: 'count=exact' },
    })
    if (!res.ok) throw new Error(`boat_images -> HTTP ${res.status} ${await res.text()}`)
    const rows = await res.json()
    for (const r of rows) if (String(r.storage_url).includes('/boat-images/')) set.add(toPath(r.storage_url))
    if (rows.length < 1000) break
  }
  return set
}

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
      if (!e.id && !e.metadata) out.push(...await listAll(full))
      else out.push({ name: full, size: e.metadata?.size ?? 0 })
    }
    if (page.length < 100) break
  }
  return out
}

async function main() {
  const [refs, objs] = await Promise.all([referencedPaths(), listAll()])
  const orphans = objs.filter((o) => !refs.has(o.name))
  const bytes = orphans.reduce((s, o) => s + o.size, 0)
  const total = objs.reduce((s, o) => s + o.size, 0)

  console.log(`referenced paths : ${refs.size}`)
  console.log(`bucket objects   : ${objs.length}  (${mb(total)})`)
  console.log(`unreferenced     : ${orphans.length}  (${mb(bytes)})`)
  console.log(`bucket after     : ${mb(total - bytes)}\n`)

  // A wildly high orphan share means the matching broke, not that the bucket is junk.
  if (objs.length && orphans.length / objs.length > 0.5) {
    console.error('ABORT: >50% of objects look unreferenced — that is a matching bug, not dead weight.')
    process.exit(1)
  }
  for (const o of orphans.slice(0, 20)) console.log(`  ${o.name}  ${mb(o.size)}`)
  if (orphans.length > 20) console.log(`  … and ${orphans.length - 20} more`)

  if (!APPLY) {
    console.log(`\nDry run — nothing deleted. Re-run with --apply to delete ${orphans.length} objects.`)
    return
  }
  console.log(`\nDeleting ${orphans.length} objects — this cannot be undone.`)
  let removed = 0, failed = 0
  for (let i = 0; i < orphans.length; i += 100) {
    const batch = orphans.slice(i, i + 100)
    const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: batch.map((o) => o.name) }),
    })
    if (!res.ok) { failed += batch.length; console.log(`  batch ${i} FAILED: HTTP ${res.status} ${await res.text()}`) }
    else { removed += batch.length; console.log(`  removed ${removed}/${orphans.length}`) }
  }
  console.log(`\ndeleted ${removed}, failed ${failed}, freed ~${mb(bytes)}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
