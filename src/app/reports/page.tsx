import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ReportsPageComponent from '../../components/ReportsPageComponent'

export default async function ReportsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  return <ReportsPageComponent />
}