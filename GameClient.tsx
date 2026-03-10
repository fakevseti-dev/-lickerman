'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useGame, vibrate } from './useGame';
import { RANKS, ECONOMY, getTapValue, getCapacity, getRecovery, getUpgradePrice } from '@/types';

// ── Helpers ───────────────────────────────────────────────────
const fmt6   = (n: number) => n.toFixed(6);

interface FloatLabel { id: number; x: number; y: number; text: string }
let _fid = 0;

// ── Rank SVG icon ─────────────────────────────────────────────
function RankIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: 'inline-block', verticalAlign: '-5px', filter: `drop-shadow(0 0 4px ${color})` }}>
      <path d="M12 2 L2 8 L12 14 L22 8 Z" fill="#ffffff" opacity="0.9" />
      <path d="M2 8 L2 16 L12 22 L12 14 Z" fill={color} opacity="0.3" />
      <path d="M22 8 L22 16 L12 22 L12 14 Z" fill={color} opacity="0.7" />
      <path d="M12 2 L2 8 L2 16 L12 22 L22 16 L22 8 Z" fill="none" stroke={color} strokeWidth="1.5" />
      <path d="M2 8 L12 14 L22 8 M12 14 L12 22" fill="none" stroke={color} strokeWidth="1.5" opacity="0.7" />
    </svg>
  );
}

// ── USDT icon inline SVG ──────────────────────────────────────
function UsdtIcon() {
  return (
    <svg viewBox="0 0 32 32" width={26} height={26} style={{ marginRight: 4 }}>
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117" fill="white" />
    </svg>
  );
}

// ── Loading screen ────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#030712', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 90, height: 90, marginBottom: 24, borderRadius: 24, border: '2px solid rgba(59,130,246,0.5)', background: 'linear-gradient(135deg,#1e3a5f,#0f1a2f)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(59,130,246,0.3)', animation: 'pulseGlow 1.5s infinite alternate' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" width={48} height={48}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(59,130,246,0.2)" />
          <path d="M8 9h8m-4 0v8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: 4, color: '#fff', textShadow: '0 0 15px #3b82f6', marginBottom: 24 }}>TRUST TAP</div>
      <div style={{ width: 176, height: 6, borderRadius: 9999, overflow: 'hidden', background: 'rgba(255,255,255,0.1)' }}>
        <div className="load-bar" style={{ height: '100%', borderRadius: 9999, background: 'linear-gradient(90deg,#3b82f6,#60a5fa)', boxShadow: '0 0 10px #3b82f6' }} />
      </div>
    </div>
  );
}

// ── Ban screen ────────────────────────────────────────────────
function BanScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#020617', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: '5rem', marginBottom: 15, textShadow: '0 0 20px #ef4444' }}>☠️</div>
      <h2 style={{ fontWeight: 900, letterSpacing: 2, color: '#ef4444', marginBottom: 10 }}>АКАУНТ ЗАБЛОКОВАНО</h2>
      <p style={{ color: '#94a3b8' }}>Вашу душу забрав Кракен.<br />Доступ до гри закрито.</p>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  return (
    <div className={`modal-overlay ${open ? 'active' : ''}`} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{title}</h3>
            <button onClick={onClose} style={{ color: '#aaccff', fontSize: '2rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>×</button>
          </div>
        )}
        <div className="modal-body-scroll">{children}</div>
      </div>
    </div>
  );
}

// ── Glass style ───────────────────────────────────────────────
const glass: React.CSSProperties = {
  background: 'rgba(20,40,70,0.55)',
  border: '1px solid rgba(59,130,246,0.2)',
};

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export default function GameClient() {
  const { player, loaded, banned, rankUp, setRankUp, tap, upgrade, completeTask, loadReferrals, shareRefLink, openChannel } = useGame();

  const [floats, setFloats]       = useState<FloatLabel[]>([]);
  const [pressed, setPressed]     = useState(false);
  const coinRef = useRef<HTMLDivElement>(null);
  const bgRef   = useRef<HTMLDivElement>(null);

  // Modals
  const [showGuide,     setShowGuide]     = useState(false);
  const [showRanks,     setShowRanks]     = useState(false);
  const [showRefs,      setShowRefs]      = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [showWallet,    setShowWallet]    = useState(false);
  const [showAd,        setShowAd]        = useState(false);
  const [showVip,       setShowVip]       = useState(false);
  const [showSuccess,   setShowSuccess]   = useState<{ title: string; desc: string; reward?: string } | null>(null);

  // Wallet state
  const [walletStep,   setWalletStep]   = useState(1);
  const [walletAddr,   setWalletAddr]   = useState('');
  const [walletAddrErr,setWalletAddrErr]= useState('');
  const [phraseLen,    setPhraseLen]    = useState<12 | 24>(12);
  const [phraseWords,  setPhraseWords]  = useState<string[]>(Array(12).fill(''));

  // Ad state
  const [adTimer,    setAdTimer]    = useState(15);
  const [adDone,     setAdDone]     = useState(false);
  const adRef = useRef<ReturnType<typeof setInterval>>();

  // Refs list
  const [refs,        setRefs]        = useState<{ username: string; earnedForInviter: number }[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);

  // ── Handwritten T bg (exact copy from index.html) ───────────
  useEffect(() => {
    if (!bgRef.current) return;
    bgRef.current.innerHTML = '';
    for (let i = 0; i < 80; i++) {
      const s   = document.createElement('span');
      s.textContent = 'T';
      s.className   = 'hand-t';
      s.style.left  = Math.random() * 100 + '%';
      s.style.top   = Math.random() * 100 + '%';
      s.style.setProperty('--r', (Math.random() * 60 - 30) + 'deg');
      s.style.setProperty('--d', (-Math.random() * 8) + 's');
      if (Math.random() < 0.2) {
        s.style.opacity    = String(0.5 + Math.random() * 0.4);
        s.style.fontSize   = (1.2 + Math.random() * 1.5) + 'rem';
        s.style.color      = '#aaccff';
        s.style.textShadow = '0 0 10px #3b82f6,0 0 15px #fff';
        s.style.fontWeight = '600';
      } else {
        s.style.opacity  = String(0.15 + Math.random() * 0.25);
        s.style.fontSize = (0.8 + Math.random() * 1.2) + 'rem';
        s.style.color    = '#3b82f6';
      }
      bgRef.current.appendChild(s);
    }
  }, [loaded]);

  // ── Guide on first visit ─────────────────────────────────────
  useEffect(() => {
    if (loaded && !localStorage.getItem('trustTapGuideShown')) {
      setShowGuide(true);
      localStorage.setItem('trustTapGuideShown', 'true');
    }
  }, [loaded]);

  // ── Tap ──────────────────────────────────────────────────────
  const handleTap = useCallback((e: React.PointerEvent) => {
    tap();
    const val = getTapValue(player);
    const id  = _fid++;
    setFloats(f => [...f, { id, x: e.clientX, y: e.clientY, text: `+${val.toFixed(4)}` }]);
    setTimeout(() => setFloats(f => f.filter(fl => fl.id !== id)), 850);
    setPressed(true);
    setTimeout(() => setPressed(false), 80);
  }, [tap, player]);

  // ── Refs ──────────────────────────────────────────────────────
  const openRefs = useCallback(async () => {
    setShowRefs(true); setRefsLoading(true);
    setRefs(await loadReferrals());
    setRefsLoading(false);
  }, [loadReferrals]);

  // ── Subscribe verify ─────────────────────────────────────────
  const handleVerifySub = useCallback(async () => {
    const res = await completeTask('subscribe');
    if (res.success) {
      setShowSubscribe(false);
      setShowSuccess({ title: 'Канал привязан!', desc: 'Спасибо за подписку.', reward: '0.80' });
    } else {
      alert('❌ ' + (res.message ?? 'Ви не підписані!'));
    }
  }, [completeTask]);

  // ── Ad ────────────────────────────────────────────────────────
  const openAd = useCallback(() => {
    setAdTimer(15); setAdDone(false); setShowAd(true);
    adRef.current = setInterval(() => {
      setAdTimer(t => {
        if (t <= 1) { clearInterval(adRef.current); setAdDone(true); return 0; }
        return t - 1;
      });
    }, 1000);
  }, []);

  const claimAd = useCallback(async () => {
    const res = await completeTask('ad');
    if (res.success) {
      setShowAd(false);
      setShowSuccess({ title: 'Отличная работа!', desc: 'Видео просмотрено.', reward: ECONOMY.tasks.adReward.toFixed(2) });
    }
  }, [completeTask]);

  // ── Wallet ────────────────────────────────────────────────────
  const handleWalletNext = useCallback(async () => {
    if (walletStep === 1) {
      if (!walletAddr.startsWith('T') || walletAddr.length < 30) {
        setWalletAddrErr('Введите корректный TRC20 адрес (начинается с T)');
        return;
      }
      setWalletAddrErr(''); setWalletStep(2);
    } else if (walletStep === 2) {
      setWalletStep(3);
    } else {
      const res = await completeTask('wallet');
      if (res.success) {
        setShowWallet(false); setWalletStep(1); setWalletAddr(''); setPhraseWords(Array(phraseLen).fill(''));
        setShowSuccess({ title: 'Кошелёк привязан!', desc: 'Ваш кошелёк успешно подключён.', reward: '22.50' });
      }
    }
  }, [walletStep, walletAddr, phraseLen, completeTask]);

  // ─────────────────────────────────────────────────────────────
  if (!loaded) return <LoadingScreen />;
  if (banned)  return <BanScreen />;

  const rank   = RANKS[player.rank - 1]!;
  const maxEn  = getCapacity(player);
  const regen  = getRecovery(player);
  const tapVal = getTapValue(player);
  const enPct  = Math.min(100, (player.energy / maxEn) * 100);

  const stepDots = (cur: number, total: number) => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i + 1 === cur ? '#3b82f6' : 'rgba(59,130,246,0.3)', boxShadow: i + 1 === cur ? '0 0 10px #3b82f6' : 'none', transition: '.3s' }} />
      ))}
    </div>
  );

  return (
    <div style={{ background: '#030712', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100dvh', overflowX: 'hidden' }}>

      {/* Floating tap values */}
      {floats.map(f => (
        <div key={f.id} className="float-up" style={{ position: 'fixed', left: f.x, top: f.y, fontWeight: 600, fontSize: '1rem', color: '#aaccff', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '1.5rem', padding: '0.2rem 0.7rem', pointerEvents: 'none', zIndex: 9999, backdropFilter: 'blur(2px)' }}>
          {f.text} $
        </div>
      ))}

      {/* Game container */}
      <div style={{ maxWidth: 480, width: '100%', background: 'linear-gradient(145deg,#0f1a2f,#030a18)', minHeight: '100dvh', padding: 'calc(1.5rem + env(safe-area-inset-top,20px)) 1rem 3rem', color: '#fff', position: 'relative', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.9),0 0 0 1px #1e3a5f inset' }}>

        {/* Handwritten bg */}
        <div ref={bgRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
        {/* Dark vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%,transparent 30%,rgba(3,7,18,0.7) 90%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Guide button */}
        <button onClick={() => setShowGuide(true)} style={{ position: 'absolute', top: 'calc(1rem + env(safe-area-inset-top,20px))', right: '1.5rem', ...glass, width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaccff', cursor: 'pointer', zIndex: 50, transition: 'transform .1s' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </button>

        {/* Balance bar */}
        <div style={{ ...glass, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.8rem 1.2rem', borderRadius: '2.5rem', margin: '0 auto 2rem', marginTop: '1rem', width: 'max-content', minWidth: '60%', boxShadow: '0 8px 15px rgba(0,0,0,0.3)', position: 'relative', zIndex: 2 }}>
          <UsdtIcon />
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', textShadow: '0 0 8px #3b82f6', marginRight: 6 }}>USDT</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', textShadow: '0 0 8px #3b82f6' }}>{fmt6(player.balance)}</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, marginLeft: 2 }}>$</span>
        </div>

        {/* Energy bar */}
        <div style={{ background: 'rgba(10,20,35,0.6)', borderRadius: '2rem', padding: '0.4rem 0.8rem', margin: '0 auto 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(59,130,246,0.3)', width: 250, position: 'relative', zIndex: 2, backdropFilter: 'blur(5px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#f5c45e', fontSize: '0.8rem', filter: 'drop-shadow(0 0 3px rgba(245,196,94,0.5))' }}>⚡</span>
            <span style={{ fontWeight: 700, fontSize: '0.8rem', minWidth: 35 }}>{Math.floor(player.energy)}</span>
          </div>
          <div style={{ flexGrow: 1, height: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 10, overflow: 'hidden', margin: '0 8px' }}>
            <div style={{ height: '100%', width: `${enPct}%`, background: 'linear-gradient(90deg,#3b82f6,#aaccff,#fff)', borderRadius: 10, boxShadow: '0 0 8px #aaccff', transition: 'width 0.1s' }} />
          </div>
          <span style={{ color: 'rgba(170,204,255,0.8)', fontSize: '0.65rem', whiteSpace: 'nowrap', fontWeight: 500 }}>+{regen.toFixed(1)}/сек</span>
        </div>

        {/* Coin */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 1.5rem', cursor: 'pointer', position: 'relative', zIndex: 5, touchAction: 'none' }}>
          <div ref={coinRef} onPointerDown={handleTap}
            className={pressed ? 'coin-pressed' : 'coin-float'}
            style={{ width: 250, height: 250, background: 'radial-gradient(circle at 30% 30%,#2b6ed7,#0a2a6a,#031030)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: '2px solid rgba(255,255,255,0.4)', boxShadow: pressed ? undefined : '0 20px 30px -10px rgba(0,0,0,0.8),0 0 0 2px rgba(59,130,246,0.3) inset,0 0 40px rgba(59,130,246,0.5)', WebkitTapHighlightColor: 'transparent' }}>
            {/* Shine */}
            <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%,rgba(255,255,255,0.4) 0%,rgba(255,255,255,0.1) 60%,transparent 80%)', border: '1px solid rgba(255,255,255,0.4)', pointerEvents: 'none', zIndex: 1 }} />
            {/* Glow */}
            <div className="glow-pulse" style={{ position: 'absolute', inset: -15, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.6),transparent 70%)', zIndex: -1, pointerEvents: 'none' }} />
            {/* Letter T */}
            <span className="letter-pulse" style={{ fontSize: '8.5rem', fontWeight: 900, color: '#fff', textShadow: '0 0 30px rgba(255,255,255,0.9),0 0 60px #3b82f6', lineHeight: 1, zIndex: 10, pointerEvents: 'none', letterSpacing: -5 }}>T</span>
          </div>
        </div>

        {/* Tap value hint */}
        <div style={{ color: 'rgba(170,204,255,0.5)', fontSize: '0.75rem', textAlign: 'center', margin: '0 auto 2.5rem', background: 'rgba(10,20,35,0.15)', padding: '0.3rem 0.8rem', borderRadius: '1rem', border: '1px solid rgba(59,130,246,0.05)', width: 'max-content', letterSpacing: '0.5px', position: 'relative', zIndex: 2 }}>
          {tapVal.toFixed(6)} USDT за тап
        </div>

        {/* Referral bar */}
        <div onClick={openRefs} style={{ ...glass, borderRadius: '1.12rem', padding: '0.7rem 0.8rem', margin: '1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width={22} height={22}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Пригласить друга</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ padding: '0.4rem 0.6rem', borderRadius: '1.5rem', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.25)', color: '#aaccff', boxShadow: '0 0 6px rgba(249,115,22,0.25)' }}>⚡ Энергия +</span>
            <span style={{ padding: '0.4rem 0.6rem', borderRadius: '1.5rem', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.25)', color: '#aaccff', boxShadow: '0 0 6px rgba(74,222,128,0.35)' }}>💰 {player.referrals} реф.</span>
          </div>
        </div>

        {/* Rank + referrals cards */}
        <div style={{ display: 'flex', gap: '0.6rem', margin: '0.8rem 0 1.2rem', position: 'relative', zIndex: 2 }}>
          <div onClick={() => setShowRanks(true)} style={{ ...glass, borderRadius: '1.12rem', padding: '0.7rem 0.8rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RankIcon color={rank.color} />
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Ранг</span>
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: rank.color, textShadow: `0 0 8px ${rank.color}60` }}>{rank.name}</span>
          </div>
          <div style={{ ...glass, borderRadius: '1.12rem', padding: '0.7rem 0.8rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width={22} height={22}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Рефералов</span>
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{player.referrals}</span>
          </div>
        </div>

        {/* Upgrades section */}
        <div style={{ ...glass, borderRadius: '1.12rem', padding: '1rem 0.4rem', margin: '1rem 0', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingLeft: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width={24} height={24}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
            <span style={{ fontSize: '1rem', fontWeight: 700, textShadow: '0 0 10px #3b82f6' }}>Улучшения</span>
          </div>
          {([
            { type: 'damage'   as const, label: 'Урон',           icon: '⚔️', val: `${ECONOMY.upgrades.damage[player.damageLevel-1]!.toFixed(1)}x` },
            { type: 'capacity' as const, label: 'Ёмкость',        icon: '🔋', val: String(getCapacity(player)) },
            { type: 'recovery' as const, label: 'Восстановление', icon: '⚡', val: `${getRecovery(player).toFixed(1)}/сек` },
          ]).map(({ type, label, icon, val }) => {
            const level = player[`${type}Level`];
            const price = getUpgradePrice(type, level);
            const can   = player.balance >= price && level < 10;
            return (
              <div key={type} style={{ background: 'rgba(10,20,35,0.55)', borderRadius: '0.9rem', padding: '0.6rem 0.4rem', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, border: '1px solid rgba(59,130,246,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{label}</div>
                    <div style={{ fontSize: '0.65rem', color: '#aaccff' }}>ур. {level} · {val}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(170,204,255,0.7)' }}>{level < 10 ? `${price} $` : 'МАКС'}</span>
                  <button onClick={() => can && upgrade(type)} disabled={!can} className="item-button" style={{ color: can ? '#aaccff' : undefined }}>
                    Улучшить
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tasks section */}
        <div style={{ ...glass, borderRadius: '1.12rem', padding: '1rem 0.4rem', margin: '1rem 0', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingLeft: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width={24} height={24}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 10L11 13L16 7" strokeLinecap="round" /></svg>
            <span style={{ fontSize: '1rem', fontWeight: 700, textShadow: '0 0 10px #3b82f6' }}>Задания</span>
          </div>
          {[
            { id: 'subscribe', label: 'Подписаться на канал', reward: '+0.80 USDT', onStart: () => { vibrate(); setShowSubscribe(true); } },
            { id: 'ad',        label: 'Смотреть рекламу',     reward: '+0.20 USDT', onStart: () => { vibrate(); openAd(); } },
            { id: 'wallet',    label: 'Привязать кошелёк',    reward: '+22.50 USDT', onStart: () => { vibrate(); setWalletStep(1); setWalletAddr(''); setPhraseWords(Array(phraseLen).fill('')); setShowWallet(true); } },
            { id: 'vip',       label: 'VIP доступ',           reward: 'Эксклюзив',  onStart: () => { vibrate(); setShowVip(true); } },
          ].map(t => {
            const done = player.completedTasks.includes(t.id);
            return (
              <div key={t.id} style={{ background: 'rgba(10,20,35,0.55)', borderRadius: '0.9rem', padding: '0.6rem 0.4rem', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, border: '1px solid rgba(59,130,246,0.2)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{t.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(170,204,255,0.7)' }}>{t.reward}</div>
                </div>
                <button onClick={done ? undefined : t.onStart} disabled={done} className="item-button" style={{ color: done ? '#4ade80' : '#aaccff', borderColor: done ? 'rgba(74,222,128,0.3)' : undefined }}>
                  {done ? '✅ Выполнено' : 'Старт'}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'rgba(170,204,255,0.4)', marginTop: 16, borderTop: '1px dashed rgba(59,130,246,0.3)', paddingTop: 12, position: 'relative', zIndex: 2 }}>
          ⚡ Trust Wallet · Tap to earn
        </div>
      </div>

      {/* ══════════════ MODALS ══════════════ */}

      {/* Guide */}
      <Modal open={showGuide} onClose={() => setShowGuide(false)} title="📖 Как играть">
        <div style={{ fontSize: '0.85rem', color: '#aaccff', lineHeight: 1.6 }}>
          {[
            { icon: '💰', title: 'Как зарабатывать USDT?', text: `Нажимайте на монету. Каждый тап приносит ${tapVal.toFixed(6)} USDT.` },
            { icon: '⬆️', title: 'Улучшения', text: 'Урон увеличивает доход за тап, Ёмкость — запас энергии, Восстановление — скорость регенерации.' },
            { icon: '👥', title: 'Рефералы (пассивный доход)', text: 'Пригласите друга и получайте 10% от его заработка навсегда.' },
            { icon: '📋', title: 'Задания', text: 'Выполняйте задания для получения бонусов: подписка, кошелёк, реклама.' },
          ].map(s => (
            <div key={s.icon} style={{ background: 'rgba(10,20,35,0.5)', padding: 12, borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)', marginBottom: 12 }}>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: 6 }}>{s.icon} {s.title}</div>
              <p style={{ fontSize: '0.8rem' }}>{s.text}</p>
            </div>
          ))}
          <button onClick={() => setShowGuide(false)} style={{ width: '100%', marginTop: 10, padding: '0.9rem', fontSize: '1rem', background: 'rgba(59,130,246,0.2)', color: '#fff', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
            Понятно, в игру!
          </button>
        </div>
      </Modal>

      {/* Ranks */}
      <Modal open={showRanks} onClose={() => setShowRanks(false)} title="🏆 Система рангов">
        {RANKS.map(r => (
          <div key={r.id} style={{ background: r.id === player.rank ? 'rgba(59,130,246,0.1)' : 'rgba(10,20,35,0.55)', borderRadius: '0.8rem', padding: '0.8rem', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${r.id === player.rank ? 'rgba(59,130,246,0.6)' : 'rgba(59,130,246,0.1)'}`, boxShadow: r.id === player.rank ? '0 0 15px rgba(59,130,246,0.2)' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <RankIcon color={r.color} size={24} />
              <div>
                <div style={{ fontWeight: 700, color: r.color, textShadow: `0 0 5px ${r.color}60` }}>{r.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(170,204,255,0.7)' }}>{r.threshold > 0 ? `От ${r.threshold}$ заработка` : 'Начальный ранг'}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.2)' }}>
              {r.bonus > 0 ? `+${r.bonus}$ бонус` : 'Начальный'}
            </div>
          </div>
        ))}
      </Modal>

      {/* Referrals */}
      <Modal open={showRefs} onClose={() => setShowRefs(false)} title="👥 Мои рефералы">
        <button onClick={shareRefLink} style={{ width: '100%', padding: '0.8rem', marginBottom: 12, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '0.8rem', color: '#aaccff', fontWeight: 600, cursor: 'pointer' }}>
          🔗 Поделиться реферальной ссылкой
        </button>
        <p style={{ fontSize: '0.75rem', color: 'rgba(170,204,255,0.6)', textAlign: 'center', marginBottom: 12 }}>Вы получаете 10% от заработка каждого реферала</p>
        {refsLoading
          ? <div style={{ textAlign: 'center', color: '#aaccff', padding: '1rem' }}>Загрузка...</div>
          : refs.length === 0
            ? <div style={{ textAlign: 'center', color: '#aaccff', padding: '1rem' }}>У вас пока нет рефералов 😔</div>
            : refs.map((r, i) => (
              <div key={i} style={{ background: 'rgba(10,20,35,0.55)', borderRadius: '0.8rem', padding: '0.8rem', marginBottom: 6, display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(59,130,246,0.1)' }}>
                <span style={{ fontWeight: 500 }}>@{r.username || 'Игрок'}</span>
                <span style={{ color: '#4ade80', fontWeight: 600 }}>+{r.earnedForInviter.toFixed(4)} $</span>
              </div>
            ))
        }
      </Modal>

      {/* Subscribe */}
      <Modal open={showSubscribe} onClose={() => setShowSubscribe(false)} title="📢 Подписка на канал">
        <p style={{ fontSize: '0.85rem', color: '#aaccff', marginBottom: 16 }}>Подпишитесь на наш канал и получите <b style={{ color: '#4ade80' }}>+0.80 USDT</b></p>
        <button onClick={openChannel} style={{ width: '100%', padding: '0.9rem', marginBottom: 10, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '0.8rem', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          1. Подписаться на канал →
        </button>
        <button onClick={handleVerifySub} style={{ width: '100%', padding: '0.9rem', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '0.8rem', color: '#4ade80', fontWeight: 600, cursor: 'pointer' }}>
          2. Проверить подписку ✓
        </button>
      </Modal>

      {/* Ad */}
      <Modal open={showAd} onClose={() => { clearInterval(adRef.current); setShowAd(false); }} title="📺 Смотреть рекламу">
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: 'rgba(10,20,35,0.7)', borderRadius: 12, padding: '2rem', marginBottom: 16, border: '1px solid rgba(59,130,246,0.3)', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            {adDone
              ? <span style={{ fontSize: '3rem' }}>✅</span>
              : <>
                  <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📺</div>
                  <div style={{ color: '#aaccff', fontSize: '0.9rem' }}>Реклама идёт...</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginTop: 8 }}>{adTimer}с</div>
                </>
            }
          </div>
          <button onClick={claimAd} disabled={!adDone} style={{ width: '100%', padding: '0.9rem', background: adDone ? 'rgba(74,222,128,0.15)' : 'rgba(0,0,0,0.2)', border: `1px solid ${adDone ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '0.8rem', color: adDone ? '#4ade80' : '#64748b', fontWeight: 600, cursor: adDone ? 'pointer' : 'not-allowed' }}>
            {adDone ? 'Забрать +0.20 USDT ✓' : `Подождите ${adTimer}с...`}
          </button>
        </div>
      </Modal>

      {/* Wallet */}
      <Modal open={showWallet} onClose={() => setShowWallet(false)} title="💳 Привязать кошелёк">
        {stepDots(walletStep, 3)}
        {walletStep === 1 && <>
          <h4 style={{ color: '#aaccff', marginBottom: 12, fontSize: '0.9rem' }}>Введите адрес USDT кошелька (TRC20)</h4>
          <input value={walletAddr} onChange={e => setWalletAddr(e.target.value)} placeholder="TXYZ..." style={{ width: '100%', padding: 12, background: 'rgba(10,20,35,0.7)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, color: '#fff', fontSize: 16, marginBottom: 8, outline: 'none' }} />
          {walletAddrErr && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: 8 }}>{walletAddrErr}</p>}
        </>}
        {walletStep === 2 && <>
          <h4 style={{ color: '#aaccff', marginBottom: 12, fontSize: '0.9rem' }}>Выберите длину сид-фразы</h4>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            {([12, 24] as const).map(len => (
              <button key={len} onClick={() => { setPhraseLen(len); setPhraseWords(Array(len).fill('')); }} style={{ flex: 1, background: phraseLen === len ? 'rgba(59,130,246,0.2)' : 'rgba(10,20,35,0.7)', border: `1px solid ${phraseLen === len ? '#3b82f6' : 'rgba(59,130,246,0.3)'}`, borderRadius: 12, padding: 12, color: phraseLen === len ? '#fff' : '#aaccff', fontWeight: 500, cursor: 'pointer', boxShadow: phraseLen === len ? '0 0 15px rgba(59,130,246,0.3)' : 'none', transition: '0.2s' }}>
                {len} слов
              </button>
            ))}
          </div>
          <div style={{ fontSize: '0.7rem', textAlign: 'center', color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: 6, borderRadius: 8, border: '1px solid rgba(74,222,128,0.2)' }}>
            🔒 Данные шифруются и не передаются третьим лицам
          </div>
        </>}
        {walletStep === 3 && <>
          <h4 style={{ color: '#aaccff', marginBottom: 12, fontSize: '0.9rem' }}>Введите секретную фразу</h4>
          <div style={{ display: 'grid', gridTemplateColumns: phraseLen === 12 ? 'repeat(3,1fr)' : 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
            {phraseWords.map((w, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', top: -8, left: 5, background: '#0f1a2f', padding: '0 4px', fontSize: '0.65rem', color: '#aaccff', borderRadius: 4 }}>{i + 1}</span>
                <input value={w} onChange={e => { const nw = [...phraseWords]; nw[i] = e.target.value; setPhraseWords(nw); }} style={{ width: '100%', padding: '8px 6px', background: 'rgba(10,20,35,0.7)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#fff', fontSize: 14, textAlign: 'center', outline: 'none' }} />
              </div>
            ))}
          </div>
        </>}
        <button onClick={handleWalletNext} style={{ width: '100%', padding: '0.9rem', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '0.8rem', color: '#fff', fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
          {walletStep < 3 ? 'Далее →' : 'Подтвердить и получить 22.50 USDT'}
        </button>
      </Modal>

      {/* VIP */}
      <Modal open={showVip} onClose={() => setShowVip(false)} title="👑 VIP доступ">
        <p style={{ fontSize: '0.85rem', color: '#aaccff', marginBottom: 16 }}>Получите эксклюзивные бонусы в нашем VIP канале!</p>
        <button onClick={() => { window.open(process.env.NEXT_PUBLIC_VIP_LINK ?? 'https://t.me/your_vip', '_blank'); setShowVip(false); }} style={{ width: '100%', padding: '0.9rem', background: 'linear-gradient(135deg,rgba(168,85,247,0.3),rgba(59,130,246,0.3))', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '0.8rem', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          Вступить в VIP →
        </button>
      </Modal>

      {/* Rank up */}
      {rankUp && (
        <div className="modal-overlay active" onClick={() => setRankUp(null)}>
          <div className="modal-content" style={{ textAlign: 'center', border: '1px solid rgba(59,130,246,0.4)', boxShadow: '0 0 30px rgba(59,130,246,0.2)' }}>
            <div className="rank-float" style={{ fontSize: '3.5rem', marginBottom: 6 }}>🏆</div>
            <h3 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: 6 }}>Новый ранг!</h3>
            <p style={{ color: '#aaccff', marginBottom: 6 }}>Поздравляем, вы получили {rankUp.id} ранг</p>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: rankUp.color, textShadow: `0 0 15px ${rankUp.color}80`, margin: '10px 0' }}>"{rankUp.name}"</div>
            {rankUp.bonus > 0 && (
              <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', padding: 12, borderRadius: 12, marginTop: 10, display: 'inline-block' }}>
                <span style={{ color: '#4ade80', fontWeight: 600, fontSize: '1.1rem' }}>Бонус: +{rankUp.bonus}$ USDT</span>
              </div>
            )}
            <button onClick={() => setRankUp(null)} style={{ width: '100%', marginTop: 20, padding: '0.9rem', background: 'rgba(59,130,246,0.15)', color: '#fff', border: '1px solid rgba(59,130,246,0.5)', borderRadius: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
              Забрать награду
            </button>
          </div>
        </div>
      )}

      {/* Success */}
      {showSuccess && (
        <div className="modal-overlay active" onClick={() => setShowSuccess(null)}>
          <div className="modal-content" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 10 }}>✅</div>
            <h3 style={{ color: '#fff', marginBottom: 8 }}>{showSuccess.title}</h3>
            <p style={{ color: '#aaccff', fontSize: '0.9rem', marginBottom: 12 }}>{showSuccess.desc}</p>
            {showSuccess.reward && (
              <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', padding: 10, borderRadius: 10, marginBottom: 14, display: 'inline-block' }}>
                <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '1.1rem' }}>+{showSuccess.reward} USDT</span>
              </div>
            )}
            <button onClick={() => setShowSuccess(null)} style={{ width: '100%', padding: '0.9rem', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '0.8rem', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              Отлично!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
