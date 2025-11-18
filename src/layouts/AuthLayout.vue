<template>
  <NConfigProvider>
    <NMessageProvider>
      <div class="auth-layout min-h-screen bg-gray-50">
        <!-- 桌面端布局 -->
        <div v-if="!isMobile" class="flex h-screen">
          <!-- 左侧背景区域 -->
          <div class="w-2/5  bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <div class="text-center text-white">
              <h1 class="text-4xl font-bold mb-4">南京中西医医院招标AI智能审核系统</h1>
              <p class="text-xl opacity-90">一站式管理平台</p>
            </div>
          </div>
          <!-- 右侧登录区域 -->
          <div class="w-3/5 flex items-center justify-center p-8">
            <div class="w-full max-w-md">
              <RouterView />
            </div>
          </div>
        </div>

        <!-- 移动端布局 -->
        <div v-else class="min-h-screen flex items-center justify-center p-4">
          <div class="w-full max-w-sm">
            <div class="text-center mb-8">
              <h1 class="text-3xl font-bold text-gray-900 mb-2">控制台</h1>
              <p class="text-gray-600">现代化的管理平台</p>
            </div>
            <RouterView />
          </div>
        </div>
      </div>
    </NMessageProvider>
  </NConfigProvider>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { NConfigProvider, NMessageProvider } from 'naive-ui'

const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.auth-layout {
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
}
</style>
