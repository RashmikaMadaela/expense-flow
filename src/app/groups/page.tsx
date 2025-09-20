import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import GroupsPage from '@/components/GroupsPage'

export default async function Groups() {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  return <GroupsPage />
}