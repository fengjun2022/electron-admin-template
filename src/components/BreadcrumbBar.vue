<template>
  <div class="breadcrumb flex items-center gap-1 text-gray-600 text-[15px] font-medium select-none">
    <span
        v-for="(seg, idx) in segments"
        :key="idx"
        class="flex items-center"
    >
      <span class="px-1 py-0.5 rounded hover:text-blue-600 transition-colors">
        {{ seg.label }}
      </span>
      <span v-if="idx < segments.length - 1" class="mx-1 text-gray-400 font-normal">
        /
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {generateMenuFromRouter} from "@/config/menu.ts";
const router = useRouter()
const route = useRoute()

const segments = computed(() =>
    route.matched
        .filter(r => r.meta?.title) // 只要有 title 的
        .map(r => ({
          label: r.meta!.title as string,
          path: r.path,              // 需要可点击时用
        }))
)
console.log(segments.value)
</script>

<style scoped>
.breadcrumb {
  padding: 8px 12px;
}
</style>

