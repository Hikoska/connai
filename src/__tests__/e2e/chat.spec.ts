import { test, expect } from '@playwright/test'

test('POST /api/chat returns streamed AI response', async ({ request }) => {
  const res = await request.post('/api/chat', {
    data: { messages: [{ role: 'user', content: 'Hello' }] },
  })
  expect(res.status()).toBe(200)
  const contentType = res.headers()['content-type'] ?? ''
  expect(contentType).toMatch(/text\//)
})
