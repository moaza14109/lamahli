import { useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Check, X, Lightbulb } from 'lucide-react'
import { Tex } from './Tex'
import { EquationEditor } from './EquationEditor'
import { Solution, Y, same, similar, tex } from '../math/diff'
import { parse, UserError } from '../math/parse'

const Card = ({ children, tone = '' }: { children: React.ReactNode; tone?: string }) => (
  <div className={`reveal rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${tone}`}>{children}</div>
)
const btn = 'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-40'
const primary = `${btn} bg-brand text-white hover:bg-indigo-700`
const ghost = `${btn} border border-slate-200 bg-white hover:bg-slate-50`

export function HintResult({ sol, onSteps }: { sol: Solution; onSteps: () => void }) {
  const [n, setN] = useState(1)
  return (
    <div className="space-y-3">
      {sol.hints.slice(0, n).map((h, i) => (
        <Card key={i}><div className="flex gap-3"><Lightbulb className="mt-0.5 shrink-0 text-amber-500" size={20} /><p className="leading-8">{h}</p></div></Card>
      ))}
      <div className="flex flex-wrap gap-2">
        {n < sol.hints.length ? <button className={primary} onClick={() => setN(n + 1)}>تلميح إضافي</button>
          : <p className="text-sm text-slate-500">هذه آخر التلميحات. جرّب الحل بنفسك الآن.</p>}
        <button className={ghost} onClick={onSteps}>اعرض الحل خطوة بخطوة</button>
      </div>
    </div>
  )
}

export function StepByStep({ sol }: { sol: Solution }) {
  const [i, setI] = useState(0)
  const last = i === sol.steps.length - 1
  return (
    <div className="space-y-3">
      <Card><p className="mb-1 text-sm text-slate-500">الدالة الأصلية</p><Tex block tex={`${Y} = ${tex(sol.f)}`} /></Card>
      {sol.steps.slice(0, i + 1).map((s, k) => (
        <Card key={k} tone={k === i ? 'border-brand/40' : ''}>
          <p className="font-bold">{s.title}</p>
          {s.why && <p className="mt-1 text-sm leading-7 text-slate-600">{s.why}</p>}
          <div className="mt-2 rounded-xl bg-slate-50 p-3"><Tex block tex={s.tex} /></div>
        </Card>
      ))}
      {last && (
        <Card tone="border-emerald-200 bg-emerald-50/60">
          <p className="mb-1 text-sm font-semibold text-emerald-800">الناتج النهائي</p>
          <Tex block tex={`${Y}' = ${tex(sol.result)}`} />
          {sol.note && <p className="mt-2 text-sm text-slate-600">{sol.note}</p>}
        </Card>
      )}
      <div className="flex items-center gap-2">
        <button className={ghost} disabled={i === 0} onClick={() => setI(i - 1)}><ChevronRight size={16} /> الخطوة السابقة</button>
        <button className={primary} disabled={last} onClick={() => setI(i + 1)}>الخطوة التالية <ChevronLeft size={16} /></button>
        <span className="ms-auto text-sm text-slate-500">{i + 1} / {sol.steps.length}</span>
      </div>
    </div>
  )
}

export function Practice({ base }: { base: Solution }) {
  const [p, setP] = useState(() => {
    try { return similar(base.f) } catch { return base }
  })
  const [ans, setAns] = useState('')
  const [fb, setFb] = useState<{ ok: boolean; msg: string } | null>(null)
  const [show, setShow] = useState(false)
  const next = () => { try { setP(similar(base.f)); setAns(''); setFb(null); setShow(false) } catch (e) { setFb({ ok: false, msg: (e as Error).message }) } }
  const check = () => {
    try {
      const a = parse(ans)
      if (same(a, p.result)) setFb({ ok: true, msg: 'إجابة صحيحة، أحسنت!' })
      else if (same(a, p.f)) setFb({ ok: false, msg: 'هذه الدالة نفسها وليست مشتقتها. اشتقّها.' })
      else setFb({ ok: false, msg: `الإجابة ليست صحيحة بعد. ${p.hints[1]} راجع كل جزء على حدة ثم أعد المحاولة.` })
    } catch (e) { setFb({ ok: false, msg: e instanceof UserError ? e.message : 'تعذّر فهم إجابتك.' }) }
  }
  return (
    <div className="space-y-3">
      <Card><p className="mb-1 text-sm text-slate-500">اشتق هذه الدالة بنفسك</p><Tex block tex={`${Y} = ${tex(p.f)}`} /></Card>
      <Card>
        <EquationEditor label="إجابتك: مشتقة الدالة" value={ans} onChange={(v) => { setAns(v); setFb(null) }} onEnter={check} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={primary} onClick={check}>تحقق من إجابتي</button>
          <button className={ghost} onClick={() => setShow(true)}>أظهر الحل</button>
          <button className={ghost} onClick={next}><RefreshCw size={15} /> مسألة جديدة</button>
        </div>
        {fb && (
          <p className={`reveal mt-3 flex gap-2 rounded-xl p-3 text-sm leading-7 ${fb.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
            {fb.ok ? <Check size={18} className="mt-1 shrink-0" /> : <X size={18} className="mt-1 shrink-0" />}{fb.msg}
          </p>
        )}
      </Card>
      {show && <StepByStep key={tex(p.f)} sol={p} />}
    </div>
  )
}
