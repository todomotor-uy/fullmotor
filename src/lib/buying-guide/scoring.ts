/**
 * Guía de compra — filters, ranking, relaxation and reasons.
 *
 * Deterministic and pure: the same index + answers always give the same
 * result, on the server (SSR of a shared URL) and on the client (live counts).
 *
 * Pipeline (see `runGuide`):
 *   1. hard filters → candidate set C
 *   2. curated podium from the Top TodoMotor tree, restricted to C
 *   3. rule-based ranking of C fills the podium and builds "otros que encajan"
 *   4. if C has < 3 families, relax answers step by step and explain it
 */

import type {
  Answers, Criterion, GuideResult, GuideUse, GuideVehicle, PodiumEntry, RankedFamily, ResolvedPick, Scored,
} from './types'
import { SPORTY_MIN_HP, SUB_LABELS, USE_AFFINITY, bandIndex } from './questions'
import { curatedCandidates, subOf } from './curated'
import { adasLabel, equipLabel } from './features'
import { segmentLabel } from './sales'

export const PODIUM_SIZE = 3
export const MAX_OTHERS = 24

/* ======================= Hard filters ======================= */

/** Body types excluded per "personas" answer (on top of the use filter). */
const PERS_EXCLUDE: Record<number, string[]> = {
  2: [],
  4: ['single-cab', 'extended-cab'],
  5: ['single-cab', 'extended-cab', 'coupe', 'convertible'],
  7: [],
}
const PERS7_ALLOWED = ['midsize-suv', 'fullsize-suv']
const PERS7_MIN_LENGTH = 4600

export function matches(v: GuideVehicle, a: Answers): boolean {
  const sub = subOf(v)
  if (a.uso) {
    if (!(USE_AFFINITY[a.uso][sub] > 0)) return false
    if (a.uso === 'deportivo' && (v.hp == null || v.hp < SPORTY_MIN_HP)) return false
  }
  if (a.max != null) {
    if (v.price == null || v.price > a.max) return false
  }
  if (a.pers) {
    if (a.pers === 7) {
      if (!PERS7_ALLOWED.includes(sub)) return false
      if (v.len == null || v.len < PERS7_MIN_LENGTH) return false
    } else if (PERS_EXCLUDE[a.pers].includes(sub)) return false
  }
  if (a.motor && v.fuel !== a.motor) return false
  if (a.caja && v.manual !== (a.caja === 'manual')) return false
  return true
}

export function applyHardFilters(index: GuideVehicle[], a: Answers): GuideVehicle[] {
  return index.filter((v) => matches(v, a))
}

export function countMatches(index: GuideVehicle[], a: Answers): { vehicles: number; families: number } {
  const fams = new Set<string>()
  let n = 0
  for (const v of index) if (matches(v, a)) { n++; fams.add(v.family) }
  return { vehicles: n, families: fams.size }
}

/* ======================= Normalisation ======================= */

interface Range { lo: number; hi: number }

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))
  return sorted[i]
}

/** Robust min-max (p5..p95) so one outlier doesn't flatten everybody else. */
function rangeOf(values: Array<number | undefined>): Range {
  const s = values.filter((x): x is number => x != null && Number.isFinite(x)).sort((a, b) => a - b)
  if (s.length === 0) return { lo: 0, hi: 1 }
  const lo = percentile(s, 0.05)
  const hi = percentile(s, 0.95)
  return hi > lo ? { lo, hi } : { lo: s[0], hi: s[s.length - 1] > s[0] ? s[s.length - 1] : s[0] + 1 }
}

const MISSING = 0.4

function norm(x: number | undefined, r: Range): number {
  if (x == null || !Number.isFinite(x)) return MISSING
  return Math.min(1, Math.max(0, (x - r.lo) / (r.hi - r.lo)))
}

interface Ranges {
  price: Range; hp: Range; tq: Range; hpkg: Range; len: Range; wb: Range; trunk: Range
  eq: Range; airbags: Range; adas: Range; auto: Range; cc: Range; listed: Range; sold: Range
  maxYear: number
  /** p25 / p75 raw thresholds used by the reasons generator */
  q: { trunk75: number; len25: number; hp75: number; tq75: number; eq75: number; cc25: number; price25: number }
}

function computeRanges(C: GuideVehicle[]): Ranges {
  const sortedNum = (f: (v: GuideVehicle) => number | undefined) =>
    C.map(f).filter((x): x is number => x != null).sort((a, b) => a - b)
  const trunkS = sortedNum((v) => v.trunk), lenS = sortedNum((v) => v.len), hpS = sortedNum((v) => v.hp)
  const tqS = sortedNum((v) => v.tq), eqS = sortedNum((v) => v.eq), ccS = sortedNum((v) => v.cc), priceS = sortedNum((v) => v.price)
  return {
    price: rangeOf(C.map((v) => v.price)),
    hp: rangeOf(C.map((v) => v.hp)),
    tq: rangeOf(C.map((v) => v.tq)),
    hpkg: rangeOf(C.map((v) => (v.hp && v.kg ? v.hp / v.kg : undefined))),
    len: rangeOf(C.map((v) => v.len)),
    wb: rangeOf(C.map((v) => v.wb)),
    trunk: rangeOf(C.map((v) => v.trunk)),
    eq: rangeOf(C.map((v) => v.eq)),
    airbags: rangeOf(C.map((v) => v.airbags || undefined)),
    adas: rangeOf(C.map((v) => v.adas)),
    auto: rangeOf(C.map((v) => v.auto)),
    cc: rangeOf(C.map((v) => v.cc)),
    listed: rangeOf(C.map((v) => (v.listed < 9999 ? v.listed : undefined))),
    // log scale: 3.000 vs 300 units matters, 3.000 vs 2.700 barely does
    sold: rangeOf(C.map((v) => (v.sold != null ? Math.log1p(v.sold) : undefined))),
    maxYear: Math.max(0, ...C.map((v) => v.year || 0)),
    q: {
      trunk75: percentile(trunkS, 0.75), len25: percentile(lenS, 0.25), hp75: percentile(hpS, 0.75),
      tq75: percentile(tqS, 0.75), eq75: percentile(eqS, 0.75), cc25: percentile(ccS, 0.25), price25: percentile(priceS, 0.25),
    },
  }
}

/* ======================= Weights ======================= */

const BASE_WEIGHTS: Record<Criterion, number> = {
  fit: 20, price: 12, budget: 8, space: 10, power: 10, equip: 10, safety: 12, eff: 10, recency: 4, market: 10,
}

const USE_NUDGES: Record<GuideUse, Partial<Record<Criterion, number>>> = {
  familia: { space: 8, safety: 8, market: 3 },
  ciudad: { eff: 6, price: 6, market: 3 },
  trabajo: { power: 8, space: 6, market: 2 },
  ruta: { eff: 6, safety: 4, space: 4 },
  deportivo: { power: 12, equip: 2, price: -4 },
}

const PRIO_CRITERION: Record<NonNullable<Answers['prio']>, Criterion> = {
  precio: 'price', espacio: 'space', potencia: 'power', equipamiento: 'equip', seguridad: 'safety', eficiencia: 'eff',
}
const PRIO_BONUS = 25

export function weightsFor(a: Answers): Record<Criterion, number> {
  const w: Record<Criterion, number> = { ...BASE_WEIGHTS }
  if (a.uso) for (const [k, d] of Object.entries(USE_NUDGES[a.uso])) w[k as Criterion] += d || 0
  if (a.prio) w[PRIO_CRITERION[a.prio]] += PRIO_BONUS
  if (a.max == null) { w.fit += w.budget; w.budget = 0 }
  const total = Object.values(w).reduce((s, x) => s + Math.max(0, x), 0)
  for (const k of Object.keys(w) as Criterion[]) w[k] = Math.max(0, w[k]) / total * 100
  return w
}

/* ======================= Scoring ======================= */

const FUEL_EFF: Record<string, number> = { electrico: 0.9, hibrido: 0.7, diesel: 0.45, nafta: 0.3 }
const RUTA_EV_MIN_KM = 350

function criteria(v: GuideVehicle, a: Answers, R: Ranges): Record<Criterion, number> {
  const sub = subOf(v)
  const compact = 1 - norm(v.len, R.len)
  let fit = a.uso ? (USE_AFFINITY[a.uso][sub] ?? 0) : 0.6
  if (a.uso === 'ciudad') fit = 0.7 * fit + 0.3 * compact
  if (!a.uso && a.pers === 2) fit = 0.6 + 0.2 * compact

  const price = 1 - norm(v.price, R.price)
  const budget = a.max != null && v.price != null ? 1 - 0.5 * Math.min(1, Math.max(0, (a.max - v.price) / a.max)) : MISSING

  const isPickup = v.type === 'pickups'
  let space: number
  if (v.trunk != null && !isPickup) space = 0.6 * norm(v.trunk, R.trunk) + 0.4 * norm(v.len, R.len)
  else space = 0.6 * norm(v.len, R.len) + 0.4 * norm(v.wb, R.wb)
  if (a.pers === 5 || a.pers === 7) space = 0.7 * space + 0.3 * Math.min(1, Math.max(0, ((v.len ?? 4300) - 4300) / 400))

  let power: number
  if (a.uso === 'trabajo') power = 0.4 * norm(v.hp, R.hp) + 0.6 * norm(v.tq, R.tq)
  else if (a.uso === 'deportivo') power = 0.5 * norm(v.hp, R.hp) + 0.5 * norm(v.hp && v.kg ? v.hp / v.kg : undefined, R.hpkg)
  else power = 0.7 * norm(v.hp, R.hp) + 0.3 * norm(v.tq, R.tq)

  const equip = norm(v.eq, R.eq)
  const safety = 0.5 * norm(v.airbags || undefined, R.airbags) + 0.4 * norm(v.adas, R.adas) + 0.1 * (v.isofix ? 1 : 0)

  let eff = v.fuel ? FUEL_EFF[v.fuel] : MISSING
  if (v.fuel === 'electrico') eff = 0.9 + 0.1 * norm(v.auto, R.auto)
  else if (v.fuel === 'nafta' || v.fuel === 'diesel') eff += 0.2 * (1 - norm(v.cc, R.cc))
  if (a.uso === 'ruta' && v.fuel === 'electrico' && (v.auto == null || v.auto < RUTA_EV_MIN_KM)) eff = Math.min(eff, 0.5)
  eff = Math.min(1, eff)

  const recency = 0.6 * (1 - norm(v.listed < 9999 ? v.listed : undefined, R.listed)) + 0.4 * (v.year === R.maxYear ? 1 : 0)

  // ACAU sales: how established the model is in the Uruguayan market. No data (brands
  // outside ACAU, e.g. Tesla) is neutral, never a penalty.
  const market = v.sold != null ? norm(Math.log1p(v.sold), R.sold) : MISSING

  return { fit, price, budget, space, power, equip, safety, eff, recency, market }
}

export function scoreAll(C: GuideVehicle[], a: Answers): Scored[] {
  if (C.length === 0) return []
  const R = computeRanges(C)
  const W = weightsFor(a)
  const out: Scored[] = C.map((v) => {
    const c = criteria(v, a, R)
    let s = 0
    for (const k of Object.keys(W) as Criterion[]) s += W[k] * c[k]
    return { v, score: Math.round(s), c }
  })
  out.sort((x, y) => (y.score - x.score) || (y.c.market - x.c.market) || (y.c.recency - x.c.recency) || ((x.v.price ?? Infinity) - (y.v.price ?? Infinity)))
  return out
}

/** One entry per model family, ordered by the best version's score. */
export function rankFamilies(scored: Scored[]): RankedFamily[] {
  const byFam = new Map<string, RankedFamily>()
  for (const s of scored) {
    const f = byFam.get(s.v.family)
    if (!f) byFam.set(s.v.family, { best: s, versions: [] })
    else f.versions.push(s.v)
  }
  return Array.from(byFam.values())
}

/* ======================= Reasons ======================= */

/** One line about market acceptance, from ACAU units/rank. Undefined when the
 *  model has no ACAU data or sells too little to be worth mentioning. */
export function salesReason(v: GuideVehicle, year?: number): string | undefined {
  if (v.sold == null) return undefined
  const seg = segmentLabel(v.soldSeg ?? v.type)
  const y = year ? ` ${year}` : ''
  if (v.soldRank != null && v.soldRank <= 3) return `N.º ${v.soldRank} en ventas de ${seg}${y} en Uruguay (ACAU)`
  if (v.soldRank != null && v.soldRank <= 10) return `Entre los 10 ${seg} más vendidos${y} en Uruguay (ACAU)`
  if (v.sold >= 200) return `${v.sold.toLocaleString('es-UY')} unidades vendidas${y} en Uruguay (ACAU)`
  return undefined
}

interface ReasonCtx { a: Answers; R: Ranges; W: Record<Criterion, number>; /** the user's own budget, before relaxation */ origMax?: number; /** ACAU reference year for sales reasons */ salesYear?: number }

function fmt(n: number): string { return n.toLocaleString('es-UY') }
function metres(mm: number): string { return (mm / 1000).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

/** 2–4 human reasons, ordered by how much each criterion weighs for this user. */
export function reasons(s: Scored, ctx: ReasonCtx): string[] {
  const { a, R, W } = ctx
  const v = s.v
  const cands: { w: number; text: string }[] = []
  const add = (crit: Criterion, text: string, bonus = 0) => cands.push({ w: W[crit] * (s.c[crit] + bonus), text })
  const userMax = ctx.origMax ?? a.max
  const withinBudget = userMax == null || (v.price != null && v.price <= userMax)

  // price / budget
  if (withinBudget && userMax != null && v.price != null && v.price <= 0.85 * userMax) add('price', `Te deja margen: USD ${fmt(userMax - v.price)} bajo tu presupuesto`, 0.3)
  else if (s.c.price >= 0.75 && v.price != null && v.price <= R.q.price25) add('price', 'Entre los más accesibles de tu selección')
  else if (withinBudget && s.c.budget >= 0.9 && userMax != null) add('budget', 'Aprovecha bien tu presupuesto')

  // space
  if (v.trunk != null && v.trunk >= R.q.trunk75 && v.type !== 'pickups') add('space', `Baúl amplio: ${fmt(v.trunk)} L`)
  else if (v.len != null && v.len >= 4700 && v.type !== 'pickups') add('space', `Buen espacio: ${metres(v.len)} m de largo`)
  if (a.uso === 'ciudad' && v.len != null && v.len <= R.q.len25) add('fit', `Compacto: ${metres(v.len)} m, fácil de estacionar`, 0.2)

  // power
  if (a.uso === 'trabajo' && v.tq != null && v.tq >= R.q.tq75) add('power', `Torque de ${fmt(v.tq)} Nm para carga`)
  else if (v.hp != null && v.hp >= R.q.hp75) add('power', `Buena potencia: ${fmt(v.hp)} HP`)

  // safety
  if (v.airbags >= 6) add('safety', `${v.airbags} airbags`)
  if (v.adas >= 3) {
    const labels = v.adasTags.slice(0, 3).map(adasLabel)
    add('safety', `Asistencias de conducción: ${labels.join(', ')}`, 0.1)
  }
  if (a.uso === 'familia' && v.isofix) add('safety', 'Anclajes ISOFIX', -0.2)

  // equipment
  if (v.eq >= R.q.eq75 && v.eqTags.length) add('equip', `Bien equipado: ${v.eqTags.slice(0, 3).map(equipLabel).join(', ')}`)

  // efficiency
  if (v.fuel === 'electrico') add('eff', v.auto ? `100% eléctrico · ${fmt(v.auto)} km de autonomía` : '100% eléctrico')
  else if (v.fuel === 'hibrido') add('eff', 'Híbrido: menor consumo en ciudad')
  else if (v.fuel === 'diesel' && (a.uso === 'trabajo' || a.uso === 'ruta')) add('eff', 'Diésel: rinde en ruta y carga')
  else if (v.fuel === 'nafta' && v.cc != null && v.cc <= R.q.cc25 && v.cc > 0) add('eff', `Motor ${(v.cc / 1000).toLocaleString('es-UY', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de bajo consumo`)

  // market (ACAU)
  const sales = salesReason(v, ctx.salesYear)
  if (sales) add('market', sales, v.soldRank != null && v.soldRank <= 10 ? 0.4 : 0)

  // fit
  if (a.uso && s.c.fit >= 0.85) {
    const label = SUB_LABELS[subOf(v)]
    const tail: Record<GuideUse, string> = {
      familia: 'ideal para la familia', ciudad: 'ágil para la ciudad', trabajo: 'para trabajar',
      ruta: 'cómodo en ruta', deportivo: 'de vocación deportiva',
    }
    if (label) add('fit', `${label}, ${tail[a.uso]}`, -0.3)
  }

  // explicit matches, low priority
  if (a.caja === 'auto' && !v.manual) cands.push({ w: 3, text: 'Caja automática' })
  if (a.caja === 'manual' && v.manual) cands.push({ w: 3, text: 'Caja manual' })
  if (v.year === R.maxYear && R.maxYear > 0) cands.push({ w: 2, text: `Modelo ${v.year}` })

  cands.sort((x, y) => y.w - x.w)
  const out: string[] = []
  for (const c of cands) if (!out.includes(c.text)) out.push(c.text)
  const fallbacks = [
    userMax != null && withinBudget ? 'Dentro de tu presupuesto' : null,
    a.uso ? 'Coincide con el uso que buscás' : 'Buen equilibrio general',
  ].filter((x): x is string => !!x)
  for (const f of fallbacks) if (out.length < 2 && !out.includes(f)) out.push(f)
  return out.slice(0, 4)
}

/* ======================= Relaxation ======================= */

interface RelaxStep { apply(a: Answers): Answers | null; note(a: Answers, next: Answers): string; tag: string }

const PERS_DOWN: Record<number, Answers['pers']> = { 7: 5, 5: 4, 4: 2, 2: undefined }

const RELAX_LADDER: RelaxStep[] = [
  {
    apply: (a) => (a.max != null ? { ...a, max: Math.round(a.max * 1.15 / 500) * 500 } : null),
    note: (_a, n) => `ampliamos el presupuesto un 15% (hasta USD ${fmt(n.max!)})`, tag: '+15% presupuesto',
  },
  {
    apply: (a) => (a.max != null ? { ...a, max: Math.round(a.max * 1.3 / 500) * 500 } : null),
    note: (_a, n) => `ampliamos el presupuesto un 30% (hasta USD ${fmt(n.max!)})`, tag: '+30% presupuesto',
  },
  { apply: (a) => (a.caja ? { ...a, caja: undefined } : null), note: () => 'no filtramos por caja', tag: 'sin filtro de caja' },
  { apply: (a) => (a.motor ? { ...a, motor: undefined } : null), note: () => 'no filtramos por motorización', tag: 'otra motorización' },
  {
    apply: (a) => (a.pers ? { ...a, pers: PERS_DOWN[a.pers] } : null),
    note: (_a, n) => (n.pers ? `bajamos la cantidad de personas a "${n.pers === 2 ? '1 o 2' : n.pers}"` : 'no filtramos por cantidad de personas'),
    tag: 'menos plazas',
  },
  { apply: (a) => (a.uso ? { ...a, uso: undefined } : null), note: () => 'ampliamos a otros tipos de vehículo', tag: 'otro tipo de vehículo' },
]

/**
 * Widens the answers one rung at a time until at least PODIUM_SIZE families
 * match. Returns the effective answers, the notes to show and, for each rung
 * applied, the base answers *before* it (to tag which picks came from where).
 * Deterministic and cumulative: rung 2 keeps rung 1's change.
 */
export function relax(index: GuideVehicle[], a: Answers): { effective: Answers; notes: string[]; rungs: { answers: Answers; tag: string }[] } {
  let cur = a
  const notes: string[] = []
  const rungs: { answers: Answers; tag: string }[] = []
  if (countMatches(index, cur).families >= PODIUM_SIZE) return { effective: cur, notes, rungs }
  for (const step of RELAX_LADDER) {
    // The 30% budget rung replaces the 15% one rather than compounding it.
    const base = step.tag === '+30% presupuesto' ? a : cur
    const next = step.apply(base)
    if (!next) continue
    const merged: Answers = { ...cur, ...next }
    if (step.tag === '+30% presupuesto' && merged.max === cur.max) continue
    notes.push(step.note(cur, merged))
    rungs.push({ answers: cur, tag: step.tag })
    cur = merged
    if (countMatches(index, cur).families >= PODIUM_SIZE) break
  }
  return { effective: cur, notes, rungs }
}

/* ======================= Orchestration ======================= */

export interface RunOptions { podiumSize?: number; maxOthers?: number; /** ACAU reference year, for the wording of sales reasons */ salesYear?: number }

export function runGuide(index: GuideVehicle[], curated: ResolvedPick[], a: Answers, opts: RunOptions = {}): GuideResult {
  const podiumSize = opts.podiumSize ?? PODIUM_SIZE
  const maxOthers = opts.maxOthers ?? MAX_OTHERS

  const strict = countMatches(index, a)
  const { effective, notes, rungs } = relax(index, a)
  const C = applyHardFilters(index, effective)
  const scored = scoreAll(C, effective)
  const R = computeRanges(C.length ? C : index)
  const W = weightsFor(effective)
  const ctx: ReasonCtx = { a: effective, R, W, origMax: a.max, salesYear: opts.salesYear }
  // Strict matches always outrank vehicles that only entered through relaxation.
  const families = rungs.length
    ? rankFamilies(scored).sort((x, y) => Number(matches(y.best.v, a)) - Number(matches(x.best.v, a)))
    : rankFamilies(scored)
  const famMap = new Map(families.map((f) => [f.best.v.family, f]))
  const scoredBySlug = new Map(scored.map((s) => [s.v.slug, s]))

  /** Which relaxation rung let a vehicle in (undefined = matched strictly).
   *  A vehicle "needed" rung k if it fails the answers before rung k but passes
   *  the answers right after it. */
  const relaxedTagFor = (v: GuideVehicle): string | undefined => {
    if (matches(v, a)) return undefined
    for (let i = 0; i < rungs.length; i++) {
      const after = i + 1 < rungs.length ? rungs[i + 1].answers : effective
      if (matches(v, after)) return rungs[i].tag
    }
    return rungs.length ? rungs[rungs.length - 1].tag : undefined
  }

  const podium: PodiumEntry[] = []
  const used = new Set<string>()

  if (effective.uso) {
    let cands = curatedCandidates(curated, effective.uso, effective.max).filter((p) => scoredBySlug.has(p.slug))
    if (effective.prio) {
      // An explicit priority beats editorial order inside a band ("Potencia" must not open
      // with a 122 hp hybrid). Bands stay first so "Precio" does not jump to the cheapest band.
      const crit = PRIO_CRITERION[effective.prio]
      const keepBands = effective.max != null
      cands = [...cands].sort((x, y) =>
        (keepBands ? bandIndex(y.band) - bandIndex(x.band) : 0)
        || (scoredBySlug.get(y.slug)!.c[crit] - scoredBySlug.get(x.slug)!.c[crit])
        || (keepBands ? x.rank - y.rank : scoredBySlug.get(y.slug)!.score - scoredBySlug.get(x.slug)!.score))
    } else if (effective.max == null) cands = [...cands].sort((x, y) => (scoredBySlug.get(y.slug)!.score - scoredBySlug.get(x.slug)!.score))
    for (const p of cands) {
      if (podium.length >= podiumSize || used.has(p.family)) continue
      const s = scoredBySlug.get(p.slug)!
      const fam = famMap.get(p.family)
      const versions = fam ? [fam.best.v, ...fam.versions].filter((x) => x.slug !== p.slug) : []
      // Editorial reasons first; a strong ACAU signal earns the fourth slot when there is room.
      const why = p.why.slice(0, 4)
      const sales = s.v.soldRank != null && s.v.soldRank <= 10 ? salesReason(s.v, opts.salesYear) : undefined
      if (sales && why.length < 4) why.push(sales)
      podium.push({ vehicle: s.v, score: s.score, reasons: why, source: 'top', relaxedTag: relaxedTagFor(s.v), versions })
      used.add(p.family)
    }
  }

  for (const f of families) {
    if (podium.length >= podiumSize) break
    if (used.has(f.best.v.family)) continue
    podium.push({ vehicle: f.best.v, score: f.best.score, reasons: reasons(f.best, ctx), source: 'data', relaxedTag: relaxedTagFor(f.best.v), versions: f.versions })
    used.add(f.best.v.family)
  }

  const others = families.filter((f) => !used.has(f.best.v.family)).slice(0, maxOthers)

  return {
    strictCount: strict.vehicles,
    strictFamilies: strict.families,
    effective,
    notes,
    podium,
    others,
  }
}
