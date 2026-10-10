import { NextRequest, NextResponse } from "next/server";
import User from '@/models/User';
import db from '@/utils/db';
import { sendActivationLink } from "@/app/api/utils/account";
import { rateLimit } from "@/utils/rateLimit";
import { normalizeEmail } from "@/utils/security";
import { GetIp } from "@/utils/getIp";
import { ErrorCode } from "@/utils/ErrorCode";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {

    const data = await req.json().catch(() => null);
    const email = normalizeEmail(data?.email);

    if (!email) {
        return NextResponse.json({ success: false, message: 'Email is required!' }, { status: 422 });
    }

    const ip = await GetIp();
    if (!(await rateLimit(`activation-send:ip:${ip}`, 10, 60 * 60))) {
        return NextResponse.json({ success: false, error: ErrorCode.TooManyRequests }, { status: 429 });
    }

    try {
        await db.connect();

        // At most 3 emails per hour per account
        if (await rateLimit(`activation-send:email:${email}`, 3, 60 * 60)) {
            const user = await User.findOne({ email });
            if (user && !user.active) {
                await sendActivationLink(user);
            }
        }
    } catch (error: any) {
        console.error('activation send failed', error?.message);
    }

    // Same answer whether or not the account exists
    return NextResponse.json({ success: true, message: 'If the account exists, an activation link was sent' }, { status: 200 });
}
