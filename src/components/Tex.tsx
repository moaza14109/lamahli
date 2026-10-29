import { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

export function Tex({ tex, block }: { tex: string; block?: boolean }) {
  const [copied, setCopied] = useState(false)
  const stacked = /(^|[^\\])=/.test(tex)
  const renderedTex = stacked
    ? `\\begin{aligned}${tex.split('=').map((part, index) => index === 0 ? part : `= ${part}`).join(' \\\\ ')}\\end{aligned}`
    : tex
  const html = useMemo(() => katex.renderToString(renderedTex, { displayMode: !!block || stacked, throwOnError: false, strict: 'ignore' }), [renderedTex, block, stacked])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tex)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return <span dir="rtl" lang="ar" className={block ? 'math-output-block math-output-with-copy' : 'math-output-inline'}>
    <span dir="rtl" lang="ar" className={`${block || stacked ? 'block overflow-x-auto py-1 text-right' : 'inline-block'} math-output`} role="math" dangerouslySetInnerHTML={{ __html: html }} />
    {block && <button type="button" className="copy-equation" onClick={copy} aria-label="نسخ المعادلة">
      {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'تم النسخ' : 'نسخ المعادلة'}
    </button>}
  </span>
}
