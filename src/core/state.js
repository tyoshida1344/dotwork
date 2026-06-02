import { reactive } from 'vue'
import { PAL } from './palette.js'

const SIZE = 32   // デフォルトのキャンバス一辺（cols = rows）

export const S = reactive({
  cols: SIZE,
  rows: SIZE,
  cell: 16,
  pixels: new Array(SIZE * SIZE).fill(null),
  tool: 'pencil',
  color: '#f0a030',
  sym: false,
  palette: [...PAL.pico8],
  headUnits: 0,
  vDivUnits: 0,
  refImg: null,
  overlay: 0.30,
  outlineColor: '#000000',
})
// アンドゥ履歴は history.js でモジュールレベルの素の配列として保持する
// （reactive(S) 下に大量のピクセルスナップショットを置く無駄を避けるため）
