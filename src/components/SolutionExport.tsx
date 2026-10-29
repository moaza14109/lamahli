import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { toBlob } from 'html-to-image'
import { Tex } from './Tex'
import { HigherSolution, ParametricSolution, PointSolution, Solution, Y, tex } from '../math/diff'

type ExportData = {
  base?: Solution
  higher?: HigherSolution
  parametric?: ParametricSolution
  point?: PointSolution
}

export function SolutionExport({ data }: { data: ExportData }) {
  const ref = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [message, setMessage] = useState('')

  const download = async () => {
    if (!ref.current || busy) return
    const node = ref.current
    const originalStyles = node.style.cssText
    try {
      setBusy(true)
      setMessage('')
      setRendering(true)
      await document.fonts?.ready
      await waitForImages(node)
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      const { width: renderedWidth, height: renderedHeight } = node.getBoundingClientRect()
      const width = Math.ceil(Math.max(renderedWidth, node.scrollWidth, node.offsetWidth))
      const height = Math.ceil(Math.max(renderedHeight, node.scrollHeight, node.offsetHeight))
      if (width <= 0 || height <= 0) throw new Error('Export element has no size')
      node.style.cssText = `${originalStyles}; position: fixed; inset: 0 auto auto 0; z-index: 9999; opacity: 1; visibility: visible; pointer-events: none; width: ${width}px; min-width: ${width}px; height: ${height}px; max-width: none; max-height: none; transform: none; display: block; background: #ffffff;`
      const blob = await toBlob(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width,
        height,
        skipFonts: false,
      })
      if (!blob || blob.size === 0) throw new Error('Export produced an empty image')
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.download = 'lamhly-solution.png'
      link.href = url
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      setMessage('الصورة جاهزة، تقدر تحفظها أو تبعتها.')
    } catch (error) {
      console.error('Failed to export solution image', error)
      setMessage('ماقدرناش نجهّز الصورة دلوقتي. جرّب تاني بعد لحظات.')
    } finally {
      node.style.cssText = originalStyles
      setRendering(false)
      setBusy(false)
    }
  }

  return (
    <div className="export-area" dir="rtl" lang="ar">
      <div ref={ref} className={`solution-export ${rendering ? 'solution-export-rendering' : ''}`} dir="rtl" lang="ar">
        <header className="solution-export-header">
          <div><strong>اشتقّها</strong><span>حل مسألة اشتقاق</span></div>
          <span className="solution-export-mark">∂</span>
        </header>
        {data.base && <BaseExport sol={data.base} />}
        {data.higher && <HigherExport sol={data.higher} />}
        {data.parametric && <ParametricExport sol={data.parametric} />}
        {data.point && <PointExport sol={data.point} />}
        <footer>حلّك اتراجع حسابيًا قبل ما يظهر — اشتقّها</footer>
      </div>
      <button className="download-button" type="button" onClick={download} disabled={busy}>
        <Download size={17} /> {busy ? 'جاري تجهيز الصورة...' : 'تحميل الحل'}
      </button>
      {message && <p className="export-message" role="status">{message}</p>}
    </div>
  )
}

async function waitForImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(images.map(async (image) => {
    if (!image.complete) {
      await new Promise<void>((resolve, reject) => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => reject(new Error('An export image failed to load')), { once: true })
      })
    }
    if (image.naturalWidth === 0) throw new Error('An export image has no usable dimensions')
    await image.decode?.()
  }))
}

function BaseExport({ sol }: { sol: Solution }) {
  return <section>
    <div className="export-source"><span>الدالة الأصلية</span><Tex block tex={`${Y} = ${tex(sol.f)}`} /></div>
    <p className="export-rule">القاعدة المستخدمة: {sol.rule}</p>
    <div className="export-steps">{sol.steps.map((step, index) => <article key={`${step.title}-${index}`}>
      <h3>الخطوة {index + 1}: {step.title.replace(/^الخطوة الأولى:\s*/, '')}</h3>
      {step.why && <p>{step.why}</p>}
      <Tex block tex={step.tex} />
    </article>)}</div>
    <div className="export-final"><h3>الناتج النهائي</h3><Tex block tex={`${Y}' = ${tex(sol.result)}`} />{sol.note && <p>{sol.note}</p>}</div>
  </section>
}

function HigherExport({ sol }: { sol: HigherSolution }) {
  return <section><div className="export-source"><span>الدالة الأصلية</span><Tex block tex={`${Y} = ${tex(sol.f)}`} /></div>
    <div className="export-steps">{sol.derivatives.map((derivative, index) => <article key={index}><h3>المشتقة رقم {index + 1}</h3><Tex block tex={`${Y}^{(${index + 1})} = ${tex(derivative)}`} /></article>)}</div>
    <div className="export-final"><h3>المشتقة المطلوبة</h3><Tex block tex={`${Y}^{(${sol.order})} = ${tex(sol.derivatives[sol.order - 1])}`} /></div>
  </section>
}

function ParametricExport({ sol }: { sol: ParametricSolution }) {
  return <section><div className="export-source"><span>الاشتقاق البارامتري</span><Tex block tex={`س = ${tex(sol.x)},\\quad ص = ${tex(sol.y)}`} /></div>
    <div className="export-steps"><article><h3>المشتقات بالنسبة للمتغير الوسيط</h3><Tex block tex={`\\frac{\\text{د س}}{\\text{د ل}}=${tex(sol.dx)},\\quad \\frac{\\text{د ص}}{\\text{د ل}}=${tex(sol.dy)}`} /></article></div>
    <div className="export-final"><h3>الناتج</h3><Tex block tex={`\\frac{\\text{د ص}}{\\text{د س}}=\\frac{${tex(sol.dy)}}{${tex(sol.dx)}}=${tex(sol.first)}`} />{sol.second && <Tex block tex={`\\frac{\\text{د}^{2}\\text{ص}}{\\text{د س}^{2}}=${tex(sol.second)}`} />}</div>
  </section>
}

function PointExport({ sol }: { sol: PointSolution }) {
  return <section><div className="export-source"><span>الحل عند النقطة</span><Tex block tex={`${Y} = ${tex(sol.f)},\\quad (س,ص)=(${sol.x},${sol.y})`} /></div>
    <div className="export-final"><h3>الناتج</h3><Tex block tex={`ميل المماس = ${sol.slope}`} /><Tex block tex={sol.vertical ? `المعادلة: \\text{س} = ${tex(sol.equation)}` : `المعادلة: ${Y} = ${tex(sol.equation)}`} /></div>
  </section>
}
