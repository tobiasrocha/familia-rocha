import { describe, it, expect } from 'vitest'

const formatarMoeda = (val) => Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

describe('formatarMoeda', () => {
  it('formata valores positivos corretamente', () => {
    expect(formatarMoeda(1000)).toBe('R$\u00a01.000,00')
  })

  it('formata zero', () => {
    expect(formatarMoeda(0)).toBe('R$\u00a00,00')
  })

  it('formata valores decimais', () => {
    expect(formatarMoeda(99.9)).toBe('R$\u00a099,90')
  })

  it('formata valores negativos', () => {
    expect(formatarMoeda(-500)).toBe('-R$\u00a0500,00')
  })
})
