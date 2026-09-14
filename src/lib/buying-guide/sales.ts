/**
 * ACAU sales signal for the guía de compra.
 *
 * ACAU (Asociación de Concesionarios) publishes a yearly "Compilado" with
 * units sold per model *version* ("NOVO HB20 SEDAN 1.0 COMFORT MT",
 * "TIGGO2 1.5 PRO MT"…). This module reduces those strings to a model root
 * ("hb 20 sedan", "tiggo 2"), aggregates units per root, and matches roots to
 * catalogue model families. Pure and dependency-free: the importer script,
 * the server index build and the check script all use the same rules, so a
 * match seen in `npm run acau:import` is the match the site uses.
 */

import type { AcauData, AcauModel, GuideType, GuideVehicle } from './types'

/* ---------------- Normalisation ---------------- */

const NOISE = new Set(['new', 'nuevo', 'nueva', 'novo', 'nova', 'the', 'all', 'my', 'fl'])

/** Tokens at which an ACAU version string stops being a model name. */
const CUT = new Set([
  // powertrain / gearbox / drive
  'mt', 'at', 'cvt', 'dct', 'dsg', 'tiptronic', 'aut', 'auto', 'automatica', 'automatico', 'manual', 'mt5', 'mt6', 'at6', 'at8', 'ecvt',
  'hev', 'phev', 'mhev', 'ev', 'bev', 'hybrid', 'hibrido', 'hibrida', 'plug', 'diesel', 'nafta', 'gnc', 'turbo', 'tsi', 'tdi', 'td', 'tci', 'gdi', 'dhat', 'dht', 'epower', 'dm', 'dmi',
  '4x2', '4x4', 'awd', '2wd', '4wd', 'rwd', 'fwd', 'eawd', 'xdrive', 'sdrive', '4matic', 'quattro',
  'doble', 'cabina', 'dc', 'cs', 'cd', 'simple', 'p', 'up', 'pup', 'pick', 'furgon', 'van', 'kwh', 'aa', 'pax',
  // trims / equipment levels
  'comfort', 'comfortline', 'highline', 'trendline', 'life', 'elegance', 'rline', 'gts', 'gti', 'gli', 'hl', 'cl', 'tl', 'exclusive', 'outfit', 'extreme',
  'premium', 'premier', 'luxury', 'deluxe', 'elite', 'limited', 'safe', 'ultimate', 'calligraphy', 'gl', 'gls', 'glx', 'gsi', 'gli', 'gs', 'xgs', 'gt', 'gk', 'gc', 'gf', 'gb',
  'ls', 'lt', 'ltz', 'rs', 'ss', 'z71', 'xei', 'seg', 'xls', 'xl', 'xlt', 'xlr', 's', 'se', 'sr', 'srv', 'srx', 'dx', 'sx', 'ex', 'exl', 'lx', 'touring',
  'ultra', 'volcano', 'freedom', 'endurance', 'drive', 'trekking', 'impetus', 'audace', 'like', 'tool', 'family', 'dignity', 'conqueror', 'activ', 'active',
  'high', 'middle', 'low', 'standard', 'std', 'econ', 'pack', 'sport', 'style', 'zen', 'intens', 'outsider', 'iconic', 'evolution', 'business', 'work', 'truck',
  'core', 'performance', 'long', 'range', 'sr', 'lr', 'flagship', 'privilege', 'skin', 'signature', 'titanium', 'wildtrak', 'raptor', 'lariat', 'laramie', 'bighorn', 'big', 'horn',
  'higher', 'comf', 'lux', 'idd', 'reev', 'techno', 'ge', 'trail', 'rubicon', 'sahara', 'overland', 'longitude', 'advance', 'sense', 'exclusive', 'platinum', 'prestige', 'inspiration', 'design', 'progressive', 'amg', 'line', 'm', 'msport',
])

/** Body words that may follow a model root and disambiguate siblings. */
const BODY: Record<string, string> = {
  sedan: 'sedan', hatch: 'hatchback', hb: 'hatchback', hatchback: 'hatchback', sw: 'wagon', wagon: 'wagon', rural: 'wagon', coupe: 'coupe', cabrio: 'convertible', convertible: 'convertible', suv: 'suv',
}

const BRAND_ALIASES: Record<string, string> = {
  gac: 'gacmotor',
  geelyriddara: 'riddara',
  omoda: 'omodajaecoo',
  jaecoo: 'omodajaecoo',
  dongfengforthing: 'dongfeng',
  haval: 'gwm',
  ora: 'gwm',
  tank: 'gwm',
  abarth: 'fiat',
  mercedesamg: 'mercedesbenz',
  vw: 'volkswagen',
}

function ascii(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function normalizeBrand(brand: string): string {
  const key = ascii(brand).replace(/[^a-z0-9]+/g, '')
  return BRAND_ALIASES[key] || key
}

const DISPLACEMENT = /^\d[.,]\d+[a-z]*$/

/** Splits a raw model string into normalised tokens, marking where the model
 *  name ends. Returns the root tokens (never empty when the input has letters). */
export function modelRoot(raw: string): string[] {
  const out: string[] = []
  // "D/C", "C/S", "P/UP" are cab-style abbreviations: glue them so they hit the CUT list.
  const words = ascii(raw).replace(/\b([a-z])\/([a-z]+)\b/g, '$1$2').replace(/[()/,;+]/g, ' ').split(/\s+/).filter(Boolean)
  for (const w0 of words) {
    const w = w0.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    if (!w) continue
    if (NOISE.has(w)) continue
    if (DISPLACEMENT.test(w)) break
    if (CUT.has(w) && out.length > 0) break
    // "tiggo2" → tiggo 2 · "hb20" → hb 20 · "h6gt" → h 6 gt (both sides get the same treatment)
    const parts = w.replace(/-/g, '').match(/[a-z]+|\d+/g) || []
    let stop = false
    for (const p of parts) {
      if (out.length > 0 && CUT.has(p)) { stop = true; break }
      out.push(p)
    }
    if (stop) break
  }
  return out
}

/** Model root of a catalogue family, from its `model` field. Powertrain
 *  suffixes are dropped so "Kona Hybrid" and "Kona" share a root. */
export function catalogueRoot(model: string): string[] {
  const toks = modelRoot(model)
  while (toks.length > 1 && ['hybrid', 'hev', 'phev', 'ev', 'mhev', 'e'].includes(toks[toks.length - 1])) toks.pop()
  return toks
}

/** Manual overrides: "<brandKey>|<catalogue stem>" → ACAU root(s) (segment-agnostic).
 *  Add entries from the "sin familia" report printed by `npm run acau:import`. */
export const SALES_ALIASES: Record<string, string | string[]> = {
  'dongfeng|nammi': ['nammi 330', 'nammi 430'],
  'foton|tunland v 7': ['tunland v 7'],
  'foton|tunland v 9': ['tunland v 9'],
  'jac|ytterby': ['es 3 ytterby'],
  'toyota|yaris hatch': ['yaris hb'],
  'geely|ex 5 urban': ['ex 5 max', 'ex 5 pro', 'ex 5 emi max'],
  'geely|ex 2 max': ['ex 2 max', 'ex 2 pro'],
  'gacmotor|aion es': ['aion es', 'aion ut', 'aion ut max'],
  'renault|kardian': ['kardian', 'kardian premiere edition'],
  'lynkco|01': ['lynk co 01'],
  'lynkco|02': ['lynk co 02 halo', 'lynk co 02 pro'],
  'lynkco|06': ['lynk co 06', 'lynk co 06 hyper pro', 'lynk co 06 hyper halo'],
  'lynkco|09': ['lynk co 09 halo'],
  'citroen|c 3 aircross': ['c 3 aircross t 200 shine', 'c 3 aircross vti feel', 'c 3 aircross vti shine'],
  'citroen|c 3 aircross 7': ['c 3 aircross t 200 shine 7'],
  'bmw|x 3': ['x 3', 'x 3 20'],
}

/** Trailing tokens that are trims rather than model identity ("EX5 Max" → "ex 5"). */
// 'pro' / 'plus' / 'max' stay: BYD Yuan Pro and Yuan Plus are different cars.
const STEM_TRIMS = new Set(['csh', 'hybrid', 'hev', 'phev', 'ev', 'mhev', 'e'])

/** Family stem: root minus trailing trim tokens (never shorter than one token). */
export function familyStem(root: string[]): string[] {
  const out = [...root]
  while (out.length > 1 && STEM_TRIMS.has(out[out.length - 1])) out.pop()
  return out
}

/** "ph 2", "b 18", "n 19": platform codes ACAU appends after the model name. */
const PLATFORM_PREFIXES = new Set(['ph', 'b', 'n', 'e'])
function stripPlatformCode(root: string[]): string[] {
  if (root.length >= 3 && PLATFORM_PREFIXES.has(root[root.length - 2]) && /^\d+$/.test(root[root.length - 1])) return root.slice(0, -2)
  return root
}

/* ---------------- Aggregation (importer) ---------------- */

export interface AcauRow {
  seg: GuideType
  brand: string
  model: string
  units: number
}

/** Aggregates raw ACAU version rows into model roots with per-segment ranks. */
export function aggregateAcau(rows: AcauRow[]): AcauModel[] {
  const groups = new Map<string, AcauModel & { display: string[] }>()
  for (const r of rows) {
    if (!r.units || r.units <= 0) continue
    const brandKey = normalizeBrand(r.brand)
    const root = stripPlatformCode(modelRoot(r.model))
    if (root.length === 0) continue
    const modelKey = root.join(' ')
    const key = `${r.seg}|${brandKey}|${modelKey}`
    const g = groups.get(key)
    if (g) { g.units += r.units; g.versions += 1; continue }
    const display = root.map((t) => (/^\d+$/.test(t) || t.length <= 2 ? t.toUpperCase() : t[0].toUpperCase() + t.slice(1)))
    groups.set(key, { seg: r.seg, brand: titleBrand(r.brand), brandKey, model: display.join(' '), modelKey, units: r.units, rank: 0, versions: 1, display })
  }
  const list = Array.from(groups.values())
  for (const seg of ['cars', 'suvs', 'pickups'] as GuideType[]) {
    list.filter((m) => m.seg === seg).sort((a, b) => b.units - a.units).forEach((m, i) => { m.rank = i + 1 })
  }
  return list.sort((a, b) => a.seg.localeCompare(b.seg) || a.rank - b.rank).map((m) => {
    const { display: _display, ...rest } = m
    void _display
    return rest
  })
}

function titleBrand(b: string): string {
  const keep = new Set(['BYD', 'GWM', 'GAC', 'JAC', 'JMC', 'MG', 'BMW', 'DFSK', 'BAIC', 'KGM', 'SEAT', 'MINI', 'RAM', 'XEV', 'ORA'])
  if (keep.has(b.toUpperCase())) return b.toUpperCase()
  return b.split(/([\s-]+)/).map((w) => (/^[\s-]+$/.test(w) ? w : w[0].toUpperCase() + w.slice(1).toLowerCase())).join('')
}

/* ---------------- Matching (index build + scripts) ---------------- */

export interface SalesMatch {
  units: number
  rank: number
  /** ACAU segment the rank refers to (may differ from the family's type). */
  seg: GuideType
  /** ACAU roots that fed the match (for reports). */
  roots: string[]
}

export interface FamilyLike { brand: string; model: string; type: GuideType; sub?: string }

const SUB_TO_BODY: Record<string, string> = {
  sedan: 'sedan', hatchback: 'hatchback', wagon: 'wagon', coupe: 'coupe', convertible: 'convertible',
}

/** Sub-brands / brand words ACAU folds into the model string ("HAVAL H6", "MG 3", "ORA 03"). */
const BRAND_WORDS = new Set(['haval', 'ora', 'tank', 'abarth', 'forthing'])

function rawBrandKey(brand: string): string {
  return ascii(brand).replace(/[^a-z0-9]+/g, '')
}

/** Drops a leading brand word when it repeats the family's own brand ("mg 3" → "3" for MG). */
function stripBrandWord(tokens: string[], rawBrand: string): string[] {
  if (tokens.length > 1 && (tokens[0] === rawBrand || BRAND_WORDS.has(tokens[0]))) return tokens.slice(1)
  return tokens
}

/**
 * Finds the ACAU model root(s) for a catalogue family.
 *
 * Both sides are reduced to a *stem* (root minus trailing trims), with the
 * brand word removed when ACAU repeats it. A candidate matches when:
 *   1. an alias names it, or
 *   2. its stem equals the family stem, or
 *   3. its stem is the family stem + one token that is a body word compatible
 *      with the family's body type, or any non-numeric token no sibling family
 *      owns ("onix" must not take "onix plus" when Onix Plus is a family), or
 *   4. the family stem is the ACAU stem + one token (ACAU truncated the name
 *      at a trim) and no sibling family owns the shorter stem.
 * Same-segment candidates are tried first; if none match, other segments are
 * considered (ACAU files crossovers under AUTOS or SUV differently than we do).
 */
export function matchSales(family: FamilyLike, data: AcauData, siblingStems?: Set<string>): SalesMatch | undefined {
  const brandKey = normalizeBrand(family.brand)
  const rawBrand = rawBrandKey(family.brand)
  const famRoot = stripBrandWord(catalogueRoot(family.model), rawBrand)
  if (famRoot.length === 0) return undefined
  const famStem = familyStem(famRoot)
  const famKey = famStem.join(' ')
  const aliasRaw = SALES_ALIASES[`${brandKey}|${famKey}`] ?? SALES_ALIASES[`${brandKey}|${famRoot.join(' ')}`]
  const alias = aliasRaw == null ? undefined : Array.isArray(aliasRaw) ? aliasRaw : [aliasRaw]
  const bodyOfFamily = family.sub ? SUB_TO_BODY[family.sub] : undefined
  const owns = (stem: string[]) => siblingStems?.has(`${brandKey}|${stem.join(' ')}`) ?? false

  const test = (m: AcauModel): boolean => {
    if (m.brandKey !== brandKey) return false
    const mk = familyStem(stripBrandWord(m.modelKey.split(' '), rawBrand))
    if (alias) return alias.includes(mk.join(' ')) || alias.includes(m.modelKey)
    if (mk.length === famStem.length && mk.every((t, i) => t === famStem[i])) return true
    if (mk.length === famStem.length + 1 && famStem.every((t, i) => t === mk[i])) {
      const extra = mk[famStem.length]
      const body = BODY[extra]
      if (body) return !bodyOfFamily || body === bodyOfFamily || body === 'suv'
      return !/^\d+$/.test(extra) && !owns(mk)
    }
    if (famStem.length === mk.length + 1 && mk.every((t, i) => t === famStem[i])) return !owns(mk)
    return false
  }

  let hits = data.models.filter((m) => m.seg === family.type && test(m))
  if (hits.length === 0) hits = data.models.filter((m) => m.seg !== family.type && test(m))
  if (hits.length === 0) return undefined
  const best = hits.reduce((a, b) => (b.rank < a.rank ? b : a))
  return {
    units: hits.reduce((s, h) => s + h.units, 0),
    rank: best.rank,
    seg: best.seg,
    roots: hits.map((h) => `${h.seg}|${h.modelKey}`),
  }
}

/** Set of "brandKey|stem" owned by catalogue families — used to avoid a short
 *  stem swallowing a sibling's longer one ("onix" vs "onix plus"). */
export function familyStemSet(families: FamilyLike[]): Set<string> {
  const s = new Set<string>()
  for (const f of families) {
    const r = familyStem(stripBrandWord(catalogueRoot(f.model), rawBrandKey(f.brand)))
    if (r.length) s.add(`${normalizeBrand(f.brand)}|${r.join(' ')}`)
  }
  return s
}

export interface SalesStats { families: number; matched: number; unitsMatched: number; matchedRoots: Set<string> }

/** Mutates the index: sets `sold` / `soldRank` / `soldSeg` per model family. Returns match stats. */
export function attachSales(index: GuideVehicle[], data: AcauData | null | undefined): SalesStats {
  const stats: SalesStats = { families: 0, matched: 0, unitsMatched: 0, matchedRoots: new Set() }
  if (!data || !data.models.length) return stats
  const byFamily = new Map<string, GuideVehicle[]>()
  for (const v of index) {
    const arr = byFamily.get(v.family)
    if (arr) arr.push(v)
    else byFamily.set(v.family, [v])
  }
  stats.families = byFamily.size
  const reps: FamilyLike[] = Array.from(byFamily.values()).map((vs) => ({ brand: vs[0].brand, model: vs[0].model, type: vs[0].type, sub: vs[0].sub }))
  const stems = familyStemSet(reps)
  const unitsByRoot = new Map(data.models.map((m) => [`${m.brandKey}|${m.seg}|${m.modelKey}`, m.units]))
  for (const vs of byFamily.values()) {
    const rep = vs[0]
    const m = matchSales({ brand: rep.brand, model: rep.model, type: rep.type, sub: rep.sub }, data, stems)
    if (!m) continue
    stats.matched++
    for (const r of m.roots) {
      const k = `${normalizeBrand(rep.brand)}|${r}`
      if (!stats.matchedRoots.has(k)) { stats.matchedRoots.add(k); stats.unitsMatched += unitsByRoot.get(k) || 0 }
    }
    // soldSeg only when ACAU files the model under another segment (keeps the payload small).
    for (const v of vs) { v.sold = m.units; v.soldRank = m.rank; if (m.seg !== v.type) v.soldSeg = m.seg }
  }
  return stats
}

/** Human label of the ACAU segment for reasons/chips. */
export function segmentLabel(type: GuideType): string {
  return type === 'cars' ? 'autos' : type === 'suvs' ? 'SUV' : 'utilitarios'
}

export const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre']
