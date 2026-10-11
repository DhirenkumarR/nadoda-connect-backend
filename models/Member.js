import mongoose, { Schema } from 'mongoose';

const MemberSchema = new Schema(
    {
        // 1. સળંગ ક્રમ (Serial Number in Community Directory: 1 to 829 in PDF)
        serialNumber: {
            type: Number,
            index: true
        },

        // Reference to Family and Village
        familyId: {
            type: Schema.Types.ObjectId,
            ref: 'Family',
            required: true,
            index: true
        },
        villageId: {
            type: Schema.Types.ObjectId,
            ref: 'Village',
            required: true,
            index: true
        },

        // Denormalized for fast filtering and direct search
        houseNumber: {
            type: Number,
            required: true,
            index: true
        },
        atak: {
            gu: { type: String, required: true, trim: true },
            en: { type: String, trim: true }
        },

        // 3. અ.નં. (Order of member within family: 1, 2, 3...)
        memberOrder: {
            type: Number,
            default: 1
        },

        // 4. કુટુંબના સભ્યોના નામ (Full Name)
        fullName: {
            gu: { type: String, required: true, trim: true },
            en: { type: String, trim: true }
        },

        // 5. સંબંધ (Relationship to Head of Household)
        relationWithHead: {
            gu: { type: String, required: true, trim: true }, // e.g., "પોતે", "પત્ની", "પુત્ર", "પુત્રવધુ", "પૌત્ર", "પૌત્રી", "પિતા", "માતા"
            en: { type: String, trim: true }                 // e.g., "Self", "Wife", "Son", "Daughter-in-law", "Grandson", "Granddaughter"
        },

        // 12. જાતિ (Gender)
        gender: {
            key: { type: String, enum: ['male', 'female', 'other'], required: true },
            gu: { type: String, enum: ['પુરુષ', 'સ્ત્રી', 'અન્ય'], required: true }
        },

        // 6. ઉમર (Age)
        age: {
            type: Number,
            min: 0,
            max: 130
        },

        // 7. અભ્યાસ (Education)
        education: {
            qualification: { type: String, trim: true }, // e.g., "10", "12", "બી.એ.", "બી.એડ.", "બી.એસસી.", "પીટીસી", "એમબીબીએસ", "ડીપ્લોમા"
            isStudying: { type: Boolean, default: false } // Marked true if PDF indicates "ચાલુ"
        },

        // 8. પરણિત / અપરણિત (Marital Status)
        maritalStatus: {
            key: {
                type: String,
                enum: ['married', 'unmarried', 'widow', 'widower', 'divorced', 'other'],
                default: 'married'
            },
            gu: {
                type: String,
                enum: ['પરણિત', 'અપરણિત', 'વિધવા', 'વિધુર', 'છૂટાછેડા', 'અન્ય'],
                default: 'પરણિત'
            }
        },

        // 9. વ્યવસાય (Occupation) & 10. વ્યવસાય સ્થળ (Work Place)
        occupation: {
            title: { type: String, trim: true },      // e.g., "ખેતી", "ઘરકામ", "નોકરી પ્રાઇવેટ", "પ્રાથમિક શિક્ષક", "વેપાર", "પીયુન", "દુકાન"
            category: {
                type: String,
                enum: ['agriculture', 'business', 'private_job', 'govt_job', 'homemaker', 'student', 'retired', 'labour', 'professional', 'other'],
                default: 'other'
            },
            workCity: { type: String, trim: true }    // e.g., "બાસ્પા", "રાધનપુર", "અમદાવાદ", "ગાંધીધામ", "સુરત", "પાટણ", "કેનેડા"
        },

        // 11. મોબાઈલ નંબર (Mobile Number) & Email
        mobileNumber: {
            type: String,
            trim: true,
            index: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: null
        },


        // Additional digital profile fields
        photoUrl: {
            type: String,
            default: null
        },
        bloodGroup: {
            type: String,
            enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null],
            default: null
        },
        isFamilyHead: {
            type: Boolean,
            default: false
        },
        isAlive: {
            type: Boolean,
            default: true
        },

        // Matrimonial Directory Extension (Optional for eligible unmarried profiles)
        matrimonialProfile: {
            isRegistered: { type: Boolean, default: false },
            height: { type: String, default: null },
            birthDate: { type: Date, default: null },
            hobbies: [{ type: String }],
            partnerExpectations: { type: String, default: null }
        },

        // --- APPROVAL WORKFLOW FOR ADMIN REVIEW ---
        verificationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'approved', // Seeded data is pre-approved; user self-registrations start as 'pending'
            index: true
        },
        submittedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        },
        rejectionReason: {
            type: String,
            trim: true,
            default: null
        },

        // Stores proposed modifications when an existing profile is edited,
        // allowing the admin to approve or reject without disrupting live data
        pendingUpdates: {
            type: Schema.Types.Mixed,
            default: null
        }
    },
    { timestamps: true }
);

// Search & Directory Indexes
MemberSchema.index({ villageId: 1, verificationStatus: 1, 'atak.gu': 1 });
MemberSchema.index({ villageId: 1, verificationStatus: 1, 'atak.en': 1 });
MemberSchema.index({ familyId: 1, memberOrder: 1 });
MemberSchema.index({ 'fullName.gu': 'text', 'fullName.en': 'text' });
MemberSchema.index({ 'occupation.workCity': 1 });
MemberSchema.index({ 'occupation.category': 1 });

export const Member = mongoose.model('Member', MemberSchema);