# CLAUDE.md

このファイルは、リポジトリ内のコードを扱う Claude Code (claude.ai/code) への案内です。

## コマンド

```bash
npm run dev      # 開発サーバー起動 (Vite HMR)
npm run build    # プロダクションビルド → dist/
npm run preview  # ビルド結果のプレビュー
```

## プロジェクト概要

**DOTWORKS** — デザイン経験のないゲーム開発者向けのドット絵エディタ。選択肢を絞り、陰影・縁取り・ディザリングを自動化することで初心者でも完成度の高いスプライトを作れるようにする。

技術スタック: **Vite + Vue 3 (Composition API / `<script setup>`)** + Vanilla JS コアモジュール。

## ファイル構成

```
src/
  main.js          ← Vue アプリのエントリーポイント
  App.vue          ← ルートコンポーネント。キーボードショートカット管理
  style.css        ← グローバルスタイル（CSS 変数・全コンポーネント共通）
  core/
    state.js       ← reactive(S)：アプリの唯一の状態
    palette.js     ← PAL定数、hexToHsl/hslToHex、generateLamp、extractPaletteFromImage、imageToPixels
    canvas.js      ← initContexts、resize、resetCanvas、zoomCanvas、drawBg/drawPx/drawGrid
    tools.js       ← idx、inB、setPx、bres、floodFill、applyDraw、autoOutline/removeOutline
    history.js     ← saveUndo、undo、redo、clearAll（描画呼び出しは含まない）
    export.js      ← exportPNG（16倍スケール・背景透過）
    ui.js          ← reactive({hoverPos, guidePageOpen, cropOpen})：UI固有の揮発性状態
  components/
    TheHeader.vue      ← ロゴ、サイズ選択、アクション群
    TheToolbar.vue     ← ツールボタン縦並び＋対称トグル
    TheCanvas.vue      ← 3層キャンバス、マウスイベント、canvas.js 初期化
    TheSidebar.vue     ← 各パネルのコンテナ
    TheStatusBar.vue   ← カーソル位置、ツール名、ズーム操作
    SidePanel.vue      ← 再利用可能なサイドバーセクション（title + tooltip + slot）
    GuidePage.vue      ← 全画面ガイドオーバーレイ（v-html + IntersectionObserver）
    ImageImportModal.vue ← 画像→ドット変換のクロップオーバーレイ（比率固定の枠を移動／リサイズ）
    panels/
      ColorPanel.vue     ← 現在色 + シャドウランプ（まとめてひとつのコンポーネント）
      PalettePanel.vue   ← パレット選択 + スウォッチグリッド
      EnhancePanel.vue   ← Auto Outline / Remove Outline
      GuidesPanel.vue    ← 頭身スライダー、中心線、カスタム補助線
      BackgroundPanel.vue ← キャンバス背景色（透過チェッカー／プリセット／カスタム。書き出し非対象。追加カスタム色は localStorage `dotworks.bgColors` に永続、選択状態 S.bg は非永続）
      RefImagePanel.vue  ← 参照画像（ドロップゾーン・オーバーレイ・パレット抽出・ドット変換）
```

## アーキテクチャ

### 状態管理（state.js）

`S = reactive({...})` がアプリ唯一の状態ソース。Vue の Proxy ベース reactivity で動作するため、`S.pixels[i] = color` 等のインデックス代入もトラッキングされる。ただしピクセル配列の変更を watch することはパフォーマンス上避けており、代わりにツール関数が直接 `drawPx()` を呼ぶ。

キャンバスの初期サイズは **16×16**。サイズを変更すると `resetCanvas()` が `saveDefaultSize()` で localStorage（キー `dotworks.canvasSize`）に保存し、次回起動時の既定値として復元する。`SIZES` 配列は `TheHeader` の SIZE セレクト選択肢と一致させること。

`ui.js` は `hoverPos`（カーソル位置）・`guidePageOpen`（ガイドページ表示）・`cropOpen`（画像→ドット変換のクロップ表示）など、アンドゥ履歴に含める必要のない揮発性状態を持つ。これらは `S` から分離してある。

### 3層キャンバス（canvas.js）

`bgcv` → `cv` → `gridcv` の順に重なる（全て `position: absolute`）。`gridcv` が最前面でマウスイベントを受け取る。

- `bgcv`：背景レイヤー。`S.bg` が null なら透過チェッカー、色指定なら単色。表示専用で `exportPNG()` は参照しない。`S.bg` 変更時に `TheCanvas.vue` が watch して再描画
- `cv`：参照画像オーバーレイ（底面）＋ピクセルデータ（前面）
- `gridcv`：グリッド線・補助線（書き出し非対象）

コンテキスト（`bgX/pxX/gX`）はモジュールレベル変数に保持し、`TheCanvas.vue` の `onMounted` で `initContexts()` を呼んで初期化する。

### ツール操作フロー（tools.js / history.js）

```
マウスダウン（TheCanvas.vue）
  └─ tool = button===2 ? S.toolR : S.toolL  ← 押したボタンでツール決定
  └─ saveUndo()             ← ストローク開始前に1回だけ保存
  └─ applyDraw(x, y, tool)  ← 指定ツールを1セルに適用
  └─ drawPx()               ← 呼び出し元（TheCanvas.vue）が担う

history.js の undo/redo は S.pixels のみ操作し、描画は呼び出さない。
App.vue が「undo() 成功 → drawPx()」の順で呼ぶ。
```

### 左右クリックのツール（toolL / toolR）

ツールは `S.toolL`（左ボタン）と `S.toolR`（右ボタン）の2枠を持つ。ツールバーは左クリックで `toolL`、右クリック（`contextmenu`）で `toolR` を割り当て、L/R バッジで表示する。キャンバスはマウスダウン時に押したボタンで使用ツールを決め、ストローク中は `strokeTool`（TheCanvas のモジュール変数）に保持する。キーボードショートカット（B/E/L…）は `toolL` を切り替える。右クリックのコンテキストメニューはキャンバスとツールボタンで抑制している。

### 注意点

- **ディザ＋対称のパリティ修正**：ディザツールは元ピクセルの `(x+y)%2` のパリティを鏡像側にも使う。これにより中心軸をまたいで市松パターンがズレる問題を防ぐ。
- **直線ツールのプレビュー**：`lineSnap`（ドラッグ開始時スナップショット）を毎フレーム `S.pixels` に復元してから再描画。確定は `window` の `mouseup`。終点がキャンバス外の場合は線を確定せず、`lineSnap` に戻して破棄する。
- **watch の範囲**：`S.overlay`・`S.refImg`・`S.headUnits`・`S.vDivUnits` は `TheCanvas.vue` で watch して描画を更新する。ピクセル配列は deep watch せず、ツール関数から直接 `drawPx()` を呼ぶ。
- **ズーム倍率**：`S.cell` は `zoomCanvas()` が `ZOOM_LEVELS`（`2,4,6,8,12,16,24,32` px）を1段ずつ移動する。`±` ボタンとキャンバスのホイールから共用。8px 未満は縮小プレビュー域で、`drawGrid()` が毎セルのグリッド線を隠す（補助線は残す）。

## テーマ・フォント

- 白基調テーマ。`style.css` の `:root` ブロックで CSS 変数管理。
- 面の階層: `--bg` 薄グレー `#f3f4f6`（アプリ／キャンバス領域）＞ `--bg2` 白 `#ffffff`（ヘッダー・ツールバー・サイドバー・ステータス）＞ `--bg3` `#f9fafb`（ボタン・入力）。境界線 `--border` `#e5e7eb`、本文 `--text` `#374151`、補助 `--muted` `#6b7280`
- アクセント: アンバー `--amber` `#e08a1e`（鮮やかなアンバー）、副次: ティール `--teal` `#0d9488`。アクティブ表示の淡い塗りは `--amber-soft` / `--teal-soft`、アクセント塗りボタン上の文字は `--on-accent`（白）
- フォント: **Silkscreen**（見出し・ロゴ）＋ **DM Mono**（UI）、Google Fonts から読み込み
- 補助線の色: ティール `#0d9488`（横分割）、ピンク `#f06080`（縦分割）。グリッド線・ホバー枠は白背景向けに `rgba(0,0,0,…)` で描画（`canvas.js`）。透過チェッカーは薄グレー（`drawBg` / `.bg-checker` / ステータスバー）

## ロードマップ（未実装）

1. 任意サイズのキャンバス＋大キャンバス時のパン / スクロール（タッチのピンチズーム / 2本指パン含む）
2. フレーム単位のアニメーション＋オニオンスキン
3. アンドゥ粒度の統一（ペンのストローク単位 vs. 単発操作単位）
