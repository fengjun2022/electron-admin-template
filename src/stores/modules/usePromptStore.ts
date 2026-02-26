import { defineStore } from 'pinia'
import { generateMdPromptByAiApi, getCurrentMdPromptApi, updateCurrentMdPromptApi } from '@/api/prompts'

export const usePromptStore = defineStore('prompt', {
  state: () => ({
    loading: false,
    saving: false,
    generating: false,
    currentCustomization: '',
    aiGenerated: '' as string | null,
    effectivePromptPreview: '',
    note: '',
  }),
  actions: {
    async refresh() {
      this.loading = true
      try {
        const res = await getCurrentMdPromptApi()
        this.currentCustomization = res.md_prompt_customization || ''
        this.aiGenerated = res.md_prompt_ai_generated || null
        this.effectivePromptPreview = res.effective_prompt_preview || ''
        this.note = res.note || ''
        return res
      } finally {
        this.loading = false
      }
    },
    async saveCurrent(customText: string) {
      this.saving = true
      try {
        const res = await updateCurrentMdPromptApi({ md_prompt_customization: customText })
        this.currentCustomization = res.prompt_settings?.md_prompt_customization || customText
        return res
      } finally {
        this.saving = false
      }
    },
    async generateByAi(userGoal: string, extraPreferences = '', autoSave = true) {
      this.generating = true
      try {
        const res = await generateMdPromptByAiApi({
          user_goal: userGoal,
          extra_preferences: extraPreferences,
          auto_save: autoSave,
        })
        this.aiGenerated = res.generated_prompt
        if (res.auto_saved && res.prompt_settings) {
          this.currentCustomization = res.prompt_settings.md_prompt_customization
        }
        return res
      } finally {
        this.generating = false
      }
    },
  },
})

