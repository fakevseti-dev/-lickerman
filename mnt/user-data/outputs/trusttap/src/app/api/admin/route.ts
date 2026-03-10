import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { sanitizeId, safeNum, checkAdmin, rateLimit, ok, err } from '@/lib/api';

// GET /api/admin  →  список всех пользователей
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return err('Невірний пароль', 401);
  await connectDB();
  const users = await User.find().sort({ lastSync: -1 }).lean();
  return ok(users);
}

// POST /api/admin  →  действие над пользователем
export async function POST(req: NextRequest) {
  if (!rateLimit(req, 60, 60_000)) return err('Too many requests', 429);
  if (!checkAdmin(req))            return err('Невірний пароль', 401);

  const body       = await req.json() as Record<string, unknown>;
  const telegramId = sanitizeId(body.telegramId);
  const action     = String(body.action ?? '');
  const value      = safeNum(body.value);

  const VALID = ['add_balance', 'sub_balance', 'ban', 'unban', 'reset_tasks', 'delete'];
  if (!telegramId || !VALID.includes(action)) return err('Invalid request');

  await connectDB();

  if (action === 'delete') {
    const r = await User.deleteOne({ telegramId });
    return r.deletedCount ? ok({ success: true }) : err('Гравця не знайдено', 404);
  }

  const user = await User.findOne({ telegramId });
  if (!user) return err('Гравця не знайдено', 404);

  // Точная копия логики из server.js /api/admin/action
  if      (action === 'add_balance')  user.balance = user.balance + value;
  else if (action === 'sub_balance')  user.balance = Math.max(0, user.balance - value);
  else if (action === 'ban')         { user.isBanned = true;  user.sessionId = null; }
  else if (action === 'unban')         user.isBanned = false;
  else if (action === 'reset_tasks')   user.completedTasks = [];

  await user.save();
  return ok({ success: true, balance: user.balance });
}
