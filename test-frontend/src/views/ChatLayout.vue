<template>
    <div class="layout">
        <aside class="sidebar">
            <div class="sidebar-header">
                <span class="logo">MindEcho</span>
                <span class="env-badge">DEV</span>
            </div>

            <RouterLink to="/main" class="back-link">← Back to Main</RouterLink>
            <RouterLink to="/chat/new" class="new-btn btn-primary">+ New Session</RouterLink>

            <nav class="session-nav">
                <RouterLink
                    v-for="s in sessions"
                    :key="s.id"
                    :to="`/chat/${s.id}`"
                    class="session-link"
                    :class="{ active: route.params.sessionId === s.id }"
                >
                    <div class="session-title">{{ s.title || 'Untitled' }}</div>
                    <div class="session-meta">
                        <span class="badge" :class="s.chatbotType.toLowerCase()">{{ s.chatbotType }}</span>
                        <span class="badge provider">{{ s.provider }}</span>
                    </div>
                </RouterLink>

                <p v-if="!sessions.length" class="empty-sessions">No sessions yet.</p>
            </nav>

            <div class="sidebar-footer">
                <span class="user-email">{{ auth.user?.email }}</span>
                <button class="btn-ghost" @click="handleLogout">Logout</button>
            </div>
        </aside>

        <main class="main-pane">
            <RouterView @session-created="loadSessions" @session-deleted="loadSessions" />
        </main>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { listSessions } from '../api/chat.js';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const sessions = ref([]);

async function loadSessions() {
    try {
        const data = await listSessions();
        sessions.value = data.sessions;
    } catch {
        sessions.value = [];
    }
}

function handleLogout() {
    auth.logout();
    router.push('/login');
}

onMounted(loadSessions);
</script>

<style scoped>
.layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
}

.sidebar {
    width: 240px;
    min-width: 240px;
    background: white;
    border-right: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.sidebar-header {
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    gap: 8px;
}

.logo { font-weight: 700; font-size: 16px; color: #6366f1; }

.env-badge {
    font-size: 10px;
    font-weight: 700;
    background: #fef3c7;
    color: #92400e;
    padding: 2px 6px;
    border-radius: 4px;
}

.new-btn {
    margin: 12px;
    display: block;
    text-align: center;
    text-decoration: none;
    padding: 8px;
    border-radius: 6px;
}

.back-link {
    display: block;
    padding: 8px 16px;
    margin: 12px 12px 0;
    text-align: center;
    text-decoration: none;
    font-size: 12px;
    color: #6b7280;
    border-radius: 6px;
}
.back-link:hover { background: #f3f4f6; color: #374151; }

.session-nav {
    flex: 1;
    overflow-y: auto;
    padding: 4px 8px;
}

.session-link {
    display: block;
    padding: 10px 8px;
    border-radius: 6px;
    text-decoration: none;
    color: #374151;
    margin-bottom: 2px;
    cursor: pointer;
}

.session-link:hover { background: #f3f4f6; }
.session-link.active { background: #eef2ff; color: #4f46e5; }

.session-title {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.session-meta { display: flex; gap: 4px; margin-top: 4px; }

.badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 600;
    text-transform: uppercase;
}

.badge.cbt { background: #dbeafe; color: #1e40af; }
.badge.mbt { background: #d1fae5; color: #065f46; }
.badge.mbct { background: #ede9fe; color: #5b21b6; }
.badge.dbt { background: #ffedd5; color: #9a3412; }
.badge.initial { background: #fce7f3; color: #9d174d; }
.badge.provider { background: #f3f4f6; color: #6b7280; }

.empty-sessions { padding: 16px 8px; color: #9ca3af; font-size: 13px; }

.sidebar-footer {
    padding: 12px 16px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.user-email {
    font-size: 12px;
    color: #6b7280;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.main-pane {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
</style>
