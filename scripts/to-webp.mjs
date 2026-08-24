import sharp from 'sharp'
import { readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const root = 'public/images/notebook'
let saved = 0

async function walk (dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) { await walk(p); continue }
    if (!f.endsWith('.png')) continue
    const out = p.replace(/\.png$/, '.webp')
    const info = await sharp(p, { animated: false }).webp({ quality: 82, effort: 6 }).toFile(out)
    const before = statSync(p).size
    unlinkSync(p)
    saved += before - info.size
    console.log(`${f} ${(before / 1024).toFixed(0)}KB -> ${(info.size / 1024).toFixed(0)}KB`)
  }
}

await walk(root)
console.log(`TOTAL SAVED: ${(saved / 1024 / 1024).toFixed(2)}MB`)
