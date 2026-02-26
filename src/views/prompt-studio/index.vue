<template>
  <div class="p-4 h-full overflow-auto">
    <n-space vertical size="large">
      <n-card title="Prompt 设置（Markdown 输出格式）" :bordered="false">

      </n-card>

      <n-card title="当前用户 Prompt 自定义规则" :bordered="false">
        <template #header-extra>
          <n-space>
            <n-button @click="refresh" :loading="promptStore.loading">刷新</n-button>
            <n-button type="primary" @click="savePrompt" :loading="promptStore.saving">保存</n-button>
          </n-space>
        </template>

        <n-space vertical>
          <n-input
            v-model:value="promptDraft"
            type="textarea"
            :autosize="{ minRows: 10, maxRows: 24 }"
            placeholder="请填写你希望的 Markdown 输出风格与结构要求"
          />

          <n-collapse>
            <n-collapse-item title="当前有效 Prompt 预览（后端生成）" name="preview">
              <pre class="text-xs whitespace-pre-wrap break-all">{{ promptStore.effectivePromptPreview || '暂无' }}</pre>
            </n-collapse-item>
          </n-collapse>
        </n-space>
      </n-card>

      <n-card title="AI 帮我生成/优化 Prompt" :bordered="false">
        <n-space vertical>
          <n-form-item label="目标效果（必填）">
            <n-input
              v-model:value="aiGoal"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 5 }"
              placeholder="例如：我希望最终笔记像高质量课程讲义，结构清楚、便于复习，重点与例外都保留"
            />
          </n-form-item>
          <n-form-item label="额外偏好（可选）">
            <n-input
              v-model:value="aiExtra"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 5 }"
              placeholder="例如：条目多时用表格；先结论后解释；避免标题过长"
            />
          </n-form-item>
          <n-space justify="space-between">
            <n-checkbox v-model:checked="autoSaveAiPrompt">自动保存到当前用户 Prompt</n-checkbox>
            <n-button type="primary" @click="generateByAi" :loading="promptStore.generating">AI 生成 Prompt</n-button>
          </n-space>

          <n-input
            v-model:value="aiGeneratedPreview"
            type="textarea"
            readonly
            :autosize="{ minRows: 8, maxRows: 20 }"
            placeholder="AI 生成的 Prompt 会显示在这里"
          />
        </n-space>
      </n-card>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NCheckbox,
  NCollapse,
  NCollapseItem,
  NFormItem,
  NInput,
  NSpace,
  useMessage,
} from 'naive-ui'
import { usePromptStore } from '@/stores/modules/usePromptStore'
import { useAuthStore } from '@/stores/modules/useAuthStore'

const router = useRouter()
const message = useMessage()
const promptStore = usePromptStore()
const authStore = useAuthStore()

const promptDraft = ref('')
const aiGoal = ref('')
const aiExtra = ref('')
const aiGeneratedPreview = ref('')
const autoSaveAiPrompt = ref(true)
const apiBaseUrlDraft = ref(authStore.apiBaseUrl)

watch(() => promptStore.currentCustomization, (v) => {
  if (!v) return
  promptDraft.value = v
}, { immediate: true })

async function refresh() {
  try {
    await promptStore.refresh()
    promptDraft.value = promptStore.currentCustomization
  } catch (e: any) {
    message.error(e?.message || '刷新 Prompt 配置失败')
  }
}

async function savePrompt() {
  try {
    await promptStore.saveCurrent(promptDraft.value)
    await promptStore.refresh()
    message.success('Prompt 配置已保存')
  } catch (e: any) {
    message.error(e?.message || '保存失败')
  }
}

async function generateByAi() {
  if (!aiGoal.value.trim()) {
    message.warning('请先填写目标效果')
    return
  }
  try {
    const res = await promptStore.generateByAi(aiGoal.value, aiExtra.value, autoSaveAiPrompt.value)
    aiGeneratedPreview.value = res.generated_prompt
    if (autoSaveAiPrompt.value) {
      promptDraft.value = promptStore.currentCustomization
      await promptStore.refresh()
    }
    message.success('AI Prompt 已生成')
  } catch (e: any) {
    message.error(e?.message || 'AI 生成失败')
  }
}

function saveApiBaseUrl() {
  if (!apiBaseUrlDraft.value.trim()) {
    message.warning('后端地址不能为空')
    return
  }
  authStore.setApiBaseUrlValue(apiBaseUrlDraft.value)
  message.success('后端地址已保存')
}

function goHome() {
  router.push('/home')
}

onMounted(() => {
  refresh()
})
</script>
