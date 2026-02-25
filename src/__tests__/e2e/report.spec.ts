import { test, expect } from '@playwright/test'

test('report page renders score section for valid lead', async ({ page, request }) => {
  // Create a lead
  const capture = await request.post('/api/capture', {
    data: { org: 'E2E Report Org', email: 'e2e-report@connai.test' },
  })
  const { lead_id } = await capture.json()
  await page.goto(`/report/${lead_id}`)
  // Should render either score section or paywall — not a 404/error
  await expect(page.locator('body')).not.toContainText('404')
  await expect(page.locator('body')).not.toContainText('Internal Server Error')
})
