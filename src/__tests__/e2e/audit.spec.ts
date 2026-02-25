import { test, expect } from '@playwright/test'

test('audit page renders for valid lead', async ({ page, request }) => {
  const capture = await request.post('/api/capture', {
    data: { org: 'E2E Audit Org', email: 'e2e-audit@connai.test' },
  })
  const { lead_id } = await capture.json()
  await page.goto(`/audit/${lead_id}`)
  await expect(page.locator('body')).not.toContainText('404')
  await expect(page.locator('body')).not.toContainText('Internal Server Error')
})
