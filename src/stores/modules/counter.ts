import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() {
      this.count += 1
    },
    reset() {
      this.count = 0
    },
  },
  // Enable persistence for this store (pinia-plugin-persistedstate@4.x)
  // Use `pick` instead of legacy `paths`
  persist: {
    pick: ['count'],
  },
})
