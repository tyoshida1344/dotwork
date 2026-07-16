<script setup>
// 管理トップのメニュー。今後、管理機能が増えたらここにリンクを足していく。
</script>

<template>
  <nav class="admin-menu">
    <router-link class="admin-menu-item" to="/admin/lessons">
      <div class="amm-title">▦ レッスン管理</div>
      <div class="amm-desc">レッスンの追加・編集・並び替え・削除を行います。</div>
    </router-link>
  </nav>
</template>

<style scoped>
.admin-menu { display: flex; flex-direction: column; gap: 10px; }
.admin-menu-item {
  display: block;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px 18px;
  text-decoration: none;
}
.admin-menu-item:hover { border-color: var(--amber); }
.amm-title { font-size: 15px; color: var(--text); }
.amm-desc { font-size: 13px; color: var(--muted); margin-top: 4px; }
</style>
