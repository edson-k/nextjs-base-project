
import Token from "@/models/Token";
import { nanoid } from 'nanoid';
import { transporter } from "@/utils/nodemailer";
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