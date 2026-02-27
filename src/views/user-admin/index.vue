<template>
  <div class="p-4 h-full overflow-auto">
    <n-card :bordered="false" title="用户管理">
      <template #header-extra>
        <n-space>
          <n-button @click="refreshUsers" :loading="loading">刷新</n-button>
          <n-button type="primary" @click="openCreate">新增用户</n-button>
        </n-space>
      </template>

      <n-alert v-if="!isAdmin" type="error" :show-icon="false" class="mb-4">
        当前账号无权限访问该页面。
      </n-alert>

      <template v-else>
        <div class="text-xs opacity-70 mb-3">
          角色说明：`admin`（无限制，可管理用户） / `user`（无限制） / `tryuser`（按额度限制对话次数）。
        </div>
        <n-data-table
          :columns="columns"
          :data="users"
          :loading="loading"
          :pagination="{ pageSize: 20 }"
          size="small"
        />
      </template>
    </n-card>

    <n-modal v-model:show="showCreate" preset="card" title="新增用户" style="width: 520px">
      <n-form :model="createForm" label-placement="left" label-width="92">
        <n-form-item label="账号">
          <n-input v-model:value="createForm.username" placeholder="至少3位" />
        </n-form-item>
        <n-form-item label="显示名">
          <n-input v-model:value="createForm.display_name" placeholder="可选" />
        </n-form-item>
        <n-form-item label="密码">
          <n-input v-model:value="createForm.password" type="password" show-password-on="click" placeholder="至少6位" />
        </n-form-item>
        <n-form-item label="角色">
          <n-select v-model:value="createForm.role" :options="roleOptions" />
        </n-form-item>
        <n-form-item label="对话额度">
          <n-input-number v-model:value="createForm.chat_quota_total" :min="-1" :max="1000000" :disabled="createForm.role !== 'tryuser'" class="w-full" />
        </n-form-item>
        <n-form-item label="启用">
          <n-switch v-model:value="createForm.is_active" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreate = false">取消</n-button>
          <n-button type="primary" :loading="savingCreate" @click="submitCreate">创建</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showEdit" preset="card" title="编辑用户" style="width: 560px">
      <n-form :model="editForm" label-placement="left" label-width="92">
        <n-form-item label="账号">
          <n-input :value="editForm.username" disabled />
        </n-form-item>
        <n-form-item label="显示名">
          <n-input v-model:value="editForm.display_name" />
        </n-form-item>
        <n-form-item label="新密码">
          <n-input v-model:value="editForm.password" type="password" show-password-on="click" placeholder="留空则不改密码" />
        </n-form-item>
        <n-form-item label="角色">
          <n-select v-model:value="editForm.role" :options="roleOptions" />
        </n-form-item>
        <n-form-item label="总额度">
          <n-input-number v-model:value="editForm.chat_quota_total" :min="-1" :max="1000000" :disabled="editForm.role !== 'tryuser'" class="w-full" />
        </n-form-item>
        <n-form-item label="已使用">
          <n-input-number v-model:value="editForm.chat_quota_used" :min="0" :max="1000000" :disabled="editForm.role !== 'tryuser'" class="w-full" />
        </n-form-item>
        <n-form-item label="启用">
          <n-switch v-model:value="editForm.is_active" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEdit = false">取消</n-button>
          <n-button type="primary" :loading="savingEdit" @click="submitEdit">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NAlert, NButton, NCard, NDataTable, NForm, NFormItem, NInput, NInputNumber, NModal, NSelect, NSpace, NSwitch, NTag, useMessage, type DataTableColumns } from 'naive-ui'
import { createAdminUserApi, listAdminUsersApi, updateAdminUserApi } from '@/api/admin-users'
import type { AuthUserProfile, UserRole } from '@/api/types'
import { useAuthStore } from '@/stores/modules/useAuthStore'

const message = useMessage()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const users = ref<AuthUserProfile[]>([])

const showCreate = ref(false)
const savingCreate = ref(false)
const createForm = reactive({
  username: '',
  display_name: '',
  password: '',
  role: 'tryuser' as UserRole,
  chat_quota_total: 10 as number | null,
  is_active: true,
})

const showEdit = ref(false)
const savingEdit = ref(false)
const editingUserId = ref<number>(0)
const editForm = reactive({
  username: '',
  display_name: '',
  password: '',
  role: 'tryuser' as UserRole,
  chat_quota_total: 10 as number | null,
  chat_quota_used: 0 as number | null,
  is_active: true,
})

const roleOptions = [
  { label: '管理员（admin）', value: 'admin' },
  { label: '正式用户（user）', value: 'user' },
  { label: '试用用户（tryuser）', value: 'tryuser' },
]

const isAdmin = computed(() => String(authStore.user?.role || '') === 'admin')

const columns = computed<DataTableColumns<AuthUserProfile>>(() => [
  { title: 'ID', key: 'id', width: 180 },
  { title: '账号', key: 'username', width: 140 },
  { title: '显示名', key: 'display_name', width: 140 },
  {
    title: '角色',
    key: 'role',
    width: 120,
    render: (row) => h(NTag, { type: row.role === 'admin' ? 'error' : (row.role === 'user' ? 'success' : 'warning'), size: 'small' }, { default: () => row.role }),
  },
  {
    title: '状态',
    key: 'is_active',
    width: 90,
    render: (row) => h(NTag, { type: row.is_active ? 'success' : 'default', size: 'small' }, { default: () => row.is_active ? '启用' : '禁用' }),
  },
  {
    title: '额度',
    key: 'quota',
    width: 190,
    render: (row) => {
      if (row.chat_quota_total < 0) return '无限'
      return `${row.chat_quota_used}/${row.chat_quota_total}（剩余 ${row.chat_quota_remaining}）`
    },
  },
  { title: '创建时间', key: 'created_at', width: 180 },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render: (row) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'tiny', secondary: true, onClick: () => openEdit(row) }, { default: () => '编辑' }),
      h(NButton, {
        size: 'tiny',
        type: row.is_active ? 'warning' : 'success',
        onClick: () => toggleActive(row),
      }, { default: () => (row.is_active ? '封禁' : '解封') }),
    ]),
  },
])

function resetCreateForm() {
  createForm.username = ''
  createForm.display_name = ''
  createForm.password = ''
  createForm.role = 'tryuser'
  createForm.chat_quota_total = 10
  createForm.is_active = true
}

function openCreate() {
  resetCreateForm()
  showCreate.value = true
}

function openEdit(row: AuthUserProfile) {
  editingUserId.value = Number(row.id)
  editForm.username = String(row.username || '')
  editForm.display_name = String(row.display_name || '')
  editForm.password = ''
  editForm.role = row.role
  editForm.chat_quota_total = row.chat_quota_total
  editForm.chat_quota_used = row.chat_quota_used
  editForm.is_active = Boolean(row.is_active)
  showEdit.value = true
}

async function refreshUsers() {
  if (!isAdmin.value) return
  loading.value = true
  try {
    const res = await listAdminUsersApi(500)
    users.value = Array.isArray(res.items) ? res.items : []
  } catch (e: any) {
    message.error(e?.message || '加载用户列表失败')
  } finally {
    loading.value = false
  }
}

async function submitCreate() {
  if (!createForm.username.trim() || !createForm.password) {
    message.warning('请填写账号和密码')
    return
  }
  savingCreate.value = true
  try {
    const payload = {
      username: createForm.username.trim(),
      display_name: createForm.display_name.trim(),
      password: createForm.password,
      role: createForm.role,
      chat_quota_total: createForm.role === 'tryuser' ? Number(createForm.chat_quota_total ?? 10) : -1,
      is_active: Boolean(createForm.is_active),
    }
    await createAdminUserApi(payload)
    message.success('用户创建成功')
    showCreate.value = false
    await refreshUsers()
  } catch (e: any) {
    message.error(e?.message || '创建用户失败')
  } finally {
    savingCreate.value = false
  }
}

async function submitEdit() {
  if (!editingUserId.value) return
  savingEdit.value = true
  try {
    const payload: Record<string, any> = {
      display_name: editForm.display_name.trim(),
      role: editForm.role,
      chat_quota_total: editForm.role === 'tryuser' ? Number(editForm.chat_quota_total ?? 10) : -1,
      chat_quota_used: editForm.role === 'tryuser' ? Number(editForm.chat_quota_used ?? 0) : 0,
      is_active: Boolean(editForm.is_active),
    }
    if (editForm.password.trim()) payload.password = editForm.password
    await updateAdminUserApi(editingUserId.value, payload)
    message.success('用户更新成功')
    showEdit.value = false
    await refreshUsers()
  } catch (e: any) {
    message.error(e?.message || '更新用户失败')
  } finally {
    savingEdit.value = false
  }
}

async function toggleActive(row: AuthUserProfile) {
  try {
    await updateAdminUserApi(Number(row.id), { is_active: !Boolean(row.is_active) })
    message.success(Boolean(row.is_active) ? '已封禁' : '已解封')
    await refreshUsers()
  } catch (e: any) {
    message.error(e?.message || '操作失败')
  }
}

onMounted(async () => {
  try {
    await authStore.fetchMe()
  } catch {
    // ignore
  }
  if (!isAdmin.value) {
    message.error('仅管理员可访问用户管理')
    router.replace('/home')
    return
  }
  await refreshUsers()
})
</script>
