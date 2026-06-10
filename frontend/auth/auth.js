import React from 'react';
import * as authService from '../services/authService.js';
const { useState, useEffect } = React;

const inputClass = 'w-full px-4 py-3 rounded-3xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300';

function AsyncButton({ busy, children }) {
  return (
    <button disabled={busy} className="w-full py-3 rounded-3xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-60">
      {busy ? 'Working…' : children}
    </button>
  );
}

function parseAuthModeFromHash() {
  const hash = window.location.hash || '#/auth/login';
  const [pathPart, searchPart] = hash.slice(1).split('?');
  if (pathPart.endsWith('/register')) return { mode: 'register', token: '' };
  if (pathPart.endsWith('/forgot-password')) return { mode: 'forgotPassword', token: '' };
  if (pathPart.endsWith('/reset-password')) {
    const params = new URLSearchParams(searchPart || '');
    return { mode: 'resetPassword', token: params.get('token') || '' };
  }
  return { mode: 'login', token: '' };
}

export function AuthFlow({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [pendingType, setPendingType] = useState('');
  const [pendingUserId, setPendingUserId] = useState('');
  const [step, setStep] = useState('form');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const updateMode = () => {
      const { mode: nextMode, token } = parseAuthModeFromHash();
      setMode(nextMode);
      setResetToken(token);
      setStep('form');
      setPendingType('');
      setPendingUserId('');
      setOtp('');
      setMessage('');
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    };

    updateMode();
    window.addEventListener('hashchange', updateMode);
    return () => window.removeEventListener('hashchange', updateMode);
  }, []);

  const changeRoute = (hash) => {
    window.location.hash = hash;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      if (step === 'form') {
        if (mode === 'register') {
          const data = await authService.register({ name, email, password, confirmPassword });
          setPendingType('register');
          setPendingUserId(data.userId);
          setStep('otp');
          setMessage(data.message || 'OTP sent. Enter the code to verify your account.');
          return;
        }

        if (mode === 'login') {
          const data = await authService.login({ email, password });
          if (data.token) {
            onAuthenticated(data);
            return;
          }

          setPendingType('login');
          setPendingUserId(data.userId);
          setStep('otp');
          setMessage(data.message || 'OTP sent. Enter the code to continue.');
          return;
        }

        if (mode === 'forgotPassword') {
          const data = await authService.forgotPassword({ email });
          if (data.userId) {
            setPendingType('reset');
            setPendingUserId(data.userId);
            setStep('otp');
          }
          setMessage(data.message || 'If an account exists, a reset OTP has been sent.');
          return;
        }

        if (mode === 'resetPassword') {
          if (!resetToken) {
            setMessage('Reset token is missing from the link. Please request a new password reset.');
            return;
          }
          const response = await authService.resetPassword({ resetToken, password, confirmPassword });
          setMessage(response.message || 'Password reset successfully. Please sign in with your new password.');
          changeRoute('/auth/login');
          return;
        }
      }

      if (step === 'otp') {
        const data = await authService.verifyOtp({ userId: pendingUserId, type: pendingType, code: otp });
        if (pendingType === 'reset') {
          setStep('reset');
          setMessage(data.message || 'OTP verified. Enter a new password.');
          return;
        }

        onAuthenticated(data);
        return;
      }

      if (step === 'reset') {
        const response = await authService.resetPassword({ userId: pendingUserId, otp, password, confirmPassword });
        setMessage(response.message || 'Password reset successfully. Please sign in with your new password.');
        changeRoute('/auth/login');
        return;
      }
    } catch (err) {
      setMessage(err?.message || 'An unexpected error occurred.');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!pendingUserId || !pendingType) {
      setMessage('No OTP request in progress to resend.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const data = await authService.resendOtp({ userId: pendingUserId, type: pendingType });
      setMessage(data.message || 'OTP resent. Check your email.');
    } catch (err) {
      setMessage(err?.message || 'Unable to resend OTP.');
    } finally {
      setBusy(false);
    }
  };

  const titleMap = {
    login: 'Sign in to Trackkar',
    register: 'Create your Trackkar account',
    forgotPassword: 'Forgot your password?',
    resetPassword: 'Reset your password',
  };

  const descriptionMap = {
    login: 'Sign in with your email and password.',
    register: 'Create a new account with a secure password.',
    forgotPassword: 'Enter your email to receive a reset OTP.',
    resetPassword: 'Set a new password for your account.',
  };

  const renderSubmitLabel = () => {
    if (step === 'otp') return 'Verify OTP';
    if (step === 'reset') return 'Update password';
    if (mode === 'login') return 'Sign in';
    if (mode === 'register') return 'Create account';
    if (mode === 'forgotPassword') return 'Send reset OTP';
    if (mode === 'resetPassword') return 'Update password';
    return 'Submit';
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F4F4F6]">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-[0_24px_80px_-40px_rgba(0,0,0,0.25)] border border-slate-200 overflow-hidden">
        <div className="p-7">
          <div className="mb-6 text-center">
            <span className="text-sm uppercase tracking-[0.35em] text-slate-400">trackkar.store</span>
            <h1 className="mt-4 text-3xl font-serif font-bold text-slate-900">{step === 'otp' ? 'Enter your OTP' : step === 'reset' ? 'Create a new password' : titleMap[mode]}</h1>
            <p className="mt-2 text-sm text-slate-500">{step === 'otp' ? 'Enter the code sent to your email.' : step === 'reset' ? 'Set a new password to finish your reset.' : descriptionMap[mode]}</p>
          </div>

          {message && <div className="rounded-3xl bg-slate-50 border border-slate-200 text-slate-700 p-3 mb-4 text-sm">{message}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 'form' && mode === 'register' && (
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Full name</label>
                <input
                  className={inputClass}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            {step !== 'reset' && (
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Email address</label>
                <input
                  className={inputClass}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={step !== 'form' && Boolean(pendingUserId)}
                />
              </div>
            )}

            {step === 'form' && (mode === 'login' || mode === 'register' || mode === 'resetPassword') && (
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Password</label>
                <input
                  className={inputClass}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {step === 'form' && (mode === 'register' || mode === 'resetPassword') && (
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">Confirm password</label>
                <input
                  className={inputClass}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {step === 'otp' && (
              <div>
                <label className="text-xs font-bold uppercase text-slate-400">OTP Code</label>
                <input
                  className={inputClass}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                />
              </div>
            )}

            {step === 'reset' && (
              <>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">New password</label>
                  <input
                    className={inputClass}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Confirm password</label>
                  <input
                    className={inputClass}
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <AsyncButton busy={busy}>{renderSubmitLabel()}</AsyncButton>
          </form>

          {step === 'otp' && (
            <div className="mt-4 text-center">
              <button type="button" onClick={handleResend} className="text-sm font-bold text-slate-800 hover:text-slate-900">Resend OTP</button>
            </div>
          )}

          <div className="mt-5 text-center text-sm text-slate-500 space-y-2">
            {step === 'form' && mode === 'login' && (
              <>
                <button type="button" onClick={() => changeRoute('/auth/register')} className="font-bold text-slate-800">Create account</button>
                <button type="button" onClick={() => changeRoute('/auth/forgot-password')} className="font-bold text-slate-800">Forgot password?</button>
              </>
            )}
            {step === 'form' && mode === 'register' && (
              <button type="button" onClick={() => changeRoute('/auth/login')} className="font-bold text-slate-800">Already have an account? Sign in</button>
            )}
            {step === 'form' && mode === 'forgotPassword' && (
              <button type="button" onClick={() => changeRoute('/auth/login')} className="font-bold text-slate-800">Back to sign in</button>
            )}
            {step === 'otp' && (
              <button type="button" onClick={() => changeRoute('/auth/login')} className="font-bold text-slate-800">Back to sign in</button>
            )}
            {step === 'reset' && (
              <button type="button" onClick={() => changeRoute('/auth/login')} className="font-bold text-slate-800">Back to sign in</button>
            )}
            {step === 'form' && mode === 'resetPassword' && (
              <button type="button" onClick={() => changeRoute('/auth/forgot-password')} className="font-bold text-slate-800">Request a reset OTP</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

