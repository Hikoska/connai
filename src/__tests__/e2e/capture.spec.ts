import { test, expect } from '@playwright/test'

test('POST /api/capture returns token and lead_id', async ({ request }) => {
  const res = await request.post('/api/capture', {
    data: { org: 'E2E Test Org', email: 'e2e-test@connai.test' },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body).toHaveProperty('token')
  expect(body).toHaveProperty('lead_id')
  expect(typeof body.token).toBe('string')
  expect(body.token.length).toBeGreaterThan(8)
})
