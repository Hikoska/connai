import { test, expect } from '@playwright/test'

test('interview chat UI loads and accepts input', async ({ page, request }) => {
  // 1. Create a fresh lead + interview session
  const capture = await request.post('/api/capture', {
    data: { org: 'E2E Interview Org', email: 'e2e-interview@connai.test' },
  })
  expect(capture.status()).toBe(200)
  const { token } = await capture.json()

  // 2. Navigate to interview page
  await page.goto(`/interview/${token}`)

  // 3. Wait for chat to load (header visible)
  await expect(page.getByText('Connai AI Interviewer')).toBeVisible({ timeout: 10000 })

  // 4. Chat input visible
  const textarea = page.locator('textarea[placeholder="Type your answer..."]')
  await expect(textarea).toBeVisible()

  // 5. Type a message and send
  await textarea.fill('We are a mid-size retail company')
  await page.keyboard.press('Enter')

  // 6. AI response appears (thinking dots → message)
  await expect(page.locator('.justify-start .bg-white').last()).toBeVisible({ timeout: 15000 })
})
