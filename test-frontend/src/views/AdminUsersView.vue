<template>
    <div class="admin-page">
        <header class="admin-header">
            <h1>Users</h1>
            <div class="nav-links">
                <RouterLink to="/main">← Main</RouterLink>
                <RouterLink to="/admin/llm">LLM Stats</RouterLink>
            </div>
        </header>

        <div class="admin-section">
            <p v-if="loading" class="muted">Loading…</p>
            <p v-else-if="error" class="error-msg">{{ error }}</p>
            <p v-else-if="!users.length" class="muted">No users.</p>

            <table v-else class="admin-table">
                <thead>
                    <tr>
                        <th @click="sortBy('name')">Name {{ sortIndicator('name') }}</th>
                        <th @click="sortBy('email')">Email {{ sortIndicator('email') }}</th>
                        <th @click="sortBy('userId')">UserId {{ sortIndicator('userId') }}</th>
                        <th @click="sortBy('lastLoginAt')">Last Login {{ sortIndicator('lastLoginAt') }}</th>
                        <th @click="sortBy('sessionCount')">Sessions {{ sortIndicator('sessionCount') }}</th>
                        <th @click="sortBy('messageCount')">Messages {{ sortIndicator('messageCount') }}</th>
                        <th @click="sortBy('lastMessageAt')">Last Message {{ sortIndicator('lastMessageAt') }}</th>
                        <th @click="sortBy('dataAnalysisConsent')">Consent {{ sortIndicator('dataAnalysisConsent') }}</th>
                        <th @click="sortBy('isActive')">Active {{ sortIndicator('isActive') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="u in sortedUsers" :key="u.id" @click="openChats(u)">
                        <td>{{ u.name || '—' }}</td>
                        <td>{{ u.email }}</td>
                        <td>{{ u.userId || '—' }}</td>
                        <td>{{ fmtDate(u.lastLoginAt) }}</td>
                        <td>{{ u.sessionCount }}</td>
                        <td>{{ u.messageCount }}</td>
                        <td>{{ fmtDate(u.lastMessageAt) }}</td>
                        <td>{{ u.dataAnalysisConsent ? '✓' : '—' }}</td>
                        <td>{{ u.isActive ? '✓' : '—' }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getUsers } from '../api/admin.js';
import '../styles/admin.css';

const router = useRouter();
const users = ref([]);
const loading = ref(true);
const error = ref('');
const sortKey = ref(null);
const sortDir = ref('asc');

onMounted(async () => {
    try {
        const data = await getUsers();
        users.value = data.users || [];
    } catch (err) {
        error.value = err.message || 'Failed to load users.';
    } finally {
        loading.value = false;
    }
});

function sortBy(key) {
    if (sortKey.value === key) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortKey.value = key;
        sortDir.value = 'asc';
    }
}

function sortIndicator(key) {
    if (sortKey.value !== key) return '';
    return sortDir.value === 'asc' ? '▲' : '▼';
}

const sortedUsers = computed(() => {
    if (!sortKey.value) return users.value;
    const arr = [...users.value];
    const k = sortKey.value;
    const dir = sortDir.value === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
        const av = a[k];
        const bv = b[k];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
    });
    return arr;
});

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString();
}

function openChats(u) {
    if (!u.userId) return;
    router.push(`/admin/users/${encodeURIComponent(u.userId)}/chats`);
}
</script>
