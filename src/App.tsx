import { useState } from 'react'
import { Sigma, Lightbulb, ListOrdered, Target, Play, AlertCircle, Upload, Image as ImageIcon, X, RotateCcw } from 'lucide-react'
import { EquationEditor } from './components/EquationEditor'
import { HintResult, StepByStep, Practice } from './components/Help'
import { Tex } from './components/Tex'
import { parse, UserError } from './math/parse'
import { solve, solveImplicit, tex, Y, Solution } from './math/diff'

type Mode = 'hint' | 'steps' | 'practice'
const MODES = [
  { id: 'hint' as Mode, title: 'لمّحلي', icon: Lightbulb, desc: 'تلميح يوجّه تفكيرك دون كشف الحل.' },
  { id: 'steps' as Mode, title: 'فهمني الحل', icon: ListOrdered, desc: 'خطوات الاشتقاق مع سبب كل خطوة.' },
  { id: 'practice' as Mode, title: 'اختبر فهمي', icon: Target, desc: 'مسألة مشابهة تحلّها بنفسك.' },
]
const EXAMPLES = ['ص=س^{3}+2س', 'ص=جا(س^{2})', 'ص=ظا(3س+1)', 'ص=جا(س)/جتا(س)', 'ص²+س²=1']

export default function App() {
  const [latex, setLatex] = useState('')
  const [mode, setMode] = useState<Mode>('hint')
  const [run, setRun] = useState<{ id: number; mode: Mode; sol: Solution } | null>(null)
  const [err, setErr] = useState('')
  const [variable, setVariable] = useState<'x' | 'y'>('x')
  const [implicit, setImplicit] = useState(false)
  const [image, setImage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const edit = (v: string) => { setLatex(v); setRun(null); setErr('') }
  const start = () => {
    if (busy) return
    try {
      setBusy(true)
      setErr('')
      const sol = implicit ? solveImplicit(latex) : solve(parse(latex), variable)
      setRun({ id: Date.now(), mode, sol })
    }
    catch (e) { setRun(null); setErr(e instanceof UserError ? e.message : 'حدث خطأ غير متوقع أثناء الحساب. جرّب إعادة كتابة الدالة.') }
    finally { setBusy(false) }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-brand text-white"><Sigma size={22} /></span>
          <div><h1 className="text-xl font-bold leading-6">لمّحلي</h1><p className="text-sm text-slate-500">افهم الاشتقاق خطوة بخطوة</p></div>
        </div>
        <span className="trust-badge">مجاني · بدون تسجيل</span>
      </header>

      <section className="hero">
        <p className="eyebrow">مساعدك في الرياضيات</p>
        <h2>اشتقاق أوضح، خطوة بخطوة</h2>
        <p>اكتب المسألة، ثم اختر نوع المساعدة المناسب لك.</p>
      </section>

      <main className="workspace">
        <EquationEditor label="اكتب الدالة" value={latex} onChange={edit} />
        <div className="input-options">
          <label htmlFor="variable">اشتق بالنسبة إلى
          <select id="variable" value={variable} onChange={(e) => setVariable(e.target.value as 'x' | 'y')}>
            <option value="x">س / x</option>
            <option value="y">ص / y</option>
          </select></label>
          <label className="check-option"><input type="checkbox" checked={implicit} onChange={(e) => setImplicit(e.target.checked)} /> اشتقاق ضمني
          </label>
        </div>
        <div className="image-input">
          <label className="upload-button">
            <Upload size={18} /> صوّر أو ارفع المسألة
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setImage(URL.createObjectURL(file))
              setErr('تمت معاينة الصورة. اكتب المعادلة المستخرجة في المحرر للتأكد منها قبل الاشتقاق؛ لا يتم تخمين النص من الصورة.')
            }} />
          </label>
          <p className="upload-help">التقط صورة واضحة أو اخترها من جهازك، ثم راجع المعادلة يدويًا.</p>
          {image && <div className="image-preview"><img src={image} alt="معاينة المسألة" /><div><span><ImageIcon size={15} /> المعاينة فقط</span><button type="button" onClick={() => setImage(null)}><X size={14} /> إزالة</button></div></div>}
        </div>
        <div className="examples">
          <span className="text-slate-500">جرّب مثالًا:</span>
          {EXAMPLES.map((x) => (
            <button key={x} onClick={() => edit(x)}><Tex tex={x.replace(/س/g, '\\text{س}').replace('ص', '\\text{ص}')} /></button>
          ))}
        </div>

        <div role="radiogroup" aria-label="نوع المساعدة" className="mode-grid">
          {MODES.map(({ id, title, icon: Icon, desc }) => (
            <button key={id} role="radio" aria-checked={mode === id} onClick={() => { setMode(id); setRun(null) }}
              className={`mode-card ${mode === id ? 'selected' : ''}`}>
              <Icon size={20} className={mode === id ? 'text-brand' : 'text-slate-500'} />
              <p className="mt-2 font-bold">{title}</p><p className="mt-0.5 text-sm leading-6 text-slate-600">{desc}</p>
            </button>
          ))}
        </div>
        <button onClick={start} disabled={busy} className="start-button">
          <Play size={17} className="rotate-180" /> {busy ? 'جارٍ التحضير...' : 'ابدأ الحل'}
        </button>
        {err && <p role="alert" className="reveal mt-4 flex gap-2 rounded-xl bg-rose-50 p-3 text-sm leading-7 text-rose-800"><AlertCircle size={18} className="mt-1 shrink-0" />{err}</p>}
      </main>

      {run && (
        <section className="mt-6 space-y-3" key={run.id}>
          <div className="reveal result-heading">
            <span>الدالة كما فهمتُها:</span><Tex tex={`${Y} = ${tex(run.sol.f)}`} />
          </div>
          {run.mode === 'hint' && <HintResult sol={run.sol} onSteps={() => { setMode('steps'); setRun({ ...run, id: Date.now(), mode: 'steps' }) }} />}
          {run.mode === 'steps' && <StepByStep sol={run.sol} />}
          {run.mode === 'practice' && <Practice base={run.sol} />}
        </section>
      )}
      {run && <button className="edit-again" onClick={() => { setRun(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><RotateCcw size={15} /> تعديل المسألة</button>}
    </div>
  )
}
