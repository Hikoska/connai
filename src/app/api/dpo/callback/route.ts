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

  // Optional: Check ccdApproval if DPO provides it for pre-verification
  if (ccdApproval && ccdApproval !== '000') {
    console.warn(`DPO Callback Warning: Payment may have failed. CCDapproval: ${ccdApproval}`)
    // We still proceed to verify server-side for security
  }

  try {
    // Securely verify the transaction server-to-server
    const verifyResponse = await fetch(`${NEXT_PUBLIC_APP_URL}/api/dpo/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transToken }),
    })

    const verification = await verifyResponse.json()

    if (verification.success) {
      // Payment is verified. Redirect to the report page or a success page.
      // The `companyRef` should ideally contain the interview_id to redirect to the correct report.
      const reportId = companyRef || 'default'
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/report/${reportId}?status=success`)
    } else {
      // Verification failed. Redirect to an error page.
      console.error('DPO Token Verification Failed:', verification.details)
      return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/payment/error?reason=verification_failed`)
    }

  } catch (error) {
    console.error('Error in DPO callback handler:', error)
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/payment/error?reason=internal_error`)
  }
}
