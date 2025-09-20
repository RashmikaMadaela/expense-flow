import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import FriendsPage from '@/components/FriendsPage'

export default async function Friends() {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  return <FriendsPage />
}