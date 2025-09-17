/* TODO: Fix TypeScript issues with Prisma includes
 * The balance calculation logic is correct but TypeScript is not recognizing
 * the included relations properly. This needs to be fixed or implemented differently.
 */

import {
  createApiResponse,
} from '@/lib/api-middleware';

export async function GET() {
  return createApiResponse(
    { message: 'Balance calculation endpoint temporarily disabled due to TypeScript issues' },
    'Please use individual expense data to calculate balances on the frontend'
  );
}