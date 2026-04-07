import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
    { path: '/', redirect: '/login' },
    {
        path: '/login',
        component: () => import('../views/LoginView.vue'),
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
