import crypto from 'crypto';

export const isString = (v: unknown): v is string => typeof v === 'string';

export const normalizeEmail = (v: unknown): string | null => {
    if (!isString(v)) return null;
    const email = v.trim().toLowerCase();
    if (email.length === 0 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return email;
};

// bcrypt only uses the first 72 bytes
export const isValidPassword = (v: unknown): v is string => isString(v) && v.length >= 8 && Buffer.byteLength(v) <= 72;

export const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

export const safeEqual = (a: string, b: string) => {
    const ha = crypto.createHash('sha256').update(a).digest();
    const hb = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(ha, hb);
};

export const randomToken = () => crypto.randomBytes(32).toString('base64url');

const OTP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const randomCode = (length: number) =>
    Array.from({ length }, () => OTP_ALPHABET[crypto.randomInt(OTP_ALPHABET.length)]).join('');
