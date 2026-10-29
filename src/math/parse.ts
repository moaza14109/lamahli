export type Fn = 'sin' | 'cos' | 'tan' | 'cot' | 'sec' | 'csc' | 'asin' | 'acos' | 'atan' | 'exp' | 'ln' | 'log'
export type Op = '+' | '-' | '*' | '/' | '^'
export type N =
  | { t: 'n'; v: number }
  | { t: 'v'; name: string }
  | { t: 'neg'; a: N }
  | { t: 'fn'; f: Fn; a: N }
  | { t: Op; a: N; b: N }

export class UserError extends Error {}

const arabicDigits = '٠١٢٣٤٥٦٧٨٩'
const names: Record<string, Fn> = {
  جا: 'sin', جتا: 'cos', ظا: 'tan', ظتا: 'cot', قا: 'sec', قتا: 'csc',
  sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', sec: 'sec', csc: 'csc',
  asin: 'asin', acos: 'acos', atan: 'atan',
  exp: 'exp', ln: 'ln', log: 'log',
}
const latexNames: Record<string, string> = {
  '\\sin': 'sin', '\\cos': 'cos', '\\tan': 'tan', '\\cot': 'cot',
  '\\sec': 'sec', '\\csc': 'csc', '\\exp': 'exp', '\\ln': 'ln', '\\log': 'log',
  '\\arcsin': 'asin', '\\arccos': 'acos', '\\arctan': 'atan',
}

function normalize(src: string): string {
  return src
    .replace(/[٠-٩]/g, (c) => String(arabicDigits.indexOf(c)))
    .replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .replace(/٫/g, '.')
    .replace(/[²]/g, '^2').replace(/[³]/g, '^3')
    .replace(/⁻¹/g, '^(-1)').replace(/⁻²/g, '^(-2)')
    .replace(/\\(?:text|mathrm|mathit|mathord|operatorname)\{([^{}]*)\}/g, '$1')
    .replace(/\\left|\\right|\\!|\\,|\\;|\\ |~/g, '')
    .replace(/\\cdot|\\times|×/g, '*').replace(/\\div|÷/g, '/')
    .replace(/−/g, '-').replace(/،/g, ',')
}

function lex(src: string): string[] {
  let s = normalize(src)
  const eq = s.lastIndexOf('=')
  if (eq >= 0) s = s.slice(eq + 1)
  const out: string[] = []
  for (let i = 0; i < s.length;) {
    if (/\s/.test(s[i])) { i++; continue }
    if (s.startsWith('\\frac', i) || s.startsWith('\\sqrt', i)) {
      out.push(s.startsWith('\\frac', i) ? '\\frac' : '\\sqrt'); i += s.startsWith('\\frac', i) ? 5 : 5; continue
    }
    if (s[i] === '\\') {
      const m = s.slice(i).match(/^\\[a-zA-Z]+/)
      if (m) { out.push(latexNames[m[0]] ?? m[0]); i += m[0].length; continue }
    }
    const number = s.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)/)
    if (number) { out.push(number[0]); i += number[0].length; continue }
    const word = s.slice(i).match(/^[A-Za-z\u0600-\u06ff]+/)
    if (word) {
      const value = word[0]
      if (value === 'س' || value.toLowerCase() === 'x') out.push('x')
      else if (value === 'ص' || value.toLowerCase() === 'y') out.push('y')
      else if (value === 'ل' || value.toLowerCase() === 't') out.push('x')
      else if (names[value]) out.push(value)
      else out.push(value)
      i += value.length; continue
    }
    out.push(s[i]); i++
  }
  return out
}

export function parse(src: string): N {
  const T = lex(src)
  if (!T.length) throw new UserError('اكتب الدالة الأول.')
  let i = 0
  const peek = () => T[i]
  const eat = (want?: string) => {
    const t = T[i++]
    if (t === undefined) throw new UserError('الدالة ناقصة. اقفل الأقواس وكمل الكسر أو الأس.')
    if (want && t !== want) throw new UserError(`كنت مستني «${want}» ولقيت «${t}». راجع الأقواس.`)
    return t
  }
  const starts = (t?: string) => !!t && (/^\d/.test(t) || t === '.' || /^[xy]$/.test(t) || t === '(' || t === '{' || t === '\\frac' || t === '\\sqrt' || !!names[t])
  const group = (): N => { eat('{'); const e = expr(); eat('}'); return e }
  let exprInLast: N = { t: 'n', v: 0 }
  function exprIn(close: string): N {
    const result = expr()
    if (peek() !== close) throw new UserError('الدالة وقفت قبل ما القوس يتقفل.')
    exprInLast = result
    return result
  }
  function expr(): N {
    let l = term()
    while (peek() === '+' || peek() === '-') { const o = eat() as '+' | '-'; l = { t: o, a: l, b: term() } }
    return l
  }
  function term(): N {
    let l = unary()
    for (;;) {
      const p = peek()
      if (p === '*' || p === '/') { eat(); l = { t: p, a: l, b: unary() } }
      else if (starts(p)) l = { t: '*', a: l, b: unary() }
      else return l
    }
  }
  function unary(): N {
    if (peek() === '-') { eat(); return { t: 'neg', a: unary() } }
    if (peek() === '+') { eat(); return unary() }
    return power()
  }
  function power(): N {
    if (peek() && names[peek()!] && T[i + 1] === '^') {
      const f = names[eat()]
      eat('^')
      const exponent = peek() === '{' ? group() : unary()
      if ((exponent.t === 'n' && exponent.v === -1) || (exponent.t === 'neg' && exponent.a.t === 'n' && exponent.a.v === 1)) {
        throw new UserError('جا⁻¹(س) ممكن تتفهم بطريقتين. اكتب 1/جا(س) للمقلوب، أو asin(س) للدالة العكسية.')
      }
      const arg = peek() === '(' ? (eat('('), exprIn(')'), eat(')'), exprInLast) : atom()
      return { t: '^', a: { t: 'fn', f, a: arg }, b: exponent }
    }
    const b = atom()
    if (peek() === '^') { eat(); return { t: '^', a: b, b: peek() === '{' ? group() : unary() } }
    return b
  }
  function atom(): N {
    const t = eat()
    if (/^(?:\d|\.)/.test(t)) return { t: 'n', v: parseFloat(t) }
    if (t === 'x' || t === 'y') return { t: 'v', name: t }
    if (t === '(') { const e = expr(); eat(')'); return e }
    if (t === '{') { i--; return group() }
    if (t === '\\frac') { const a = group(); return { t: '/', a, b: group() } }
    if (t === '\\sqrt') return { t: '^', a: group(), b: { t: 'n', v: 0.5 } }
    if (names[t]) {
      const a = peek() === '(' ? (eat('('), exprIn(')'), eat(')'), exprInLast) : atom()
      return { t: 'fn', f: names[t], a }
    }
    if (/^[A-Za-z\u0600-\u06ff]+$/.test(t)) throw new UserError(`المتغير «${t}» مش مدعوم. استخدم س أو ص أو x أو y.`)
    throw new UserError(`الرمز «${t}» مش مدعوم. استخدم + − × ÷ والأسس والجذور والدوال المعروفة.`)
  }
  const result = expr()
  if (i < T.length) throw new UserError(`مش فاهم الجزء «${T.slice(i).join(' ')}». لو عايز مربع الدالة اكتب جا²(س)، وللدالة العكسية استخدم asin(س) أو acos(س) أو atan(س).`)
  return result
}

export function parseRelation(src: string): { left: N; right: N } {
  const normalized = normalize(src)
  const at = normalized.indexOf('=')
  if (at < 0) throw new UserError('للاشتقاق الضمني اكتب معادلة فيها =، زي: ص² + س² = 1.')
  const left = parse(normalized.slice(0, at))
  const right = parse(normalized.slice(at + 1))
  return { left, right }
}
