import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SettlementsPage from '@/components/SettlementsPage'

export default async function Settlements() {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  return <SettlementsPage />
}