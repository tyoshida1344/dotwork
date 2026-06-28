<script setup>
import { ref } from 'vue'

defineProps({
  loading: Boolean,
  error: String,
})
const emit = defineEmits(['submit'])

const email = ref('')
const password = ref('')

function onSubmit() {
  if (!email.value || !password.value) return
  emit('submit', { email: email.value, password: password.value })
}
</script>

<template>
  <div class="admin-login">
    <form class="admin-login-box" @submit.prevent="onSubmit">
      <span class="admin-logo">LESSON ADMIN</span>
      <p class="admin-login-note">管理者アカウントでログインしてください。</p>

      <label class="admin-field">
        <span>メールアドレス</span>
        <input v-model="email" type="email" autocomplete="username" required>
      </label>
      <label class="admin-field">
        <span>パスワード</span>
        <input v-model="password" type="password" autocomplete="current-password" required>
      </label>

      <p v-if="error" class="admin-error">{{ error }}</p>

      <button class="btn-a" type="submit" :disabled="loading">
        {{ loading ? 'ログイン中…' : 'ログイン' }}
      </button>
    </form>
  </div>
</template>
