
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import User, { IUser } from "@/models/User";
import { getServerSession } from "next-auth";

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: {} }) {

    const session: any = await getServerSession(authOptions);
    const user = await User.findOne<IUser>({ email: session?.user?.email }).select({ password: 0, twoFactorSecret: 0 });

    if (!session) {
        return NextResponse.json({
            redirect: {
                destination: '/',
                permananet: false,
            },
        }, { status: 401 });
    }

    return NextResponse.json({
        props: { session, user: user?.toJSON() },
    }, { status: 200 });
}