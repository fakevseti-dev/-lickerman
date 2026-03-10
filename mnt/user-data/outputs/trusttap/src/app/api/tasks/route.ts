import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { sanitizeId, rateLimit, ok, err } from '@/lib/api';
import { ECONOMY } from '@/types';

export async function POST(req: NextRequest) {
  if (!rateLimit(req, 10, 60_000)) return err('Too many requests', 429);

  const body       = await req.json() as { telegramId?: unknown; task?: unknown };
  const telegramId = sanitizeId(body.telegramId);
  const task       = String(body.task ?? '');

  if (!telegramId || !['subscribe', 'wallet', 'ad'].includes(task))
    return err('Invalid request');

  await connectDB();
  const user = await User.findOne({ telegramId });

  if (!user)         return err('Користувача не знайдено', 404);
  if (user.isBanned) return ok({ banned: true, error: 'Акаунт заблоковано' });
  if (user.completedTasks.includes(task))
    return ok({ success: false, message: 'Завдання вже виконано' });

  // Проверка подписки — точная копия из server.js /api/verify-subscription
  if (task === 'subscribe') {
    const botToken  = process.env.BOT_TOKEN;
    const channelId = process.env.CHANNEL_ID;
    if (!botToken || !channelId) return err('Помилка сервера', 500);

    const tgRes  = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(channelId)}&user_id=${telegramId}`
    );
    const tgData = await tgRes.json() as { ok: boolean; result?: { status: string } };

    if (!tgData.ok || !['member', 'administrator', 'creator'].includes(tgData.result?.status ?? '')) {
      return ok({ success: false, message: 'Ви не підписані!' });
    }
  }

  const rewards: Record<string, number> = {
    subscribe: ECONOMY.tasks.subscription,
    wallet:    ECONOMY.tasks.walletReward,
    ad:        ECONOMY.tasks.adReward,
  };
  const reward = rewards[task] ?? 0;

  user.balance     += reward;
  user.totalEarned += reward;
  user.completedTasks.push(task);
  await user.save();

  return ok({ success: true, reward });
}
