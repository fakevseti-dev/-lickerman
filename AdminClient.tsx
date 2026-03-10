'use client';
import { useState, useEffect, useCallback } from 'react';

interface User {
  telegramId: string; username?: string;
  balance: number; totalEarned: number; totalSpent: number;
  energy: number; damageLevel: number; capacityLevel: number; recoveryLevel: number;
  referrals: number; invitedBy?: string | null; earnedForInviter: number;
  rank: number; isBanned: boolean; completedTasks: string[]; lastSync: string;
}

type Action = 'add_balance' | 'sub_balance' | 'ban' | 'unban' | 'reset_tasks' | 'delete';

const glass: React.CSSProperties = {
  background: 'rgba(15,23,42,0.65)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.1)',
};

export default function AdminClient() {
  const [adminKey, setAdminKey] = useState('');
  const [authed,   setAuthed]   = useState(false);
  const [users,    setUsers]    = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [loginErr, setLoginErr] = useState('');
  const [selected, setSelected] = useState<User | null>(null);

  const loadUsers = useCallback(async (key: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin', { headers: { 'x-admin-key': key } });
      if (res.status === 401) { setLoginErr('❌ ДОСТУП ЗАБОРОНЕНО'); setAuthed(false); return; }
      const data = await res.json() as User[];
      setUsers(data); setFiltered(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('adminKey');
    if (saved) { setAdminKey(saved); setAuthed(true); void loadUsers(saved); }
  }, [loadUsers]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(users.filter(u => String(u.telegramId).toLowerCase().includes(q) || (u.username ?? '').toLowerCase().includes(q)));
  }, [search, users]);

  const doLogin = async () => {
    if (!adminKey.trim()) return;
    setLoginErr('');
    await loadUsers(adminKey);
    sessionStorage.setItem('adminKey', adminKey);
    setAuthed(true);
  };

  async function adminAction(telegramId: string, action: Action) {
    let value = 0;
    if (action === 'add_balance') {
      const v = prompt(`Скільки USDT ДОДАТИ гравцю ${telegramId}?`, '1.00'); if (!v) return; value = parseFloat(v);
    } else if (action === 'sub_balance') {
      const v = prompt(`Скільки USDT ЗАБРАТИ у гравця ${telegramId}?`, '1.00'); if (!v) return; value = parseFloat(v);
    } else if (action === 'delete') {
      if (!confirm(`💀 ВИДАЛИТИ користувача ${telegramId} назавжди?`)) return;
    } else if (action === 'ban') {
      if (!confirm(`Відправити ${telegramId} на дно (БАН)?`)) return;
    } else if (action === 'unban') {
      if (!confirm(`Повернути ${telegramId} до життя (РОЗБАН)?`)) return;
    } else if (action === 'reset_tasks') {
      if (!confirm(`Обнулити всі завдання для ${telegramId}?`)) return;
    }

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ telegramId, action, value }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) {
        if (action === 'reset_tasks') { alert('Завдання успішно скинуто!'); setSelected(null); }
        await loadUsers(adminKey);
      } else {
        alert('Помилка сервера: ' + (data.error ?? 'Невідома помилка'));
      }
    } catch { alert('Втрачено зв\'язок з базою!'); }
  }

  // Stats — same as original admin.html
  const totalBal    = users.reduce((s, u) => s + (u.balance ?? 0), 0);
  const totalEarned = users.reduce((s, u) => s + (u.totalEarned ?? 0), 0);
  const totalSpent  = users.reduce((s, u) => s + (u.totalSpent ?? 0), 0);
  const wallets     = users.filter(u => u.completedTasks?.includes('wallet')).length;
  const ads         = users.filter(u => u.completedTasks?.includes('ad')).length;

  // ── Login ─────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      {/* BG gradient */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at 50% 0%,rgba(30,58,138,0.4),#020617 70%)', zIndex: -1 }} />
      <div style={{ ...glass, padding: '3rem 2rem', borderRadius: '1.5rem', textAlign: 'center', width: '90%', maxWidth: 400 }}>
        <div style={{ fontSize: '4rem', color: '#818cf8', marginBottom: 16, filter: 'drop-shadow(0 0 15px #4f46e5)' }}>🦑</div>
        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, letterSpacing: 2, marginBottom: 32, fontSize: '1.4rem' }}>KRAKEN ADMIN PANEL</h2>
        <input
          type="password"
          placeholder="Секретний ключ..."
          value={adminKey}
          onChange={e => setAdminKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void doLogin()}
          style={{ width: '100%', padding: '1rem 1.2rem', marginBottom: 12, borderRadius: '0.8rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff', outline: 'none', fontSize: '1rem', fontFamily: 'inherit' }}
        />
        {loginErr && <p style={{ color: '#ef4444', marginBottom: 12, fontSize: '0.9rem' }}>{loginErr}</p>}
        <button onClick={() => void doLogin()} style={{ width: '100%', padding: '1rem', border: 'none', borderRadius: '0.8rem', background: 'linear-gradient(135deg,#4f46e5,#3b82f6)', color: '#fff', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', letterSpacing: 1, boxShadow: '0 4px 15px rgba(79,70,229,0.4)', fontFamily: 'Montserrat, sans-serif' }}>
          УВІЙТИ
        </button>
      </div>
    </div>
  );

  // ── Dashboard ─────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#020617', color: '#f8fafc', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Background overlay */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'radial-gradient(circle at 50% 0%,rgba(30,58,138,0.4),#020617 70%)' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '2rem', maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 10px #4f46e5)' }}>🦑</span>
            <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: '2.2rem', letterSpacing: 1.5, background: 'linear-gradient(to right,#fff,#a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>KRAKEN ADMIN</h1>
          </div>
          <button onClick={() => { sessionStorage.removeItem('adminKey'); setAuthed(false); setAdminKey(''); }} style={{ padding: '0.7rem 1.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '0.8rem', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            🚪 Вийти
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {[
            { icon: '👥', label: 'Гравців',          val: String(users.length),              color: '#818cf8' },
            { icon: '💰', label: 'Загальний баланс',  val: totalBal.toFixed(2) + ' $',        color: '#4ade80' },
            { icon: '📈', label: 'Всього добуто',     val: totalEarned.toFixed(2) + ' $',     color: '#fbbf24' },
            { icon: '🔥', label: 'Всього витрачено',  val: totalSpent.toFixed(2) + ' $',      color: '#f87171' },
            { icon: '💳', label: 'Гаманців',          val: String(wallets),                   color: '#c084fc' },
            { icon: '📺', label: 'Реклам',            val: String(ads),                       color: '#38bdf8' },
          ].map(s => (
            <div key={s.label} style={{ ...glass, padding: '1.2rem', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
              <div style={{ width: 50, height: 50, flexShrink: 0, background: `rgba(129,140,248,0.15)`, borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', border: '1px solid rgba(129,140,248,0.3)' }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 4, wordBreak: 'break-all', fontFamily: 'Montserrat, sans-serif' }}>{s.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ ...glass, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem 1.5rem', borderRadius: '1.2rem', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ position: 'relative', width: 400, maxWidth: '100%' }}>
            <span style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🎯</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Знайти ціль (ID або Нік)..." style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3rem', borderRadius: '0.8rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', outline: 'none', fontSize: '0.9rem', fontFamily: 'inherit' }} />
          </div>
          <button onClick={() => void loadUsers(adminKey)} style={{ padding: '0.8rem 1.5rem', background: 'linear-gradient(135deg,#4f46e5,#3b82f6)', border: 'none', color: '#fff', borderRadius: '0.8rem', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Montserrat, sans-serif', letterSpacing: 0.5 }}>
            {loading ? '⏳' : '📡'} СКАНУВАТИ МЕРЕЖУ
          </button>
        </div>

        {/* Table */}
        <div style={{ ...glass, borderRadius: '1.5rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 900 }}>
            <thead>
              <tr>
                {['ID Гравця', 'Позивний', 'Баланс', 'Реферали', 'Статус', 'Управління'].map(h => (
                  <th key={h} style={{ background: 'rgba(0,0,0,0.4)', padding: '1.5rem 1.2rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', letterSpacing: 1.5, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.08)', fontFamily: 'Montserrat, sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.telegramId} style={{ transition: 'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.03)', fontWeight: 600, color: '#818cf8' }}>{u.telegramId}</td>
                  <td style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{u.username ? `@${u.username}` : <span style={{ opacity: 0.3 }}>Невідомий</span>}</td>
                  <td style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.03)', fontWeight: 700, color: '#4ade80' }}>{(u.balance ?? 0).toFixed(6)} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.8rem' }}>USDT</span></td>
                  <td style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.03)', fontWeight: 700, textAlign: 'center' }}>{u.referrals ?? 0}</td>
                  <td style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    {u.isBanned
                      ? <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 9999, padding: '4px 10px', fontSize: '0.8rem', fontWeight: 700 }}>💀 У БАНІ</span>
                      : <span style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 9999, padding: '4px 10px', fontSize: '0.8rem', fontWeight: 700 }}>💚 ЖИВИЙ</span>
                    }
                  </td>
                  <td style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Btn color="#38bdf8" onClick={() => setSelected(u)}>📋 Досьє</Btn>
                      <Btn color="#4ade80" onClick={() => void adminAction(u.telegramId, 'add_balance')}>➕</Btn>
                      <Btn color="#fbbf24" onClick={() => void adminAction(u.telegramId, 'sub_balance')}>➖</Btn>
                      {u.isBanned
                        ? <Btn color="#a78bfa" onClick={() => void adminAction(u.telegramId, 'unban')}>🔓 Розбан</Btn>
                        : <Btn color="#f87171" onClick={() => void adminAction(u.telegramId, 'ban')}>🔨 Бан</Btn>
                      }
                      <Btn color="#ef4444" onClick={() => void adminAction(u.telegramId, 'delete')}>🗑</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>Нічого не знайдено</div>}
        </div>
      </div>

      {/* User modal — exact copy of original admin.html userModal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(5px)' }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={{ ...glass, borderRadius: '1.5rem', width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '1.3rem' }}>ID: {selected.telegramId}</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4 }}>
                  {selected.username ? `@${selected.username}` : 'Невідомий'} | Ранг: {selected.rank ?? 1} | Останній візит: {new Date(selected.lastSync).toLocaleString('ru-RU')}
                </p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer', padding: '0 8px' }}>✕</button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Economy */}
              <Section title="📊 Економіка">
                <InfoGrid items={[
                  ['Поточний баланс', (selected.balance ?? 0).toFixed(4) + ' USDT', '#4ade80'],
                  ['Всього добуто',   (selected.totalEarned ?? 0).toFixed(4) + ' USDT', '#f8fafc'],
                  ['Всього витрачено',(selected.totalSpent ?? 0).toFixed(4) + ' USDT', '#f8fafc'],
                ]} />
              </Section>

              {/* Upgrade */}
              <Section title="🚀 Прокачка">
                <InfoGrid items={[
                  ['Енергія',         String(Math.floor(selected.energy ?? 0)), '#f8fafc'],
                  ['Урон (Рівень)',   String(selected.damageLevel ?? 1), '#f8fafc'],
                  ['Ємність (Рівень)',String(selected.capacityLevel ?? 1), '#f8fafc'],
                  ['Реген (Рівень)',  String(selected.recoveryLevel ?? 1), '#f8fafc'],
                ]} />
              </Section>

              {/* Referrals */}
              <Section title="👥 Реферальна мережа">
                <InfoGrid items={[
                  ['Хто запросив (ID)',      selected.invitedBy || 'Немає', '#f8fafc'],
                  ['Приніс доходу інвайтеру',(selected.earnedForInviter ?? 0).toFixed(4) + ' USDT', '#4ade80'],
                  ['Власних рефералів',       String(selected.referrals ?? 0), '#f8fafc'],
                ]} />
              </Section>

              {/* Tasks */}
              <Section title="✅ Завдання гравця">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { key: 'subscribe', label: 'Підписка на канал' },
                    { key: 'wallet',    label: "Прив'язка гаманця" },
                    { key: 'ad',        label: 'Перегляд реклами' },
                  ].map(t => {
                    const done = (selected.completedTasks ?? []).includes(t.key);
                    return (
                      <div key={t.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: '#94a3b8' }}>{t.label}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: done ? '#4ade80' : '#f87171' }}>{done ? '✅ Виконано' : '❌ Не виконано'}</span>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => void adminAction(selected.telegramId, 'reset_tasks')} style={{ width: '100%', marginTop: 12, padding: '0.8rem', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '0.8rem', color: '#fbbf24', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  🔄 Скинути всі завдання
                </button>
              </Section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────
function Btn({ color, onClick, children }: { color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding: '0.4rem 0.7rem', background: `${color}15`, border: `1px solid ${color}40`, color, borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: '0.2s', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: '#818cf8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</h3>
      {children}
    </div>
  );
}

function InfoGrid({ items }: { items: [string, string, string][] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
      {items.map(([label, value, color]) => (
        <div key={label} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color, fontFamily: 'Montserrat, sans-serif' }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
