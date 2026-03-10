import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { sanitizeId, sanitizeStr, safeNum, rateLimit, ok, err } from '@/lib/api';
import { ECONOMY } from '@/types';

export async function POST(req: NextRequest) {
  if (!rateLimit(req, 120, 60_000)) return err('Too many requests', 429);

  const body = await req.json() as Record<string, unknown>;
  const telegramId        = sanitizeId(body.telegramId);
  const sessionId         = sanitizeStr(body.sessionId, 64);
  const clientTotalEarned = safeNum(body.clientTotalEarned);
  const clientSpent       = safeNum(body.clientSpent);
  const clientEnergy      = safeNum(body.clientEnergy);
  const rank              = safeNum(body.rank, 1);
  const lvl               = (body.levels ?? {}) as Record<string, unknown>;

  if (!telegramId || !sessionId) return err('Missing fields');

  await connectDB();
  const user = await User.findOne({ telegramId });

  if (!user)                        return err('Гравця не знайдено', 404);
  if (user.isBanned)                return ok({ banned: true, error: 'Акаунт заблоковано' });
  if (user.sessionId !== sessionId) return err('conflict', 409);

  const newEarned = clientTotalEarned - user.totalEarned;
  const newSpent  = clientSpent - user.totalSpent;

  if (newEarned > 0) {
    // Анти-чит: cap max
    const safeEarned = Math.min(newEarned, ECONOMY.maxEarnedPerSync);
    user.balance += safeEarned;

    // Реферальный бонус 10% — точная копия из server.js
    if (user.invitedBy) {
      const inviter = await User.findOne({ telegramId: user.invitedBy });
      if (inviter && !inviter.isBanned) {
        const refBonus = parseFloat((safeEarned * ECONOMY.refBonus).toFixed(6));
        inviter.balance     += refBonus;
        inviter.totalEarned += refBonus;
        inviter.earnedForInviter = (inviter.earnedForInviter ?? 0); // compat
        await inviter.save();
        user.earnedForInviter += refBonus;
      }
    }
  }

  if (newSpent > 0) user.balance = Math.max(0, user.balance - newSpent);

  user.totalEarned   = clientTotalEarned;
  user.totalSpent    = clientSpent;
  user.energy        = clientEnergy;
  user.damageLevel   = safeNum(lvl['damage'], 1);
  user.capacityLevel = safeNum(lvl['capacity'], 1);
  user.recoveryLevel = safeNum(lvl['recovery'], 1);
  user.rank          = rank;
  user.lastSync      = new Date();

  await user.save();
  return ok({ success: true, balance: user.balance, referrals: user.referrals });
}
