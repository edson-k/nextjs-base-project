import { NextRequest, NextResponse } from "next/server";
import User from '@/models/User';
import db from '@/utils/db';
import { hashPassword } from '@/utils/hash';
import { ErrorCode } from "@/utils/ErrorCode";
import { validatedHuman } from "@/utils/recaptcha";
import { rateLimit } from "@/utils/rateLimit";
import { isString, isValidPassword, normalizeEmail } from "@/utils/security";

import { sendActivationLink } from "@/app/api/utils/account";
import { GetIp } from "@/utils/getIp";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
        return NextResponse.json({ success: false, message: 'Invalid request', error: ErrorCode.InternalServerError }, { status: 400 });
    }

    // Whitelist: nothing else from the client reaches the model
    const name = isString(body.name) ? body.name.trim() : '';
    const email = normalizeEmail(body.email);
    const password = body.password;

    if (!name || name.length > 50 || !email || !isValidPassword(password)) {
        return NextResponse.json({
            success: false,
            message: 'Invalid name, email or password (minimum 8 characters)',
            error: ErrorCode.InternalServerError,
        }, { status: 422 });
    }

    const ip = await GetIp();
    if (!(await rateLimit(`signup:ip:${ip}`, 10, 60 * 60))) {
        return NextResponse.json({ success: false, message: 'Too many requests', error: ErrorCode.TooManyRequests }, { status: 429 });
    }

    // Validate human
    const human = await validatedHuman(body.token);
    if (!human) {
        return NextResponse.json({ success: false, message: 'You are not human!', error: ErrorCode.IsBot }, { status: 422 });
    }

    await db.connect();

    // Same response whether or not the email exists (no account enumeration)
    const userExists = await User.findOne({ email });
    if (!userExists) {
        try {
            const storeUser = new User({
                name,
                email,
                password: await hashPassword(password),
                active: false,
            });
            await storeUser.save();
            await sendActivationLink(storeUser);
        } catch (error: any) {
            // duplicate key race: behave as if the user already existed
            if (error?.code !== 11000) {
                console.error('signup failed', error?.message);
                return NextResponse.json({ success: false, message: 'Could not create the account', error: ErrorCode.InternalServerError }, { status: 500 });
            }
        }
    }

    return NextResponse.json({ success: true, message: 'User signed up successfuly. Check your email to activate the account.' }, { status: 201 });
}
