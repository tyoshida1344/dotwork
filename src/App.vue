<script setup>
import BaseDialog from '~/components/organisms/BaseDialog.vue'
</script>

<template>
  <router-view />
  <!-- 全ルート共通の共通ダイアログ（alert/confirm/prompt の置き換え）を最前面に置く -->
  <BaseDialog />
</template>
