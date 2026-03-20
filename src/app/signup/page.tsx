import { redirect } from 'next/navigation'

// /signup → redirect to homepage (server component, no client needed)
export default function SignupRedirect() {
  redirect('/')
}
