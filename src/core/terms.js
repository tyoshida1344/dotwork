// 利用規約の版と最終更新日。本文は TermsView.vue が持つ。
// 本文を実質的に変えたら TERMS_VERSION を上げる。版を上げると、次に作品を公開しようとした
// ユーザーへ再同意を求める（未同意の版は consentApi.hasAgreed が false を返すため）。
export const TERMS_VERSION = '1'
export const TERMS_UPDATED = '2026-07-18'
