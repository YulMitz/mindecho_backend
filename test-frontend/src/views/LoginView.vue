<template>
    <div class="login-page">
        <div class="login-card">
            <h1>MindEcho</h1>
            <p class="subtitle">Chatbot Test Console</p>

            <form @submit.prevent="handleLogin">
                <div class="field">
                    <label>Username</label>
                    <input
                        v-model="email"
                        type="text"
                        placeholder="yuming  (or full email)"
                        autocomplete="username"
                        required
                    />
                </div>
                <div class="field">
                    <label>Key</label>
                    <input
                        v-model="password"
                        type="password"
                        placeholder="••••••••"
                        autocomplete="current-password"
                        required
                    />
                </div>

                <p v-if="error" class="error-msg">{{ error }}</p>

                <button type="submit" class="btn-primary" :disabled="loading" style="width:100%;margin-top:8px;">
                    {{ loading ? 'Logging in…' : 'Login' }}
                </button>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
    error.value = '';
    loading.value = true;
    const resolvedEmail = email.value.includes('@')
        ? email.value
        : `${email.value}@mindecho.test`;
    try {
        await auth.login(resolvedEmail, password.value);
        router.push('/main');
    } catch (err) {
        error.value = err.message || 'Login failed.';
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>
.login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
}

.login-card {
    background: white;
    border-radius: 12px;
    padding: 40px;
    width: 360px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.08);
}

h1 { font-size: 24px; font-weight: 700; color: #6366f1; }
.subtitle { color: #6b7280; margin-top: 4px; margin-bottom: 28px; font-size: 13px; }

.field { margin-bottom: 16px; }
.field label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; }
</style>
