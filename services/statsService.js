import mongoose from 'mongoose';
import { Village, Family, Member } from '../models/index.js';

/**
 * Service to dynamically count and calculate statistics from MongoDB collections
 * @param {string|mongoose.Types.ObjectId} villageId
 */
export const calculateVillageStats = async (villageId) => {
    const objectId = typeof villageId === 'string' ? new mongoose.Types.ObjectId(villageId) : villageId;

    const village = await Village.findById(objectId);
    if (!village) return null;

    // 1. Basic counts from DB
    const totalHouses = await Family.countDocuments({ villageId: objectId, isActive: true });
    const totalMembers = await Member.countDocuments({
        villageId: objectId,
        isAlive: true,
        verificationStatus: 'approved'
    });
    const totalMale = await Member.countDocuments({
        villageId: objectId,
        isAlive: true,
        verificationStatus: 'approved',
        'gender.key': 'male'
    });
    const totalFemale = await Member.countDocuments({
        villageId: objectId,
        isAlive: true,
        verificationStatus: 'approved',
        'gender.key': 'female'
    });

    // 2. Member aggregation by Atak
    const memberAtakAgg = await Member.aggregate([
        {
            $match: {
                villageId: objectId,
                isAlive: true,
                verificationStatus: 'approved'
            }
        },
        {
            $group: {
                _id: '$atak.gu',
                atakEn: { $first: '$atak.en' },
                totalMembers: { $sum: 1 },
                totalMale: {
                    $sum: { $cond: [{ $eq: ['$gender.key', 'male'] }, 1, 0] }
                },
                totalFemale: {
                    $sum: { $cond: [{ $eq: ['$gender.key', 'female'] }, 1, 0] }
                }
            }
        },
        { $sort: { totalMembers: -1 } }
    ]);

    // 3. Family aggregation by Atak
    const familyAtakAgg = await Family.aggregate([
        {
            $match: {
                villageId: objectId,
                isActive: true
            }
        },
        {
            $group: {
                _id: '$atak.gu',
                atakEn: { $first: '$atak.en' },
                totalHouses: { $sum: 1 },
                kuldeviGu: { $first: '$kuldevi.gu' },
                kuldeviEn: { $first: '$kuldevi.en' }
            }
        }
    ]);

    const familyMap = new Map();
    familyAtakAgg.forEach((item) => {
        familyMap.set(item._id, item);
    });

    // Build registered atak details list
    const ataksBreakdown = memberAtakAgg.map((item) => {
        const famData = familyMap.get(item._id) || {};
        return {
            atak: {
                gu: item._id,
                en: item.atakEn || famData.atakEn || item._id
            },
            kuldevi: {
                gu: famData.kuldeviGu || '',
                en: famData.kuldeviEn || ''
            },
            totalHouses: famData.totalHouses || 0,
            totalMembers: item.totalMembers,
            totalMale: item.totalMale,
            totalFemale: item.totalFemale
        };
    });

    // Include any families whose ataks might have 0 alive members
    familyAtakAgg.forEach((fam) => {
        if (!memberAtakAgg.some((m) => m._id === fam._id)) {
            ataksBreakdown.push({
                atak: {
                    gu: fam._id,
                    en: fam.atakEn || fam._id
                },
                kuldevi: {
                    gu: fam.kuldeviGu || '',
                    en: fam.kuldeviEn || ''
                },
                totalHouses: fam.totalHouses || 0,
                totalMembers: 0,
                totalMale: 0,
                totalFemale: 0
            });
        }
    });

    // 4. Age groups breakdown
    const ageGroupsAgg = await Member.aggregate([
        {
            $match: {
                villageId: objectId,
                isAlive: true,
                verificationStatus: 'approved'
            }
        },
        {
            $bucket: {
                groupBy: '$age',
                boundaries: [0, 18, 35, 60, 150],
                default: 'unknown',
                output: {
                    count: { $sum: 1 },
                    male: { $sum: { $cond: [{ $eq: ['$gender.key', 'male'] }, 1, 0] } },
                    female: { $sum: { $cond: [{ $eq: ['$gender.key', 'female'] }, 1, 0] } }
                }
            }
        }
    ]);

    const ageGroupLabels = {
        0: '0 - 17 Years (Children/Youth)',
        18: '18 - 34 Years (Young Adults)',
        35: '35 - 59 Years (Middle Age)',
        60: '60+ Years (Senior Citizens)',
        unknown: 'Age Not Specified'
    };

    const ageDistribution = ageGroupsAgg.map((ag) => ({
        range: ageGroupLabels[ag._id] || String(ag._id),
        count: ag.count,
        male: ag.male,
        female: ag.female
    }));

    // 5. Top Occupations
    const occupationsAgg = await Member.aggregate([
        {
            $match: {
                villageId: objectId,
                isAlive: true,
                verificationStatus: 'approved',
                'occupation.title': { $exists: true, $ne: '' }
            }
        },
        {
            $group: {
                _id: '$occupation.title',
                category: { $first: '$occupation.category' },
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    // 6. Top Work / Residence Cities
    const citiesAgg = await Member.aggregate([
        {
            $match: {
                villageId: objectId,
                isAlive: true,
                verificationStatus: 'approved',
                'occupation.workCity': { $exists: true, $ne: '' }
            }
        },
        {
            $group: {
                _id: '$occupation.workCity',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    // 7. Marital status distribution
    const maritalStatusAgg = await Member.aggregate([
        {
            $match: {
                villageId: objectId,
                isAlive: true,
                verificationStatus: 'approved'
            }
        },
        {
            $group: {
                _id: '$maritalStatus.gu',
                key: { $first: '$maritalStatus.key' },
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);

    return {
        village: {
            _id: village._id,
            name: village.name,
            slug: village.slug,
            taluka: village.taluka,
            district: village.district,
            state: village.state,
            pincode: village.pincode
        },
        summary: {
            totalHouses,
            totalMembers,
            totalMale,
            totalFemale,
            sexRatio: totalFemale > 0 && totalMale > 0 ? Math.round((totalFemale / totalMale) * 1000) : 0,
            averageFamilySize: totalHouses > 0 ? Number((totalMembers / totalHouses).toFixed(1)) : 0
        },
        ataks: ataksBreakdown,
        demographics: {
            ageDistribution,
            topOccupations: occupationsAgg,
            topCities: citiesAgg,
            maritalStatus: maritalStatusAgg
        }
    };
};

/**
 * Service to recalculate and persist aggregate statistics into Village document
 * @param {string|mongoose.Types.ObjectId} villageId
 */
export const recalculateVillageStats = async (villageId) => {
    const objectId = typeof villageId === 'string' ? new mongoose.Types.ObjectId(villageId) : villageId;
    const village = await Village.findById(objectId);
    if (!village) return null;

    // 1. Auto-assign salang kram (સળંગ ક્રમ / serialNumber) to any members missing one
    try {
        const highestMember = await Member.findOne({
            villageId: objectId,
            serialNumber: { $exists: true, $ne: null }
        }).sort({ serialNumber: -1 });

        let nextSerial = (highestMember && typeof highestMember.serialNumber === 'number' && highestMember.serialNumber > 0)
            ? highestMember.serialNumber + 1
            : 1;

        const unnumberedMembers = await Member.find({
            villageId: objectId,
            $or: [
                { serialNumber: null },
                { serialNumber: { $exists: false } },
                { serialNumber: { $lte: 0 } }
            ]
        }).sort({ houseNumber: 1, memberOrder: 1, createdAt: 1 });

        if (unnumberedMembers.length > 0) {
            console.log(`[StatsService] Auto-assigning salang kram (serial numbers) starting from #${nextSerial} to ${unnumberedMembers.length} member(s) in village ${village.name?.gu || village.name?.en}`);
            for (const mem of unnumberedMembers) {
                mem.serialNumber = nextSerial++;
                await mem.save();
            }

            // Sync family serialNumberRange for affected families
            const affectedFamilyIds = [...new Set(unnumberedMembers.map(m => String(m.familyId)))];
            for (const famId of affectedFamilyIds) {
                const famMembers = await Member.find({
                    familyId: famId,
                    serialNumber: { $exists: true, $ne: null }
                }).sort({ serialNumber: 1 });

                if (famMembers.length > 0) {
                    const nums = famMembers.map(m => m.serialNumber).filter(n => typeof n === 'number' && n > 0);
                    if (nums.length > 0) {
                        await Family.findByIdAndUpdate(famId, {
                            'serialNumberRange.start': Math.min(...nums),
                            'serialNumberRange.end': Math.max(...nums)
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('[StatsService] Error auto-assigning salang kram:', err.message);
    }

    const stats = await calculateVillageStats(objectId);
    if (!stats) return null;

    village.totalHouses = stats.summary.totalHouses;
    village.totalMembers = stats.summary.totalMembers;
    village.totalMale = stats.summary.totalMale;
    village.totalFemale = stats.summary.totalFemale;

    // Update or populate registered ataks
    village.registeredAtaks = stats.ataks.map((a) => ({
        atak: a.atak,
        kuldevi: a.kuldevi,
        totalHouses: a.totalHouses,
        totalMale: a.totalMale,
        totalFemale: a.totalFemale,
        totalMembers: a.totalMembers
    }));

    await village.save();
    return { village, stats };
};
