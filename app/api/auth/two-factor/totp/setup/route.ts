import { NextRequest, NextResponse } from "next/server";
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { symmetricEncrypt } from '@/utils/crypto';
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { ErrorCode } from '@/utils/ErrorCode';
import User, { IUser } from '@/models/User';
import { isPasswordValid } from '@/utils/hash';

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

    const user = await User.findOne<IUser>({ email: session.user?.email });

    if (!user) {
        console.error(`Session references user that no longer exists.`);
        return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    if (!user.password) {
        return NextResponse.json({ error: ErrorCode.UserMissingPassword }, { status: 400 });
    }

    if (user.twoFactorEnabled) {
        return NextResponse.json({ error: ErrorCode.TwoFactorAlreadyEnabled }, { status: 200 });
    }

    if (!process.env.ENCRYPTION_KEY) {
        console.error('Missing encryption key; cannot proceed with two factor setup.');
        return NextResponse.json({ error: ErrorCode.InternalServerError }, { status: 500 });
    }

    const data = await req.json();
    const isCorrectPassword = await isPasswordValid(data.password, user.password);

    if (!isCorrectPassword) {
        return NextResponse.json({ error: ErrorCode.IncorrectPassword }, { status: 400 });
    }

    // This generates a secret 32 characters in length. Do not modify the number of
    // bytes without updating the sanity checks in the enable and login endpoints.
    const secret = authenticator.generateSecret(20);

    await User.updateOne(
        { email: session.user?.email },
        {
            twoFactorEnabled: false,
            twoFactorSecret: symmetricEncrypt(secret, process.env.ENCRYPTION_KEY),
        }
    );

    const name = user.email;
    const keyUri = authenticator.keyuri(name, (process.env.MYAPP || 'MyApp'), secret);
    const dataUri = await qrcode.toDataURL(keyUri);

    return NextResponse.json({ secret, keyUri, dataUri }, { status: 200 });
}
