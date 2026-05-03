<template>
    <div class="conversation">
        <!-- Header -->
        <div class="conv-header">
            <div class="session-info">
                <span class="badge" :class="session?.chatbotType?.toLowerCase()">{{ session?.chatbotType }}</span>
                <span class="badge provider">{{ session?.provider }}</span>
                <span class="session-title">{{ session?.title || 'Untitled' }}</span>
            </div>
            <button class="btn-danger" style="font-size:12px;padding:6px 12px;" @click="handleDelete">
                Delete
            </button>
        </div>

        <!-- INITIAL mode status bar -->
        <div v-if="session?.chatbotType === 'INITIAL' && initialMode" class="initial-bar">
            <span>Round {{ initialMode.roundsUsed }} / {{ initialMode.maxRounds }}</span>
            <span v-if="initialMode.selectedMode" class="mode-result">
                Selected: <strong>{{ initialMode.selectedMode }}</strong>
            </span>
            <span v-if="initialMode.sessionEnded" class="session-ended">Session ended</span>
        </div>

        <!-- Messages -->
        <div class="messages" ref="messagesEl">
            <div v-if="loading && !messages.length" class="loading-state">Loading…</div>

            <div
                v-for="msg in messages"
                :key="msg.id"
                class="message-row"
                :class="msg.isFromUser ? 'user' : 'model'"
            >
                <div class="bubble">
                    <div class="content">{{ msg.content }}</div>
                    <div class="ts">{{ formatTime(msg.timestamp) }}</div>
                </div>
            </div>

            <!-- Typing indicator -->
            <div v-if="sending" class="message-row model">
                <div class="bubble typing">
                    <span></span><span></span><span></span>
                    <span class="elapsed" v-if="elapsed > 3">{{ elapsed }}s</span>
                </div>
            </div>
        </div>

        <!-- Input -->
        <div class="input-area" v-if="!sessionEnded">
            <textarea
                v-model="input"
                placeholder="Type a message…"
                rows="1"
                :disabled="sending"
                @keydown.enter.exact.prevent="handleSend"
                @input="autoResize"
                ref="textareaEl"
            />
            <button class="btn-primary" :disabled="sending || !input.trim()" @click="handleSend">
                Send
            </button>
        </div>
        <div v-else class="session-ended-bar">
            Session has ended.
            <RouterLink to="/chat/new" style="color:#6366f1;text-decoration:none;margin-left:8px;">Start new</RouterLink>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getMessages, sendMessage, deleteSession } from '../api/chat.js';
import { listSessions } from '../api/chat.js';

const emit = defineEmits(['session-deleted']);
const route = useRoute();
const router = useRouter();

const messages = ref([]);
const input = ref('');
const sending = ref(false);
const loading = ref(false);
const initialMode = ref(null);
const sessionEnded = ref(false);
const session = ref(null);
const messagesEl = ref(null);
const textareaEl = ref(null);
const elapsed = ref(0);
let elapsedTimer = null;

async function loadSession() {
    try {
        const data = await listSessions(100, 0);
        session.value = data.sessions.find(s => s.id === route.params.sessionId) || null;
    } catch { /* ignore */ }
}

async function loadMessages() {
    loading.value = true;
    try {
        const data = await getMessages(route.params.sessionId);
        messages.value = data.messages;
        await nextTick();
        scrollToBottom();
    } catch (err) {
        console.error(err);
    } finally {
        loading.value = false;
    }
}

async function handleSend() {
    const text = input.value.trim();
    if (!text || sending.value) return;

    // Optimistic user message
    messages.value.push({
        id: `temp-${Date.now()}`,
        content: text,
        isFromUser: true,
        timestamp: new Date().toISOString(),
    });
    input.value = '';
    if (textareaEl.value) textareaEl.value.style.height = 'auto';
    await nextTick();
    scrollToBottom();

    sending.value = true;
    elapsed.value = 0;
    elapsedTimer = setInterval(() => elapsed.value++, 1000);

    try {
        const data = await sendMessage(route.params.sessionId, text);
        messages.value.push({
            id: data.messageId || `model-${Date.now()}`,
            content: data.reply,
            isFromUser: false,
            timestamp: data.timestamp,
        });

        if (data.initialMode) {
            initialMode.value = data.initialMode;
            if (data.initialMode.sessionEnded) {
                sessionEnded.value = true;
            }
        }
    } catch (err) {
        messages.value.push({
            id: `err-${Date.now()}`,
            content: `Error: ${err.message}`,
            isFromUser: false,
            timestamp: new Date().toISOString(),
        });
    } finally {
        sending.value = false;
        clearInterval(elapsedTimer);
        await nextTick();
        scrollToBottom();
    }
}

async function handleDelete() {
    if (!confirm('Delete this session?')) return;
    try {
        await deleteSession(route.params.sessionId);
        emit('session-deleted');
        router.push('/chat');
    } catch (err) {
        alert(err.message);
    }
}

function scrollToBottom() {
    if (messagesEl.value) {
        messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
    }
}

function autoResize(e) {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
}

function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

watch(() => route.params.sessionId, () => {
    messages.value = [];
    initialMode.value = null;
    sessionEnded.value = false;
    if (route.params.sessionId) {
        loadSession();
        loadMessages();
    }
});

onMounted(() => {
    loadSession();
    loadMessages();
});

onUnmounted(() => clearInterval(elapsedTimer));
</script>

<style scoped>
.conversation {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

.conv-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-bottom: 1px solid #e5e7eb;
    background: white;
}

.session-info { display: flex; align-items: center; gap: 8px; }
.session-title { font-size: 14px; font-weight: 500; color: #374151; }

.badge {
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 4px;
    font-weight: 700;
    text-transform: uppercase;
}

.badge.cbt { background: #dbeafe; color: #1e40af; }
.badge.mbt { background: #d1fae5; color: #065f46; }
.badge.mbct { background: #ede9fe; color: #5b21b6; }
.badge.dbt { background: #ffedd5; color: #9a3412; }
.badge.initial { background: #fce7f3; color: #9d174d; }
.badge.provider { background: #f3f4f6; color: #6b7280; }

.initial-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 20px;
    background: #fef3c7;
    font-size: 13px;
    color: #92400e;
}

.mode-result strong { color: #6366f1; }
.session-ended { color: #ef4444; font-weight: 600; }

.messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.loading-state { color: #9ca3af; font-size: 13px; text-align: center; }

.message-row { display: flex; }
.message-row.user { justify-content: flex-end; }
.message-row.model { justify-content: flex-start; }

.bubble {
    max-width: 70%;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.5;
}

.message-row.user .bubble {
    background: #6366f1;
    color: white;
    border-bottom-right-radius: 4px;
}

.message-row.model .bubble {
    background: white;
    color: #1a1a1a;
    border: 1px solid #e5e7eb;
    border-bottom-left-radius: 4px;
}

.ts { font-size: 11px; margin-top: 4px; opacity: 0.6; }

/* Typing dots */
.bubble.typing {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 12px 16px;
}

.bubble.typing span:not(.elapsed) {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #9ca3af;
    animation: bounce 1.2s infinite;
}

.bubble.typing span:nth-child(2) { animation-delay: 0.2s; }
.bubble.typing span:nth-child(3) { animation-delay: 0.4s; }

.elapsed { font-size: 12px; color: #9ca3af; margin-left: 6px; }

@keyframes bounce {
    0%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-6px); }
}

.input-area {
    display: flex;
    gap: 10px;
    padding: 14px 20px;
    border-top: 1px solid #e5e7eb;
    background: white;
    align-items: flex-end;
}

.input-area textarea {
    flex: 1;
    resize: none;
    min-height: 38px;
    max-height: 120px;
    overflow-y: auto;
    line-height: 1.5;
}

.session-ended-bar {
    padding: 14px 20px;
    border-top: 1px solid #e5e7eb;
    background: #fef2f2;
    text-align: center;
    font-size: 14px;
    color: #991b1b;
}
</style>
