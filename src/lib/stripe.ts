// Phase 1 stub — Stripe integration added in Phase 2
export const stripe = {
  checkout: { sessions: { create: async () => ({ url: '' }) } },
  webhooks: { constructEvent: () => ({ type: '', data: { object: {} } }) },
}
