import { trusted } from 'mongoose';
import RateLimit from '@/models/RateLimit';
import db from '@/utils/db';

/**
 * Fixed-window counter stored in MongoDB.
 * Returns true when the request is allowed, false when the limit was exceeded.
 */
export const rateLimit = async (key: string, max: number, windowSeconds: number): Promise<boolean> => {
    await db.connect();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

    try {
        // Reset an expired window (the TTL monitor only runs every ~60s)
        await RateLimit.updateOne({ key, expiresAt: trusted({ $lte: now }) }, { $set: { count: 0, expiresAt } });
        const doc: any = await RateLimit.findOneAndUpdate(
            { key },
            { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
            { upsert: true, new: true }
        );
        return doc.count <= max;
    } catch (e: any) {
        // Concurrent upsert on the unique key: the other request created it, count again
        if (e?.code === 11000) {
            const doc: any = await RateLimit.findOneAndUpdate({ key }, { $inc: { count: 1 } }, { new: true });
            return !doc || doc.count <= max;
        }
        throw e;
    }
};
