<script setup>
import { ref } from 'vue'
import BaseButton from '~/components/atoms/BaseButton.vue'
import BaseField from '~/components/molecules/BaseField.vue'

defineProps({
  loading: Boolean,
  error: String,
})
const emit = defineEmits(['submit'])

const loginId = ref('')
const password = ref('')

function onSubmit() {
  if (!loginId.value || !password.value) return
  emit('submit', { loginId: loginId.value, password: password.value })
}
</script>

<template>
  <div class="admin-login">
    <form class="admin-login-box" @submit.prevent="onSubmit">
      <span class="admin-logo">DOTWORK ADMIN</span>
      <p class="admin-login-note">管理者アカウントでログインしてください。</p>

      <BaseField label="ログインID">
        <input v-model="loginId" type="text" autocomplete="username" required>
      </BaseField>
      <BaseField label="パスワード">
        <input v-model="password" type="password" autocomplete="current-password" required>
      </BaseField>

      <p v-if="error" class="admin-error">{{ error }}</p>

      <BaseButton variant="accent" type="submit" :loading="loading" loading-text="ログイン中…">
        ログイン
      </BaseButton>
    </form>
  </div>
</template>

<style scoped>
.admin-login { min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px; }
.admin-login-box {
  width: 100%; max-width: 340px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  display: flex; flex-direction: column; gap: 4px;
}
.admin-login-box .admin-logo { margin-bottom: 6px; }
.admin-login-box .admin-login-note { margin-bottom: 12px; }
.admin-login-box button { margin-top: 6px; }
</style>
