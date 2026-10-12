import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { User, Member } from '../models/index.js';
import { syncMemberWithUser } from '../services/userSyncService.js';

const run = async () => {
    try {
        console.log('[SyncScript] Connecting to MongoDB...');
        await connectDB();

        console.log('[SyncScript] Fetching all members...');
        const members = await Member.find({});
        console.log(`[SyncScript] Found ${members.length} member(s). Synchronizing with User collection...`);

        let syncedCount = 0;
        for (const member of members) {
            const synced = await syncMemberWithUser(member);
            if (synced && synced.length > 0) {
                syncedCount += synced.length;
            }
        }

        console.log(`[SyncScript] Successfully synchronized ${syncedCount} User account(s) with Member data.`);
        process.exit(0);
    } catch (err) {
        console.error('[SyncScript Error]:', err);
        process.exit(1);
    }
};

run();
