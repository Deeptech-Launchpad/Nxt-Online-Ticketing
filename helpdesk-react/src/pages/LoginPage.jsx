import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API = '/api';

// ─── AltiusNxt suite branding (kept in sync with the standard login template) ───
const APP_CONFIG = {
  appName:  'Online Ticketing',
  features: [
    'Ticket Submission & Tracking',
    'SLA Management',
    'IT Support Portal',
  ],
  suite:    ['HR', 'LMS', 'Billing', 'Helpdesk', 'Assessment', 'Reports'],
  suiteKey: 'Helpdesk',
  suiteLinks: {
    HR:         'https://nxtpeople.altiusnxt.tech',
    LMS:        'https://lms.altiusnxt.tech/login',
    Billing:    'http://72.61.245.208:5000/login',
    Helpdesk:   'https://tickets.altiusnxt.tech/login',
    Assessment: 'https://assess.altiusnxt.tech',
    Reports:    'https://ur.altiusnxt.tech',
  },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .anx-page { display: flex; min-height: 100vh; font-family: 'DM Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }

  /* ── Left dark panel ───────────────────────────────────────────── */
  .anx-left {
    width: 380px; flex-shrink: 0;
    background: linear-gradient(160deg, #1c1c2e 0%, #141420 100%);
    display: flex; flex-direction: column;
    padding: 40px 36px; position: relative; overflow: hidden;
  }
  .anx-geo { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  .anx-geo-1 { position: absolute; width: 280px; height: 280px; border-radius: 50%; background: radial-gradient(circle, rgba(230,51,41,0.12) 0%, transparent 65%); top: -80px; right: -80px; }
  .anx-geo-2 { position: absolute; width: 200px; height: 200px; background: linear-gradient(135deg, rgba(99,102,241,0.08), transparent); bottom: 120px; left: -60px; border-radius: 40px; transform: rotate(30deg); }
  .anx-geo-3 { position: absolute; width: 160px; height: 160px; border: 1px solid rgba(255,255,255,0.04); border-radius: 24px; bottom: 60px; right: -40px; transform: rotate(15deg); }
  .anx-logo-wrap { background: rgba(255,255,255,0.96); border-radius: 12px; padding: 10px 16px; display: inline-flex; align-items: center; width: fit-content; margin-bottom: 40px; position: relative; z-index: 1; }
  .anx-logo-wrap img { height: 30px; width: auto; }
  .anx-left-body { flex: 1; position: relative; z-index: 1; }
  .anx-left-divider { width: 40px; height: 2px; background: linear-gradient(90deg, #e63329, rgba(230,51,41,0.3)); border-radius: 2px; margin-bottom: 14px; }
  .anx-access-label { font-size: 11px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(255,255,255,0.45); margin-bottom: 10px; }
  .anx-app-name { font-size: 26px; font-weight: 700; color: #fff; line-height: 1.2; letter-spacing: -0.3px; margin-bottom: 16px; }
  .anx-red-rule { width: 32px; height: 3px; background: #e63329; border-radius: 2px; margin-bottom: 24px; }
  .anx-feature-list { list-style: none; display: flex; flex-direction: column; gap: 12px; }
  .anx-feature-item { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; color: rgba(255,255,255,0.75); line-height: 1.4; }
  .anx-feat-icon { color: #e63329; flex-shrink: 0; margin-top: 1px; }
  .anx-left-bottom { position: relative; z-index: 1; }
  .anx-bottom-divider { height: 1px; background: rgba(255,255,255,0.08); margin-bottom: 16px; }
  .anx-suite-label { font-size: 10.5px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 10px; }
  .anx-suite-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
  .anx-suite-chip { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.45); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 4px 10px; font-family: 'DM Sans', system-ui, sans-serif; }
  .anx-suite-chip.active { color: #e63329; background: rgba(230,51,41,0.12); border-color: rgba(230,51,41,0.3); }
  a.anx-suite-chip { text-decoration: none; cursor: pointer; transition: color .15s, background .15s, border-color .15s; }
  a.anx-suite-chip:hover { color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2); }
  .anx-left-foot { font-size: 11px; color: rgba(255,255,255,0.2); }

  /* ── Right light panel ─────────────────────────────────────────── */
  /* The right side holds a white "card" container so the form has a clear
     visual boundary (instead of floating against the background). */
  .anx-right {
    flex: 1; background: #f1f5f9;
    display: flex; align-items: center; justify-content: center;
    padding: 40px 32px; overflow-y: auto;
  }
  .anx-right-content {
    width: 100%; max-width: 440px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.04), 0 18px 50px rgba(0,0,0,0.08);
    padding: 40px 36px;
  }
  .anx-app-badge { width: 48px; height: 48px; border-radius: 13px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; background: #CC3A3A; color: #fff; font-size: 12px; font-weight: 700; letter-spacing: 0.3px; }
  .anx-right-title { font-size: 26px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px; margin-bottom: 4px; }
  .anx-right-sub { font-size: 14px; color: #64748b; margin-bottom: 28px; }

  /* Pills */
  .anx-pills { display: flex; gap: 4px; background: #f1f5f9; border-radius: 10px; padding: 4px; margin-bottom: 24px; }
  .anx-pill { flex: 1; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #64748b; background: none; border: none; border-radius: 7px; cursor: pointer; font-family: inherit; transition: background .15s, color .15s, box-shadow .15s; }
  .anx-pill.active { background: #fff; color: #0f172a; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,0.10); }

  /* Form */
  .anx-form { display: flex; flex-direction: column; gap: 16px; }
  .anx-field { display: flex; flex-direction: column; gap: 6px; }
  .anx-label { font-size: 13px; font-weight: 600; color: #334155; }
  .anx-input {
    width: 100%; padding: 11px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px;
    font-size: 14px; color: #0f172a; background: #fff; outline: none; font-family: inherit;
    transition: border-color .15s, box-shadow .15s;
  }
  .anx-input::placeholder { color: #94a3b8; }
  .anx-input:focus { border-color: #e63329; box-shadow: 0 0 0 3px rgba(230,51,41,0.10); }

  /* 6-box OTP — styled to match the new template aesthetic */
  .anx-otp-grid { display: flex; gap: 10px; justify-content: space-between; margin: 4px 0 8px; }
  .anx-otp-input {
    flex: 1; min-width: 0; height: 54px;
    border: 1.5px solid #e2e8f0; border-radius: 10px;
    text-align: center; font-size: 22px; font-weight: 700; color: #0f172a;
    font-family: inherit; outline: none; background: #fff;
    transition: border-color .15s, box-shadow .15s;
  }
  .anx-otp-input:focus { border-color: #e63329; box-shadow: 0 0 0 3px rgba(230,51,41,0.10); }

  /* Buttons */
  .anx-submit {
    width: 100%; padding: 12px 20px; background: #e63329; color: #fff; border: none; border-radius: 10px;
    font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; min-height: 46px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: background .15s, box-shadow .15s, transform .1s;
  }
  .anx-submit:hover:not(:disabled) { background: #c0271e; box-shadow: 0 4px 16px rgba(230,51,41,0.35); }
  .anx-submit:active:not(:disabled) { transform: translateY(1px); }
  .anx-submit:disabled { opacity: 0.7; cursor: not-allowed; }
  .anx-resend { font-size: 13px; font-weight: 500; color: #64748b; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; width: 100%; text-align: center; margin-top: 4px; }

  /* Google hint + wrapper */
  .anx-google-hint { font-size: 13px; color: #64748b; background: #f1f5f9; padding: 10px 14px; border-radius: 9px; margin-bottom: 16px; line-height: 1.5; }
  .anx-google-wrap { display: flex; flex-direction: column; align-items: stretch; gap: 8px; }
  .anx-google-wrap > div { width: 100% !important; }
  .anx-google-wrap > div > div { width: 100% !important; }

  /* Messages */
  .anx-msg-error { font-size: 13px; color: #e63329; background: rgba(230,51,41,0.06); padding: 8px 12px; border-radius: 8px; }
  .anx-msg-success { font-size: 13px; color: #059669; background: rgba(5,150,105,0.07); padding: 8px 12px; border-radius: 8px; }
  .anx-dev-code { font-size: 13px; color: #b45309; background: #fef3c7; border: 1px dashed #f59e0b; padding: 8px 12px; border-radius: 8px; font-family: 'DM Mono', monospace; }

  .anx-right-foot { margin-top: 32px; font-size: 12px; color: #94a3b8; text-align: center; }
  .anx-right-foot a { color: #e63329; font-weight: 500; text-decoration: none; }

  .spinner-sm { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: anx-spin 0.7s linear infinite; }
  @keyframes anx-spin { to { transform: rotate(360deg); } }

  /* Mobile */
  @media (max-width: 768px) {
    .anx-page { flex-direction: column; }
    .anx-left { width: 100%; padding: 28px 24px 24px; }
    .anx-left-bottom { display: none; }
    .anx-app-name { font-size: 20px; }
    .anx-right { padding: 24px 16px 36px; align-items: stretch; }
    .anx-right-content { max-width: 100%; padding: 28px 22px; border-radius: 16px; }
  }
`;

const CHECK_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function LoginPage() {
  const { login } = useApp();
  const navigate  = useNavigate();

  // Which method tab is active: 'otp' | 'google'
  const [method, setMethod] = useState('otp');

  // OTP flow state: 'email' | 'otp'
  const [step, setStep]           = useState('email');
  const [email, setEmail]         = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [devCode, setDevCode]     = useState('');

  // ── Send OTP ──────────────────────────────────────────────
  const handleSendCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.'); return;
    }
    setError(''); setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send code.'); return; }

      setSuccess(data.dev_code
        ? `Dev mode: your code is ${data.dev_code}`
        : `A 6-digit code has been sent to ${email}`
      );
      if (data.dev_code) setDevCode(data.dev_code);
      setStep('otp');
    } catch {
      setError('Cannot connect to backend. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP digit input handler ───────────────────────────────
  const handleOtpChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otpDigits];
    next[idx] = val;
    setOtpDigits(next);
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  };
  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
    if (e.key === 'Enter') handleVerify();
  };

  // Friendly messages for backend 403 reason codes
  const accessDeniedMessage = (reason) => {
    switch (reason) {
      case 'ACCOUNT_INACTIVE':
        return 'Your account has been deactivated. Please contact your admin to reactivate it.';
      case 'NOT_REGISTERED':
        return 'Your email is not registered in our system. Please contact your admin to add your account.';
      case 'NOT_GRANTED':
        return "Your account exists but HR hasn't given you access to this app. Please contact HR.";
      case 'EMPLOYEE_INACTIVE':
        return 'Your employment status does not allow access. Please contact HR.';
      case 'NOT_FOUND':
        return 'Your email is not registered in our system. Please contact your admin to add your account.';
      case 'INVALID_KEY':
      case 'RATE_LIMITED':
      case 'NETWORK_ERROR':
      case 'CONFIG_MISSING':
        return 'Login service temporarily unavailable. Please try again in a minute.';
      default:
        return 'Access denied. Please contact your admin.';
    }
  };

  // ── Verify OTP ────────────────────────────────────────────
  const handleVerify = async () => {
    const code = otpDigits.join('');
    if (code.length < 6) { setError('Please enter all 6 digits.'); return; }
    setError(''); setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.reason) {
          setError(accessDeniedMessage(data.reason));
        } else {
          setError(data.error || 'Invalid code.');
        }
        return;
      }
      doLogin(email, data.role);
    } catch {
      setError('Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth success ──────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    setError(''); setLoading(true);
    try {
      const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      const googleEmail = payload.email;

      const res  = await fetch(`${API}/auth/check-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: googleEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.reason) {
          setError(accessDeniedMessage(data.reason));
        } else {
          setError(data.error || 'Google login failed.');
        }
        return;
      }
      doLogin(googleEmail, data.role, payload.name, payload.picture);
    } catch {
      setError('Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Common login completion ───────────────────────────────
  const doLogin = async (emailAddr, role, name = '', picture = '') => {
    try {
      const res   = await fetch(`${API}/users`);
      const users = await res.json();
      let user    = users.find(u => u.email?.toLowerCase() === emailAddr.toLowerCase());

      if (!user) {
        user = {
          id:       role === 'admin' ? 'ADM-001' : emailAddr,
          name:     name || emailAddr.split('@')[0],
          email:    emailAddr,
          role,
          division: '',
          avatar:   (name || emailAddr)[0]?.toUpperCase(),
          picture,
        };
      } else {
        user = { ...user, role }; // role from admin list takes priority
      }

      login(user);
      navigate(role === 'admin' ? '/admin' : '/dashboard');
    } catch {
      setError('Login succeeded but could not load profile. Check backend.');
    }
  };

  const resetToEmail = () => {
    setStep('email'); setOtpDigits(['', '', '', '', '', '']);
    setError(''); setSuccess(''); setDevCode('');
  };

  // Switching tabs clears any in-flight error/success so the UI feels fresh
  const switchMethod = (m) => {
    setMethod(m);
    setError(''); setSuccess('');
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <style>{css}</style>
      <div className="anx-page">

        {/* ════ LEFT — Branding panel ════ */}
        <div className="anx-left">
          <div className="anx-geo" aria-hidden="true">
            <div className="anx-geo-1" />
            <div className="anx-geo-2" />
            <div className="anx-geo-3" />
          </div>

          <div className="anx-logo-wrap">
            <img src="/AltiusNXT_Logo-01.png" alt="AltiusNxt Technologies" />
          </div>

          <div className="anx-left-body">
            <div className="anx-left-divider" />
            <p className="anx-access-label">Secure Workspace Access</p>
            <h2 className="anx-app-name">{APP_CONFIG.appName}</h2>
            <div className="anx-red-rule" />
            <ul className="anx-feature-list">
              {APP_CONFIG.features.map((f, i) => (
                <li className="anx-feature-item" key={i}>
                  <span className="anx-feat-icon">{CHECK_ICON}</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="anx-left-bottom">
            <div className="anx-bottom-divider" />
            <p className="anx-suite-label">Part of AltiusNxt Suite</p>
            <div className="anx-suite-chips">
              {APP_CONFIG.suite.map((s) => {
                if (s === APP_CONFIG.suiteKey) {
                  return <span className="anx-suite-chip active" key={s}>{s}</span>;
                }
                const url = APP_CONFIG.suiteLinks[s];
                return url
                  ? <a className="anx-suite-chip" href={url} key={s}>{s}</a>
                  : <span className="anx-suite-chip" key={s}>{s}</span>;
              })}
            </div>
            <p className="anx-left-foot">© 2026 AltiusNxt Technologies Pvt. Ltd.</p>
          </div>
        </div>

        {/* ════ RIGHT — Sign-in panel ════ */}
        <div className="anx-right">
          <div className="anx-right-content">
            <div className="anx-app-badge">OT</div>
            <h1 className="anx-right-title">Sign In</h1>
            <p className="anx-right-sub">Access {APP_CONFIG.appName}</p>

            {/* Method pills */}
            <div className="anx-pills" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={method === 'otp'}
                className={`anx-pill ${method === 'otp' ? 'active' : ''}`}
                onClick={() => switchMethod('otp')}
              >
                Email OTP
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={method === 'google'}
                className={`anx-pill ${method === 'google' ? 'active' : ''}`}
                onClick={() => switchMethod('google')}
              >
                Google SSO
              </button>
            </div>

            {/* ── OTP view ── */}
            {method === 'otp' && (
              <>
                {step === 'email' && (
                  <form className="anx-form" onSubmit={(e) => { e.preventDefault(); handleSendCode(); }}>
                    <div className="anx-field">
                      <label className="anx-label" htmlFor="anx-email">Work Email</label>
                      <input
                        id="anx-email"
                        className="anx-input"
                        type="email"
                        placeholder="you@altiusnxt.com"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    {error && <div className="anx-msg-error">{error}</div>}
                    <button type="submit" className="anx-submit" disabled={loading}>
                      {loading ? <span className="spinner-sm" /> : 'Send OTP'}
                    </button>
                  </form>
                )}

                {step === 'otp' && (
                  <form className="anx-form" onSubmit={(e) => { e.preventDefault(); handleVerify(); }}>
                    {success && <div className="anx-msg-success">{success}</div>}
                    {devCode && <div className="anx-dev-code">Dev OTP: <strong>{devCode}</strong></div>}

                    <div className="anx-field">
                      <label className="anx-label">Enter the 6-digit code</label>
                      <div className="anx-otp-grid">
                        {otpDigits.map((d, i) => (
                          <input
                            key={i}
                            id={`otp-${i}`}
                            className="anx-otp-input"
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={d}
                            onChange={(e) => handleOtpChange(e.target.value, i)}
                            onKeyDown={(e) => handleOtpKeyDown(e, i)}
                            autoComplete={i === 0 ? 'one-time-code' : 'off'}
                            autoFocus={i === 0}
                          />
                        ))}
                      </div>
                    </div>

                    {error && <div className="anx-msg-error">{error}</div>}

                    <button type="submit" className="anx-submit" disabled={loading}>
                      {loading ? <span className="spinner-sm" /> : 'Verify & Sign In'}
                    </button>
                    <button type="button" className="anx-resend" onClick={resetToEmail}>
                      ← Change email / Resend OTP
                    </button>
                  </form>
                )}
              </>
            )}

            {/* ── Google view ── */}
            {method === 'google' && (
              <>
                <p className="anx-google-hint">
                  Sign in securely using your Google Workspace account.
                </p>
                <div className="anx-google-wrap">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google login failed. Please try again.')}
                    text="continue_with"
                    shape="rectangular"
                    size="large"
                    width="100%"
                  />
                </div>
                {error && <div className="anx-msg-error" style={{ marginTop: 12 }}>{error}</div>}
              </>
            )}

            <div className="anx-right-foot">
              Need help? <a href="mailto:itsupport@altiusnxt.com">Contact IT Support</a>
            </div>
          </div>
        </div>

      </div>
    </GoogleOAuthProvider>
  );
}
