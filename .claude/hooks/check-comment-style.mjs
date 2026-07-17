// Claude Code PostToolUse フック。編集した .js / .vue に、レビューで繰り返し指摘される
// 2点が無いかを書いた直後に検知して差し戻す。
// 1. 行末コメントの桁揃え（コード＋2つ以上のスペース＋//）
// 2. コメント内のイシュー／PR 番号（読み手が解決できないので理由の文言にする）
// 検知したら exit 2 で stderr をモデルに返す（編集自体はブロックしない）。

import { readFileSync } from 'node:fs'

function readStdin() {
  try { return readFileSync(0, 'utf8') } catch { return '' }
}

// コメント部分だけ取り出す（// 行末・ブロック・jsdoc の継続行 *）。無ければ空。
function commentOf(line) {
  const s = line.indexOf('//')
  if (s >= 0) return line.slice(s)
  const b = line.indexOf('/*')
  if (b >= 0) return line.slice(b)
  const t = line.trimStart()
  return t.startsWith('*') ? t : ''
}

const ALIGN = /\S {2,}\/\//
// イシュー番号は #\d を狙うが、hex カラー（#0d9488 等）を巻き込まないよう直後が hex 文字なら除く。
const ISSUE = /(?:イシュー|Issue|PR)\s*#?\s*\d+|(?<![\w#])#\d{1,5}(?![0-9a-fA-F])/

let data = {}
try { data = JSON.parse(readStdin()) } catch { process.exit(0) }

const file = data?.tool_input?.file_path
if (!file || !/\.(js|vue)$/.test(file)) process.exit(0)

let src = ''
try { src = readFileSync(file, 'utf8') } catch { process.exit(0) }

const found = []
src.split(/\r?\n/).forEach((line, i) => {
  if (ALIGN.test(line)) found.push(`${file}:${i + 1} 行末コメントを桁揃えのスペースで揃えている`)
  const c = commentOf(line)
  if (c && ISSUE.test(c)) found.push(`${file}:${i + 1} コメント内にイシュー／PR 番号がある`)
})

if (found.length) {
  const shown = found.slice(0, 20)
  const more = found.length > shown.length ? `\n  …ほか ${found.length - shown.length} 件` : ''
  console.error(
    'コーディング規約チェック（要修正）:\n' + shown.map(x => '  - ' + x).join('\n') + more +
    '\n→ 桁揃えのスペースは単一スペースに、コメントのイシュー／PR 番号は理由の文言に置き換えてください。',
  )
  process.exit(2)
}
process.exit(0)
