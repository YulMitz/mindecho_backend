<template>
    <div class="admin-page">
        <header class="admin-header">
            <h1>
                Chat history
                <span v-if="data?.user" class="muted" style="font-weight:400; font-size: 14px;">
                    — {{ data.user.name || '—' }} ({{ data.user.email }})
                </span>
            </h1>
            <div class="nav-links">
                <RouterLink to="/admin/users">← Users</RouterLink>
            </div>
        </header>

        <p v-if="loading" class="muted">Loading…</p>
        <p v-else-if="error" class="error-msg">{{ error }}</p>

        <div v-else-if="data" class="chats-layout">
            <aside class="session-pane admin-section">
                <h2>Sessions ({{ data.pagination.totalSessions }})</h2>
                <p v-if="!data.sessions.length" class="muted">No sessions.</p>
                <ul class="session-list">
                    <li
                        v-for="s in data.sessions"
                        :key="s.id"
                        class="session-item"
                        :class="{ active: selected?.id === s.id }"
                        @click="selected = s"
                    >
                        <div class="session-title">{{ s.title || 'Untitled' }}</div>
                        <div class="session-meta">
                            <span class="badge">{{ s.chatbotType }}</span>
                            <span class="badge muted-badge">{{ s.provider }}</span>
                        </div>
                        <div class="session-sub">
                            {{ s.messageCount }} msgs · {{ fmtDate(s.updatedAt) }}
                        </div>
                    </li>
                </ul>

                <div class="pagination">
                    <button class="btn-ghost" :disabled="page <= 1" @click="changePage(page - 1)">Prev</button>
                    <span class="page-ind">Page {{ page }} / {{ totalPages }}</span>
                    <button class="btn-ghost" :disabled="page >= totalPages" @click="changePage(page + 1)">Next</button>
                </div>
            </aside>

            <main class="messages-pane admin-section">
                <p v-if="!selected" class="muted">Select a session.</p>
                <template v-else>
                    <div class="messages">
                        <div
                            v-for="m in selected.messages"
                            :key="m.id"
                            class="msg"
                            :class="m.messageType === 'USER' ? 'msg-user' : 'msg-model'"
                        >
                            <div class="msg-bubble">
                                <div class="msg-content">{{ m.content }}</div>
                                <div v-if="m.messageType === 'MODEL'" class="msg-meta">
                                    <details v-if="m.metadata">
                                        <summary>metadata</summary>
                                        <div class="meta-grid">
                                            <span>tokens in: {{ m.metadata?.tokens?.input ?? '—' }}</span>
                                            <span>out: {{ m.metadata?.tokens?.output ?? '—' }}</span>
                                            <span>total: {{ m.metadata?.tokens?.total ?? '—' }}</span>
                                            <span>model: {{ m.metadata?.model ?? '—' }}</span>
                                            <span>latency: {{ m.metadata?.latencyMs ?? '—' }}ms</span>
                                        </div>
                                    </details>
                                    <span v-else class="muted">(no metadata — pre-Phase-4 message)</span>
                                </div>
                                <div class="msg-time muted">{{ fmtDate(m.timestamp) }}</div>
                            </div>
                        </div>
                    </div>
                    <p v-if="selected.messagesTruncated" class="muted truncated-note">
                        Showing first {{ selected.messages.length }} messages of {{ selected.messageCount }} total
                    </p>
                </template>
            </main>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { getUserChats } from '../api/admin.js';
import '../styles/admin.css';

const route = useRoute();
const userId = route.params.userId;

const data = ref(null);
const selected = ref(null);
const loading = ref(true);
const error = ref('');
const page = ref(1);
const pageSize = 50;

const totalPages = computed(() => {
    if (!data.value) return 1;
    return Math.max(1, Math.ceil(data.value.pagination.totalSessions / data.value.pagination.pageSize));
});

async function load() {
    loading.value = true;
    error.value = '';
    try {
        data.value = await getUserChats(userId, page.value, pageSize);
        selected.value = data.value.sessions[0] || null;
    } catch (err) {
        const msg = err.message || '';
        error.value = /admin only|Forbidden/i.test(msg)
            ? 'Your account is not in the admin allowlist. Ask an operator to add your userId to ADMIN_USERNAMES.'
            : msg || 'Failed to load chats.';
    } finally {
        loading.value = false;
    }
}

function changePage(p) {
    page.value = p;
}

watch(page, load);
onMounted(load);

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString();
}
</script>

<style scoped>
.chats-layout {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 16px;
    align-items: start;
}

@media (max-width: 800px) {
    .chats-layout { grid-template-columns: 1fr; }
}

.session-pane h2 { margin-bottom: 8px; }
.session-list { list-style: none; padding: 0; margin: 0; }
.session-item {
    padding: 10px;
    border-radius: 6px;
    cursor: pointer;
    margin-bottom: 4px;
    border: 1px solid transparent;
}
.session-item:hover { background: #f9fafb; }
.session-item.active { background: #eef2ff; border-color: #c7d2fe; }
.session-title { font-size: 13px; font-weight: 500; color: #374151; }
.session-meta { display: flex; gap: 4px; margin-top: 4px; }
.session-sub { font-size: 11px; color: #9ca3af; margin-top: 4px; }

.badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 600;
    text-transform: uppercase;
    background: #dbeafe;
    color: #1e40af;
}
.badge.muted-badge { background: #f3f4f6; color: #6b7280; }

.pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
    gap: 8px;
}
.page-ind { font-size: 12px; color: #6b7280; }

.messages {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 70vh;
    overflow-y: auto;
}

.msg { display: flex; }
.msg-user { justify-content: flex-end; }
.msg-model { justify-content: flex-start; }

.msg-bubble {
    max-width: 80%;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 13px;
}

.msg-user .msg-bubble { background: #6366f1; color: white; }
.msg-model .msg-bubble { background: #f3f4f6; color: #1f2937; }

.msg-content { white-space: pre-wrap; word-wrap: break-word; }

.msg-meta {
    margin-top: 8px;
    font-size: 11px;
    color: #6b7280;
}
.msg-meta details summary { cursor: pointer; }
.meta-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }

.msg-time { font-size: 10px; margin-top: 4px; }
.msg-user .msg-time { color: #e0e7ff; }

.truncated-note { margin-top: 12px; text-align: center; }
</style>
