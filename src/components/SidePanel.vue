<script setup>
defineProps({
  title:   { type: String, required: true },
  tooltip: { type: String, default: '' },
})
</script>

<template>
  <div class="sec">
    <div class="sec-hdr">
      {{ title }}
      <span v-if="tooltip" class="tip-wrap">
        <span class="tip-ico">?</span>
        <div class="tip-box">{{ tooltip }}</div>
      </span>
    </div>
    <slot />
  </div>
</template>
