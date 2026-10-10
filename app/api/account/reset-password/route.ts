import { NextRequest, NextResponse } from "next/server";
import User from '@/models/User';
import db from '@/utils/db';
import { hashPassword } from '@/utils/hash';
import { transporter } from '@/utils/nodemailer';
import { validatedHuman } from '@/utils/recaptcha';
import { ErrorCode } from '@/utils/ErrorCode';
import { rateLimit } from '@/utils/rateLimit';
import { isValidPassword, normalizeEmail, randomToken } from '@/utils/security';
import { createToken, findToken } from '@/utils/tokens';
import Token from '@/models/Token';
import { GetIp } from '@/utils/getIp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {

    const body = await req.json().catch(() => null);
    const email = normalizeEmail(body?.email);
    const ip = await GetIp();

    // Always the same answer, so the endpoint cannot be used to enumerate accounts
    const ok = NextResponse.json({ success: true }, { status: 200 });

    try {
        if (!(await rateLimit(`reset:ip:${ip}`, 10, 60 * 60))) {
            return NextResponse.json({ success: false, error: ErrorCode.TooManyRequests }, { status: 429 });
        }

        // Validate human
        const human = await validatedHuman(body?.token);
        if (!human) {
            return NextResponse.json({ success: false, message: 'You are not human!', error: ErrorCode.IsBot }, { status: 422 });
        }

        if (!email) {
            return ok;
        }

        await db.connect();

        // At most 3 emails per hour per account (email bombing)
        if (!(await rateLimit(`reset:email:${email}`, 3, 60 * 60))) {
            return ok;
        }

        const user = await User.findOne({ email });

        if (user && user.active) {
            const securedTokenId = randomToken();
            await createToken(user._id, 'password', securedTokenId);

            // Link send to user's email for resetting
            const link = `${process.env.WEB_URI}/reset-password/${securedTokenId}`;

            await transporter.sendMail({
                from: process.env.EMAIL,
                to: user.email,
                subject: 'Reset Password',
                text: 'Reset Password Messsage',
                html: ` 
                <div>
                    <h1>Follow the following link</h1>
                    <p>Please follow 
                    <a href="${link}"> this link </a> 
                    to reset your password
                    </p>
                </div> 
                `,
            });
        }
    } catch (error: any) {
        console.error('reset-password failed', error?.message);
    }

    return ok;
}

export async function PUT(req: NextRequest) {

    const data = await req.json().catch(() => null);
    const ip = await GetIp();

    if (!(await rateLimit(`reset-put:ip:${ip}`, 20, 60 * 60))) {
        return NextResponse.json({ success: false, error: ErrorCode.TooManyRequests }, { status: 429 });
    }

    if (!isValidPassword(data?.password)) {
        return NextResponse.json({
            success: false,
            message: 'Password must have at least 8 characters',
        }, { status: 422 });
    }

    // Get token from DB (type + string are enforced, expired tokens are rejected)
    const token = await findToken(data?.tokenId, 'password');

    if (!token) {
        return NextResponse.json({
            success: false,
            message: 'Invalid or expired password reset token',
        }, { status: 400 });
    }

    // Return user
    const user = await User.findOne({ _id: token.userId });

    if (!user) {
        await Token.deleteOne({ _id: token._id });
        return NextResponse.json({
            success: false,
            message: 'Invalid or expired password reset token',
        }, { status: 400 });
    }

    // Hash password before resetting; bumping sessionVersion revokes every existing session
    const hashedPassword = await hashPassword(data.password);

    await User.updateOne(
        { _id: user._id },
        { password: hashedPassword, $inc: { sessionVersion: 1 } }
    );

    // Delete token so it won't be used twice
    await Token.deleteOne({ _id: token._id });

    try {
        await transporter.sendMail({
            from: process.env.EMAIL,
            to: user.email,
            subject: 'Password reset successufly',
            html: 'Password is successfuly reset',
        });
    } catch (error: any) {
        console.error('reset-password notification failed', error?.message);
    }

    return NextResponse.json({ success: true, message: 'Password is reset successfuly' }, { status: 200 });
}
