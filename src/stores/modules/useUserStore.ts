import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    userName: '演示用户',
    personalizedSignature: '欢迎使用文档助手',
  }),
  actions: {
    cleanUserInfo() {
      this.userName = '游客'
      this.personalizedSignature = ''
    },
  },
  persist: true,
})

