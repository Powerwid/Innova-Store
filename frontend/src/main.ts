import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import '@/shared/styles/main.css'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import App from '@/App.vue'
import router from '@/app/router'
import vuetify from '@/app/plugins/vuetify'

const app = createApp(App)
const pinia = createPinia()

pinia.use(piniaPluginPersistedstate)
app.use(pinia)
app.use(router)
app.use(vuetify)
app.mount('#app')
