import { createRouter, createWebHistory } from 'vue-router'
import EditorView from './views/EditorView.vue'

// / = エディタ本体、/admin = レッスン管理画面（UI 上の導線は置かず直リンクのみ）。
// 管理画面はめったに開かないため遅延ロードしてメインバンドルから切り離す。
const routes = [
  { path: '/', name: 'editor', component: EditorView },
  { path: '/admin', name: 'admin', component: () => import('./views/AdminView.vue') },
  // 未知のパスはエディタへ
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
