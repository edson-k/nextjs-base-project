import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from '@/utils/session';
import { rateLimit } from '@/utils/rateLimit';
import { authenticator } from 'otplib';
import User from '@/models/User';
import { symmetricDecrypt } from '@/utils/crypto';
import { ErrorCode } from '@/utils/ErrorCode';

export const dynamic = 'force-dynamic';

export async function POST(
    req: NextRequest,
    { params }: { params: {} }) {

    const current = await getSessionUser();
    if (!current) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }
    const { user } = current;

    if (!(await rateLimit(`2fa-enable:${user._id}`, 10, 15 * 60))) {
        return NextResponse.json({ error: ErrorCode.TooManyRequests }, { status: 429 });
    }

    if (user.twoFactorEnabled) {
        return NextResponse.json({ error: ErrorCode.TwoFactorAlreadyEnabled }, { status: 400 });
    }

    if (!user.twoFactorSecret) {
        return NextResponse.json({ error: ErrorCode.TwoFactorSetupRequired }, { status: 400 });
    }

    if (!process.env.ENCRYPTION_KEY) {
        console.error('Missing encryption key; cannot proceed with two factor setup.');
        return NextResponse.json({ error: ErrorCode.InternalServerError }, { status: 500 });
    }

    const secret = symmetricDecrypt(user.twoFactorSecret, process.env.ENCRYPTION_KEY);
    if (secret.length !== 32) {
        console.error(`Two factor secret decryption failed. Expected key with length 32 but got ${secret.length}`);
        return NextResponse.json({ error: ErrorCode.InternalServerError }, { status: 500 });
    }

    const data = await req.json().catch(() => null);
    const isValidToken = typeof data?.totpCode === 'string' && /^\d{6}$/.test(data.totpCode) && authenticator.check(data.totpCode, secret);
    if (!isValidToken) {
        return NextResponse.json({ error: ErrorCode.IncorrectTwoFactorCode }, { status: 400 });
    }

    await User.updateOne(
        { _id: user._id },
        {
            twoFactorEnabled: true,
        }
    );

    return NextResponse.json({ message: 'Two-factor enabled' }, { status: 200 });
}
