import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'node:child_process'

const BASE = 'http://localhost:3001'

let server

beforeAll(async () => {
  server = spawn('node', ['server.js'], {
    cwd: import.meta.dirname,
    env: { ...process.env, PORT: '3001' },
    stdio: 'ignore',
  })
  // espera o servidor subir
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('servidor nao iniciou')), 15000)
    const check = async () => {
      try {
        await fetch(`${BASE}/api`)
        clearTimeout(timeout)
        resolve()
      } catch {
        setTimeout(check, 500)
      }
    }
    setTimeout(check, 1000)
  })
}, 20000)

afterAll(() => {
  if (server) server.kill()
})

describe('API familiarocha', () => {
  it('GET /api responde', async () => {
    const res = await fetch(`${BASE}/api`)
    expect(res.status).toBeLessThan(500)
  })

  it('POST /api/disparar-alertas responde JSON', async () => {
    const res = await fetch(`${BASE}/api/disparar-alertas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    expect(data).toBeDefined()
  })
})
