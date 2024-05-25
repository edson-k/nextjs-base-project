
import { headers } from "next/headers"

export const UserData = async () => {
    const data = await fetch(`${process.env.WEB_URI}/api/account/info`, {
        method: 'GET',
        headers: headers(),
    });
    return data.json();
}

export const fetchActivation = async (data: any) => {
    const response = await fetch(`${process.env.WEB_URI}/api/account/activation`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: headers(),
    })
    return await response.json();
}