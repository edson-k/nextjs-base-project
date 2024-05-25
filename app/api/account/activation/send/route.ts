import { NextRequest, NextResponse } from "next/server";
import User from '@/models/User';
import db from '@/utils/db';
import { sendActivationLink } from "@/app/api/utils/account";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {

    try {
        const data = await req.json();
        const email = data.email;

        if (email) {
            await db.connect();

            // get user
            const user = await User.findOne({ email });
            if (user) {
                await sendActivationLink(user);
                return NextResponse.json({ success: true, message: 'Send activation link successfuly' }, { status: 200 });
            } else {
                return NextResponse.json({ success: false, message: 'User not found!' }, { status: 404 });
            }
        }
        return NextResponse.json({ success: false, message: 'Email is required!' }, { status: 422 });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

}