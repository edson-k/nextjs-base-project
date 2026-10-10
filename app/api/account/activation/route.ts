import { NextRequest, NextResponse } from "next/server";
import Token from '@/models/Token';
import User from '@/models/User';
import { transporter } from '@/utils/nodemailer';
import { findToken } from '@/utils/tokens';
import { rateLimit } from '@/utils/rateLimit';
import { GetIp } from '@/utils/getIp';
import { ErrorCode } from '@/utils/ErrorCode';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {

    const data = await req.json().catch(() => null);
    const ip = await GetIp();

    if (!(await rateLimit(`activation:ip:${ip}`, 20, 60 * 60))) {
        return NextResponse.json({ success: false, error: ErrorCode.TooManyRequests }, { status: 429 });
    }

    // Get token from DB (type + string are enforced, expired tokens are rejected)
    const token = await findToken(data?.tokenId, 'activation');

    if (!token) {
        return NextResponse.json({
            success: false,
            message: 'Invalid or expired activation token!',
        }, { status: 400 });
    }

    // Return user
    const user = await User.findOne({ _id: token.userId });

    if (!user) {
        await Token.deleteOne({ _id: token._id });
        return NextResponse.json({
            success: false,
            message: 'Invalid or expired activation token!',
        }, { status: 400 });
    }

    if (!user.active) {
        await User.updateOne({ _id: user._id }, { active: true });

        try {
            await transporter.sendMail({
                from: process.env.EMAIL,
                to: user.email,
                subject: 'Account activate successufly',
                html: 'Your account is activated successfuly!',
            });
        } catch (error: any) {
            console.error('activation notification failed', error?.message);
        }
    }

    // Delete token so it won't be used twice
    await Token.deleteOne({ _id: token._id });

    return NextResponse.json({ success: true, message: 'Account is activated successfuly' }, { status: 200 });
}
