import { headers } from 'next/headers';

/**
 * Client IP. Behind Cloudflare/Traefik only the proxy-set headers are trusted:
 * cf-connecting-ip, then x-real-ip, then the LAST x-forwarded-for hop (the one appended by our proxy).
 * Keep the origin unreachable except through the proxy, otherwise these headers can be forged.
 */
export const GetIp = async () => {
    const header = await headers();
    const cf = header.get('cf-connecting-ip');
    if (cf) return cf.trim();

    const real = header.get('x-real-ip');
    if (real) return real.trim();

    const forwarded = header.get('x-forwarded-for');
    if (forwarded) {
        const hops = forwarded.split(',').map((h) => h.trim()).filter(Boolean);
        if (hops.length) return hops[hops.length - 1];
    }

    return '127.0.0.1';
};
