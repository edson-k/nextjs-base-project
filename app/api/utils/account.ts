
import Token from "@/models/Token";
import { nanoid } from 'nanoid';
import { transporter } from "@/utils/nodemailer";
import otpGenerator from 'otp-generator';
import db from '@/utils/db';

export const sendActivationLink = async (user: any) => {
    await db.connect();

    const token = await Token.findOne({ userId: user._id, type: 'activation' });

    if (token) {
        await token.deleteOne();
    }

    // Create a token id
    const securedTokenId = nanoid(32);

    // Store token in DB
    await new Token({
        userId: user._id,
        token: securedTokenId,
        type: 'activation',
        createdAt: Date.now(),
    }).save();

    // Link send to user's email for resetting
    const link = `${process.env.WEB_URI}/activation/${securedTokenId}`;

    await transporter.sendMail({
        from: process.env.EMAIL,
        to: user.email,
        subject: 'Activation',
        text: 'Activation Messsage',
        html: ` 
                <div>
                    <h1>Follow the following link</h1>
                    <p>Please follow 
                    <a href="${link}"> this link </a> 
                    to activation your account
                    </p>
                </div> 
                `,
    });
}

export const sendOTPCode = async (user: any) => {
    await db.connect();

    const token = await Token.findOne({ userId: user._id, type: 'otp' });

    if (token) {
        await token.deleteOne();
    }

    // Create a token id
    const securedTokenId = otpGenerator.generate(6, { specialChars: false });

    // Store token in DB
    await new Token({
        userId: user._id,
        token: securedTokenId,
        type: 'otp',
        createdAt: Date.now(),
    }).save();

    await transporter.sendMail({
        from: process.env.EMAIL,
        to: user.email,
        subject: 'Your Two-Factor Authentication code',
        text: `Your Two-Factor Authentication code: ${securedTokenId}`,
        html: ` 
                <div>
                    <h1>Your Two-Factor Authentication code</h1>
                    <p><b>${securedTokenId}</b></p>
                </div> 
                `,
    });
}

export const validateOTPCode = async (userId: string, otpCode: string) => {
    const token = await Token.findOne({ userId, type: 'otp' });
    if (!token) return false;
    if (token.token !== otpCode) return false;
    if (token.token === otpCode) {
        await token.deleteOne();
        return true;
    }
}