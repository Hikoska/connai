import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DPO_COMPANY_TOKEN = process.env.DPO_COMPANY_TOKEN
const DPO_API_URL = 'https://secure.3gdirectpay.com/dpopay.php'

// Helper to extract value from XML response
const getXmlValue = (xml: string, tag: string): string => {
  const match = xml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`))
  return match ? match[1] : ''
}

export async function POST(request: Request) {
  const { transToken } = await request.json()

  if (!transToken) {
    return NextResponse.json({ error: 'transToken is required' }, { status: 400 })
  }

  if (!DPO_COMPANY_TOKEN) {
    console.error('DPO Company Token is not configured.')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const xmlPayload = `
    <?xml version="1.0" encoding="utf-8"?>
    <API3G>
      <CompanyToken>${DPO_COMPANY_TOKEN}</CompanyToken>
      <Request>verifyToken</Request>
      <TransactionToken>${transToken}</TransactionToken>
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
      console.error('DPO verifyToken Error:', resultExplanation)
      return NextResponse.json({ success: false, error: 'Token verification failed', details: resultExplanation }, { status: 200 })
    }

    const transRef = getXmlValue(responseText, 'TransactionRef')
    const customerName = `${getXmlValue(responseText, 'CustomerFirstName')} ${getXmlValue(responseText, 'CustomerLastName')}`
    const customerEmail = getXmlValue(responseText, 'CustomerEmail')

    return NextResponse.json({
      success: true,
      transRef,
      customerName,
      customerEmail
    })

  } catch (error) {
    console.error('Error verifying DPO token:', error)
    return NextResponse.json({ success: false, error: 'An unexpected error occurred' }, { status: 500 })
  }
}