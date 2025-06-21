import mongoose from "mongoose";

const bookIssueSchema = new mongoose.Schema({
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
    bookRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BookRequest',
        required: true
    },
    issueDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: true
    },
    returnDate: {
        type: Date
    },
    finePerDay: {
        type: Number,
        required: true,
        min: 0
    },
    calculatedFine: {
        type: Number,
        default: 0,
        min: 0
    },
    finePaid: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['issued', 'returned', 'overdue'],
        default: 'issued'
    },
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    returnedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    }
}, {
    timestamps: true
});

export default mongoose.model("BookIssue", bookIssueSchema);