// Точная копия экономики из оригинального index.html + server.js

export const RANKS = [
  { id: 1, name: 'Бронза',   color: '#e89543', threshold: 0,   bonus: 0  },
  { id: 2, name: 'Сильвер',  color: '#cbd5e1', threshold: 2.5, bonus: 1  },
  { id: 3, name: 'Золото',   color: '#fbbf24', threshold: 10,  bonus: 3  },
  { id: 4, name: 'Платинум', color: '#e2e8f0', threshold: 50,  bonus: 5  },
  { id: 5, name: 'Диамант',  color: '#22d3ee', threshold: 150, bonus: 10 },
] as const;

export const ECONOMY = {
  usdt: { decimals: 6, baseTapValue: 0.0002 },
  energy: { baseCapacity: 1000, baseRecovery: 1, tapCost: 1 },
  upgrades: {
    damage:   [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0],
    capacity: [1.0, 1.3, 1.6, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0],
    recovery: [1.0, 1.3, 1.6, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0],
  },
  upgradePrices: {
    damage:   [2.5,  5.0,  10.0,  20.0,  40.0,  80.0, 160.0, 320.0, 640.0, 1280.0],
    capacity: [3.0,  6.0,  12.0,  24.0,  48.0,  96.0, 192.0, 384.0, 768.0, 1536.0],
    recovery: [1.5,  3.0,   6.0,  12.0,  24.0,  48.0,  96.0, 192.0, 384.0,  768.0],
  },
  tasks: {
    subscription: 0.80,
    adReward:     0.20,
    walletReward: 22.50,
  },
  refBonus: 0.10,       // 10% от заработка реферала
  maxEarnedPerSync: 100, // анти-чит лимит
} as const;

export type UpgradeType = 'damage' | 'capacity' | 'recovery';

export interface Player {
  balance:        number;
  totalEarned:    number;
  totalSpent:     number;
  energy:         number;
  damageLevel:    number;
  capacityLevel:  number;
  recoveryLevel:  number;
  referrals:      number;
  rank:           number;
  completedTasks: string[];
}

export const DEFAULT_PLAYER: Player = {
  balance: 0, totalEarned: 0, totalSpent: 0,
  energy: 1000,
  damageLevel: 1, capacityLevel: 1, recoveryLevel: 1,
  referrals: 0, rank: 1, completedTasks: [],
};

// Хелперы (те же формулы что в оригинале)
export const getTapValue  = (p: Player) =>
  parseFloat((ECONOMY.usdt.baseTapValue * ECONOMY.upgrades.damage[p.damageLevel - 1]!).toFixed(6));

export const getCapacity  = (p: Player) =>
  Math.floor(ECONOMY.energy.baseCapacity * ECONOMY.upgrades.capacity[p.capacityLevel - 1]!);

export const getRecovery  = (p: Player) =>
  ECONOMY.energy.baseRecovery * ECONOMY.upgrades.recovery[p.recoveryLevel - 1]!;

export const getUpgradePrice = (type: UpgradeType, level: number): number =>
  ECONOMY.upgradePrices[type][level - 1] ?? 99999;
