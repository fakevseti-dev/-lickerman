import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { sanitizeId, sanitizeStr, rateLimit, ok, err } from '@/lib/api';

export async function POST(req: NextRequest) {
  if (!rateLimit(req, 20, 60_000)) return err('Too many requests', 429);

  const body = await req.json() as Record<string, unknown>;
  const telegramId = sanitizeId(body.telegramId);
  const username   = sanitizeStr(body.username ?? 'Гравець');
  const refId      = sanitizeId(body.refId ?? '');

  if (!telegramId) return err('telegramId required');

  await connectDB();
  let user = await User.findOne({ telegramId });

  if (user?.isBanned) return ok({ banned: true, error: 'Акаунт заблоковано' });

  const sessionId = crypto.randomBytes(16).toString('hex');

  if (!user) {
    user = new User({ telegramId, username: username || 'Гравець', sessionId });

    // Реферальная система — точная копия из server.js
    if (refId && refId !== telegramId && refId !== 'null') {
      const inviter = await User.findOne({ telegramId: refId });
      if (inviter && !inviter.isBanned) {
        inviter.referrals += 1;
        await inviter.save();
        user.invitedBy = refId;
      }
    }
    await user.save();
  } else {
    user.sessionId = sessionId;
    await user.save();
  }

  return ok(user.toObject());
}
