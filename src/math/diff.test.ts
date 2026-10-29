import { describe, expect, it } from 'vitest'
import { derive, ev, same, similar, solve, solveHigher, solveImplicit, solveParametric, solvePointApplication, tex } from './diff'
import { parse, parseRelation, UserError } from './parse'

function expectDerivative(source: string, expected: string, variable = 'x') {
  const actual = derive(parse(source), variable)
  const expectedNode = parse(expected)
  expect(same(actual, expectedNode)).toBe(true)
  expect(tex(actual)).toBeTruthy()
}

describe('الاشتقاق', () => {
  it('يشتق كثيرات الحدود والقوى بالشكل الصحيح', () => {
    const result = solve(parse('س^3 + 2س + 5'), 'x')
    expect(same(result.result, parse('3*س^2 + 2'))).toBe(true)
  })

  it('يشتق الدوال المثلثية والكسور بشكل صحيح', () => {
    const result = solve(parse('جا(س)/جتا(س)'), 'x')
    expect(same(result.result, parse('(1 + ظا(س)^2)'))).toBe(true)
  })

  it('يشتق ضمنيًا بعد تحويل المعادلة العربية', () => {
    const result = solveImplicit('ص^2 + س^2 = 1')
    expect(same(result.result, parse('-س/ص'))).toBe(true)
  })

  it('يشتق بارامترية من دوال بسيطة', () => {
    const result = solveParametric(parse('ل^2'), parse('2*ل'), false)
    expect(same(result.first, parse('1/ل'))).toBe(true)
  })
})

describe('تحويل الرموز العربية', () => {
  it('يتعرف على الأسماء العربية للمتغيرات والدوال', () => {
    const expr = parse('ص = جا(س)')
    expect(same(expr, parse('جا(س)'))).toBe(true)
  })

  it('يقبل المعادلة العربية مع علامات التساوي', () => {
    const relation = parseRelation('ص² + س² = 1')
    expect(same(relation.left, parse('ص^2 + س^2'))).toBe(true)
    expect(same(relation.right, parse('1'))).toBe(true)
  })
})

describe('regression rules', () => {
  it('handles nested parentheses, products, and negative powers', () => {
    expectDerivative('(س^2 + 1)^3', '6*(س^2 + 1)^2*س')
    expectDerivative('س^(-2)', '-2*س^(-3)')
    expectDerivative('(س+1)/(س-1)', '-2/(س-1)^2')
  })

  it('handles roots and inverse trigonometric functions', () => {
    expectDerivative('\\sqrt{س}', '1/(2*\\sqrt{س})')
    expectDerivative('asin(س)', '1/(1-س^2)^0.5')
    expectDerivative('acos(س)', '-1/(1-س^2)^0.5')
    expectDerivative('atan(س)', '1/(1+س^2)')
  })

  it('handles logarithmic and reciprocal trigonometric functions', () => {
    expectDerivative('ln(س)', '1/س')
    expectDerivative('log(س)', '1/(2.302585092994046*س)')
    expectDerivative('tan(س)', 'sec(س)^2')
    expectDerivative('cot(س)', '-csc(س)^2')
    expectDerivative('sec(س)', 'sec(س)*tan(س)')
    expectDerivative('csc(س)', '-csc(س)*cot(س)')
  })

  it('supports differentiation with respect to y', () => {
    expectDerivative('ص^3 + 2ص', '3*ص^2 + 2', 'y')
  })

  it('keeps the selected variable when generating practice questions', () => {
    const solution = solve(parse('ص^3 + 2ص'), 'y')
    const practice = similar(solution.f, solution.variable)
    expect(practice.variable).toBe('y')
    expect(practice.result).toBeTruthy()
  })

  it('rejects unsupported higher-derivative orders', () => {
    expect(() => solveHigher(parse('س^2'), 0)).toThrow(UserError)
    expect(() => solveHigher(parse('س^2'), 6)).toThrow(UserError)
  })

  it('supports implicit equations with multiple terms and exposes real steps', () => {
    const result = solveImplicit('ص^2 + 3*س*ص + س^2 = 4')
    expect(same(result.result, parse('-(3*ص + 2*س)/(2*ص + 3*س)'))).toBe(true)
    expect(result.steps.map((step) => step.title)).toEqual([
      'نرتّب المعادلة',
      'نشتق الطرفين',
      'نجمع حدود المشتقة',
      'نعزل المشتقة',
      'نبسّط الناتج',
    ])
    expect(result.steps[1].tex).toContain('\\frac{\\text{د ص}}{\\text{د س}}')
    expect(result.steps[2].tex).not.toBe(result.steps[4].tex)
  })

  it('supports second-order parametric derivatives', () => {
    const result = solveParametric(parse('ل^2'), parse('ل^3'), true)
    expect(ev(result.first, 2)).toBeCloseTo(3)
    expect(result.second && ev(result.second, 2)).toBeCloseTo(0.375)
  })

  it('calculates tangent and normal applications', () => {
    const tangent = solvePointApplication(parse('س^2'), 2, 'tangent')
    expect(tangent.slope).toBe(4)
    expect(tangent.vertical).toBeUndefined()
    const normal = solvePointApplication(parse('س^2'), 0, 'normal')
    expect(normal.vertical).toBe(true)
    expect(normal.equation).toEqual({ t: 'n', v: 0 })
  })

  it('rejects undefined values and singular denominators', () => {
    expect(ev(parse('1/0'), 1)).toBe(Infinity)
    expect(ev(parse('ln(0)'), 1)).toBe(-Infinity)
    expect(() => solvePointApplication(parse('1/س'), 0, 'tangent')).toThrow(UserError)
    expect(() => solveImplicit('ص^2 + س = ص^2 + 1')).toThrow(UserError)
  })

  it('accepts mixed Arabic and Latin input', () => {
    expectDerivative('y = sin(x^2)', '2*cos(x^2)*x')
    expectDerivative('ص = جا(x^2)', '2*جتا(x^2)*x')
  })
})
