import { useEffect, useRef, useState } from 'react'
import { MathfieldElement } from 'mathlive'
import { ChevronDown, Eraser, Keyboard, X } from 'lucide-react'

MathfieldElement.fontsDirectory = import.meta.env.BASE_URL + 'fonts'
MathfieldElement.soundsDirectory = null

const KEY_GROUPS: { label: string; keys: [string, string][] }[] = [
  { label: 'الأساسيات', keys: [
    ['س', 'س'], ['ص', 'ص'], ['x²', '#@^{2}'], ['xⁿ', '#@^{#?}'], ['كسر', '\\frac{#@}{#?}'], ['√', '\\sqrt{#?}'],
    ['( )', '\\left(#@\\right)'], ['+', '+'], ['−', '-'], ['×', '\\cdot '], ['=', '='],
  ] },
  { label: 'الدوال المثلثية', keys: [
  ['جا', '\\sin\\left(#?\\right)'], ['جتا', '\\cos\\left(#?\\right)'], ['ظا', '\\tan\\left(#?\\right)'],
  ['ظتا', '\\cot\\left(#?\\right)'], ['قا', '\\sec\\left(#?\\right)'], ['قتا', '\\csc\\left(#?\\right)'],
  ] },
  { label: 'دوال إضافية', keys: [
  ['asin', '\\arcsin\\left(#?\\right)'], ['acos', '\\arccos\\left(#?\\right)'], ['atan', '\\arctan\\left(#?\\right)'],
  ['هـˣ', '\\exp\\left(#?\\right)'], ['ln', '\\ln\\left(#?\\right)'],
  ] },
]

interface Props { label: string; value: string; onChange: (latex: string) => void; initial?: string; onEnter?: () => void }

export function EquationEditor({ label, value, onChange, onEnter }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const mf = useRef<MathfieldElement | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(true)
  const [activeGroup, setActiveGroup] = useState(0)
  const cb = useRef({ onChange, onEnter })
  cb.current = { onChange, onEnter }

  useEffect(() => {
    const el = new MathfieldElement()
    // Keep the browser's own keyboard available without forcing MathLive's large
    // virtual keyboard over the result on small screens.
    el.mathVirtualKeyboardPolicy = 'manual'
    el.setAttribute('aria-label', label)
    el.style.cssText = 'width:100%;min-height:4.5rem;font-size:clamp(1.55rem, 6vw, 2rem);padding:.9rem 1rem;border:1px solid #dcdfee;border-radius:14px;background:#fff;direction:ltr;--caret-color:#5b4cf0;--selection-background-color:#e3e0ff'
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
      <div className="editor-label">
        <span>{label}</span>
        <div className="flex items-center gap-1">
        <button type="button" onClick={() => { mf.current?.focus(); setPaletteOpen((open) => !open) }} className="editor-tool">
          <Keyboard size={16} /> {paletteOpen ? 'إخفاء الرموز' : 'لوحة الرموز'}
        </button>
        <button type="button" onClick={() => { onChange(''); mf.current?.focus() }} className="editor-tool">
          <Eraser size={15} /> مسح
        </button>
        </div>
      </div>
      <div ref={host} dir="ltr" className="math-editor" />
      {paletteOpen && <div className="symbol-panel" aria-label="لوحة الرموز الرياضية">
        <div className="symbol-tabs" role="tablist">
          {KEY_GROUPS.map((group, index) => <button key={group.label} role="tab" aria-selected={activeGroup === index}
            className={activeGroup === index ? 'active' : ''} onClick={() => setActiveGroup(index)}>{group.label}</button>)}
          <button className="symbol-close" aria-label="إغلاق لوحة الرموز" onClick={() => setPaletteOpen(false)}><X size={16} /></button>
        </div>
        <div className="symbol-grid">
          {KEY_GROUPS[activeGroup].keys.map(([t, l]) => (
            <button key={t} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(l)}>{t}</button>
          ))}
        </div>
        <p className="symbol-tip"><ChevronDown size={14} /> اضغط داخل المعادلة أولًا للحفاظ على موضع المؤشر</p>
      </div>}
    </div>
  )
}
