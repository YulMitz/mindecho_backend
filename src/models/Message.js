import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: [true, 'User ID is required'],
        trim: true
    },
    messageType: {
        type: String,
        enum: ['user', 'chatbot', 'system'],
        required: [true, 'Message type is required']
    },
    chatbotType: {
        type: String,
        enum: ['default', 'CBT', 'MBT'],
        required: [true, 'Chatbot type is required']
    },
    content: {
        type: String,
        required: [true, 'Message content is required'],
    },
    timestamp: {
        type: Date,
        required: [true, 'Timestamp is required'],
    },
})

export default mongoose.model('Message', messageSchema);