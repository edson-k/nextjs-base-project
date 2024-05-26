import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]"
import { authenticator } from 'otplib';
import User, { IUser } from '@/models/User';
import { symmetricDecrypt } from '@/utils/crypto';
import { ErrorCode } from '@/utils/ErrorCode';

export const dynamic = 'force-dynamic';

export async function POST(
    req: NextRequest,
    { params }: { params: {} }) {

    const session: any = await getServerSession(authOptions)
    if (!session) {
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    if (!session.user?.email) {
        console.error('Session is missing a user email.');
        return NextResponse.json({ error: ErrorCode.InternalServerError }, { status: 500 });
    }

    const user = await User.findOne<IUser>({ email: session.user.email });

    if (!user) {
        console.error(`Session references user that no longer exists.`);
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
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

    const data = await req.json();
    const isValidToken = authenticator.check(data.totpCode, secret);
    if (!isValidToken) {
        return NextResponse.json({ error: ErrorCode.IncorrectTwoFactorCode }, { status: 400 });
    }

    await User.updateOne(
        { email: session.user?.email },
        {
            twoFactorEnabled: true,
        }
    );

    return NextResponse.json({ message: 'Two-factor enabled' }, { status: 200 });
}
