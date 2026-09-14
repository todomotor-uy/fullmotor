/**
 * ACAU sales import for the guía de compra.
 *
 *   npm run acau:import                 current year, URL resolved from acau.com.uy
 *   npm run acau:import -- --year 2025  another year
 *   npm run acau:import -- --url <xlsx> explicit file (skip resolution)
 *   npm run acau:import -- --file <path> local .xlsx
 *   npm run acau:import -- --no-match   skip the catalogue cross-check
 *
 * Reads the "Compilado <year>" workbook (sheets AUTOS / SUV / UTILITARIOS,
 * one row per model version with monthly units), aggregates model roots and
 * writes src/data/buying-guide/acau-<year>.json. Then cross-checks the roots
 * against the live catalogue and prints what did not match so aliases can be
 * added in src/lib/buying-guide/sales.ts.
 *
 * Column layout isn't assumed by position: each sheet's Marca/Modelo/
 * Total_Cantidad/month columns are located by header name (findColumns),
 * since ACAU has silently reordered them before (a "Nombre_Socio" column
 * inserted before Marca in Sep 2026 shifted everything else one over).
 *
 * No dependencies: the .xlsx (a zip of XML) is read with node:zlib.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'
import type { AcauData, GuideType, GuideVehicle } from '../src/lib/buying-guide/types'
import type { Vehicle } from '../src/types/vehicle'
import { aggregateAcau, attachSales, type AcauRow } from '../src/lib/buying-guide/sales'
import { toGuideVehicle } from '../src/lib/buying-guide/features'

const HOME = 'https://www.acau.com.uy/'
const UA = 'Mozilla/5.0 (compatible; TodoMotor-guide/1.0; +https://todomotor.uy)'
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.todomotor.uy'
const COUNTRY = process.env.NEXT_PUBLIC_COUNTRY || 'uy'

const args = process.argv.slice(2)
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const year = parseInt(opt('--year') || String(new Date().getFullYear()), 10)
const noMatch = args.includes('--no-match')

/* ---------------- minimal zip reader ---------------- */

function readZip(buf: Buffer): Map<string, Buffer> {
  // End of central directory
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('not a zip file (EOCD not found)')
  const cdOffset = buf.readUInt32LE(eocd + 16)
  const entries = buf.readUInt16LE(eocd + 10)
  const files = new Map<string, Buffer>()
  let p = cdOffset
  for (let n = 0; n < entries; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory')
    const method = buf.readUInt16LE(p + 10)
    const compSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const localOffset = buf.readUInt32LE(p + 42)
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8')
    // local header → data start
    const lNameLen = buf.readUInt16LE(localOffset + 26)
    const lExtraLen = buf.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + lNameLen + lExtraLen
    const data = buf.subarray(dataStart, dataStart + compSize)
    files.set(name, method === 8 ? inflateRawSync(data) : method === 0 ? Buffer.from(data) : Buffer.alloc(0))
    p += 46 + nameLen + extraLen + commentLen
  }
  return files
}

/* ---------------- minimal xlsx reader ---------------- */

function unescapeXml(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10))).replace(/&amp;/g, '&')
}

interface Sheet { name: string; rows: Map<string, string>[] }

function readXlsx(buf: Buffer): Sheet[] {
  const files = readZip(buf)
  const ssXml = files.get('xl/sharedStrings.xml')?.toString('utf8') || ''
  const strings = Array.from(ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)).map((m) => unescapeXml(m[1].replace(/<[^>]+>/g, '')))
  const wb = files.get('xl/workbook.xml')?.toString('utf8') || ''
  const sheetNames = Array.from(wb.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)).map((m) => ({ name: unescapeXml(m[1]), rid: m[2] }))
  const rels = files.get('xl/_rels/workbook.xml.rels')?.toString('utf8') || ''
  const relMap = new Map(Array.from(rels.matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)).map((m) => [m[1], m[2]]))
  const sheets: Sheet[] = []
  for (const s of sheetNames) {
    const target = relMap.get(s.rid) || ''
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`
    const xml = files.get(path)?.toString('utf8')
    if (!xml) continue
    const rows: Map<string, string>[] = []
    for (const rm of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = new Map<string, string>()
      for (const cm of rm[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const col = cm[1]
        const attrs = cm[2] || ''
        const inner = cm[3] || ''
        const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1]
        if (v == null) continue
        cells.set(col, /t="s"/.test(attrs) ? strings[parseInt(v, 10)] ?? '' : unescapeXml(v))
      }
      if (cells.size) rows.push(cells)
    }
    sheets.push({ name: s.name, rows })
  }
  return sheets
}

/* ---------------- ACAU specifics ---------------- */

const SHEET_TO_TYPE: Record<string, GuideType> = { AUTO: 'cars', AUTOS: 'cars', SUV: 'suvs', SUVS: 'suvs', UTILITARIO: 'pickups', UTILITARIOS: 'pickups' }

/** Month name (both "septiembre" and the older "setiembre" spelling) → 0-based index. */
const MONTH_INDEX: Record<string, number> = {
  ENERO: 0, FEBRERO: 1, MARZO: 2, ABRIL: 3, MAYO: 4, JUNIO: 5, JULIO: 6, AGOSTO: 7,
  SEPTIEMBRE: 8, SETIEMBRE: 8, OCTUBRE: 9, NOVIEMBRE: 10, DICIEMBRE: 11,
}

interface ColMap { brand: string; model: string; total: string; months: string[] }

/** Locates the header row of an ACAU sheet by column *names* (not fixed
 *  letters) so a reordered/inserted column doesn't silently misread data —
 *  this is exactly the kind of change that broke the previous hardcoded
 *  C/D/Y mapping when ACAU added a "Nombre_Socio" column in Sep 2026. */
function findColumns(rows: Map<string, string>[]): { cols: ColMap; dataStart: number } | undefined {
  for (let i = 0; i < rows.length; i++) {
    let brand: string | undefined, model: string | undefined, total: string | undefined
    const months = new Array(12).fill(undefined) as (string | undefined)[]
    for (const [col, val] of rows[i]) {
      const v = val.trim().toUpperCase()
      if (v === 'MARCA') brand = col
      else if (v === 'MODELO') model = col
      else if (v === 'TOTAL_CANTIDAD' || v === 'TOTAL') total = col
      else if (v in MONTH_INDEX) months[MONTH_INDEX[v]] = col
    }
    if (brand && model && total && months.every(Boolean)) return { cols: { brand, model, total, months: months as string[] }, dataStart: i + 1 }
  }
  return undefined
}

async function resolveUrl(): Promise<string> {
  const explicit = opt('--url')
  if (explicit) return explicit
  const html = await (await fetch(HOME, { headers: { 'User-Agent': UA } })).text()
  // <a href="../panel/estadisticas/….xlsx" …><span>Compilado 2026</span>…
  const re = new RegExp(`<a[^>]+href="([^"]*panel/estadisticas/[^"]+\\.xlsx?)"[^>]*>\\s*(?:<span[^>]*>)?\\s*Compilado\\s+${year}\\s*<`, 'i')
  const m = html.match(re)
  if (!m) throw new Error(`No encontré el link "Compilado ${year}" en ${HOME} — pasá --url`)
  return new URL(m[1].replace(/^\.\.\//, ''), HOME).toString()
}

async function fetchAll(): Promise<Vehicle[]> {
  const FUEL_ES: Record<string, string> = { gasoline: 'nafta', diesel: 'diesel', hybrid: 'híbrido', electric: 'eléctrico' }
  const out: Vehicle[] = []
  let page = 1
  for (;;) {
    const res = await fetch(`${API}/api/vehicles?limit=100&page=${page}`, { headers: { 'X-Country': COUNTRY, 'X-Vehicle-Type': 'all', 'User-Agent': UA } })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const json = (await res.json()) as { data: (Vehicle & { fuelType?: string })[]; meta: { lastPage: number } }
    for (const v of json.data) out.push({ ...v, fuelType: v.fuelType ? FUEL_ES[v.fuelType] || v.fuelType : undefined })
    if (page >= json.meta.lastPage) break
    page++
  }
  return out
}

async function main() {
  let buf: Buffer
  let url = opt('--file') ? `file:${opt('--file')}` : ''
  if (opt('--file')) buf = readFileSync(opt('--file')!)
  else {
    url = await resolveUrl()
    console.log(`descargando ${url}`)
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`HTTP ${res.status} al bajar ${url}`)
    buf = Buffer.from(await res.arrayBuffer())
  }
  const sheets = readXlsx(buf)
  console.log(`hojas: ${sheets.map((s) => `${s.name}(${s.rows.length})`).join(', ')}`)

  const rows: AcauRow[] = []
  const segments: Record<GuideType, number> = { cars: 0, suvs: 0, pickups: 0 }
  let monthsCovered = 0
  for (const sh of sheets) {
    const seg = SHEET_TO_TYPE[sh.name.trim().toUpperCase()]
    if (!seg) continue
    const found = findColumns(sh.rows)
    if (!found) { console.warn(`hoja ${sh.name}: no encontré las columnas Marca/Modelo/Total_Cantidad — se omite`); continue }
    const { cols, dataStart } = found
    for (const r of sh.rows.slice(dataStart)) {
      const brand = r.get(cols.brand)?.trim(), model = r.get(cols.model)?.trim(), total = r.get(cols.total)
      if (!brand || !model || total == null) continue
      const units = Math.round(parseFloat(total))
      if (!Number.isFinite(units)) continue
      rows.push({ seg, brand, model, units })
      segments[seg] += units
      cols.months.forEach((c, i) => { const v = parseFloat(r.get(c) || '0'); if (v > 0 && i + 1 > monthsCovered) monthsCovered = i + 1 })
    }
  }
  if (!rows.length) throw new Error('el archivo no tiene filas AUTOS/SUV/UTILITARIOS — ¿cambió el formato?')

  const models = aggregateAcau(rows)
  const data: AcauData = {
    source: `ACAU — Compilado ${year} (operaciones realizadas por empresas representantes de marca)`,
    url,
    year,
    monthsCovered,
    updatedAt: new Date().toISOString().slice(0, 10),
    segments,
    models,
  }
  const outPath = `src/data/buying-guide/acau-${year}.json`
  writeFileSync(outPath, JSON.stringify(data, null, 1) + '\n', 'utf-8')
  console.log(`\n${outPath}: ${rows.length} filas → ${models.length} modelos raíz · meses cubiertos: ${monthsCovered} · unidades: autos ${segments.cars} · SUV ${segments.suvs} · utilitarios ${segments.pickups}`)
  for (const seg of ['cars', 'suvs', 'pickups'] as GuideType[]) {
    console.log(`  top ${seg}: ` + models.filter((m) => m.seg === seg).slice(0, 8).map((m) => `${m.brand} ${m.model} (${m.units})`).join(' · '))
  }
  if (noMatch) return

  // ---- cross-check with the live catalogue
  console.log('\ncruzando con el catálogo…')
  const all = await fetchAll()
  const index = all.map(toGuideVehicle).filter((g): g is GuideVehicle => !!g)
  const stats = attachSales(index, data)
  const totalUnits = models.reduce((s, m) => s + m.units, 0)
  console.log(`familias con ventas: ${stats.matched}/${stats.families} · unidades ACAU cubiertas: ${stats.unitsMatched}/${totalUnits} (${Math.round(stats.unitsMatched / totalUnits * 100)}%)`)

  const unmatched = models.filter((m) => !stats.matchedRoots.has(`${m.brandKey}|${m.seg}|${m.modelKey}`)).sort((a, b) => b.units - a.units)
  console.log('\nmodelos ACAU sin familia en el catálogo (top 25 por unidades — agregá alias en sales.ts si el modelo existe con otro nombre):')
  for (const m of unmatched.slice(0, 25)) console.log(`  ${String(m.units).padStart(5)}  ${m.seg.padEnd(7)} ${m.brand} · "${m.model}" (key: ${m.brandKey}|${m.modelKey})`)
  const fams = new Map<string, GuideVehicle>()
  for (const v of index) if (!fams.has(v.family)) fams.set(v.family, v)
  const noSales = Array.from(fams.values()).filter((v) => v.sold == null).map((v) => `${v.brand} ${v.model}`).sort()
  console.log(`\nfamilias del catálogo sin dato ACAU (${noSales.length}): ${noSales.slice(0, 60).join(', ')}${noSales.length > 60 ? ' …' : ''}`)
}

main().catch((e) => { console.error(e); process.exit(2) })
