import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from '@/utils/session';
import { rateLimit } from '@/utils/rateLimit';
import { authenticator } from 'otplib';
import User from '@/models/User';
import { symmetricDecrypt } from '@/utils/crypto';
import { ErrorCode } from '@/utils/ErrorCode';
import { isPasswordValid } from '@/utils/hash';
import { isString } from '@/utils/security';

export const dynamic = 'force-dynamic';

export async function POST(
    req: NextRequest,
    { params }: { params: {} }) {

    const current = await getSessionUser();
    if (!current) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }
    const { user } = current;

    if (!(await rateLimit(`2fa-disable:${user._id}`, 10, 15 * 60))) {
        return NextResponse.json({ error: ErrorCode.TooManyRequests }, { status: 429 });
    }

    if (!user.password) {
        return NextResponse.json({ error: ErrorCode.UserMissingPassword }, { status: 400 });
    }

    if (!user.twoFactorEnabled) {
        return NextResponse.json({ message: 'Two factor disabled' }, { status: 200 });
    }

    // if user has 2fa
    if (user.twoFactorEnabled) {
        const data = await req.json().catch(() => null);

        // exige a senha atual antes de aceitar o TOTP
        const isCorrectPassword = isString(data?.password) && await isPasswordValid(data.password, user.password);
        if (!isCorrectPassword) {
            return NextResponse.json({ error: ErrorCode.IncorrectPassword }, { status: 400 });
        }

        if (typeof data?.totpCode !== 'string' || !data.totpCode) {
            return NextResponse.json({ error: ErrorCode.SecondFactorRequired }, { status: 400 });
        }

        if (!user.twoFactorSecret) {
            console.error(`Two factor is enabled for user ${user._id} but they have no secret`);
            throw new Error(ErrorCode.InternalServerError);
        }

        if (!process.env.ENCRYPTION_KEY) {
            console.error(`"Missing encryption key; cannot proceed with two factor login."`);
            throw new Error(ErrorCode.InternalServerError);
        }

        const secret = symmetricDecrypt(user.twoFactorSecret, process.env.ENCRYPTION_KEY);
        if (secret.length !== 32) {
            console.error(`Two factor secret decryption failed. Expected key with length 32 but got ${secret.length}`);
            throw new Error(ErrorCode.InternalServerError);
        }

        // If user has 2fa enabled, check if body.totpCode is correct
        const isValidToken = /^\d{6}$/.test(data.totpCode) && authenticator.check(data.totpCode, secret);
        if (!isValidToken) {
            return NextResponse.json({ error: ErrorCode.IncorrectTwoFactorCode }, { status: 400 });
        }
    }

    // If it is, disable users 2fa
    await User.updateOne(
        { _id: user._id },
        {
            twoFactorEnabled: false,
            twoFactorSecret: null,
            recoveryCode: null,
        }
    );

    return NextResponse.json({ message: 'Two factor disabled' }, { status: 200 });
}