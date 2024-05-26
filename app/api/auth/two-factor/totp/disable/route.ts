import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]"
import { authenticator } from 'otplib';
import User, { IUser } from '@/models/User';
import { symmetricDecrypt } from '@/utils/crypto';
import { ErrorCode } from '@/utils/ErrorCode';
import { isPasswordValid } from '@/utils/hash';

export const dynamic = 'force-dynamic';

export async function POST(
    req: NextRequest,
    { params }: { params: {} }) {

    const session: any = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    if (!session?.user?.email) {
        console.error('Session is missing a user id.');
        return NextResponse.json({ error: ErrorCode.InternalServerError }, { status: 500 });
    }

    const user = await User.findOne<IUser>({ email: session.user.email });

    if (!user) {
        console.error(`Session references user that no longer exists.`);
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    if (!user.password) {
        return NextResponse.json({ error: ErrorCode.UserMissingPassword }, { status: 400 });
    }

    if (!user.twoFactorEnabled) {
        return NextResponse.json({ message: 'Two factor disabled' }, { status: 200 });
    }

    // if user has 2fa
    if (user.twoFactorEnabled) {
        const data = await req.json();
        if (!data.totpCode) {
            return NextResponse.json({ error: ErrorCode.SecondFactorRequired }, { status: 400 });
        }

        if (!user.twoFactorSecret) {
            console.error(`Two factor is enabled for user ${user.email} but they have no secret`);
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
        const isValidToken = authenticator.check(data.totpCode, secret);
        if (!isValidToken) {
            return NextResponse.json({ error: ErrorCode.IncorrectTwoFactorCode }, { status: 400 });
        }
    }

    // If it is, disable users 2fa
    await User.updateOne(
        { email: session.user?.email },
        {
            twoFactorEnabled: false,
            twoFactorSecret: null,
            recoveryCode: null,
        }
    );

    return NextResponse.json({ message: 'Two factor disabled' }, { status: 200 });
}