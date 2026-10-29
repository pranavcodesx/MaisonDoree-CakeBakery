import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';

let loading;
// Google's sign-in script is loaded only when someone opens the login box.
function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = resolve; s.onerror = () => { loading = null; reject(new Error('Could not load Google sign-in.')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// The official "Continue with Google" button. Shows nothing until the owner has set GOOGLE_CLIENT_ID.
export default function GoogleButton({ onCredential }) {
  const { googleClientId } = useSettings();
  const box = useRef(null); const [failed, setFailed] = useState(false);
  const cb = useRef(onCredential); cb.current = onCredential;
  useEffect(() => {
    if (!googleClientId) return undefined;
    let dead = false;
    loadGoogle().then(() => {
      if (dead || !box.current) return;
      window.google.accounts.id.initialize({ client_id: googleClientId, callback: r => r?.credential && cb.current(r.credential), ux_mode: 'popup', auto_select: false });
      box.current.innerHTML = '';
      window.google.accounts.id.renderButton(box.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'left', width: 320 });
    }).catch(() => !dead && setFailed(true));
    return () => { dead = true; };
  }, [googleClientId]);
  if (!googleClientId) return null;
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ink-faint)', fontSize: 11.5, fontWeight: 700, margin: '0 0 14px' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />OR<span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>
      <div ref={box} id="googleSignInBox" style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />
      {failed && <p className="field-error" style={{ display: 'block', textAlign: 'center' }}>Google sign-in could not load. You can still use email or phone.</p>}
    </div>
  );
}
