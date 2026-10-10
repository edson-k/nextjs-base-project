import { trusted } from 'mongoose';

import CredentialsProvider from 'next-auth/providers/credentials';
import { authenticator } from 'otplib';
import User, { IUser } from '@/models/User';
import { symmetricDecrypt } from '@/utils/crypto';
import db from '@/utils/db';
import { ErrorCode } from '@/utils/ErrorCode';
import { isPasswordValid } from '@/utils/hash';
import { validatedHuman } from '@/utils/recaptcha';
import { rateLimit } from '@/utils/rateLimit';
import { isString, normalizeEmail, safeEqual, sha256 } from '@/utils/security';
import { GetIp } from '@/utils/getIp';
import { sendOTPCode, validateOTPCode } from '@/app/api/utils/account';

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
                step: { label: 'Step', type: 'input', placeholder: 'Step from authenticator app' },
                token: { label: 'Token', type: 'input', placeholder: 'Token from reCAPTCHA' },
                otpCode: { label: 'OTP Code', type: 'input', placeholder: 'Code from email' },
            },
            //@ts-ignore
            async authorize(credentials: any) {

                const email = normalizeEmail(credentials?.email);
                if (!email || !isString(credentials?.password) || credentials.password.length > 1024) {
                    return null;
                }

                // Validate human
                const human = await validatedHuman(credentials.token);
                if (!human) {
                    throw new Error(ErrorCode.IsBot);
                }

                await db.connect();
                const ip = await GetIp();

                // Brute force protection: per account and per IP
                const allowed =
                    (await rateLimit(`login:email:${email}`, 10, 15 * 60)) &&
                    (await rateLimit(`login:ip:${ip}`, 30, 15 * 60));
                if (!allowed) {
                    throw new Error(ErrorCode.TooManyRequests);
                }

                const user = await User.findOne<IUser>({ email });

                // Check if user exists
                if (!user) {
                    return null;
                }

                // Validate password
                const isPasswordMatch = await isPasswordValid(credentials.password, user.password);

                if (!isPasswordMatch) {
                    return null;
                }

                if (!user.active) {
                    throw new Error(ErrorCode.UserNotActive);
                }

                // The required factor is decided by the account state, never by the client "step".
                // Anything that is not a fully verified factor ends in a throw (deny by default).
                if (user.twoFactorEnabled) {
                    if (credentials.step === 'recoveryCode') {
                        if (!isString(credentials.recoveryCode) || !credentials.recoveryCode) {
                            throw new Error(ErrorCode.RecoveryCodeRequired);
                        }
                        if (!user.recoveryCode || !safeEqual(user.recoveryCode, sha256(credentials.recoveryCode.trim().toUpperCase()))) {
                            throw new Error(ErrorCode.IncorrectRecoveryCode);
                        }
                        // Recovery code is single use: disable 2FA and revoke older sessions
                        await User.updateOne(
                            { _id: user._id },
                            {
                                twoFactorEnabled: false,
                                twoFactorSecret: null,
                                recoveryCode: null,
                                $inc: { sessionVersion: 1 },
                            }
                        );
                        user.sessionVersion = (user.sessionVersion ?? 0) + 1;
                    } else if (credentials.step === '2fa') {
                        if (!isString(credentials.totpCode) || !credentials.totpCode) {
                            throw new Error(ErrorCode.SecondFactorRequired);
                        }
                        if (!user.twoFactorSecret) {
                            console.error(`Two factor is enabled for user ${user._id} but they have no secret`);
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

                        if (!/^\d{6}$/.test(credentials.totpCode) || !authenticator.check(credentials.totpCode, secret)) {
                            throw new Error(ErrorCode.IncorrectTwoFactorCode);
                        }

                        // Replay protection: a time step can only be used once
                        const counter = Math.floor(Date.now() / (authenticator.allOptions().step * 1000));
                        const claimed = await User.findOneAndUpdate(
                            { _id: user._id, $or: [{ lastTotpCounter: trusted({ $lt: counter }) }, { lastTotpCounter: null }] },
                            { lastTotpCounter: counter }
                        );
                        if (!claimed) {
                            throw new Error(ErrorCode.IncorrectTwoFactorCode);
                        }
                    } else {
                        throw new Error(ErrorCode.SecondFactorRequest);
                    }
                } else if (user.lastIp !== ip) {
                    // New IP: email OTP required
                    if (credentials.step === 'otp') {
                        if (!isString(credentials.otpCode) || !credentials.otpCode) {
                            throw new Error(ErrorCode.OTPRequired);
                        }
                        if (!(await rateLimit(`otp:${user._id}`, 5, 5 * 60))) {
                            throw new Error(ErrorCode.TooManyRequests);
                        }
                        const validateOTP = await validateOTPCode(user._id as any, credentials.otpCode.trim().toUpperCase());
                        if (!validateOTP) {
                            throw new Error(ErrorCode.IncorrectOTPCode);
                        }
                    } else {
                        if (await rateLimit(`otp-send:${user._id}`, 3, 15 * 60)) {
                            await sendOTPCode(user);
                        }
                        throw new Error(ErrorCode.OTPRequest);
                    }
                }

                await User.updateOne(
                    { _id: user._id },
                    {
                        lastIp: ip,
                        lastConnection: new Date().toISOString(),
                    }
                );
                return {
                    id: String(user._id),
                    name: user.name,
                    email: user.email,
                    sessionVersion: user.sessionVersion ?? 0,
                };
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.sv = user.sessionVersion ?? 0;
            }
            return token;
        },
        async session({ session, token }: any) {
            session.sv = token.sv ?? 0;
            return session;
        },
    },

    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: 'jwt',
        maxAge: 7 * 24 * 60 * 60, // 7 Days
    },
}
