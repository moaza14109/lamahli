import { N, UserError, parseRelation } from './parse'

export const Y = '\\text{ص}'
const num = (v: number): N => ({ t: 'n', v })
const isN = (a: N, v?: number) => a.t === 'n' && (v === undefined || a.v === v)
const mul = (a: N, b: N): N => ({ t: '*', a, b })
const sub = (a: N, b: N): N => ({ t: '-', a, b })

export function hasX(e: N, variable = 'x'): boolean {
  if (e.t === 'v') return e.name === variable
  if (e.t === 'n') return false
  if (e.t === 'neg') return hasX(e.a, variable)
  if (e.t === 'fn') return hasX(e.a, variable)
  return hasX(e.a, variable) || hasX(e.b, variable)
}

export function ev(e: N, x: number): number {
  switch (e.t) {
    case 'n': return e.v
    case 'v': return x
    case 'neg': return -ev(e.a, x)
    case 'fn': {
      const a = ev(e.a, x)
      switch (e.f) {
        case 'sin': return Math.sin(a)
        case 'cos': return Math.cos(a)
        case 'tan': return Math.tan(a)
        case 'cot': return 1 / Math.tan(a)
        case 'sec': return 1 / Math.cos(a)
        case 'csc': return 1 / Math.sin(a)
        case 'asin': return Math.asin(a)
        case 'acos': return Math.acos(a)
        case 'atan': return Math.atan(a)
        case 'exp': return Math.exp(a)
        case 'ln': return Math.log(a)
        case 'log': return Math.log10(a)
      }
    }
    case '+': return ev(e.a, x) + ev(e.b, x)
    case '-': return ev(e.a, x) - ev(e.b, x)
    case '*': return ev(e.a, x) * ev(e.b, x)
    case '/': return ev(e.a, x) / ev(e.b, x)
    case '^': return Math.pow(ev(e.a, x), ev(e.b, x))
  }
}

/* ---------- التبسيط ---------- */
export function simp(e: N): N {
  switch (e.t) {
    case 'n': case 'v': return e
    case 'neg': { const a = simp(e.a); return a.t === 'n' ? num(-a.v) : a.t === 'neg' ? a.a : { t: 'neg', a } }
    case 'fn': return { t: 'fn', f: e.f, a: simp(e.a) }
    case '+': {
      const a = simp(e.a), b = simp(e.b)
      if (isN(a, 0)) return b
      if (isN(b, 0)) return a
      if (a.t === 'n' && b.t === 'n') return num(a.v + b.v)
      return b.t === 'neg' ? { t: '-', a, b: b.a } : { t: '+', a, b }
    }
    case '-': {
      const a = simp(e.a), b = simp(e.b)
      if (isN(b, 0)) return a
      if (isN(a, 0)) return simp({ t: 'neg', a: b })
      if (a.t === 'n' && b.t === 'n') return num(a.v - b.v)
      return b.t === 'neg' ? { t: '+', a, b: b.a } : { t: '-', a, b }
    }
    case '*': {
      const fs: N[] = []; let c = 1
      const go = (z: N) => { if (z.t === '*') { go(z.a); go(z.b) } else if (z.t === 'n') c *= z.v; else if (z.t === 'neg') { c *= -1; go(z.a) } else fs.push(z) }
      go(simp(e.a)); go(simp(e.b))
      if (c === 0) return num(0)
      const groups = new Map<string, { b: N; k: number }>()
      for (const z of fs) {
        const [base, k] = z.t === '^' && z.b.t === 'n' ? [z.a, z.b.v] : [z, 1]
        const key = tex(base), g = groups.get(key)
        if (g) g.k += k; else groups.set(key, { b: base, k })
      }
      const parts = [...groups.values()].filter((g) => g.k !== 0).map((g) => (g.k === 1 ? g.b : ({ t: '^', a: g.b, b: num(g.k) } as N)))
      if (!parts.length) return num(c)
      const r = parts.reduce((p, q) => mul(p, q))
      const abs = Math.abs(c)
      const body = abs === 1 ? r : mul(num(abs), r)
      return c < 0 ? { t: 'neg', a: body } : body
    }
    case '/': {
      const a = simp(e.a), b = simp(e.b)
      if (isN(a, 0)) return num(0)
      if (isN(b, 1)) return a
      if (a.t === 'n' && b.t === 'n' && b.v !== 0) return num(a.v / b.v)
      return { t: '/', a, b }
    }
    case '^': {
      const a = simp(e.a), b = simp(e.b)
      if (isN(b, 1)) return a
      if (isN(b, 0)) return num(1)
      if (a.t === 'n' && b.t === 'n') return num(Math.pow(a.v, b.v))
      if (a.t === '^' && a.b.t === 'n' && b.t === 'n') return simp({ t: '^', a: a.a, b: num(a.b.v * b.v) })
      return { t: '^', a, b }
    }
  }
}

/* ---------- الكتابة بـ LaTeX ---------- */
const prec = (e: N): number =>
  e.t === 'n' ? (e.v < 0 || !Number.isInteger(e.v) ? 2 : 9) : e.t === 'v' ? 9 : e.t === 'fn' ? 8 : e.t === 'neg' ? 1.5
  : e.t === '^' ? (isN(e.b, 0.5) ? 9 : 4) : e.t === '*' || e.t === '/' ? 2 : 1
const wrap = (c: N, min: number) => (prec(c) < min ? `\\left(${tex(c)}\\right)` : tex(c))
function numTex(v: number): string {
  if (Number.isInteger(v)) return String(v)
  for (let q = 2; q <= 12; q++) if (Math.abs(v * q - Math.round(v * q)) < 1e-9) {
    const p = Math.round(v * q); return `${p < 0 ? '-' : ''}\\frac{${Math.abs(p)}}{${q}}`
  }
  return String(+v.toFixed(4))
}
export function tex(e: N): string {
  switch (e.t) {
    case 'n': return numTex(e.v)
    case 'v': return e.name === 'y' ? '\\text{ص}' : '\\text{س}'
    case 'fn': {
      const label: Record<string, string> = { sin: 'جا', cos: 'جتا', tan: 'ظا', cot: 'ظتا', sec: 'قا', csc: 'قتا', asin: '\\arcsin', acos: '\\arccos', atan: '\\arctan', exp: 'e', ln: 'ln', log: 'log' }
      const name = label[e.f]
      return e.f === 'exp' ? `e^{${tex(e.a)}}` : `${['asin', 'acos', 'atan'].includes(e.f) ? name : `\\operatorname{${name}}`}\\left(${tex(e.a)}\\right)`
    }
    case 'neg': return `-${wrap(e.a, 2)}`
    case '+': return `${wrap(e.a, 1)} + ${wrap(e.b, 1)}`
    case '-': return `${wrap(e.a, 1)} - ${wrap(e.b, 2)}`
    case '*': { const L = wrap(e.a, 2), R = wrap(e.b, 2); return `${L}${/^[\d\\-]/.test(R) ? ' \\cdot ' : ' '}${R}` }
    case '/': return `\\frac{${tex(e.a)}}{${tex(e.b)}}`
    case '^': return isN(e.b, 0.5) ? `\\sqrt{${tex(e.a)}}` : `${wrap(e.a, 5)}^{${tex(e.b)}}`
  }
}

/* ---------- الاشتقاق ---------- */
function d(e: N, variable = 'x'): N {
  if (!hasX(e, variable)) return num(0)
  switch (e.t) {
    case 'v': return num(e.name === variable ? 1 : 0)
    case 'neg': return { t: 'neg', a: d(e.a, variable) }
    case 'fn': {
      const inner = d(e.a, variable)
      const outer: Record<string, N> = {
        sin: { t: 'fn', f: 'cos', a: e.a },
        cos: { t: 'neg', a: { t: 'fn', f: 'sin', a: e.a } },
        tan: { t: '^', a: { t: 'fn', f: 'sec', a: e.a }, b: num(2) },
        cot: { t: 'neg', a: { t: '^', a: { t: 'fn', f: 'csc', a: e.a }, b: num(2) } },
        sec: mul({ t: 'fn', f: 'sec', a: e.a }, { t: 'fn', f: 'tan', a: e.a }),
        csc: { t: 'neg', a: mul({ t: 'fn', f: 'csc', a: e.a }, { t: 'fn', f: 'cot', a: e.a }) },
        asin: { t: '/', a: num(1), b: { t: '^', a: sub(num(1), { t: '^', a: e.a, b: num(2) }), b: num(0.5) } },
        acos: { t: 'neg', a: { t: '/', a: num(1), b: { t: '^', a: sub(num(1), { t: '^', a: e.a, b: num(2) }), b: num(0.5) } } },
        atan: { t: '/', a: num(1), b: { t: '+', a: num(1), b: { t: '^', a: e.a, b: num(2) } } },
        exp: { t: 'fn', f: 'exp', a: e.a },
        ln: { t: '/', a: num(1), b: e.a },
        log: { t: '/', a: num(1), b: mul(e.a, num(Math.log(10))) },
      }
      return mul(outer[e.f], inner)
    }
    case '+': case '-': return { t: e.t, a: d(e.a, variable), b: d(e.b, variable) }
    case '*':
      if (!hasX(e.a, variable)) return mul(e.a, d(e.b, variable))
      if (!hasX(e.b, variable)) return mul(d(e.a, variable), e.b)
      return { t: '+', a: mul(d(e.a, variable), e.b), b: mul(e.a, d(e.b, variable)) }
    case '/':
      if (!hasX(e.b, variable)) return { t: '/', a: d(e.a, variable), b: e.b }
      return { t: '/', a: sub(mul(d(e.a, variable), e.b), mul(e.a, d(e.b, variable))), b: { t: '^', a: e.b, b: num(2) } }
    case '^':
      if (hasX(e.b, variable)) {
        return mul({ t: '^', a: e.a, b: e.b }, {
          t: '+',
          a: mul(d(e.b, variable), { t: 'fn', f: 'ln', a: e.a }),
          b: mul(e.b, { t: '/', a: d(e.a, variable), b: e.a }),
        })
      }
      return mul(mul(e.b, { t: '^', a: e.a, b: sub(e.b, num(1)) }), d(e.a, variable))
    default: return num(0)
  }
}
export const derive = (e: N, variable = 'x') => simp(d(e, variable))
export function deriveN(e: N, order: number, variable = 'x'): N {
  if (!Number.isInteger(order) || order < 1 || order > 5) throw new UserError('رتبة الاشتقاق يجب أن تكون عددًا صحيحًا من 1 إلى 5.')
  let result = e
  for (let i = 0; i < order; i++) result = derive(result, variable)
  return result
}

/* ---------- التحقق العددي ---------- */
const XS = [-2.3, -1.1, -0.7, 0.4, 0.9, 1.7, 2.6, 3.3, 4.1]
export function same(a: N, b: N, tol = 1e-6): boolean {
  let ok = 0
  for (const x of XS) {
    const p = ev(a, x), q = ev(b, x)
    if (!isFinite(p) || !isFinite(q)) continue
    if (Math.abs(p - q) > tol * (1 + Math.abs(q))) return false
    ok++
  }
  return ok >= 3
}
function verify(f: N, df: N): boolean {
  let ok = 0
  for (const x of XS) {
    const h = 1e-5, y = ev(f, x), p = ev(df, x)
    const n = (ev(f, x + h) - ev(f, x - h)) / (2 * h)
    if (![y, p, n].every(isFinite) || Math.abs(y) > 1e4) continue
    if (Math.abs(n - p) > 1e-4 * (1 + Math.abs(p))) return false
    ok++
  }
  return ok >= 3
}

function hasOtherVariable(e: N, variable: string): boolean {
  if (e.t === 'v') return e.name !== variable
  if (e.t === 'n') return false
  if (e.t === 'neg' || e.t === 'fn') return hasOtherVariable(e.a, variable)
  return hasOtherVariable(e.a, variable) || hasOtherVariable(e.b, variable)
}

/* ---------- خطوات الحل ---------- */
export interface Step { title: string; why: string; tex: string }
export interface Solution { f: N; rule: string; steps: Step[]; result: N; hints: string[]; note?: string }

const D = (e: N, variable = 'x') => `\\frac{d}{d${variable === 'y' ? '\\text{ص}' : '\\text{س}'}}\\left[${tex(e)}\\right]`
const leaf = (c: N) => c.t === 'v' || !hasX(c)
const Dk = (c: N, variable = 'x') => (leaf(c) ? tex(derive(c, variable)) : D(c, variable))

function rule(e: N, variable = 'x'): { name: string; why: string; form: string; kids: N[] } {
  switch (e.t) {
    case 'neg': return { name: 'إشارة السالب', why: 'إشارة السالب تبقى كما هي ونشتق ما بعدها.', form: `-${Dk(e.a, variable)}`, kids: [e.a] }
    case '+': case '-': return {
      name: 'قاعدة الجمع والطرح', why: 'مشتقة المجموع أو الفرق هي مجموع أو فرق المشتقات، فنشتق كل حد على حدة.',
      form: `${Dk(e.a, variable)} ${e.t} ${Dk(e.b, variable)}`, kids: [e.a, e.b] }
    case '*':
      if (!hasX(e.a, variable)) return { name: 'ثابت × دالة', why: 'الثابت الذي يضرب دالة يبقى كما هو، ونشتق الدالة فقط.', form: `${wrap(e.a, 2)} \\cdot ${Dk(e.b, variable)}`, kids: [e.b] }
      if (!hasX(e.b, variable)) return { name: 'ثابت × دالة', why: 'الثابت الذي يضرب دالة يبقى كما هو، ونشتق الدالة فقط.', form: `${Dk(e.a, variable)} \\cdot ${wrap(e.b, 2)}`, kids: [e.a] }
      return { name: 'قاعدة الضرب', why: 'مشتقة حاصل الضرب = مشتقة الأولى × الثانية + الأولى × مشتقة الثانية.',
        form: `${Dk(e.a, variable)} \\cdot ${wrap(e.b, 2)} + ${wrap(e.a, 2)} \\cdot ${Dk(e.b, variable)}`, kids: [e.a, e.b] }
    case '/':
      if (!hasX(e.b, variable)) return { name: 'القسمة على ثابت', why: 'نشتق البسط ثم نقسم على الثابت نفسه.', form: `\\frac{${Dk(e.a, variable)}}{${tex(e.b)}}`, kids: [e.a] }
      return { name: 'قاعدة القسمة', why: 'مشتقة الكسر = (مشتقة البسط × المقام − البسط × مشتقة المقام) ÷ مربع المقام.',
        form: `\\frac{${Dk(e.a, variable)} \\cdot ${wrap(e.b, 2)} - ${wrap(e.a, 2)} \\cdot ${Dk(e.b, variable)}}{\\left(${tex(e.b)}\\right)^{2}}`, kids: [e.a, e.b] }
    case '^': {
      const n1 = tex(simp(sub(e.b, num(1))))
      if (e.a.t === 'v') return { name: 'قاعدة القوة', why: 'ننزل الأس ليصبح معاملًا، ثم ننقص الأس بمقدار ١.', form: `${wrap(e.b, 5)} \\, ${tex(e.a)}^{${n1}}`, kids: [] }
      return { name: 'قاعدة السلسلة', why: 'الدالة الخارجية قوة لشيء بين قوسين: نشتق القوة كما هي، ثم نضرب في مشتقة ما بداخل القوسين.',
        form: `${wrap(e.b, 5)} \\left(${tex(e.a)}\\right)^{${n1}} \\cdot ${Dk(e.a, variable)}`, kids: [e.a] }
    }
    case 'fn': {
      const names: Record<string, string> = { sin: 'جا', cos: 'جتا', tan: 'ظا', cot: 'ظتا', sec: 'قا', csc: 'قتا', asin: 'arcsin', acos: 'arccos', atan: 'arctan', exp: 'الدالة الأسية', ln: 'اللوغاريتم الطبيعي', log: 'اللوغاريتم العشري' }
      return { name: `قاعدة مشتقة ${names[e.f]}`, why: `نشتق الدالة الخارجية ثم نضرب في مشتقة ما بداخلها (قاعدة السلسلة).`, form: `${tex({ t: 'fn', f: e.f, a: e.a })}' \\cdot ${Dk(e.a, variable)}`, kids: [e.a] }
    }
    default: return { name: 'الثابت أو المتغير', why: '', form: '', kids: [] }
  }
}

function walk(e: N, out: Step[], top: boolean, variable = 'x') {
  const r = rule(e, variable)
  const title = top ? `الخطوة الأولى: ${r.name}` : `مشتقة الجزء: ${r.name}`
  const res = tex(derive(e, variable))
  out.push({ title, why: r.why, tex: top ? `${D(e, variable)} = ${r.form}` : `${D(e, variable)} = ${r.form} = ${res}` })
  r.kids.filter((k) => !leaf(k)).forEach((k) => walk(k, out, false, variable))
}

function hasDomainIssue(e: N): boolean {
  if (e.t === 'n' || e.t === 'v') return false
  if (e.t === 'neg') return hasDomainIssue(e.a)
  if (e.t === 'fn') return hasDomainIssue(e.a)
  if (e.t === '/' && hasX(e.b)) return true
  if (e.t === '^' && !(Number.isInteger((e.b as { v?: number }).v ?? 0.5) && (e.b as { v?: number }).v! >= 0)) return true
  return hasDomainIssue(e.a) || hasDomainIssue(e.b)
}

export function solve(f: N, variable = 'x'): Solution {
  if (!hasX(f, variable)) throw new UserError(`لم أجد المتغير ${variable === 'y' ? 'ص / y' : 'س / x'} في الدالة.`)
  const result = derive(f, variable)
  if (!verify(f, result) && !hasOtherVariable(f, variable)) throw new UserError('لا أستطيع التأكد من صحة مشتقة هذه الدالة بثقة، لذلك لن أعرض حلًا. جرّب دالة أبسط أو راجع كتابتها.')
  const top = rule(f, variable)
  const steps: Step[] = []
  walk(f, steps, true, variable)
  steps.push({ title: 'التجميع والتبسيط', why: 'نعوّض بمشتقات الأجزاء ونبسّط الناتج.', tex: `${Y}' = ${tex(result)}` })
  return {
    f, result, steps, rule: top.name,
    hints: [
      'انظر إلى الدالة كاملةً: ما آخر عملية تربط أجزاءها؟ جمع أو طرح، ضرب، قسمة، أم قوة لشيء بين قوسين؟',
      `القاعدة التي تبدأ بها هنا: ${top.name}.`,
      top.why,
    ],
    note: hasDomainIssue(f) ? 'تنبيه: الدالة ومشتقتها غير معرّفتين عند القيم التي تجعل المقام صفرًا أو ما تحت الجذر سالبًا.' : undefined,
  }
}

export function solveImplicit(src: string): Solution {
    const { left, right } = parseRelation(src)
    const f = simp({ t: '-', a: left, b: right })
    const fy = derive(f, 'y')
    if (!hasX(f, 'y') || same(fy, { t: 'n', v: 0 })) {
      throw new UserError('لم أجد ص في المعادلة أو لا يمكن حل المشتقة بالنسبة إلى ص.')
    }
    const result = simp({ t: 'neg', a: { t: '/', a: derive(f, 'x'), b: fy } })
    return {
      f, result, rule: 'الاشتقاق الضمني',
      steps: [
        { title: 'ترتيب المعادلة', why: 'ننقل الطرفين إلى طرف واحد لتكوين F(س،ص)=0.', tex: `${tex(f)} = 0` },
        { title: 'الاشتقاق الضمني', why: 'نشتق الطرفين بالنسبة إلى س، ونعامل ص كدالة في س.', tex: `\\frac{d\\text{ص}}{d\\text{س}} = ${tex(result)}` },
        { title: 'العزل والتبسيط', why: 'نعزل dص/dس من العلاقة الناتجة.', tex: `\\frac{d\\text{ص}}{d\\text{س}} = ${tex(result)}` },
      ],
      hints: ['اكتب المعادلة على صورة طرفين.', 'استخدم الاشتقاق الضمني: ص تعتمد على س.', 'اعزل dص/dس بعد الاشتقاق.'],
      note: 'هذه نتيجة اشتقاق ضمني؛ يلزم تجنب القيم التي تجعل مشتقة F بالنسبة إلى ص تساوي صفرًا.',
  }
}

export function similar(f: N): Solution {
  const r = () => Math.floor(Math.random() * 9) + 1
  const mp = (e: N): N => {
    switch (e.t) {
      case 'n': return Number.isInteger(e.v) && e.v !== 0 ? num(Math.sign(e.v) * r()) : e
      case 'v': return e
      case 'fn': return { t: 'fn', f: e.f, a: mp(e.a) }
      case 'neg': return { t: 'neg', a: mp(e.a) }
      case '^': return { t: '^', a: mp(e.a), b: e.b.t === 'n' && Number.isInteger(e.b.v) && e.b.v >= 2 ? num(Math.max(2, Math.min(5, e.b.v + (Math.random() < 0.5 ? -1 : 1)))) : e.b }
      default: return { t: e.t, a: mp(e.a), b: mp(e.b) }
    }
  }
  for (let k = 0; k < 40; k++) {
    const g = mp(f)
    if (tex(g) === tex(f)) continue
    try { return solve(g) } catch { /* جرّب توليدًا آخر */ }
  }
  throw new UserError('تعذّر توليد مسألة مشابهة لهذه الدالة.')
}
