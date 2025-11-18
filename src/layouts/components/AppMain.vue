<template>
  <!-- 主内容区域 -->
  <main class="app-content flex-1 flex flex-col overflow-hidden transition-all duration-300 p-3">
    <!-- 面包屑 -->
    <div
      class="breadcrumb-container flex-shrink-0 overflow-hidden transition-all duration-300"
      :class="{
        'h-[50px] opacity-100': isBreadcrumbBarVisible,
        'h-0 opacity-0': !isBreadcrumbBarVisible,
      }"
    >
      <BreadcrumbBar />
    </div>

    <RouterView v-slot="{ Component, route }">
      <Transition
        name="page"
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-300 ease-in"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-4"
        mode="out-in"
      >
        <component :is="Component" :key="route.fullPath" />
      </Transition>
    </RouterView>
  </main>
</template>

<script setup>
import { computed, Transition } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterView } from 'vue-router'

import { useGlobalStore } from '@/stores/global-store'
import BreadcrumbBar from '@/components/BreadcrumbBar.vue'

const globalStore = useGlobalStore()
const { isBreadcrumbBarVisible } = storeToRefs(globalStore)
</script>
