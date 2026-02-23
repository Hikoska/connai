import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DPO_COMPANY_TOKEN = process.env.DPO_COMPANY_TOKEN
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const DPO_API_URL = 'https://secure.3gdirectpay.com/dpopay.php'

// Helper to extract value from XML response
const getXmlValue = (xml: string, tag: string): string => {
  const match = xml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`))
  return match ? match[1] : ''
}

export async function POST(request: Request) {
  const { email, amount, reference, description } = await request.json()

  if (!email || !amount || !reference || !description) {
    return NextResponse.json({ error: 'Email, amount, reference, and description are required' }, { status: 400 })
  }

  if (!DPO_COMPANY_TOKEN) {
    console.error('DPO Company Token is not configured.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const xmlPayload = `
    <?xml version="1.0" encoding="utf-8"?>
    <API3G>
      <CompanyToken>${DPO_COMPANY_TOKEN}</CompanyToken>
      <Request>createToken</Request>
      <Transaction>
        <PaymentAmount>${amount}</PaymentAmount>
        <PaymentCurrency>MUR</PaymentCurrency>
        <CompanyRef>${reference}</CompanyRef>
        <RedirectURL>${NEXT_PUBLIC_APP_URL}/api/dpo/callback</RedirectURL>
        <BackURL>${NEXT_PUBLIC_APP_URL}/dashboard</BackURL>
        <CompanyRefUnique>0</CompanyRefUnique>
        <PTL>5</PTL>
      </Transaction>
      <Services>
        <Service>
          <ServiceType>3854</ServiceType>
          <ServiceDescription>${description}</ServiceDescription>
          <ServiceDate>${new Date().toISOString().slice(0, 19).replace('T', ' ')}</ServiceDate>
        </Service>
      </Services>
    </API3G>
  `.trim()

  try {
    const response = await fetch(DPO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xmlPayload,
    })

    const responseText = await response.text()

    const resultCode = getXmlValue(responseText, 'Result')
    const resultExplanation = getXmlValue(responseText, 'ResultExplanation')

    if (resultCode !== '000') {
      console.error('DPO createToken Error:', resultExplanation)
      return NextResponse.json({ error: 'Failed to create payment token', details: resultExplanation }, { status: 500 })
    }

    const transToken = getXmlValue(responseText, 'TransToken')
    const paymentUrl = `https://secure.3gdirectpay.com/payv2.php?ID=${transToken}`

    return NextResponse.json({ transToken, paymentUrl })

  } catch (error) {
    console.error('Error creating DPO token:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}