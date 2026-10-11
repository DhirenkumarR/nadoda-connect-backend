import mongoose, { Schema } from 'mongoose';

const RegisteredAtakSchema = new Schema(
    {
        atak: {
            gu: { type: String, required: true, trim: true }, // e.g. "ચાવડા", "ડાભી", "સિંધવ"
            en: { type: String, required: true, trim: true }  // e.g. "Chavda", "Dabhi", "Sindhav"
        },
        kuldevi: {
            gu: { type: String, required: true, trim: true }, // e.g. "શ્રી આશાપુરા માતાજી"
            en: { type: String, required: true, trim: true }  // e.g. "Shree Ashapura Mataji"
        },
        totalHouses: { type: Number, default: 0 },
        totalMale: { type: Number, default: 0 },
        totalFemale: { type: Number, default: 0 },
        totalMembers: { type: Number, default: 0 }
    },
    { _id: true }
);

const VillageSchema = new Schema(
    {
        name: {
            gu: { type: String, required: true, trim: true, default: 'બાસ્પા' },
            en: { type: String, required: true, trim: true, default: 'Baspa' }
        },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true }, // e.g. "baspa"
        taluka: {
            gu: { type: String, default: 'સમી' },
            en: { type: String, default: 'Sami' }
        },
        district: {
            gu: { type: String, default: 'પાટણ' },
            en: { type: String, default: 'Patan' }
        },
        state: {
            gu: { type: String, default: 'ગુજરાત' },
            en: { type: String, default: 'Gujarat' }
        },
        pincode: { type: String, trim: true, default: '384245' },
        isActive: { type: Boolean, default: true },

        // Breakdown by Atak (Surname) & Kuldevi with demographics from community census
        registeredAtaks: [RegisteredAtakSchema],

        // Village aggregate totals (Matches PDF summary on Page 1)
        totalHouses: { type: Number, default: 0 },
        totalMale: { type: Number, default: 0 },
        totalFemale: { type: Number, default: 0 },
        totalMembers: { type: Number, default: 0 }
    },
    { timestamps: true }
);

VillageSchema.index({ 'name.gu': 1, 'name.en': 1 });

export const Village = mongoose.model('Village', VillageSchema);