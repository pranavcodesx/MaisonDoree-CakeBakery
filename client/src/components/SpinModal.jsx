import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';

// The wheel is built by the server from the SPIN… coupons the owner has switched on (admin → Coupons).
// The server also picks the winner; this only draws the wheel and turns it.
const COLORS = ['#F5E9CE', '#F0D9C4', '#E7AEA4', '#E4C687', '#F3DBD4', '#E9C7A6'];
const rad = a => ((a - 90) * Math.PI) / 180;

export default function SpinModal() {
  const { spinOpen, setSpinOpen, openLogin } = useUI(); const { user, patchUser } = useAuth(); const toast = useToast();
  const [rot, setRot] = useState(0); const [busy, setBusy] = useState(false); const [result, setResult] = useState('');
  const [prizes, setPrizes] = useState([]);
  useEffect(() => { if (spinOpen) api('/api/spin/prizes').then(d => setPrizes(d.segments)).catch(() => {}); }, [spinOpen]);
  const seg = 360 / Math.max(prizes.length, 1);

  async function spin() {
    if (!user) { setSpinOpen(false); toast('Log in to spin — your prize is saved to your account', 'info'); openLogin(window.location.pathname); return; }
    setBusy(true);
    try {
      const { index, prize, segments } = await api('/api/me/spin', { method: 'POST' });
      setPrizes(segments);                                  // draw exactly the wheel the server used
      const s2 = 360 / segments.length;
      setRot(1440 + (360 - (index * s2 + s2 / 2)));
      setTimeout(() => {
        patchUser({ spinUsed: true });
        if (prize.code) { setResult(`🎉 You won ${prize.label}! Code: ${prize.code} (valid on your next order)`); toast(`You won ${prize.label}! Use code ${prize.code}`, 'success', 'tag'); }
        else setResult('No luck this time — thanks for playing!');
      }, 4100);
    } catch (e) { toast(e.message, 'info'); setBusy(false); }
  }
  const used = user?.spinUsed;
  return (
    <div className={`modal-overlay ${spinOpen ? 'open' : ''}`} onClick={e => e.target === e.currentTarget && setSpinOpen(false)}>
      <div className="modal-box">
        <button className="modal-close" onClick={() => setSpinOpen(false)} aria-label="Close coupon game"><Icon name="x" /></button>
        <span className="eyebrow" style={{ justifyContent: 'center' }}>One Spin Per Account</span>
        <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 22, marginTop: 8 }}>Spin &amp; Win a Coupon</h3>
        <div className="wheel-wrap">
          <div className="wheel-pointer" />
          <svg id="spinWheel" viewBox="0 0 200 200" style={{ transform: `rotate(${rot}deg)` }}>
            <g>{prizes.map((label, i) => {
              const s = i * seg, e = s + seg, mid = rad(s + seg / 2);
              const tx = 100 + 52 * Math.cos(mid), ty = 100 + 52 * Math.sin(mid);
              return <g key={i}>
                <path d={`M100,100 L${100 + 80 * Math.cos(rad(s))},${100 + 80 * Math.sin(rad(s))} A80,80 0 0 1 ${100 + 80 * Math.cos(rad(e))},${100 + 80 * Math.sin(rad(e))} Z`} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="1.5" />
                <text x={tx} y={ty} fontSize="9.5" fontWeight="700" fill="#4A2E1F" textAnchor="middle" transform={`rotate(${s + seg / 2},${tx},${ty})`}>{label}</text>
              </g>;
            })}</g>
            <circle cx="100" cy="100" r="16" fill="var(--cocoa-900)" />
          </svg>
        </div>
        <button className="btn btn-gold btn-block" disabled={busy || used} onClick={spin}>{used ? 'You have used your spin' : 'Spin the Wheel'}</button>
        <p style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: 'var(--sage)', minHeight: 18 }}>{result}</p>
      </div>
    </div>
  );
}
