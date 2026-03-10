'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Player, DEFAULT_PLAYER, RANKS, getTapValue, getCapacity, getRecovery, getUpgradePrice, UpgradeType } from '@/types';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: { user?: { id: number; username?: string }; start_param?: string };
        ready(): void; expand(): void;
        disableVerticalSwipes?(): void;
        requestFullscreen?(): void;
        HapticFeedback?: { impactOccurred(s: string): void };
        openTelegramLink?(url: string): void;
      };
    };
  }
}

export type RankUpInfo = typeof RANKS[number];

export function useGame() {
  const [player, setPlayer]   = useState<Player>(DEFAULT_PLAYER);
  const [loaded, setLoaded]   = useState(false);
  const [banned, setBanned]   = useState(false);
  const [rankUp, setRankUp]   = useState<RankUpInfo | null>(null);

  const sessionId  = useRef<string | null>(null);
  const tgId       = useRef('');
  const botName    = process.env.NEXT_PUBLIC_BOT_USERNAME ?? 'YourBot';

  // ── Init ────────────────────────────────────────────────────
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready(); tg.expand();
      try { tg.requestFullscreen?.(); } catch { /**/ }
      tg.disableVerticalSwipes?.();
      requestAnimationFrame(() => { window.scrollTo(0, 1); setTimeout(() => window.scrollTo(0, 0), 50); });
      const u = tg.initDataUnsafe?.user;
      if (u) tgId.current = String(u.id);
    }
    if (!tgId.current) tgId.current = 'dev_user_1'; // dev fallback

    const refId = window.Telegram?.WebApp?.initDataUnsafe?.start_param ?? '';

    fetch('/api/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramId: tgId.current,
        username: window.Telegram?.WebApp?.initDataUnsafe?.user?.username ?? 'Гравець',
        refId,
      }),
    })
      .then(r => r.json())
      .then((d: Record<string, unknown>) => {
        if (d['banned']) { setBanned(true); return; }
        sessionId.current = String(d['sessionId'] ?? '');
        setPlayer({
          balance:        Number(d['balance']       ?? 0),
          totalEarned:    Number(d['totalEarned']   ?? 0),
          totalSpent:     Number(d['totalSpent']     ?? 0),
          energy:         Number(d['energy']         ?? 1000),
          damageLevel:    Number(d['damageLevel']    ?? 1),
          capacityLevel:  Number(d['capacityLevel']  ?? 1),
          recoveryLevel:  Number(d['recoveryLevel']  ?? 1),
          referrals:      Number(d['referrals']      ?? 0),
          rank:           Number(d['rank']           ?? 1),
          completedTasks: (d['completedTasks'] as string[]) ?? [],
        });
      })
      .catch(() => null)
      .finally(() => setLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Energy regen (1 tick = 1 sec, как в оригинале) ──────────
  useEffect(() => {
    const t = setInterval(() => {
      setPlayer(p => {
        const max = getCapacity(p);
        if (p.energy >= max) return p;
        return { ...p, energy: Math.min(max, p.energy + getRecovery(p)) };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Sync — точная копия из server.js ────────────────────────
  const sync = useCallback((p: Player) => {
    if (!sessionId.current || !tgId.current) return;
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegramId: tgId.current,
        sessionId: sessionId.current,
        clientTotalEarned: p.totalEarned,
        clientSpent: p.totalSpent,
        clientEnergy: p.energy,
        levels: { damage: p.damageLevel, capacity: p.capacityLevel, recovery: p.recoveryLevel },
        rank: p.rank,
      }),
    })
      .then(r => r.json())
      .then((d: Record<string, unknown>) => {
        if (d['banned']) { setBanned(true); return; }
        if (d['error'] === 'conflict') { alert('⚠️ Ви зайшли з іншого пристрою!'); return; }
        if (d['success']) {
          setPlayer(prev => ({ ...prev, balance: Number(d['balance']), referrals: Number(d['referrals']) }));
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPlayer(p => { sync(p); return p; }), 30_000);
    const onHide = () => setPlayer(p => { sync(p); return p; });
    document.addEventListener('visibilitychange', onHide);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onHide); };
  }, [sync]);

  // ── Rank check — точная копия из index.html checkRankUp ─────
  const checkRankUp = useCallback((p: Player): Player => {
    let updated = { ...p };
    while (updated.rank < 5 && updated.totalEarned >= RANKS[updated.rank]!.threshold) {
      const next = RANKS[updated.rank]!;
      updated = {
        ...updated,
        rank:        next.id,
        balance:     parseFloat((updated.balance + next.bonus).toFixed(6)),
        totalEarned: parseFloat((updated.totalEarned + next.bonus).toFixed(6)),
      };
      setRankUp(next);
      vibrate();
    }
    return updated;
  }, []);

  // ── Tap ─────────────────────────────────────────────────────
  const tap = useCallback(() => {
    setPlayer(p => {
      if (p.energy < 1) return p;
      const val = getTapValue(p);
      return checkRankUp({
        ...p,
        energy:      Math.max(0, p.energy - 1),
        balance:     parseFloat((p.balance + val).toFixed(6)),
        totalEarned: parseFloat((p.totalEarned + val).toFixed(6)),
      });
    });
    vibrate();
  }, [checkRankUp]);

  // ── Upgrade ─────────────────────────────────────────────────
  const upgrade = useCallback((type: UpgradeType) => {
    setPlayer(p => {
      const levelKey = `${type}Level` as keyof Player;
      const level    = p[levelKey] as number;
      if (level >= 10) return p;
      const price = getUpgradePrice(type, level);
      if (p.balance < price) { alert(`❌ Недостаточно USDT! Нужно: ${price}`); return p; }
      vibrate();
      const updated = {
        ...p,
        balance:    parseFloat((p.balance - price).toFixed(6)),
        totalSpent: parseFloat((p.totalSpent + price).toFixed(6)),
        [levelKey]: level + 1,
      };
      if (type === 'capacity') (updated as Player).energy = getCapacity(updated as Player);
      setTimeout(() => sync(updated as Player), 0);
      return updated as Player;
    });
  }, [sync]);

  // ── Complete task ────────────────────────────────────────────
  const completeTask = useCallback(async (task: string) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId: tgId.current, task }),
    });
    const data = await res.json() as { success: boolean; message?: string; reward?: number; banned?: boolean };
    if (data.banned) setBanned(true);
    if (data.success && data.reward) {
      setPlayer(p => checkRankUp({
        ...p,
        balance:        parseFloat((p.balance + data.reward!).toFixed(6)),
        totalEarned:    parseFloat((p.totalEarned + data.reward!).toFixed(6)),
        completedTasks: [...p.completedTasks, task],
      }));
    }
    return data;
  }, [checkRankUp]);

  // ── Referrals ────────────────────────────────────────────────
  const loadReferrals = useCallback(async () => {
    const r = await fetch(`/api/referrals?id=${tgId.current}`);
    return r.json() as Promise<{ username: string; earnedForInviter: number }[]>;
  }, []);

  const shareRefLink = useCallback(() => {
    const link = `https://t.me/${botName}/app?startapp=${tgId.current}`;
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Забирай USDT!')}`);
    } else {
      alert(`Ваша ссылка:\n${link}`);
    }
  }, [botName]);

  const openChannel = useCallback(() => {
    const link = process.env.NEXT_PUBLIC_CHANNEL_LINK ?? 'https://t.me/test_trust_sub';
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) tg.openTelegramLink(link);
    else window.open(link, '_blank');
  }, []);

  return {
    player, loaded, banned,
    rankUp, setRankUp,
    tap, upgrade, completeTask,
    loadReferrals, shareRefLink, openChannel,
    sync,
  };
}

export function vibrate() {
  try {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    else navigator.vibrate?.(10);
  } catch { /**/ }
}
