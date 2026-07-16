<script setup>
import { ref, onMounted } from 'vue'
import { isSupabaseConfigured } from '~/core/supabase.js'
import { signIn, signOut, getSession } from '~/core/lessonsApi.js'
import AdminLogin from '~/components/organisms/AdminLogin.vue'
import BaseButton from '~/components/atoms/BaseButton.vue'

// /admin のシェル：Supabase 設定チェック・ログイン・共通ヘッダー・ログアウトを担い、
// 各管理機能（レッスン管理など）は子ルート（<router-view>）に表示する。
const configured = isSupabaseConfigured

const session = ref(null)
const loginLoading = ref(false)
const loginError = ref('')

onMounted(async () => {
  if (!configured) return
  // 保存済みトークンが有効ならログイン状態で開始（無効／未ログインならログイン画面）。
  session.value = await getSession()
})

async function handleLogin({ loginId, password }) {
  loginLoading.value = true
  loginError.value = ''
  try {
    await signIn(loginId, password)
    session.value = { ok: true }
  } catch (e) {
    loginError.value = `ログインに失敗しました: ${e.message || e}`
  } finally {
    loginLoading.value = false
  }
}

async function handleLogout() {
  await signOut()
  session.value = null
}
</script>

<template>
  <div id="admin">
    <!-- Supabase 未設定 -->
    <div v-if="!configured" class="admin-notice">
      <span class="admin-logo">DOTWORK ADMIN</span>
      <p>Supabase が未設定です。<code>.env</code> に <code>VITE_SUPABASE_URL</code> と <code>VITE_SUPABASE_ANON_KEY</code> を設定してください。</p>
      <p class="admin-login-note">セットアップ手順: <code>README.md</code> の「Supabase 連携（レッスン管理・ログイン）」</p>
    </div>

    <!-- 未ログイン -->
    <AdminLogin
      v-else-if="!session"
      :loading="loginLoading"
      :error="loginError"
      @submit="handleLogin"
    />

    <!-- 管理画面シェル（ヘッダー＋子ルート） -->
    <div v-else class="admin-main">
      <header class="admin-head">
        <router-link class="admin-logo" to="/admin">DOTWORK ADMIN</router-link>
        <div class="admin-head-actions">
          <BaseButton @click="handleLogout">ログアウト</BaseButton>
        </div>
      </header>

      <router-view />
    </div>
  </div>
</template>

<style scoped>
#admin { position: fixed; inset: 0; background: var(--bg); overflow-y: auto; color: var(--text); }
.admin-notice { max-width: 520px; margin: 80px auto; padding: 0 20px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
.admin-notice p { font-size: 14px; line-height: 1.7; }
.admin-main { max-width: 820px; margin: 0 auto; padding: 28px 22px 60px; }
</style>
