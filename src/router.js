import { createRouter, createWebHistory } from 'vue-router'
import EditorView from '~/views/EditorView.vue'
import { ensureAuth, authState } from '~/core/auth.js'

// エディタ以外はめったに開かないため遅延ロードしてメインバンドルから切り離す。
// /admin は認証＋共通ヘッダーの「シェル」。中身は子ルートに分離し、機能追加はここに足す。
//   /admin         → AdminHome（管理トップのメニュー）
//   /admin/lessons → LessonAdmin（レッスン管理）
const routes = [
  { path: '/', name: 'editor', component: EditorView },
  // レッスン選択。閲覧はログイン不要（レッスンは全員向け）なので beforeEnter は置かない。
  { path: '/lessons', name: 'lessons', component: () => import('./views/LessonsView.vue') },
  // 公開ギャラリー。閲覧はログイン不要（RLS が公開行だけ見せる）ため beforeEnter は置かない。
  { path: '/gallery', name: 'gallery', component: () => import('./views/GalleryView.vue') },
  // 利用規約。公開時の同意対象で、閲覧はログイン不要。
  { path: '/terms', name: 'terms', component: () => import('./views/TermsView.vue') },
  {
    path: '/mypage',
    name: 'mypage',
    component: () => import('./views/MyPageView.vue'),
    // 未ログイン（と Supabase 未設定）ならエディタへ戻す。作品は本人しか見られないため
    beforeEnter: async () => {
      await ensureAuth()
      return authState.user ? true : '/'
    },
  },
  {
    path: '/admin',
    component: () => import('./views/AdminView.vue'),
    children: [
      { path: '', name: 'admin', component: () => import('./views/AdminHome.vue') },
      { path: 'lessons', name: 'admin-lessons', component: () => import('./views/LessonAdmin.vue') },
    ],
  },
  // 未知のパスはエディタへ
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
