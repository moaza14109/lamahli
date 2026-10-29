import { useState } from 'react'
import { Sigma, Lightbulb, ListOrdered, Target, Play, AlertCircle, Upload, Image as ImageIcon } from 'lucide-react'
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

  const edit = (v: string) => { setLatex(v); setRun(null); setErr('') }
  const start = () => {
    try {
      setErr('')
      const sol = implicit ? solveImplicit(latex) : solve(parse(latex), variable)
      setRun({ id: Date.now(), mode, sol })
    }
    catch (e) { setRun(null); setErr(e instanceof UserError ? e.message : 'حدث خطأ غير متوقع أثناء الحساب. جرّب إعادة كتابة الدالة.') }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-2 py-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-brand text-white"><Sigma size={22} /></span>
          <div><h1 className="text-xl font-bold leading-6">لمّحلي</h1><p className="text-sm text-slate-500">افهم الاشتقاق خطوة بخطوة</p></div>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">مجاني · بدون تسجيل</span>
      </header>

      <section className="py-6 sm:py-8">
        <h2 className="text-2xl font-bold sm:text-3xl">واقف معاك في مسألة اشتقاق؟</h2>
        <p className="mt-2 text-slate-600">اكتب الدالة، واختار المساعدة اللي تناسبك.</p>
      </section>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(20,20,60,.04)] sm:p-6">
        <EquationEditor label="اكتب الدالة" value={latex} onChange={edit} />
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <label className="font-semibold text-slate-600" htmlFor="variable">اشتق بالنسبة إلى</label>
          <select id="variable" value={variable} onChange={(e) => setVariable(e.target.value as 'x' | 'y')} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
            <option value="x">س / x</option>
            <option value="y">ص / y</option>
          </select>
          <label className="inline-flex items-center gap-2 text-slate-600">
            <input type="checkbox" checked={implicit} onChange={(e) => setImplicit(e.target.checked)} />
            اشتقاق ضمني (اكتب معادلة فيها =)
          </label>
        </div>
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
            <Upload size={17} /> رفع صورة المسألة
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setImage(URL.createObjectURL(file))
              setErr('تمت معاينة الصورة. اكتب المعادلة المستخرجة في المحرر للتأكد منها قبل الاشتقاق؛ لا يتم تخمين النص من الصورة.')
            }} />
          </label>
          {image && <div className="mt-3 flex items-center gap-3"><img src={image} alt="معاينة المسألة" className="max-h-32 max-w-full rounded-lg object-contain" /><span className="text-xs text-slate-500"><ImageIcon size={15} className="inline" /> المعاينة فقط</span></div>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">جرّب مثالًا:</span>
          {EXAMPLES.map((x) => (
            <button key={x} onClick={() => edit(x)} className="rounded-lg bg-slate-100 px-2.5 py-1 hover:bg-indigo-50 hover:text-brand"><Tex tex={x.replace(/س/g, '\\text{س}').replace('ص', '\\text{ص}')} /></button>
          ))}
        </div>

        <div role="radiogroup" aria-label="نوع المساعدة" className="mt-6 grid gap-2 sm:grid-cols-3">
          {MODES.map(({ id, title, icon: Icon, desc }) => (
            <button key={id} role="radio" aria-checked={mode === id} onClick={() => { setMode(id); setRun(null) }}
              className={`rounded-2xl border p-3.5 text-start transition ${mode === id ? 'border-brand bg-indigo-50/60 ring-1 ring-brand' : 'border-slate-200 hover:border-slate-300'}`}>
              <Icon size={20} className={mode === id ? 'text-brand' : 'text-slate-500'} />
              <p className="mt-2 font-bold">{title}</p><p className="mt-0.5 text-sm leading-6 text-slate-600">{desc}</p>
            </button>
          ))}
        </div>
        <button onClick={start} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-bold text-white hover:bg-indigo-700 sm:w-auto sm:px-10">
          <Play size={16} className="rotate-180" /> ابدأ
        </button>
        {err && <p role="alert" className="reveal mt-4 flex gap-2 rounded-xl bg-rose-50 p-3 text-sm leading-7 text-rose-800"><AlertCircle size={18} className="mt-1 shrink-0" />{err}</p>}
      </div>

      {run && (
        <section className="mt-6 space-y-3" key={run.id}>
          <div className="reveal flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>الدالة كما فهمتُها:</span><Tex tex={`${Y} = ${tex(run.sol.f)}`} />
          </div>
          {run.mode === 'hint' && <HintResult sol={run.sol} onSteps={() => { setMode('steps'); setRun({ ...run, id: Date.now(), mode: 'steps' }) }} />}
          {run.mode === 'steps' && <StepByStep sol={run.sol} />}
          {run.mode === 'practice' && <Practice base={run.sol} />}
        </section>
      )}
    </div>
  )
}
