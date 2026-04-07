import { defineStore } from 'pinia';
import { ref } from 'vue';
import { login as apiLogin } from '../api/auth.js';

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('mindecho_token') || null);
    const user = ref(JSON.parse(localStorage.getItem('mindecho_user') || 'null'));

    async function login(email, password) {
        const data = await apiLogin(email, password);
        token.value = data.token;
        user.value = data.userData;
        localStorage.setItem('mindecho_token', data.token);
        localStorage.setItem('mindecho_user', JSON.stringify(data.userData));
    }

    function logout() {
        token.value = null;
        user.value = null;
        localStorage.removeItem('mindecho_token');
        localStorage.removeItem('mindecho_user');
    }

    const isLoggedIn = () => !!token.value;

    return { token, user, login, logout, isLoggedIn };
});
