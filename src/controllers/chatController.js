import { generateResponse } from "../utils/llm.js";

export const sendMessage = async (req, res) => {
    try {
        const { userId, text } = req.body;
        
        // Generate response using LLM
        const response = await generateResponse(userId, text);
        res.json({
            message: 'Response generated successfully',
            userId: userId,
            response: response.text
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
        return;
    }
};

export default {
    sendMessage
};