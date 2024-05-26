import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from "next/server";
import Token from '@/models/Token';
import User from '@/models/User';
import db from '@/utils/db';
import { hashPassword } from '@/utils/hash';
import { transporter } from '@/utils/nodemailer';
import { validatedHuman } from '@/utils/recaptcha';
import { ErrorCode } from '@/utils/ErrorCode';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {

    const { email, token } = await req.json();

    try {
        // Validate human
        const human = await validatedHuman(token);
        if (!human) {
            return NextResponse.json({ success: false, message: 'You are not human!', error: ErrorCode.IsBot }, { status: 422 });
        }

        await db.connect();

        // Check for user existence
        const user = await User.findOne({ email: email });

        if (!user) {
            return NextResponse.json({ messge: "User doesn't exists!" }, { status: 422 });
        } else if (user.active) {
            const token = await Token.findOne({ userId: user._id, type: 'password' });

            if (token) {
                await token.deleteOne();
            }

            // Create a token id
            const securedTokenId = nanoid(32);

            // Store token in DB
            await new Token({
                userId: user._id,
                token: securedTokenId,
                createdAt: Date.now(),
            }).save();

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
        } else {
            return NextResponse.json({ success: false, message: 'User not activated!' }, { status: 401 });
        }
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }

    // Success
    return NextResponse.json({ success: true }, { status: 200 });
}

export async function PUT(
    req: NextRequest,
    { params }: { params: {} }) {

    const data = await req.json();
    const tokenId = data.tokenId;
    const password = data.password;

    // Get token from DB
    const token = await Token.findOne({ token: tokenId });

    if (!token) {
        return NextResponse.json({
            success: false,
            message: 'Invalid or expired password reset token',
        }, { status: 400 });
    }

    // Return user
    const user = await User.findOne({ _id: token.userId });

    // Hash password before resetting
    const hashedPassword = await hashPassword(password);

    await User.updateOne(
        { _id: user._id },
        { password: hashedPassword },
        { new: true }
    );

    await transporter.sendMail({
        from: process.env.EMAIL,
        to: user.email,
        subject: 'Password reset successufly',
        html: 'Password is successfuly reset',
    });

    // Delete token so it won't be used twice
    const deleteToken = await Token.deleteOne({ _id: token._id });

    if (!deleteToken) {
        // res.status(403).end();
        return NextResponse.json({}, { status: 403 });
    }

    return NextResponse.json({ seccuess: true, message: 'Password is reset successfuly' }, { status: 200 });
}
