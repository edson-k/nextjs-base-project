
import { NextResponse } from "next/server";
import { getSessionUser } from "@/utils/session";

export const dynamic = 'force-dynamic';

export async function GET() {

    const current = await getSessionUser();

    if (!current) {
        return NextResponse.json({
            redirect: {
                destination: '/',
                permananet: false,
            },
        }, { status: 401 });
    }

    const { password, twoFactorSecret, recoveryCode, lastTotpCounter, sessionVersion, ...user } = current.user.toJSON();

    return NextResponse.json({
        props: { session: { user: current.session.user, expires: current.session.expires }, user },
    }, { status: 200 });
}
