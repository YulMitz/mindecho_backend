<template>
    <div class="admin-page">
        <header class="admin-header">
            <h1>LLM Stats (last {{ data?.windowDays || 30 }} days)</h1>
            <div class="nav-links">
                <RouterLink to="/main">← Main</RouterLink>
                <RouterLink to="/admin/users">Users</RouterLink>
            </div>
        </header>

        <p v-if="loading" class="muted">Loading…</p>
        <p v-else-if="error" class="error-msg">{{ error }}</p>

        <template v-else-if="data">
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-label">Total Tokens</div>
                    <div class="kpi-value">{{ fmt(data.totals.totalTokens) }}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Total Requests</div>
                    <div class="kpi-value">{{ fmt(data.totals.requestCount) }}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Active Users</div>
                    <div class="kpi-value">{{ fmt(data.totals.activeUsers) }}</div>
                </div>
            </div>

            <div class="two-col">
                <div class="admin-section">
                    <h2>By Chatbot Type</h2>
                    <table class="admin-table">
                        <thead>
                            <tr><th>Type</th><th>Requests</th><th>Total Tokens</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="r in data.byChatbotType" :key="r.chatbotType">
                                <td>{{ r.chatbotType }}</td>
                                <td>{{ fmt(r.requestCount) }}</td>
                                <td>{{ fmt(r.totalTokens) }}</td>
                            </tr>
                            <tr v-if="!data.byChatbotType.length"><td colspan="3" class="muted">No data</td></tr>
                        </tbody>
                    </table>
                </div>

                <div class="admin-section">
                    <h2>By Provider</h2>
                    <table class="admin-table">
                        <thead>
                            <tr><th>Provider</th><th>Requests</th><th>Total Tokens</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="r in data.byProvider" :key="r.provider">
                                <td>{{ r.provider }}</td>
                                <td>{{ fmt(r.requestCount) }}</td>
                                <td>{{ fmt(r.totalTokens) }}</td>
                            </tr>
                            <tr v-if="!data.byProvider.length"><td colspan="3" class="muted">No data</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="admin-section">
                <h2>By Day (Total Tokens)</h2>
                <p v-if="!data.byDay || !data.byDay.length" class="muted">No data</p>
                <template v-else>
                    <svg class="spark-svg" :viewBox="`0 0 ${sparkW} ${sparkH}`" preserveAspectRatio="none">
                        <polyline
                            :points="sparkPoints"
                            fill="none"
                            stroke="#6366f1"
                            stroke-width="2"
                        />
                        <circle
                            v-for="(p, i) in sparkDots"
                            :key="i"
                            :cx="p.x"
                            :cy="p.y"
                            r="2"
                            fill="#6366f1"
                        >
                            <title>{{ data.byDay[i].date }}: {{ fmt(data.byDay[i].totalTokens) }} tokens</title>
                        </circle>
                    </svg>
                    <div class="spark-axis">
                        <span>{{ data.byDay[0].date }}</span>
                        <span>{{ data.byDay[Math.floor(data.byDay.length / 2)].date }}</span>
                        <span>{{ data.byDay[data.byDay.length - 1].date }}</span>
                    </div>
                </template>
            </div>

            <div class="admin-section">
                <h2>Per User</h2>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Name</th><th>Email</th><th>Requests</th>
                            <th>Input</th><th>Output</th><th>Total Tokens</th>
                            <th>Weekly Active Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="u in data.perUser" :key="u.userIdPk">
                            <td>{{ u.name || '—' }}</td>
                            <td>{{ u.email }}</td>
                            <td>{{ fmt(u.requestCount) }}</td>
                            <td>{{ fmt(u.inputTokens) }}</td>
                            <td>{{ fmt(u.outputTokens) }}</td>
                            <td>{{ fmt(u.totalTokens) }}</td>
                            <td>{{ fmtDuration(u.weeklyActiveTimeSec) }}</td>
                        </tr>
                        <tr v-if="!data.perUser.length"><td colspan="7" class="muted">No data</td></tr>
                    </tbody>
                </table>
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getLlmStats } from '../api/admin.js';
import '../styles/admin.css';

const data = ref(null);
const loading = ref(true);
const error = ref('');

const sparkW = 600;
const sparkH = 80;

onMounted(async () => {
    try {
        data.value = await getLlmStats();
    } catch (err) {
        error.value = err.message || 'Failed to load stats.';
    } finally {
        loading.value = false;
    }
});

function fmt(n) {
    if (n == null) return '0';
    return Number(n).toLocaleString();
}

function fmtDuration(s) {
    s = Number(s) || 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const sparkDots = computed(() => {
    const days = data.value?.byDay || [];
    if (!days.length) return [];
    const maxV = Math.max(1, ...days.map((d) => d.totalTokens || 0));
    const stepX = days.length > 1 ? sparkW / (days.length - 1) : 0;
    return days.map((d, i) => ({
        x: i * stepX,
        y: sparkH - ((d.totalTokens || 0) / maxV) * (sparkH - 4) - 2,
    }));
});

const sparkPoints = computed(() =>
    sparkDots.value.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
);
</script>

<style scoped>
.spark-axis {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #6b7280;
    margin-top: 4px;
    max-width: 600px;
}
</style>
