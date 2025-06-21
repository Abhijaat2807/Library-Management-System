import mongoose from "mongoose";

const bookRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'books',
        required: true
    },
    requestedDuration: {
        type: Number,
        required: true,
        min: 1,
        max: 30 // Maximum 30 days
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: {
        type: String,
        required: function() {
            return this.status === 'rejected';
        }
    },
    finePerDay: {
        type: Number,
        default: 2,
        min: 0
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    approvedAt: {
        type: Date
    }
}, {
    timestamps: true
});

export default mongoose.model("BookRequest", bookRequestSchema);