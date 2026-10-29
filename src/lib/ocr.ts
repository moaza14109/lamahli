import { UserError } from '../math/parse'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const OCR_TIMEOUT_MS = 30_000

export async function extractMathEquation(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new UserError('ارفع صورة فقط بصيغة مدعومة.')
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new UserError('حجم الصورة لازم يكون أكبر من صفر وأقل من 10 ميجابايت.')
  }
  const apiUrl = import.meta.env.VITE_MATH_OCR_API_URL as string | undefined
  if (!apiUrl) {
    throw new UserError('ما في إعداد OCR رياضي مفعّل في هذا المشروع. استخدم المحرر اليدوي أو أضف خادم OCR رياضي في متغيرات البيئة VITE_MATH_OCR_API_URL.')
  }

  const form = new FormData()
  form.append('file', file)
  form.append('type', 'math')
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), OCR_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(apiUrl, { method: 'POST', body: form, signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new UserError('خدمة OCR اتأخرت زيادة عن اللزوم. راجع الاتصال وجرّب تاني.')
    }
    throw new UserError('تعذّر الاتصال بخدمة OCR. استخدم المحرر اليدوي أو جرّب تاني.')
  } finally {
    window.clearTimeout(timeout)
  }
  if (!res.ok) {
    throw new UserError('فشل استخراج المعادلة من الصورة. تحقق من خدمة OCR أو صورة المسألة.')
  }
  const payload = await res.json().catch(() => ({})) as { equation?: string; latex?: string; text?: string }
  const equation = payload.equation ?? payload.latex ?? payload.text
  if (!equation || typeof equation !== 'string' || !equation.trim()) {
    throw new UserError('الخدمة رجعت استجابة فارغة. راجع الصورة وادخل المعادلة يدويًا.')
  }
  return equation.trim()
}
