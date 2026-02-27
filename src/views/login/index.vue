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
        账户中心
      </NH2>

      <p class="mb-6 text-sm" :style="{ color: themeColors.textSecondary }">
        登录或注册后即可开始对话。试用账号默认 10 次对话额度。
      </p>

      <n-tabs v-model:value="activeTab" type="line" animated>
        <n-tab-pane name="login" tab="登录">
          <NForm ref="loginFormRef" :model="loginForm" :rules="loginRules" @submit.prevent="submitLogin">
            <NFormItem path="username" label="账号">
              <NInput v-model:value="loginForm.username" placeholder="请输入账号" size="large" />
            </NFormItem>
            <NFormItem path="password" label="密码">
              <NInput
                v-model:value="loginForm.password"
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
              <NCheckbox v-model:checked="loginForm.keepLoggedIn">保持登录状态</NCheckbox>
            </div>
            <NButton type="primary" size="large" block @click="submitLogin" :loading="loading">登录</NButton>
          </NForm>
        </n-tab-pane>

        <n-tab-pane name="register" tab="注册">
          <NForm ref="registerFormRef" :model="registerForm" :rules="registerRules" @submit.prevent="submitRegister">
            <NFormItem path="username" label="账号">
              <NInput v-model:value="registerForm.username" placeholder="至少3位" size="large" />
            </NFormItem>
            <NFormItem path="display_name" label="显示名">
              <NInput v-model:value="registerForm.display_name" placeholder="可选，不填则使用账号" size="large" />
            </NFormItem>
            <NFormItem path="password" label="密码">
              <NInput
                v-model:value="registerForm.password"
                :type="showRegPassword ? 'text' : 'password'"
                placeholder="至少6位"
                size="large"
              >
                <template #suffix>
                  <NButton text @click="showRegPassword = !showRegPassword">
                    <NIcon :component="showRegPassword ? EyeOffOutline : EyeOutline" />
                  </NButton>
                </template>
              </NInput>
            </NFormItem>
            <NButton type="primary" size="large" block @click="submitRegister" :loading="loading">注册并登录</NButton>
          </NForm>
        </n-tab-pane>
      </n-tabs>
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
  NTabs,
  NTabPane,
  useMessage,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { EyeOutline, EyeOffOutline } from '@vicons/ionicons5'
import { useUserStore } from '@/stores/modules/useUserStore'
import { useAuthStore } from '@/stores/modules/useAuthStore'
import { useGlobalStore } from '@/stores/global-store'
import { storeToRefs } from 'pinia'
import { getThemeColors } from '@/config/theme'

const router = useRouter()
const message = useMessage()
const userStore = useUserStore()
const authStore = useAuthStore()
const loginFormRef = ref<FormInst | null>(null)
const registerFormRef = ref<FormInst | null>(null)
const showPassword = ref(false)
const showRegPassword = ref(false)
const loading = ref(false)
const activeTab = ref<'login' | 'register'>('login')
// theme
const globalStore = useGlobalStore()
const { isDarkMode } = storeToRefs(globalStore)
const themeColors = computed(() => getThemeColors(isDarkMode.value ? 'dark' : 'light'))

const loginForm = reactive({
  username: '',
  password: '',
  keepLoggedIn: false,
})

const registerForm = reactive({
  username: '',
  display_name: '',
  password: '',
})

const loginRules: FormRules = {
  username: [{ required: true, message: '请输入账号' }],
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, message: '密码长度不能少于6位' },
  ],
}

const registerRules: FormRules = {
  username: [
    { required: true, message: '请输入账号' },
    { min: 3, message: '账号至少3位' },
  ],
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, message: '密码长度不能少于6位' },
  ],
}

async function afterAuthSuccess() {
  userStore.userName = authStore.user?.display_name || authStore.user?.username || '用户'
  const role = String(authStore.user?.role || 'tryuser')
  if (role === 'admin') userStore.personalizedSignature = '管理员'
  else if (role === 'user') userStore.personalizedSignature = '正式用户'
  else userStore.personalizedSignature = `试用用户（剩余 ${authStore.user?.chat_quota_remaining ?? 0} 次）`
  if ((window as any)?.electronAPI?.openMainWindow) {
    (window as any).electronAPI.openMainWindow()
  } else {
    await router.push({ path: '/home' })
  }
}

const submitLogin = async () => {
  loginFormRef.value?.validate(async (errors) => {
    if (!errors) {
      loading.value = true
      try {
        await authStore.login(loginForm.username, loginForm.password)
        message.success('登录成功！')
        await afterAuthSuccess()
      } catch (error: any) {
        message.error(error?.message || '登录失败，请稍后重试')
      } finally {
        loading.value = false
      }
    }
  })
}

const submitRegister = async () => {
  registerFormRef.value?.validate(async (errors) => {
    if (!errors) {
      loading.value = true
      try {
        await authStore.register(registerForm.username, registerForm.password, registerForm.display_name)
        message.success('注册成功，已自动登录')
        await afterAuthSuccess()
      } catch (error: any) {
        message.error(error?.message || '注册失败，请稍后重试')
      } finally {
        loading.value = false
      }
    }
  })
}
</script>
