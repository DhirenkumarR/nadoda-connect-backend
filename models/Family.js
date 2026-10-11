import mongoose, { Schema } from 'mongoose';

const FamilySchema = new Schema(
    {
        villageId: {
            type: Schema.Types.ObjectId,
            ref: 'Village',
            required: true,
            index: true
        },
        // Matches "ઘર નંબર" in PDF census (1 to 171 for Baspa)
        houseNumber: {
            type: Number,
            required: true,
            index: true
        },
        // Bilingual Surname (e.g. Chavda / ચાવડા)
        atak: {
            gu: { type: String, required: true, trim: true },
            en: { type: String, required: true, trim: true }
        },
        // Bilingual Kuldevi (e.g. શ્રી આશાપુરા માતાજી)
        kuldevi: {
            gu: { type: String, trim: true },
            en: { type: String, trim: true }
        },
        // Reference to the main member ("પોતે")
        headMemberId: {
            type: Schema.Types.ObjectId,
            ref: 'Member',
            default: null,
            index: true
        },
        primaryMobile: {
            type: String,
            trim: true,
            index: true
        },
        address: {
            nativeVillage: {
                gu: { type: String, default: '' },
                en: { type: String, default: '' }
            },
            currentCity: {
                gu: { type: String, default: '' }, // e.g., Native Village Name or "અમદાવાદ", "ગાંધીધામ", "સુરત"
                en: { type: String, default: '' }
            },
            streetAddress: { type: String, default: '' }
        },
        // Summary tracking
        serialNumberRange: {
            start: { type: Number },
            end: { type: Number }
        },
        totalMembersCount: {
            type: Number,
            default: 0
        },
        // Approval workflow for when a new family is submitted via mobile/web
        verificationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'approved', // seeded families default to approved
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
            default: null
        },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

// Compound index to guarantee houseNumber uniqueness per village
FamilySchema.index({ villageId: 1, houseNumber: 1 }, { unique: true });
// Compound index for browsing hierarchy: Village > Atak > houseNumber
FamilySchema.index({ villageId: 1, 'atak.gu': 1, houseNumber: 1 });
FamilySchema.index({ villageId: 1, 'atak.en': 1, houseNumber: 1 });

export const Family = mongoose.model('Family', FamilySchema);