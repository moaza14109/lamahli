import { useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Check, X, Lightbulb, LockKeyhole, MapPin, Trophy } from 'lucide-react'
import { Tex } from './Tex'
import { EquationEditor } from './EquationEditor'
import { Solution, Y, same, similar, tex } from '../math/diff'
import { parse, UserError } from '../math/parse'

const Card = ({ children, tone = '' }: { children: React.ReactNode; tone?: string }) => (
  <div dir="rtl" className={`solution-card reveal rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${tone}`}>{children}</div>
)
const btn = 'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-40'
const primary = `${btn} bg-brand text-white hover:bg-indigo-700`
const ghost = `${btn} border border-slate-200 bg-white hover:bg-slate-50`

export function HintResult({ sol, onSteps }: { sol: Solution; onSteps: () => void }) {
  const [n, setN] = useState(1)
  return (
    <div dir="rtl" className="solution-content space-y-3">
      {sol.hints.slice(0, n).map((h, i) => (
        <Card key={i}><div className="flex gap-3"><Lightbulb className="mt-0.5 shrink-0 text-amber-500" size={20} /><p className="leading-8">{h}</p></div></Card>
      ))}
      <div className="flex flex-wrap gap-2">
        {n < sol.hints.length ? <button className={primary} onClick={() => setN(n + 1)}>تلميح إضافي</button>
          : <p className="text-sm text-slate-500">ده آخر تلميح. جرّب تحلها بنفسك دلوقتي.</p>}
        <button className={ghost} onClick={onSteps}>ورّيني الحل خطوة خطوة</button>
      </div>
    </div>
  )
}

export function StepByStep({ sol }: { sol: Solution }) {
  const [i, setI] = useState(0)
  const last = i === sol.steps.length - 1
  return (
    <div dir="rtl" className="solution-content space-y-3">
      <div className="map-header">
        <div>
          <p className="learning-node-kicker">رحلة الاشتقاق</p>
          <h3>خريطة الحل</h3>
          <p>افتح محطة جديدة مع كل خطوة، لحد ما توصل للإجابة.</p>
        </div>
        <span className="map-progress"><MapPin size={15} /> {i + 1} / {sol.steps.length}</span>
      </div>
      <div className="learning-map">
        <div className="learning-map-line" aria-hidden="true" />
        <article className="learning-node learning-node-source">
          <span className="learning-node-number"><MapPin size={19} /></span>
          <div className="learning-node-card"><p className="learning-node-kicker">المحطة ١ · البداية</p><p className="font-bold">الدالة الأصلية</p><Tex block tex={`${Y} = ${tex(sol.f)}`} /></div>
        </article>
        {sol.steps.map((s, k) => {
          const unlocked = k <= i
          return (
          <article className={`learning-node learning-node-step ${k % 2 ? 'learning-node-left' : ''} ${k === i ? 'is-active' : ''} ${!unlocked ? 'is-locked' : ''}`} key={k}>
            <span className="learning-node-number">{unlocked ? k + 2 : <LockKeyhole size={17} />}</span>
            <div className="learning-node-card">
              <p className="learning-node-kicker">المحطة {k + 2} · {k === 0 ? 'القاعدة المستخدمة' : k === sol.steps.length - 1 ? 'الوصول' : 'تطبيق وتبسيط'}</p>
              {unlocked ? <>
                <p className="font-bold">{s.title}</p>
                {s.why && <p className="mt-1 text-sm leading-7 text-slate-600">{s.why}</p>}
                <div className="mt-2 rounded-xl bg-slate-50 p-3"><Tex block tex={s.tex} /></div>
              </> : <p className="locked-message">اضغط «الخطوة الجاية» لفتح المحطة</p>}
            </div>
          </article>
          )
        })}
        <article className={`learning-node learning-node-finish ${last ? 'is-active' : 'is-locked'}`}>
          <span className="learning-node-number">{last ? <Trophy size={19} /> : <LockKeyhole size={17} />}</span>
          <div className="learning-node-card">
            <p className="learning-node-kicker">النهاية · الإجابة النهائية</p>
            {last ? <><p className="font-bold">وصلت للإجابة</p><Tex block tex={`${Y}' = ${tex(sol.result)}`} /></> : <p className="locked-message">كمّل المحطات عشان تظهر الإجابة النهائية</p>}
          </div>
        </article>
      </div>
      {last && (
        <Card tone="border-emerald-200 bg-emerald-50/60">
          <p className="mb-1 text-sm font-semibold text-emerald-800">الناتج النهائي</p>
          <Tex block tex={`${Y}' = ${tex(sol.result)}`} />
          {sol.note && <p className="mt-2 text-sm text-slate-600">{sol.note}</p>}
        </Card>
      )}
      <div className="flex items-center gap-2">
        <button className={ghost} disabled={i === 0} onClick={() => setI(i - 1)}><ChevronRight size={16} /> الخطوة اللي فاتت</button>
        <button className={primary} disabled={last} onClick={() => setI(i + 1)}>الخطوة الجاية <ChevronLeft size={16} /></button>
        <span className="ms-auto text-sm text-slate-500">{i + 1} / {sol.steps.length}</span>
      </div>
    </div>
  )
}

export function Practice({ base }: { base: Solution }) {
  const [p, setP] = useState(() => {
    try { return similar(base.f, base.variable) } catch { return base }
  })
  const [ans, setAns] = useState('')
  const [fb, setFb] = useState<{ ok: boolean; msg: string } | null>(null)
  const [show, setShow] = useState(false)
  const next = () => { try { setP(similar(base.f, base.variable)); setAns(''); setFb(null); setShow(false) } catch (e) { setFb({ ok: false, msg: e instanceof UserError ? e.message : 'مش قادر أطلع سؤال جديد دلوقتي. جرّب تاني.' }) } }
  const check = () => {
    try {
      const a = parse(ans)
      if (same(a, p.result)) setFb({ ok: true, msg: 'عاش! إجابتك صح.' })
      else if (same(a, p.f)) setFb({ ok: false, msg: 'دي نفس الدالة، مش مشتقتها. اشتقها الأول.' })
      else setFb({ ok: false, msg: `مش بالظبط. ${p.hints[1]} راجع كل جزء لوحده وجرّب تاني.` })
    } catch (e) { setFb({ ok: false, msg: e instanceof UserError ? e.message : 'مش قادر أفهم إجابتك. راجع كتابتها وجرّب تاني.' }) }
  }
  return (
    <div dir="rtl" className="solution-content space-y-3">
      <Card><p className="mb-1 text-sm text-slate-500">اشتق الدالة دي بنفسك</p><Tex block tex={`${Y} = ${tex(p.f)}`} /></Card>
      <Card>
        <EquationEditor label="إجابتك: مشتقة الدالة دي" value={ans} onChange={(v) => { setAns(v); setFb(null) }} onEnter={check} />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={primary} onClick={check}>شوف إجابتي</button>
          <button className={ghost} onClick={() => setShow(true)}>ورّيني الحل</button>
          <button className={ghost} onClick={next}><RefreshCw size={15} /> سؤال جديد</button>
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
