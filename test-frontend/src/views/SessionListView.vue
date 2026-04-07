<template>
    <div class="empty-state">
        <div class="empty-icon">💬</div>
        <h2>Select a session</h2>
        <p>Choose a session from the sidebar or create a new one.</p>
        <RouterLink to="/chat/new" class="btn-primary" style="display:inline-block;text-decoration:none;margin-top:16px;">
            + New Session
        </RouterLink>
    </div>
</template>

<style scoped>
.empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    text-align: center;
    padding: 40px;
}

.empty-icon { font-size: 48px; margin-bottom: 16px; }
h2 { font-size: 18px; font-weight: 600; color: #374151; margin-bottom: 8px; }
p { font-size: 14px; }
</style>
