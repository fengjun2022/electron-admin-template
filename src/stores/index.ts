import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

// Create a single Pinia instance and attach persistence plugin
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// Re-export all module stores for convenient imports
export * from './modules'

export default pinia
