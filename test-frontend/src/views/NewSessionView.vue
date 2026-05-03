<template>
    <div class="new-session">
        <h2>New Session</h2>

        <form @submit.prevent="handleCreate">
            <div class="field">
                <label>Title <span class="optional">(optional)</span></label>
                <input v-model="title" type="text" placeholder="e.g. CBT anxiety test" />
            </div>

            <div class="field">
                <label>Chatbot Type</label>
                <select v-model="chatbotType" required>
                    <option value="CBT">CBT</option>
                    <option value="MBT">MBT</option>
                    <option value="MBCT">MBCT</option>
                    <option value="DBT">DBT</option>
                    <option value="INITIAL">INITIAL</option>
                </select>
            </div>

            <div class="field">
                <label>Provider</label>
                <select v-model="provider" required>
                    <option value="gemini">Gemini</option>
                    <option value="anthropic">Anthropic</option>
                </select>
            </div>

            <p v-if="error" class="error-msg">{{ error }}</p>

            <div class="actions">
                <RouterLink to="/chat" class="btn-ghost" style="text-decoration:none;">Cancel</RouterLink>
                <button type="submit" class="btn-primary" :disabled="loading">
                    {{ loading ? 'Creating…' : 'Create Session' }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createSession } from '../api/chat.js';

const emit = defineEmits(['session-created']);
const router = useRouter();

const title = ref('');
const chatbotType = ref('CBT');
const provider = ref('gemini');
const error = ref('');
const loading = ref(false);

async function handleCreate() {
    error.value = '';
    loading.value = true;
    try {
        const data = await createSession(chatbotType.value, title.value || undefined, provider.value);
        emit('session-created');
        router.push(`/chat/${data.session.id}`);
    } catch (err) {
        error.value = err.message || 'Failed to create session.';
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>
.new-session {
    max-width: 480px;
    margin: 60px auto;
    padding: 0 24px;
}

h2 { font-size: 20px; font-weight: 700; margin-bottom: 28px; }

.field { margin-bottom: 20px; }
.field label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; }
.optional { color: #9ca3af; font-weight: 400; }

.actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 28px;
}
</style>
