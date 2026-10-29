import { useEffect, useRef } from 'react'
import { MathfieldElement } from 'mathlive'
import { Eraser } from 'lucide-react'

MathfieldElement.fontsDirectory = import.meta.env.BASE_URL + 'fonts'
MathfieldElement.soundsDirectory = null

const KEYS: [string, string][] = [
  ['س', 'س'], ['ص', 'ص'], ['x²', '#@^{2}'], ['xⁿ', '#@^{#?}'], ['كسر', '\\frac{#@}{#?}'], ['√', '\\sqrt{#?}'],
  ['جا', '\\sin\\left(#?\\right)'], ['جتا', '\\cos\\left(#?\\right)'], ['ظا', '\\tan\\left(#?\\right)'],
  ['ظتا', '\\cot\\left(#?\\right)'], ['قا', '\\sec\\left(#?\\right)'], ['قتا', '\\csc\\left(#?\\right)'],
  ['asin', '\\arcsin\\left(#?\\right)'], ['acos', '\\arccos\\left(#?\\right)'], ['atan', '\\arctan\\left(#?\\right)'],
  ['هـˣ', '\\exp\\left(#?\\right)'], ['ln', '\\ln\\left(#?\\right)'],
  ['( )', '\\left(#@\\right)'], ['+', '+'], ['−', '-'], ['×', '\\cdot '], ['=', '='],
]

interface Props { label: string; value: string; onChange: (latex: string) => void; initial?: string; onEnter?: () => void }

export function EquationEditor({ label, value, onChange, onEnter }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const mf = useRef<MathfieldElement | null>(null)
  const cb = useRef({ onChange, onEnter })
  cb.current = { onChange, onEnter }

  useEffect(() => {
    const el = new MathfieldElement()
    el.mathVirtualKeyboardPolicy = 'manual'
    el.style.cssText = 'width:100%;font-size:1.7rem;padding:.75rem 1rem;border:1px solid #dcdfee;border-radius:12px;background:#fff;direction:ltr;--caret-color:#5b4cf0;--selection-background-color:#e3e0ff'
    el.value = value
    el.addEventListener('input', () => cb.current.onChange(el.value))
    el.addEventListener('keydown', (ev) => { if ((ev as KeyboardEvent).key === 'Enter') cb.current.onEnter?.() })
    host.current!.appendChild(el)
    mf.current = el
    return () => el.remove()
  }, [])

  useEffect(() => { if (mf.current && mf.current.value !== value) mf.current.value = value }, [value])

  const insert = (l: string) => { mf.current?.insert(l, { focus: true, format: 'latex' }); onChange(mf.current?.value ?? '') }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-600">{label}</span>
        <button type="button" onClick={() => { onChange(''); mf.current?.focus() }} className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">
          <Eraser size={15} /> مسح
        </button>
      </div>
      <div ref={host} dir="ltr" className="math-editor" />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {KEYS.map(([t, l]) => (
          <button key={t} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(l)}
            className="min-w-10 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-base hover:border-brand hover:text-brand">{t}</button>
        ))}
      </div>
    </div>
  )
}
