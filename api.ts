import { NextRequest, NextResponse } from 'next/server';

export const ok  = (d: object)               => NextResponse.json(d);
export const err = (msg: string, s = 400)    => NextResponse.json({ error: msg }, { status: s });

export const sanitizeId  = (v: unknown) => String(v ?? '').replace(/\D/g, '').slice(0, 20);
export const sanitizeStr = (v: unknown, max = 64) => String(v ?? '').replace(/[<>"']/g, '').trim().slice(0, max);
export const safeNum     = (v: unknown, fb = 0) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : fb; };

// Admin auth — ключ в заголовке x-admin-key (НЕ в теле запроса, как в оригинале)
export const checkAdmin  = (req: NextRequest) =>
  (req.headers.get('x-admin-key') ?? '') === (process.env.ADMIN_KEY ?? '!!unset!!');

// In-memory rate limiter per IP
const rl = new Map<string, { n: number; reset: number }>();
setInterval(() => { const now = Date.now(); rl.forEach((v, k) => { if (now > v.reset) rl.delete(k); }); }, 300_000);
export function rateLimit(req: NextRequest, max: number, windowMs: number) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'x';
  const now = Date.now(); const b = rl.get(ip);
  if (!b || now > b.reset) { rl.set(ip, { n: 1, reset: now + windowMs }); return true; }
  if (b.n >= max) return false;
  b.n++; return true;
}
