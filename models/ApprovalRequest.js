import mongoose, { Schema } from 'mongoose';

const ApprovalRequestSchema = new Schema(
    {
        entityType: {
            type: String,
            enum: ['Member', 'Family'],
            required: true
        },
        requestType: {
            type: String,
            enum: ['create', 'update', 'delete'],
            required: true
        },
        // Target document ID (if updating or deleting an existing record)
        targetId: {
            type: Schema.Types.ObjectId,
            default: null,
            index: true
        },
        villageId: {
            type: Schema.Types.ObjectId,
            ref: 'Village',
            required: true,
            index: true
        },
        familyId: {
            type: Schema.Types.ObjectId,
            ref: 'Family',
            default: null
        },
        // The submitted data payload
        payload: {
            type: Schema.Types.Mixed,
            required: true
        },
        // Snapshot of original data prior to update (for side-by-side diff in Admin Web UI)
        originalData: {
            type: Schema.Types.Mixed,
            default: null
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
            index: true
        },
        submittedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
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
        adminNotes: {
            type: String,
            trim: true,
            default: null
        }
    },
    { timestamps: true }
);

ApprovalRequestSchema.index({ villageId: 1, status: 1, createdAt: -1 });

export const ApprovalRequest = mongoose.model('ApprovalRequest', ApprovalRequestSchema);
