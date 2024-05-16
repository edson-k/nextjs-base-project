import { NextRequest, NextResponse } from "next/server";
import User from '@/models/User';
import db from '@/utils/db';
import { hashPassword } from '@/utils/hash';

export const dynamic = 'force-dynamic';

export async function POST(
    req: NextRequest,
    { params }: { params: {} }) {

    const newUser = await req.json();

    await db.connect();

    // Check if user exists
    const userExists = await User.findOne({ email: newUser.email });
    if (userExists) {
        return NextResponse.json({
            success: false,
            message: 'A user with the same email already exists!',
            userExists: true,
        }, { status: 422 });
    }

    // Hash Password
    newUser.password = await hashPassword(newUser.password);

    // Store new user
    const storeUser = new User(newUser);
    await storeUser.save();

    return NextResponse.json({ success: true, message: 'User signed up successfuly' }, { status: 201 });
}