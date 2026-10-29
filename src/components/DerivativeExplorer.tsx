import { useMemo, useRef, useState } from 'react'
import { AlertCircle, RefreshCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { EquationEditor } from './EquationEditor'
import { Tex } from './Tex'
import { derive, ev, tex } from '../math/diff'
import { N, parse, UserError } from '../math/parse'

type Point = { x: number; y: number }
type Segment = Point[]

const INITIAL = 'ص=س^2'
const WIDTH = 720
const HEIGHT = 420

function finite(value: number): value is number {
  return Number.isFinite(value) && Math.abs(value) < 1e6
}

function graphSegments(expression: N, derivative: N | null, min: number, max: number, scale = 1): { curve: Segment[]; derivative: Segment[] } {
  const count = Math.max(160, Math.round(240 * scale))
  const yBound = Math.max(5, max - min) * 0.7
  const curve: Segment[] = []
  const derivativeSegments: Segment[] = []
  let current: Segment = []
  let currentDerivative: Segment = []
  for (let i = 0; i <= count; i++) {
    const x = min + ((max - min) * i) / count
    const y = ev(expression, x)
    const dy = derivative ? ev(derivative, x) : NaN
    if (finite(y) && Math.abs(y) <= yBound) current.push({ x, y })
    else if (current.length) { curve.push(current); current = [] }
    if (derivative && finite(dy) && Math.abs(dy) <= yBound) currentDerivative.push({ x, y: dy })
    else if (currentDerivative.length) { derivativeSegments.push(currentDerivative); currentDerivative = [] }
  }
  if (current.length) curve.push(current)
  if (currentDerivative.length) derivativeSegments.push(currentDerivative)
  return { curve, derivative: derivativeSegments }
}

function pathFor(points: Segment, sx: (x: number) => number, sy: (y: number) => number): string {
  return points.map((point, index) => `${index ? 'L' : 'M'} ${sx(point.x).toFixed(2)} ${sy(point.y).toFixed(2)}`).join(' ')
}

function formatNumber(value: number): string {
  if (Math.abs(value) < 1e-10) return '٠'
  return Number(value.toFixed(3)).toLocaleString('ar-EG', { maximumFractionDigits: 3 })
}

function explanation(slope: number, x: number, previousSlope: number | null): string {
  if (Math.abs(slope) < 0.05) return 'المماس هنا شبه أفقي، يعني الميل قريب من الصفر.'
  if (slope > 0) return previousSlope !== null && slope > previousSlope + 0.08
    ? 'لاحظ إن ميل المماس بيزيد وإنت بتحرك النقطة ناحية اليمين.'
    : 'بص، الميل موجب هنا، يعني الدالة بتزيد وإنت ماشي ناحية اليمين.'
  return 'خلي بالك، الميل سالب، يعني الدالة بتقل في الجزء ده.'
}

export function DerivativeExplorer() {
  const [source, setSource] = useState(INITIAL)
  const [expression, setExpression] = useState<N>(() => parse(INITIAL))
  const [derivative, setDerivative] = useState<N>(() => derive(parse(INITIAL)))
  const [x, setX] = useState(1.5)
  const [range, setRange] = useState(6)
  const [showDerivative, setShowDerivative] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [previousSlope, setPreviousSlope] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const y = ev(expression, x)
  const slope = ev(derivative, x)
  const validPoint = finite(y) && finite(slope)
  const graph = useMemo(() => graphSegments(expression, derivative, -range, range), [expression, derivative, range])
  const yRange = Math.max(5, range)
  const sx = (value: number) => ((value + range) / (2 * range)) * WIDTH
  const sy = (value: number) => HEIGHT / 2 - (value / yRange) * (HEIGHT / 2 - 28)
  const point = validPoint ? { cx: sx(x), cy: sy(y) } : null
  const tangent = validPoint ? `M 0 ${sy(y + slope * (-range - x))} L ${WIDTH} ${sy(y + slope * (range - x))}` : ''

  const draw = () => {
    try {
      const next = parse(source)
      const nextDerivative = derive(next)
      setExpression(next)
      setDerivative(nextDerivative)
      setError('')
      setX(Math.max(-range + 0.1, Math.min(range - 0.1, x)))
      setPreviousSlope(null)
    } catch (e) {
      setError(e instanceof UserError ? e.message : 'مش قادر أفهم الدالة دي. راجع كتابتها وجرّب تاني.')
    }
  }

  const moveTo = (clientX: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const next = ((clientX - rect.left) / rect.width) * (2 * range) - range
    const bounded = Math.max(-range + 0.05, Math.min(range - 0.05, next))
    const nextSlope = ev(derivative, bounded)
    setPreviousSlope(validPoint ? slope : null)
    setX(bounded)
    if (!finite(nextSlope)) setError('الدالة أو المشتقة مش معرّفة عند النقطة دي.')
    else setError('')
  }

  const updateX = (value: number) => {
    setPreviousSlope(validPoint ? slope : null)
    setX(value)
    if (!finite(ev(expression, value)) || !finite(ev(derivative, value))) setError('الدالة أو المشتقة مش معرّفة عند النقطة دي.')
    else setError('')
  }

  return <section className="explorer reveal" aria-labelledby="explorer-title">
    <div className="explorer-heading">
      <div><p className="eyebrow">تجربة تفاعلية</p><h3 id="explorer-title">شوف المشتقة بعينك</h3><p>حرّك النقطة وشوف الدالة والمماس والميل بيتغيروا إزاي.</p></div>
      <button className="explorer-reset" type="button" onClick={() => { setRange(6); setX(1.5) }}><RefreshCcw size={16} /> إعادة الضبط</button>
    </div>
    <div className="explorer-input"><EquationEditor label="اكتب الدالة اللي عايز تستكشفها" value={source} onChange={(value) => { setSource(value); setError('') }} onEnter={draw} /><button className="start-button" type="button" onClick={draw}>ارسم الدالة</button></div>
    {error && <p className="explorer-error" role="alert"><AlertCircle size={18} /> {error}</p>}
    <div className="explorer-layout">
      <div className="graph-card">
        <div className="graph-toolbar"><label>قيمة س <input type="range" min={-range + 0.05} max={range - 0.05} step="0.01" value={x} onChange={(event) => updateX(Number(event.target.value))} /></label><span>{formatNumber(x)}</span><button type="button" onClick={() => setRange(Math.max(3, range - 1))} aria-label="صغّر الرسم"><ZoomOut size={17} /></button><button type="button" onClick={() => setRange(Math.min(12, range + 1))} aria-label="كبّر الرسم"><ZoomIn size={17} /></button></div>
        <svg ref={svgRef} className="function-graph" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="رسم الدالة وخط المماس" onPointerMove={(event) => { if (dragging) moveTo(event.clientX) }} onPointerUp={() => setDragging(false)} onPointerLeave={() => setDragging(false)}>
          <rect width={WIDTH} height={HEIGHT} fill="#fbfcff" />
          {Array.from({ length: 13 }, (_, index) => -6 + index).filter((value) => Math.abs(value) <= range).map((value) => <g key={`grid-x-${value}`}><line x1={sx(value)} x2={sx(value)} y1="0" y2={HEIGHT} className="graph-grid" /><text x={sx(value)} y={HEIGHT - 8} className="graph-label">{value}</text></g>)}
          {Array.from({ length: 13 }, (_, index) => -6 + index).filter((value) => Math.abs(value) <= yRange).map((value) => <g key={`grid-y-${value}`}><line x1="0" x2={WIDTH} y1={sy(value)} y2={sy(value)} className="graph-grid" /><text x="7" y={sy(value) - 5} className="graph-label">{value}</text></g>)}
          <line x1="0" x2={WIDTH} y1={sy(0)} y2={sy(0)} className="graph-axis" /><line x1={sx(0)} x2={sx(0)} y1="0" y2={HEIGHT} className="graph-axis" />
          {graph.curve.map((segment, index) => <path key={`curve-${index}`} d={pathFor(segment, sx, sy)} className="function-curve" />)}
          {showDerivative && graph.derivative.map((segment, index) => <path key={`derivative-${index}`} d={pathFor(segment, sx, sy)} className="derivative-curve" />)}
          {point && <><path d={tangent} className="tangent-line" /><circle cx={point.cx} cy={point.cy} r="8" className="point-handle" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(true) }} /><circle cx={point.cx} cy={point.cy} r="14" className="point-hit-area" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(true) }} /></>}
          <text x={WIDTH - 18} y={sy(0) - 10} className="axis-name">س</text><text x={sx(0) + 10} y="18" className="axis-name">ص</text>
        </svg>
        <div className="graph-legend"><span><i className="legend-dot function-dot" /> الدالة الأصلية</span><span><i className="legend-dot tangent-dot" /> المماس</span>{showDerivative && <span><i className="legend-dot derivative-dot" /> المشتقة</span>}</div>
      </div>
      <aside className="explorer-info">
        <label className="derivative-toggle"><input type="checkbox" checked={showDerivative} onChange={(event) => setShowDerivative(event.target.checked)} /> اعرض منحنى المشتقة</label>
        {validPoint ? <><div className="point-values"><p>عند النقطة الحالية</p><Tex block tex={`س = ${tex({ t: 'n', v: x })}`} /><Tex block tex={`ص = ${tex({ t: 'n', v: y })}`} /><Tex block tex={`ص' = ${tex({ t: 'n', v: slope })}`} /><p className="tangent-equation">معادلة المماس</p><Tex block tex={`ص = ${tex({ t: 'n', v: slope })}س ${y - slope * x >= 0 ? '+' : '-'} ${tex({ t: 'n', v: Math.abs(y - slope * x) })}`} /></div><p className="explorer-explanation">{explanation(slope, x, previousSlope)}</p></> : <p className="explorer-error">المماس مش معرّف عند النقطة دي، جرّب تحركها لمكان تاني.</p>}
        <p className="explorer-note">الرسم بيقطع المنحنى عند القيم اللي الدالة مش معرّفة فيها، عشان ما يوصّلش أجزاء منفصلة ببعض.</p>
      </aside>
    </div>
  </section>
}
