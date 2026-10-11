import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new Schema(
    {
        mobileNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            sparse: true,
            index: true
        },
        name: {
            type: String,
            trim: true
        },
        passwordHash: {
            type: String,
            select: false
        },
        role: {
            type: String,
            enum: ['super_admin', 'village_admin', 'member'],
            default: 'member'
        },
        // Village admins review profiles tied specifically to their assigned village
        assignedVillageId: {
            type: Schema.Types.ObjectId,
            ref: 'Village',
            default: null,
            index: true
        },
        // Links this login account to their community directory profile if one exists
        memberId: {
            type: Schema.Types.ObjectId,
            ref: 'Member',
            default: null
        },
        familyId: {
            type: Schema.Types.ObjectId,
            ref: 'Family',
            default: null
        },
        // Password setup / reset token & OTP
        resetOtp: {
            type: String,
            default: null
        },
        resetOtpExpires: {
            type: Date,
            default: null
        },
        isPasswordSet: {
            type: Boolean,
            default: false
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Method to verify password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.passwordHash) return false;
    return await bcrypt.compare(enteredPassword, this.passwordHash);
};

export const User = mongoose.model('User', UserSchema);