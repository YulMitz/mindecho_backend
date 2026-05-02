import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
    {
        path: '/',
        redirect: () => (localStorage.getItem('mindecho_token') ? '/main' : '/login'),
    },
    {
        path: '/login',
        component: () => import('../views/LoginView.vue'),
    },
    {
        path: '/main',
        component: () => import('../views/MainLayout.vue'),
        meta: { requiresAuth: true },
    },
    {
        path: '/chat',
        component: () => import('../views/ChatLayout.vue'),
        meta: { requiresAuth: true },
        children: [
            { path: '', component: () => import('../views/SessionListView.vue') },
            { path: 'new', component: () => import('../views/NewSessionView.vue') },
            { path: ':sessionId', component: () => import('../views/ChatConversationView.vue') },
        ],
    },
    {
        path: '/admin/users',
        component: () => import('../views/AdminUsersView.vue'),
        meta: { requiresAuth: true },
    },
    {
        path: '/admin/llm',
        component: () => import('../views/AdminLlmStatsView.vue'),
        meta: { requiresAuth: true },
    },
    {
        path: '/admin/users/:userId/chats',
        component: () => import('../views/AdminUserChatsView.vue'),
        meta: { requiresAuth: true },
    },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

router.beforeEach((to) => {
    const token = localStorage.getItem('mindecho_token');
    if (to.meta.requiresAuth && !token) {
        return '/login';
    }
});

export default router;
