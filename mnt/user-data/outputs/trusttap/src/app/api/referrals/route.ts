import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { sanitizeId, ok, err } from '@/lib/api';

export async function GET(req: NextRequest) {
  const telegramId = sanitizeId(req.nextUrl.searchParams.get('id') ?? '');
  if (!telegramId) return err('id required');
  await connectDB();
  const refs = await User.find({ invitedBy: telegramId }, 'username earnedForInviter -_id').lean();
  return ok(refs);
}
