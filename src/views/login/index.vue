<template>
  <!-- 整个窗口背景 -->
  <div
      class="login-page h-screen w-screen flex items-center justify-center"
      :style="{ backgroundColor: themeColors.main }"
  >
    <div
        class="w-screen h-screen px-10 py-8 rounded-2xl shadow-lg"
        :style="{ backgroundColor: themeColors.component, color: themeColors.text }"
    >
      <NH2 class="mb-4 text-center" :style="{ color: themeColors.text }">
        登录
      </NH2>

      <p class="mb-6 text-sm" :style="{ color: themeColors.textSecondary }">
        欢迎回来，请登录您的账户
      </p>

      <NForm  ref="formRef" :model="formData" :rules="rules" @submit.prevent="submit">
        <!-- 这里 path 要改成 username，和 rules 对齐 -->
        <NFormItem path="username" label="账号">
          <NInput
              v-model:value="formData.username"
              placeholder="请输入账号"
              size="large"
          />
        </NFormItem>

        <NFormItem path="password" label="密码">
          <NInput
              v-model:value="formData.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入密码"
              size="large"
          >
            <template #suffix>
              <NButton text @click="showPassword = !showPassword">
                <NIcon :component="showPassword ? EyeOffOutline : EyeOutline" />
              </NButton>
            </template>
          </NInput>
        </NFormItem>

        <div class="flex justify-between items-center mb-6">
          <NCheckbox v-model:checked="formData.keepLoggedIn">
            保持登录状态
          </NCheckbox>
        </div>

        <NButton
            type="primary"
            size="large"
            block
            @click="submit"
            :loading="loading"
        >
          登录
        </NButton>
      </NForm>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NForm,
  NFormItem,
  NInput,
  NButton,
  NCheckbox,
  NH2,
  NIcon,
  useMessage,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { EyeOutline, EyeOffOutline } from '@vicons/ionicons5'
import { useUserStore } from '@/stores/modules/useUserStore'
import { useGlobalStore } from '@/stores/global-store'
import { storeToRefs } from 'pinia'
import { getThemeColors } from '@/config/theme'

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()
const formRef = ref<FormInst | null>(null)
const showPassword = ref(false)
const loading = ref(false)
import { darkTheme } from 'naive-ui'

// theme
const globalStore = useGlobalStore()
const { isDarkMode } = storeToRefs(globalStore)
const themeColors = computed(() => getThemeColors(isDarkMode.value ? 'dark' : 'light'))

const formData = reactive({
  username: '',
  password: '',
  keepLoggedIn: false,
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入账号' }],
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, message: '密码长度不能少于6位' },
  ],
}

const submit = async () => {
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      loading.value = true
      try {
      //   const res = await userLogin<any>({
      //     username: formData.username,
      //     password: formData.password,
      //   })
      //
      //   if (res.code === 200) {
      //     // userStore.setUserInfo(res.data)
      //     // 获取完整用户信息
      //     // await userStore.getUserInfoData()
      //     message.success('登录成功！')
      //
      //   } else {
      //     message.error(res.msg || '登录失败')
      //   }
        // In Electron, open main window via IPC; in web, fallback to router
        if ((window as any)?.electronAPI?.openMainWindow) {
          (window as any).electronAPI.openMainWindow()
        } else {
          await router.push({ path: '/' })
        }
      } catch (error) {
        message.error('登录失败，请稍后重试')
      } finally {
        loading.value = false
      }
    }
  })
}
</script>
