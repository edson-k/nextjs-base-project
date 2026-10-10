import Token from '@/models/Token';
import db from '@/utils/db';
import { sha256, safeEqual } from '@/utils/security';

export type TokenType = 'password' | 'activation' | 'otp';

// Lifetime in ms
const LIFETIME: Record<TokenType, number> = {
    password: 60 * 60 * 1000,
    activation: 24 * 60 * 60 * 1000,
    otp: 5 * 60 * 1000,
};

/** Replaces any existing token of the same type for the user. Only the SHA-256 is stored. */
export const createToken = async (userId: any, type: TokenType, raw: string) => {
    await db.connect();
    await Token.deleteMany({ userId, type });
    await new Token({ userId, type, token: sha256(raw), createdAt: new Date() }).save();
};

/** Looks up a raw token of the given type; null if missing, of another type or expired. */
export const findToken = async (raw: unknown, type: TokenType) => {
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > 256) return null;
    await db.connect();
    const token: any = await Token.findOne({ token: sha256(raw), type });
    if (!token) return null;
    if (Date.now() - new Date(token.createdAt).getTime() > LIFETIME[type]) {
        await Token.deleteOne({ _id: token._id });
        return null;
    }
    return token;
};

/** Constant-time check of a user's token (used for OTP, where the user id is already known). */
export const consumeUserToken = async (userId: any, type: TokenType, raw: unknown) => {
    if (typeof raw !== 'string') return false;
    await db.connect();
    const token: any = await Token.findOne({ userId, type });
    if (!token) return false;
    if (Date.now() - new Date(token.createdAt).getTime() > LIFETIME[type]) {
        await Token.deleteOne({ _id: token._id });
        return false;
    }
    if (!safeEqual(token.token, sha256(raw))) return false;
    await Token.deleteOne({ _id: token._id });
    return true;
};
