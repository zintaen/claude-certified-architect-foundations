import { sbClient } from '../../services/supabase';
import { showToast } from '../../components/toast';
import { hashPIN } from './utils';
import { loadDashboard } from '../dashboard/dashboard';

export async function verifyUser(): Promise<boolean> {
  const emailEl = document.getElementById('auth-email') as HTMLInputElement | null;
  const pinEl = document.getElementById('auth-pin') as HTMLInputElement | null;
  const nicknameEl = document.getElementById('auth-nickname') as HTMLInputElement | null;

  const email = emailEl ? emailEl.value.trim() : '';
  const pin = pinEl ? pinEl.value.trim() : '';
  const nickname = nicknameEl ? nicknameEl.value.trim() : '';

  if (!email && !pin) return true; // guest mode
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please provide a valid email format.');
    return false;
  }
  if (!sbClient) return true; // Supabase offline — allow anyway
  if ((email && !pin) || (!email && pin) || !/^\d{6}$/.test(pin)) {
    showToast('Please provide both a valid email and a 6-digit PIN, or leave both blank.');
    return false;
  }

  const startBtn = document.getElementById('btn-start');
  const practiceBtn = document.getElementById('btn-practice');
  const ogStart = startBtn ? startBtn.innerHTML : '';
  const ogPractice = practiceBtn ? practiceBtn.innerHTML : '';

  if (startBtn) startBtn.innerHTML = 'Verifying...';
  if (practiceBtn) practiceBtn.innerHTML = 'Verifying...';

  try {
    const p_pin_hash = await hashPIN(pin);
    const { data, error } = await sbClient.rpc('verify_mock_user', {
      p_email: email,
      p_pin_hash: p_pin_hash,
      p_nickname: nickname || null,
    });

    if (error) {
      console.error('Verification error:', error);
      showToast('Error connecting to server. Please try again.');
      return false;
    }
    if (data && !data.success) {
      showToast('Authentication failed: ' + data.error);
      return false;
    }

    // If verified, try to load their history for the dashboard
    if (p_pin_hash) {
      loadDashboard(email, p_pin_hash);
    }
    return true;
  } catch (e) {
    console.error(e);
    showToast('Something went wrong during verification.');
    return false;
  } finally {
    if (startBtn) startBtn.innerHTML = ogStart;
    if (practiceBtn) practiceBtn.innerHTML = ogPractice;
  }
}

export function initAuthListeners() {
  const emailEl = document.getElementById('auth-email') as HTMLInputElement;
  const pinEl = document.getElementById('auth-pin') as HTMLInputElement;

  // Auto-login from localStorage (PIN is stored as hash)
  const savedEmail = localStorage.getItem('ccaf-email');
  const savedPinHash = localStorage.getItem('ccaf-pin-hash');
  const legacyPin = localStorage.getItem('ccaf-pin');

  if (savedEmail && legacyPin && !savedPinHash) {
    hashPIN(legacyPin)
      .then((h) => {
        if (!h) return;
        localStorage.setItem('ccaf-pin-hash', h);
        localStorage.removeItem('ccaf-pin');
        loadDashboard(savedEmail, h).catch(console.error);
      })
      .catch((e) => console.error('PIN migration failed', e));
    if (emailEl) emailEl.value = savedEmail;
    if (pinEl) pinEl.value = legacyPin;
  } else if (savedEmail && savedPinHash && emailEl) {
    emailEl.value = savedEmail;
    loadDashboard(savedEmail, savedPinHash).catch(console.error);
  }

  if (pinEl) {
    pinEl.addEventListener('blur', async () => {
      const email = emailEl?.value.trim();
      const pin = pinEl.value.trim();
      if (email && /^\d{6}$/.test(pin)) {
        const pinHash = await hashPIN(pin);
        if (pinHash) {
          localStorage.setItem('ccaf-email', email);
          localStorage.setItem('ccaf-pin-hash', pinHash);
          localStorage.removeItem('ccaf-pin');
          loadDashboard(email, pinHash).catch(console.error);
        }
      }
    });
  }
}
