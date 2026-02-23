import { NextResponse, NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const transToken = searchParams.get('TransID')
  const ccdApproval = searchParams.get('CCDapproval')
  const companyRef = searchParams.get('CompanyRef')

  if (!transToken) {
    console.error('DPO Callback Error: TransID is missing from query parameters.')
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/payment/error?reason=missing_token`)
  }

  if (ccdApproval && ccdApproval !== '000') {
    console.warn(`DPO Callback Warning: Payment may have failed. CCDapproval: ${ccdApproval}`)
  }

  try {
    const verifyResponse = await fetch(`${NEXT_PUBLIC_APP_URL}/api/dpo/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transToken }),
    });

    const verification = await verifyResponse.json()

    if (verification.success) {
      const reportId = companyRef || 'default';
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/report/${reportId}?status=success`)
    } else {
      console.error('DPO Token Verification Failed:', verification.details)
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/payment/error?reason=verification_failed`)
    }

  } catch (error) {
    console.error('Error in DPO callback handler:', error)
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/payment/error?reason=internal_error`)
  }
}
