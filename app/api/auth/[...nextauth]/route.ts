import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authenticator } from 'otplib';
import User, { IUser } from '@/models/User';
import { symmetricDecrypt } from '@/utils/crypto';
import db from '@/utils/db';
import { ErrorCode } from '@/utils/ErrorCode';
import { isPasswordValid } from '@/utils/hash';

export const authOptions: any = {
    pages: {
        signIn: '/',
    },
    providers: [
        CredentialsProvider({
            id: 'credentials',
            name: 'Credentials',
            credentials: {
                email: { label: 'Email Address', type: 'email', placeholder: 'john.doe@example.com' },
                password: { label: 'Password', type: 'password', placeholder: 'Your super secure password' },
                totpCode: { label: 'Two-factor Code', type: 'input', placeholder: 'Code from authenticator app' },
                recoveryCode: { label: 'Recovery Code', type: 'input', placeholder: 'Code from recovery authenticator app' },
                showOTP: { label: 'Two-factor Code', type: 'input', placeholder: 'Flag from authenticator app' },
                showRecoveryCode: { label: 'Recovery Code', type: 'input', placeholder: 'Flag from recovery authenticator app' },
            },
            //@ts-ignore
            async authorize(credentials: any) {
                await db.connect();

                const user = await User.findOne<IUser>({ email: credentials.email });

                // Check if user exists
                if (!user) {
                    return null;
                }

                // Validate password
                const isPasswordMatch = await isPasswordValid(credentials.password, user.password);

                if (!isPasswordMatch) {
                    return null;
                }

                if (user.twoFactorEnabled) {
                    if (credentials.showOTP === 'false' && credentials.showRecoveryCode === 'false') {
                        throw new Error(ErrorCode.SecondFactorRequest);
                    } else if (credentials.showOTP === 'true') {
                        if (!credentials.totpCode) {
                            throw new Error(ErrorCode.SecondFactorRequired);
                        }

                        if (!user.twoFactorSecret) {
                            console.error(`Two factor is enabled for user ${user.email} but they have no secret`);
                            throw new Error(ErrorCode.InternalServerError);
                        }

                        if (!process.env.ENCRYPTION_KEY) {
                            console.error(`"Missing encryption key; cannot proceed with two factor login."`);
                            throw new Error(ErrorCode.InternalServerError);
                        }

                        const secret = symmetricDecrypt(user.twoFactorSecret!, process.env.ENCRYPTION_KEY!);
                        if (secret.length !== 32) {
                            console.error(`Two factor secret decryption failed. Expected key with length 32 but got ${secret.length}`);
                            throw new Error(ErrorCode.InternalServerError);
                        }

                        if (isNaN(credentials.totpCode)) {
                            throw new Error(ErrorCode.IncorrectTwoFactorCode);
                        } else {
                            const isValidToken = authenticator.check(credentials.totpCode, secret);
                            if (!isValidToken) {
                                throw new Error(ErrorCode.IncorrectTwoFactorCode);
                            }
                        }
                    } else if (credentials.showRecoveryCode === 'true') {
                        if (!credentials.recoveryCode) {
                            throw new Error(ErrorCode.RecoveryCodeRequired);
                        } else if (user.recoveryCode === credentials.recoveryCode) {
                            // Disable 2FA
                            await User.updateOne(
                                { email: credentials.email },
                                {
                                    twoFactorEnabled: false,
                                    twoFactorSecret: null,
                                    recoveryCode: null,
                                }
                            );
                        } else {
                            throw new Error(ErrorCode.IncorrectRecoveryCode);
                        }
                    }
                }

                if (user)
                    return {
                        name: user.name,
                        email: user.email,
                    };
            },
        }),
    ],

    secret: process.env.ENCRYPTION_KEY,
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 Days
    },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }