import { get, post, del } from './client.js';

export function listSessions(limit = 20, offset = 0) {
    return get(`/chat/sessions?limit=${limit}&offset=${offset}`);
}

export function createSession(chatbotType, title, provider) {
    return post('/chat/sessions', { chatbotType, title, provider });
}

export function getMessages(sessionId, limit = 50, before) {
    const query = before
        ? `?limit=${limit}&before=${before}`
        : `?limit=${limit}`;
    return get(`/chat/sessions/${sessionId}/messages${query}`);
}

export function sendMessage(sessionId, message) {
    return post(`/chat/sessions/${sessionId}/messages`, { message });
}

export function deleteSession(sessionId) {
    return del(`/chat/sessions/${sessionId}`);
}
