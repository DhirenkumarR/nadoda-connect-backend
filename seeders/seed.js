import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { connectDB } from '../config/db.js';
import { Village, Family, Member, User } from '../models/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedDatabase = async () => {
    try {
        console.log('[Seeder] Connecting to database...');
        await connectDB();

        console.log('[Seeder] Loading census data from files...');
        const summaryData = JSON.parse(
            fs.readFileSync(path.join(__dirname, '../data/baspaSummary.json'), 'utf-8')
        );
        const familiesData = JSON.parse(
            fs.readFileSync(path.join(__dirname, '../data/allBaspaFamilies_completed_draft.json'), 'utf-8')
        );

        console.log('[Seeder] Clearing existing data...');
        await Promise.all([
            Village.deleteMany({}),
            Family.deleteMany({}),
            Member.deleteMany({}),
            User.deleteMany({})
        ]);

        console.log('[Seeder] Creating Village: Baspa...');
        const villageDoc = await Village.create({
            ...summaryData.village,
            registeredAtaks: summaryData.ataks
        });
        console.log(`[Seeder] Village created: ${villageDoc.name.gu} (${villageDoc.name.en}) [ID: ${villageDoc._id}]`);

        console.log(`[Seeder] Seeding ${familiesData.length} families and their members...`);

        let totalMembersCreated = 0;
        let headMemberForAdmin = null;

        for (const fam of familiesData) {
            // Calculate serial range
            const serialNumbers = fam.members.map(m => m.serialNumber).filter(Boolean);
            const serialStart = serialNumbers.length > 0 ? Math.min(...serialNumbers) : null;
            const serialEnd = serialNumbers.length > 0 ? Math.max(...serialNumbers) : null;

            // 1. Create Family
            const familyDoc = await Family.create({
                villageId: villageDoc._id,
                houseNumber: fam.houseNumber,
                atak: fam.atak,
                kuldevi: fam.kuldevi,
                primaryMobile: fam.primaryMobile,
                address: fam.address,
                serialNumberRange: {
                    start: serialStart,
                    end: serialEnd
                },
                totalMembersCount: fam.members.length,
                verificationStatus: 'approved'
            });

            // 2. Create Members
            let headMemberDoc = null;
            for (const mem of fam.members) {
                const memberDoc = await Member.create({
                    ...mem,
                    familyId: familyDoc._id,
                    villageId: villageDoc._id,
                    houseNumber: fam.houseNumber,
                    atak: fam.atak,
                    verificationStatus: 'approved'
                });

                totalMembersCreated++;

                if (mem.isFamilyHead) {
                    headMemberDoc = memberDoc;
                    if (fam.houseNumber === 1) {
                        headMemberForAdmin = memberDoc;
                    }
                }
            }

            // 3. Link Head Member to Family
            if (headMemberDoc) {
                familyDoc.headMemberId = headMemberDoc._id;
                await familyDoc.save();
            }
        }

        console.log(`[Seeder] Seeded ${familiesData.length} families and ${totalMembersCreated} members.`);

        const bcrypt = (await import('bcryptjs')).default;
        const defaultHash = await bcrypt.hash('admin123', 10);

        console.log('[Seeder] Creating admin users...');
        // Super Admin
        const superAdmin = await User.create({
            name: 'Super Admin',
            mobileNumber: '9999999999',
            email: 'superadmin@nadodaconnect.com',
            role: 'super_admin',
            passwordHash: defaultHash,
            isPasswordSet: true,
            isActive: true
        });

        // Village Admin tied to Baspa village
        const villageAdmin = await User.create({
            name: headMemberForAdmin ? headMemberForAdmin.fullName.en : 'Baspa Village Admin',
            mobileNumber: headMemberForAdmin ? headMemberForAdmin.mobileNumber : '9824406691',
            email: 'baspa.admin@nadodaconnect.com',
            role: 'village_admin',
            assignedVillageId: villageDoc._id,
            memberId: headMemberForAdmin ? headMemberForAdmin._id : null,
            familyId: headMemberForAdmin ? headMemberForAdmin.familyId : null,
            passwordHash: defaultHash,
            isPasswordSet: true,
            isActive: true
        });

        console.log('----------------------------------------------------');
        console.log('✅ SEEDING COMPLETE!');
        console.log(`- Village: ${villageDoc.name.gu} (${villageDoc.name.en})`);
        console.log(`- Ataks registered: ${villageDoc.registeredAtaks.length}`);
        console.log(`- Families seeded: ${familiesData.length}`);
        console.log(`- Members seeded: ${totalMembersCreated}`);
        console.log(`- Super Admin mobile: ${superAdmin.mobileNumber} (Role: ${superAdmin.role})`);
        console.log(`- Village Admin mobile: ${villageAdmin.mobileNumber} (Role: ${villageAdmin.role}, Village: Baspa)`);
        console.log('----------------------------------------------------');

        process.exit(0);
    } catch (error) {
        console.error('[Seeder] Error during seeding:', error);
        process.exit(1);
    }
};

seedDatabase();
