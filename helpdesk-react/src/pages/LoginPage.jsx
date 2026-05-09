import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API = 'http://localhost:5000/api';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .zp-page {
    min-height: 100vh;
    background: #f0f2f5;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', sans-serif;
    padding: 24px 16px;
  }

  .zp-card {
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.09);
    border: 1px solid #e8eaed;
    width: 100%;
    max-width: 860px;
    display: flex;
    min-height: 520px;
    overflow: hidden;
  }

  .zp-left {
    flex: 0 0 48%;
    padding: 52px 48px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border-right: 1px solid #eef0f3;
  }

  .zp-logo-wrap { display: inline-flex; align-items: center; margin-bottom: 36px; }
  .zp-logo { height: 38px; width: auto; object-fit: contain; display: block; }
  .zp-logo-accent { width: 36px; height: 3px; background: #CC3A3A; border-radius: 2px; margin-top: 6px; }

  .zp-heading { font-family: 'Manrope', sans-serif; font-size: 26px; font-weight: 800; color: #0C0E10; margin-bottom: 4px; }
  .zp-subheading { font-size: 14px; color: #64748b; margin-bottom: 28px; line-height: 1.5; }
  .zp-subheading strong { color: #02172E; font-weight: 600; }

  .zp-field { margin-bottom: 16px; }
  .zp-label { font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 0.08em; text-transform: uppercase; display: block; margin-bottom: 6px; }

  .zp-input-wrap { position: relative; display: flex; align-items: center; }
  .zp-input-icon { position: absolute; left: 12px; color: #94a3b8; display: flex; align-items: center; }
  .zp-input {
    width: 100%;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    outline: none;
    font-size: 14.5px;
    padding: 11px 14px 11px 38px;
    background: #f8fafc;
    color: #0C0E10;
    font-family: 'Inter', sans-serif;
    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
  }
  .zp-input:focus { border-color: #CC3A3A; box-shadow: 0 0 0 3px rgba(204,58,58,0.1); background: #fff; }
  .zp-input::placeholder { color: #c0c8d4; }

  /* OTP input */
  .zp-otp-grid { display: flex; gap: 10px; justify-content: center; margin: 20px 0; }
  .zp-otp-input {
    width: 52px; height: 58px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    color: #02172E;
    font-family: 'Manrope', sans-serif;
    outline: none;
    background: #f8fafc;
    transition: border-color 0.18s, box-shadow 0.18s;
  }
  .zp-otp-input:focus { border-color: #CC3A3A; box-shadow: 0 0 0 3px rgba(204,58,58,0.1); background: #fff; }

  .zp-btn-primary {
    width: 100%;
    padding: 12px;
    border-radius: 10px;
    border: none;
    background: #CC3A3A;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(204,58,58,0.3);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 20px;
  }
  .zp-btn-primary:hover { background: #b52f2f; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(204,58,58,0.42); }
  .zp-btn-primary:disabled { background: #e2e8f0; color: #94a3b8; box-shadow: none; cursor: not-allowed; transform: none; }

  .zp-btn-link { background: none; border: none; color: #CC3A3A; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; padding: 0; }
  .zp-btn-link:hover { text-decoration: underline; }

  .zp-divider { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .zp-divider-line { flex: 1; height: 1px; background: #e8eaed; }
  .zp-divider-text { font-size: 12px; color: #94a3b8; font-weight: 500; white-space: nowrap; }

  .zp-google-wrap { width: 100%; }
  .zp-google-wrap > div { width: 100% !important; }

  .zp-error {
    background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
    padding: 9px 12px; font-size: 13px; color: #CC3A3A;
    margin-bottom: 14px; display: flex; align-items: center; gap: 7px;
  }
  .zp-success {
    background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
    padding: 9px 12px; font-size: 13px; color: #166534;
    margin-bottom: 14px; display: flex; align-items: center; gap: 7px;
  }

  .zp-email-hint { font-size: 13px; color: #64748b; text-align: center; margin-bottom: 16px; }
  .zp-email-hint strong { color: #02172E; }

  .zp-back-row { display: flex; align-items: center; gap: 6px; margin-bottom: 20px; }

  .zp-right {
    flex: 1;
    background: linear-gradient(160deg, #fafbff 0%, #f0f4ff 100%);
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 48px 36px; text-align: center;
  }
  .zp-illustration { width: 100%; max-width: 320px; height: auto; margin-bottom: 28px; object-fit: contain; }
  .zp-illus-title { font-family: 'Manrope', sans-serif; font-size: 18px; font-weight: 700; color: #02172E; margin-bottom: 10px; }
  .zp-illus-desc { font-size: 14px; color: #64748b; line-height: 1.65; max-width: 240px; }
  .zp-pills { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 22px; }
  .zp-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
    background: #fff; border: 1.5px solid #e2e8f0; color: #475569;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .zp-pill .mat { font-size: 15px; }
  .zp-pill.red   { border-color: rgba(204,58,58,0.25);  color: #CC3A3A; }
  .zp-pill.navy  { border-color: rgba(2,23,46,0.2);     color: #02172E; }
  .zp-pill.green { border-color: rgba(149,191,71,0.35); color: #6a9a2a; }

  .zp-footer {
    margin-top: 28px; font-size: 12.5px; color: #94a3b8;
    display: flex; align-items: center; gap: 20px; flex-wrap: wrap; justify-content: center;
  }
  .zp-footer a { color: #94a3b8; text-decoration: none; transition: color 0.15s; }
  .zp-footer a:hover { color: #475569; }
  .zp-footer-sep { width: 3px; height: 3px; border-radius: 50%; background: #cbd5e1; }

  .spinner-sm {
    width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

export default function LoginPage() {
  const { login }    = useApp();
  const navigate     = useNavigate();

  // 'email' | 'otp'
  const [step, setStep]         = useState('email');
  const [email, setEmail]       = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [devCode, setDevCode]   = useState('');

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
      if (!res.ok) { setError(data.error || 'Invalid code.'); return; }
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
      // Decode the JWT to get email (no lib needed)
      const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      const googleEmail = payload.email;

      const res  = await fetch(`${API}/auth/check-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: googleEmail }),
      });
      const data = await res.json();
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
      // Try to find user in DB
      const res   = await fetch(`${API}/users`);
      const users = await res.json();
      let user    = users.find(u => u.email?.toLowerCase() === emailAddr.toLowerCase());

      if (!user) {
        // Create a session user on the fly
        user = {
          id:       role === 'admin' ? 'ADM-001' : 'EMP-GUEST',
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

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <style>{css}</style>
      <div className="zp-page">
        <div className="zp-card">

          {/* ════ LEFT — Form ════ */}
          <div className="zp-left">
            <div>
              {/* Logo */}
              <div className="zp-logo-wrap">
                <div>
                  <img src="/AltiusNXT_Logo-01.png" alt="AltiusNxt" className="zp-logo" />
                  <div className="zp-logo-accent" />
                </div>
              </div>

              {/* ── STEP 1: Email ── */}
              {step === 'email' && (
                <>
                  <h1 className="zp-heading">Sign in</h1>
                  <p className="zp-subheading">
                    to access the <strong>IT Helpdesk Portal</strong>
                  </p>

                  {error   && <div className="zp-error"><span className="material-symbols-outlined" style={{fontSize:16}}>error</span>{error}</div>}

                  <div className="zp-field">
                    <label className="zp-label">Email Address</label>
                    <div className="zp-input-wrap">
                      <span className="zp-input-icon">
                        <span className="material-symbols-outlined" style={{fontSize:18}}>mail</span>
                      </span>
                      <input
                        className="zp-input"
                        type="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                        autoFocus
                      />
                    </div>
                  </div>

                  <button className="zp-btn-primary" onClick={handleSendCode} disabled={loading}>
                    {loading ? <div className="spinner-sm" /> : (
                      <>
                        Send Code
                        <span className="material-symbols-outlined" style={{fontSize:18}}>chevron_right</span>
                      </>
                    )}
                  </button>

                  <div className="zp-divider">
                    <div className="zp-divider-line" />
                    <span className="zp-divider-text">Or continue with</span>
                    <div className="zp-divider-line" />
                  </div>

                  <div className="zp-google-wrap">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setError('Google login failed.')}
                      theme="outline"
                      size="large"
                      width={380}
                      text="continue_with"
                      shape="rectangular"
                    />
                  </div>
                </>
              )}

              {/* ── STEP 2: OTP ── */}
              {step === 'otp' && (
                <>
                  <div className="zp-back-row">
                    <button className="zp-btn-link" onClick={resetToEmail}>
                      <span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>arrow_back</span>
                      {' '}Back
                    </button>
                  </div>

                  <h1 className="zp-heading">Check your email</h1>
                  <p className="zp-subheading">
                    Enter the 6-digit code sent to <strong>{email}</strong>
                  </p>

                  {error   && <div className="zp-error"><span className="material-symbols-outlined" style={{fontSize:16}}>error</span>{error}</div>}
                  {success && <div className="zp-success"><span className="material-symbols-outlined" style={{fontSize:16}}>check_circle</span>{success}</div>}

                  <div className="zp-otp-grid">
                    {otpDigits.map((d, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        className="zp-otp-input"
                        maxLength={1}
                        value={d}
                        onChange={e => handleOtpChange(e.target.value, i)}
                        onKeyDown={e => handleOtpKeyDown(e, i)}
                        inputMode="numeric"
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>

                  <button className="zp-btn-primary" onClick={handleVerify} disabled={loading}>
                    {loading ? <div className="spinner-sm" /> : 'Verify & Sign In'}
                  </button>

                  <p style={{textAlign:'center', fontSize:13, color:'#64748b'}}>
                    Didn't receive the code?{' '}
                    <button className="zp-btn-link" onClick={() => { resetToEmail(); setTimeout(handleSendCode, 100); }}>
                      Resend
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ════ RIGHT — Illustration ════ */}
          <div className="zp-right">
            <img
              src="/helpdesk_illustration.png"
              alt="IT Helpdesk Support"
              className="zp-illustration"
              onError={e => e.target.style.display='none'}
            />
            <h2 className="zp-illus-title">Your IT support, simplified</h2>
            <p className="zp-illus-desc">
              Submit tickets, track resolutions, and stay connected with your IT Admin — all in one place.
            </p>
            <div className="zp-pills">
              <div className="zp-pill red">
                <span className="material-symbols-outlined mat">bolt</span>Fast response
              </div>
              <div className="zp-pill navy">
                <span className="material-symbols-outlined mat">manage_history</span>Full history
              </div>
              <div className="zp-pill green">
                <span className="material-symbols-outlined mat">verified_user</span>99.8% uptime
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="zp-footer">
          <span>© 2026, Altius NXT. All Rights Reserved.</span>
          <div className="zp-footer-sep" />
          <a href="#">Privacy Policy</a>
          <div className="zp-footer-sep" />
          <a href="#">Terms of Service</a>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
