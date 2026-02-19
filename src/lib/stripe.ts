import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export const PACK_PRICES: Record<string, { amount: number; credits: number; name: string }> = {
  starter:    { amount: 50000,  credits: 5,   name: 'Starter Pack (5 interviews)' },
  team:       { amount: 150000, credits: 20,  name: 'Team Pack (20 interviews)' },
  department: { amount: 350000, credits: 50,  name: 'Department Pack (50 interviews)' },
  company:    { amount: 600000, credits: 100, name: 'Company Pack (100 interviews)' },
}

export const SUB_PRICES: Record<string, { amount: number; credits_per_month: number; name: string }> = {
  pulse:        { amount: 15000, credits_per_month: 10,  name: 'Pulse Subscription' },
  monitor:      { amount: 35000, credits_per_month: 30,  name: 'Monitor Subscription' },
  intelligence: { amount: 80000, credits_per_month: 100, name: 'Intelligence Subscription' },
}
