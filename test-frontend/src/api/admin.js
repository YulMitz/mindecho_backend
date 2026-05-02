import { get } from './client.js';

export function getUsers() {
    return get('/admin/users');
}

export function getLlmStats() {
    return get('/admin/llm-stats');
}

export function getUserChats(userId, page = 1, pageSize = 50) {
    return get(`/admin/users/${encodeURIComponent(userId)}/chats?page=${page}&pageSize=${pageSize}`);
}
