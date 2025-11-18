import { createApp } from 'vue'
import App from './App.vue'
import router from '@/router'
import './style.css'
import pinia from '@/stores'
import VueFilesPreview from 'vue-files-preview'
import 'vue-files-preview/lib/style.css'
createApp(App).use(pinia).use(VueFilesPreview).use(router).mount('#app')
