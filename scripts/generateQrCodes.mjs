import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = resolve(__dirname, '..', '.env.local')
const envRaw = readFileSync(envPath, 'utf-8')
const env = Object.fromEntries(
  envRaw
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const OUT_DIR = resolve(__dirname, '..', 'public', 'qr-codes')
mkdirSync(OUT_DIR, { recursive: true })

function generateQrId(name, id) {
  return name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) + '_' + id.slice(-4).toUpperCase()
}

async function downloadQr(url, filePath) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  writeFileSync(filePath, buffer)
}

async function main() {
  const { data: centres, error } = await supabase
    .from('recycling_centres')
    .select('*')
    .is('qr_code_id', null)

  if (error) {
    console.error('Failed to fetch centres:', error.message)
    process.exit(1)
  }

  if (!centres || centres.length === 0) {
    console.log('All centres already have QR codes.')
    process.exit(0)
  }

  console.log(`Found ${centres.length} centres without QR codes. Generating...`)

  for (const c of centres) {
    const qrId = generateQrId(c.name, c.id)
    const checkInUrl = `https://recycleconnect.vercel.app/check-in?centre=${c.id}`
    const imageUrl =
      `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(checkInUrl)}&bgcolor=ffffff&color=1a4d2e`

    const { error: updateError } = await supabase
      .from('recycling_centres')
      .update({ qr_code_id: qrId })
      .eq('id', c.id)

    if (updateError) {
      console.error(`  ✗ ${c.name}: failed to update DB — ${updateError.message}`)
      continue
    }

    try {
      await downloadQr(imageUrl, resolve(OUT_DIR, `${qrId}.png`))
      console.log(`  ✓ ${c.name} → ${qrId}.png`)
    } catch (e) {
      console.error(`  ⚠ ${c.name}: DB updated but QR download failed — ${e.message}`)
    }
  }

  console.log(`\nDone. QR images saved to public/qr-codes/`)
}

main()
