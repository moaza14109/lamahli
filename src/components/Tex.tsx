import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

export function Tex({ tex, block }: { tex: string; block?: boolean }) {
  const html = useMemo(() => katex.renderToString(tex, { displayMode: !!block, throwOnError: false, strict: 'ignore' }), [tex, block])
  return <span dir="ltr" className={`${block ? 'block overflow-x-auto py-1 text-center' : 'inline-block'} math-output`} role="math" dangerouslySetInnerHTML={{ __html: html }} />
}
