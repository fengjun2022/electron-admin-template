<script setup lang="ts">
import { RouterView } from 'vue-router'
import { NConfigProvider, NMessageProvider, darkTheme } from 'naive-ui'
import { useGlobalStore } from '@/stores/global-store'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

const globalStore = useGlobalStore()
const { isDarkMode } = storeToRefs(globalStore)

// Naive 全局主题：暗色用 darkTheme，亮色用默认（null）
const naiveTheme = computed(() => (isDarkMode.value ? darkTheme : null))
</script>

<template>
  <main class="view">
    <NConfigProvider :theme="naiveTheme">
      <NMessageProvider>
        <RouterView />
      </NMessageProvider>
    </NConfigProvider>
  </main>
</template>

<style scoped>
.view {
  height: 100%;
  width: 100%;
  padding: 0;
}
</style>
