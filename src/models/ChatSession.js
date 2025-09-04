import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: [true, 'Session ID is required'],
        unique: true,
        trim: true,
    },
    userId: {
        type: String,
        required: [true, 'User ID is required'],
        trim: true,
    },
    chatbotType: {
        type: String,
        enum: ['default', 'CBT', 'MBT'],
        required: [true, 'Chatbot type is required'],
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: [true, 'Timestamp is required'],
    },
});

export default mongoose.model('ChatSession', chatSessionSchema);
