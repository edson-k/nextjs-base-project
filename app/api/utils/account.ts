
import { transporter } from "@/utils/nodemailer";
import { createToken, consumeUserToken } from '@/utils/tokens';
import { randomToken, randomCode } from '@/utils/security';

export const sendActivationLink = async (user: any) => {
    const securedTokenId = randomToken();
    await createToken(user._id, 'activation', securedTokenId);

    // Link send to user's email for activation
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
    const code = randomCode(8);
    await createToken(user._id, 'otp', code);

    await transporter.sendMail({
        from: process.env.EMAIL,
        to: user.email,
        subject: 'Your Two-Factor Authentication code',
        text: `Your Two-Factor Authentication code: ${code}`,
        html: ` 
                <div>
                    <h1>Your Two-Factor Authentication code</h1>
                    <p><b>${code}</b></p>
                </div> 
                `,
    });
}

export const validateOTPCode = async (userId: string, otpCode: string) => {
    return consumeUserToken(userId, 'otp', otpCode);
}
