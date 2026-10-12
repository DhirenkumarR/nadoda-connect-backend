import { User } from '../models/index.js';

/**
 * Synchronize a Member's updated credentials (email, mobile, name, family, village)
 * to any corresponding User account(s).
 * 
 * @param {Object} member - The updated Member document
 * @param {string} [oldMobile] - Previous mobile number before update
 * @param {string} [oldEmail] - Previous email address before update
 * @returns {Promise<Array|null>} - List of updated users, or null
 */
export const syncMemberWithUser = async (member, oldMobile, oldEmail) => {
    if (!member || !member._id) return null;

    const memberId = member._id;
    const newEmail = member.email ? member.email.toLowerCase().trim() : null;
    const newMobile = member.mobileNumber ? member.mobileNumber.trim() : null;
    const newName = member.fullName?.gu || member.fullName?.en || null;

    // 1. First, search for user explicitly linked by memberId
    let users = await User.find({ memberId });

    // 2. If no user is linked by memberId yet, try finding by old/new mobile or old/new email
    if (users.length === 0) {
        const orConditions = [];
        if (oldMobile) orConditions.push({ mobileNumber: oldMobile.trim() });
        if (newMobile) orConditions.push({ mobileNumber: newMobile });
        if (oldEmail) orConditions.push({ email: oldEmail.toLowerCase().trim() });
        if (newEmail) orConditions.push({ email: newEmail });

        if (orConditions.length > 0) {
            users = await User.find({ $or: orConditions });
        }
    }

    if (users.length === 0) {
        return null;
    }

    // 3. Update each matched user account
    for (const user of users) {
        user.memberId = memberId;
        if (member.familyId) user.familyId = member.familyId;
        if (member.villageId && (!user.assignedVillageId || user.role === 'member')) {
            user.assignedVillageId = member.villageId;
        }
        if (newName) user.name = newName;

        // Sync Email (always update to member's latest email)
        user.email = newEmail;

        // Sync Mobile Number
        if (newMobile && user.mobileNumber !== newMobile) {
            // Check if another user already has newMobile to prevent duplicate key error
            const conflict = await User.findOne({ mobileNumber: newMobile, _id: { $ne: user._id } });
            if (!conflict) {
                user.mobileNumber = newMobile;
            } else {
                console.warn(`[userSyncService] Cannot update mobile to ${newMobile} for user ${user._id}: duplicate mobile found on user ${conflict._id}`);
            }
        }

        await user.save();
        console.log(`[userSyncService] Synced User ${user._id} with Member ${memberId}: email=${user.email}, mobile=${user.mobileNumber}`);
    }

    return users;
};
