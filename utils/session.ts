import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]';
import User, { IUser } from '@/models/User';
import db from '@/utils/db';

/**
 * Returns the logged in user document, or null when there is no session or the session
 * was invalidated (password reset / recovery login bumps user.sessionVersion).
 */
export const getSessionUser = async (): Promise<{ session: any; user: IUser } | null> => {
    const session: any = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email || typeof email !== 'string') return null;

    await db.connect();
    const user = await User.findOne<IUser>({ email });
    if (!user) return null;
    if ((session.sv ?? 0) !== (user.sessionVersion ?? 0)) return null;

    return { session, user };
};
