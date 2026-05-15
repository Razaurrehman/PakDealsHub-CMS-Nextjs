// In-memory OTP store — keyed by email+siteId, 5-minute expiry
// One OTP slot per email at a time; requesting a new one replaces the old one.

type OtpEntry = {
  otp: string;
  expiresAt: number;
  attempts: number;
};

const store = new Map<string, OtpEntry>();

const OTP_TTL_MS   = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

function key(email: string, siteId: string) {
  return `${siteId}:${email.toLowerCase()}`;
}

export function setOtp(email: string, siteId: string): string {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  store.set(key(email, siteId), { otp, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  return otp;
}

export type VerifyResult = 'ok' | 'expired' | 'invalid' | 'too-many-attempts';

export function verifyOtp(email: string, siteId: string, input: string): VerifyResult {
  const entry = store.get(key(email, siteId));
  if (!entry) return 'expired';
  if (Date.now() > entry.expiresAt) {
    store.delete(key(email, siteId));
    return 'expired';
  }
  if (entry.attempts >= MAX_ATTEMPTS) return 'too-many-attempts';
  if (entry.otp !== input.trim()) {
    entry.attempts++;
    return 'invalid';
  }
  store.delete(key(email, siteId));
  return 'ok';
}

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now > v.expiresAt) store.delete(k);
  }
}, 60_000);
