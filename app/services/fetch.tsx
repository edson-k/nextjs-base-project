
import { headers } from "next/headers"

export const dynamic = 'force-dynamic';

export const UserData = async () => {
    const data = await fetch(`${process.env.WEB_URI}/api/user`, {
        method: 'GET',
        headers: headers(),
    });
    return data.json();
}