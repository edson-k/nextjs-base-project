import { NextRequest, NextResponse } from "next/server";
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { symmetricEncrypt } from '@/utils/crypto';
import { getSessionUser } from '@/utils/session';
import { rateLimit } from '@/utils/rateLimit';
import { isString, randomCode, sha256 } from '@/utils/security';
import { ErrorCode } from '@/utils/ErrorCode';
import User from '@/models/User';
import { isPasswordValid } from '@/utils/hash';

export const dynamic = 'force-dynamic';

export async function POST(
    req: NextRequest,
    { params }: { params: {} }) {

    const current = await getSessionUser();
    if (!current) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }
    const { user } = current;

    if (!(await rateLimit(`2fa-setup:${user._id}`, 10, 15 * 60))) {
        return NextResponse.json({ error: ErrorCode.TooManyRequests }, { status: 429 });
    }

    if (!user.password) {
        return NextResponse.json({ error: ErrorCode.UserMissingPassword }, { status: 400 });
    }

    if (user.twoFactorEnabled) {
        return NextResponse.json({ error: ErrorCode.TwoFactorAlreadyEnabled }, { status: 400 });
    }

    if (!process.env.ENCRYPTION_KEY) {
        console.error('Missing encryption key; cannot proceed with two factor setup.');
        return NextResponse.json({ error: ErrorCode.InternalServerError }, { status: 500 });
    }

    const data = await req.json().catch(() => null);
    const isCorrectPassword = isString(data?.password) && await isPasswordValid(data.password, user.password);

    if (!isCorrectPassword) {
        return NextResponse.json({ error: ErrorCode.IncorrectPassword }, { status: 400 });
    }

    // This generates a secret 32 characters in length. Do not modify the number of
    // bytes without updating the sanity checks in the enable and login endpoints.
    const secret = authenticator.generateSecret(20);
    // Shown to the user only once; only its hash is stored
    const secretRecoveryCode = randomCode(12);

    await User.updateOne(
        { _id: user._id },
        {
            twoFactorEnabled: false,
            twoFactorSecret: symmetricEncrypt(secret, process.env.ENCRYPTION_KEY),
            recoveryCode: sha256(secretRecoveryCode),
        }
    );

    const name = user.email;
    const keyUri = authenticator.keyuri(name, (process.env.MYAPP || 'MyApp'), secret);
    const dataUri = await qrcode.toDataURL(keyUri);

    return NextResponse.json({ secret, keyUri, dataUri, recoveryCode: secretRecoveryCode }, { status: 200 });
}
