import { post } from './client.js';

export function login(email, password) {
    return post('/auth/login', { email, password });
}
