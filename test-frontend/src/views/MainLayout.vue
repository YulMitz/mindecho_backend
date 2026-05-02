<template>
    <div class="main-page">
        <header class="main-header">
            <div class="brand">
                <span class="logo">MindEcho</span>
                <span class="env-badge">DEV</span>
            </div>
            <div class="user-area">
                <span class="user-info">{{ auth.user?.name || auth.user?.email }}</span>
                <button class="btn-ghost" @click="handleLogout">Logout</button>
            </div>
        </header>

        <main class="hub">
            <h1 class="hub-title">Choose a tool</h1>
            <div class="card-grid">
                <RouterLink to="/chat" class="hub-card">
                    <div class="hub-icon">💬</div>
                    <div class="hub-card-title">LLM Test Chat</div>
                    <div class="hub-card-desc">Run conversations against the chatbot backends.</div>
                </RouterLink>

                <RouterLink to="/admin/users" class="hub-card">
                    <div class="hub-icon">📊</div>
                    <div class="hub-card-title">Admin Dashboard</div>
                    <div class="hub-card-desc">Inspect users, LLM usage, and chat history.</div>
                </RouterLink>
            </div>
        </main>
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();

function handleLogout() {
    auth.logout();
    router.push('/login');
}
</script>

<style scoped>
.main-page {
    min-height: 100vh;
    background: #f5f5f5;
    display: flex;
    flex-direction: column;
}

.main-header {
    background: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.brand { display: flex; align-items: center; gap: 8px; }
.logo { font-weight: 700; font-size: 18px; color: #6366f1; }
.env-badge {
    font-size: 10px;
    font-weight: 700;
    background: #fef3c7;
    color: #92400e;
    padding: 2px 6px;
    border-radius: 4px;
}

.user-area { display: flex; align-items: center; gap: 12px; }
.user-info { font-size: 13px; color: #6b7280; }

.hub {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
}

.hub-title {
    font-size: 22px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 32px;
}

.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 320px));
    gap: 24px;
    width: 100%;
    max-width: 720px;
    justify-content: center;
}

.hub-card {
    background: white;
    border-radius: 12px;
    padding: 32px 24px;
    text-decoration: none;
    color: #1a1a1a;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    border: 1px solid transparent;
    transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 8px;
}

.hub-card:hover {
    transform: translateY(-2px);
    border-color: #6366f1;
    box-shadow: 0 4px 18px rgba(99,102,241,0.15);
}

.hub-icon { font-size: 40px; }
.hub-card-title { font-size: 16px; font-weight: 600; color: #374151; }
.hub-card-desc { font-size: 13px; color: #6b7280; }
</style>
