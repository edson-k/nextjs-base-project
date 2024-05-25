import { NextRequest, NextResponse } from "next/server";
import Token from '@/models/Token';
import User from '@/models/User';
import db from '@/utils/db';
import { transporter } from '@/utils/nodemailer';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {

    const data = await req.json();
    const tokenId = data.tokenId;

    await db.connect();

    // Get token from DB
    const token = await Token.findOne({ token: tokenId });

    if (!token) {
        return NextResponse.json({
            success: false,
            message: 'Invalid or expired activation token!',
        }, { status: 400 });
    }

    // Return user
    const user = await User.findOne({ _id: token.userId });

    if (!user.active) {
        await User.updateOne(
            { _id: user._id },
            { active: true },
            { new: true }
        );

        await transporter.sendMail({
            from: process.env.EMAIL,
            to: user.email,
            subject: 'Account activate successufly',
            html: 'Your account is activated successfuly!',
        });
    }

    // Delete token so it won't be used twice
    const deleteToken = await Token.deleteOne({ _id: token._id });

    if (!deleteToken) {
        return NextResponse.json({}, { status: 403 });
    }

    return NextResponse.json({ success: true, message: 'Account is activated successfuly' }, { status: 200 });
}
