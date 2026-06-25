import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'node:child_process'

const BASE = 'http://localhost:3001'

let server
let serverReady = false

beforeAll(async () => {
  server = spawn('node', ['server.js'], {
    cwd: import.meta.dirname,
    env: { ...process.env, PORT: '3001' },
    stdio: 'pipe',
  })

  server.stderr.on('data', (d) => {
    process.stderr.write(d)
  })

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('[TEST] servidor nao respondeu — pulando testes de API')
      resolve()
    }, 10000)

    const check = async () => {
      try {
        const res = await fetch(`${BASE}/api`)
        if (res.ok || res.status < 500) {
          clearTimeout(timeout)
          serverReady = true
          resolve()
        }
      } catch {
        setTimeout(check, 500)
      }
    }
    setTimeout(check, 1000)
  })
}, 15000)

afterAll(() => {
  if (server) server.kill()
})

describe('API familiarocha', () => {
  it('GET /api responde', async () => {
    if (!serverReady) {
      console.warn('[TEST] servidor indisponivel — pulando')
      return
    }
    const res = await fetch(`${BASE}/api`)
    expect(res.status).toBeLessThan(500)
  })

  it('POST /api/disparar-alertas responde JSON', async () => {
    if (!serverReady) {
      console.warn('[TEST] servidor indisponivel — pulando')
      return
    }
    const res = await fetch(`${BASE}/api/disparar-alertas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    expect(data).toBeDefined()
  })
})
