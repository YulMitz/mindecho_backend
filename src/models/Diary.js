import mongoose from 'mongoose';
import DiaryEntry from './DiaryEntry.js';

const diarySchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: [true, 'User ID is required'],
            trim: true,
        },
        diaryEntries: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'DiaryEntry',
            },
        ],
        timestamp: {
            type: Date,
            required: [true, 'Timestamp is required'],
            default: Date.now,
        },
    },
    {
        timestamps: true, // This will automatically add createdAt and updatedAt fields.
    }
);

// Indexing for faster queries
diarySchema.index({ userId: 1 });
diarySchema.index({ timestamp: -1 });

export default mongoose.model('Diary', diarySchema);
