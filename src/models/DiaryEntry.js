import mongoose from 'mongoose';

const diaryEntrySchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: [true, 'User ID is required'],
            trim: true,
        },
        content: {
            type: String,
            required: [true, 'Content is required'],
            trim: true,
        },
        title: {
            type: String,
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        mood: {
            type: String,
            enum: ['happy', 'sad', 'neutral', 'excited', 'anxious', 'calm'],
            default: 'neutral',
        },
        tags: [
            {
                type: String,
                trim: true,
                lowercase: true,
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Indexing for faster queries
diaryEntrySchema.index({ userId: 1, createdAt: -1 });
diaryEntrySchema.index({ tags: 1 });

export default mongoose.model('DiaryEntry', diaryEntrySchema);
