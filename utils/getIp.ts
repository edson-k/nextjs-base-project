import { headers } from 'next/headers'

export const GetIp = () => {
    const header = headers()
    const ip = header.get('cf-connecting-ip') ? (header.get('cf-connecting-ip') ?? '127.0.0.1').split(',')[0] : (header.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0]
    return ip;
}