// 管理者の独自認証（admins テーブル）と、レッスン／お題画像の書き込みを担う Edge Function。
// クライアントは anon キーしか持たないため、書き込みは全てここ（service_role）を通す。
// 認証: admin_sessions のトークンを `x-admin-token` ヘッダで受け取る（login/logout 以外は必須）。
// DB にはトークンの sha256 ハッシュだけを保存するので、受け取った生トークンは毎回ハッシュして照合する。
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY は Supabase ランタイムが自動注入する。
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const url = Deno.env.get("SUPABASE_URL")!
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const BUCKET = "lesson-refs"

// CORS 許可オリジン: 環境変数 ALLOWED_ORIGINS（カンマ区切り）に載る Origin だけを許可し、
// 一致した時だけそのオリジンをエコーする（`*` は使わない）。未設定時はローカル開発オリジンのみ
// 許可する（本番は `supabase secrets set ALLOWED_ORIGINS=...` で設定する）。
const DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
const ALLOWED_ORIGINS = (() => {
  const set = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean)
  return set.length ? set : DEV_ORIGINS
})()

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-admin-token",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  }
  // 許可リストに無いオリジンには ACAO を付けない（ブラウザ側でブロックされる）。
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin
  }
  return h
}

// ログイン試行元の IP。Supabase のゲートウェイが x-forwarded-for に載せる先頭を採用する。
function clientIp(req: Request): string {
  const xff = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim()
  return xff || (req.headers.get("x-real-ip") ?? "").trim()
}

// DB に保存したハッシュ（pg: encode(digest(token,'sha256'),'hex')）と一致させる
async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"))

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    })

  // DB／内部エラーは詳細をサーバーログにだけ残し、クライアントには汎用文言を返す
  // （Postgres/PostgREST の内部情報をブラウザへ漏らさない）。
  const fail = (where: string, detail: unknown, status = 400) => {
    console.error(`[admin] ${where}:`, (detail as Error)?.message ?? detail)
    return json({ error: "処理に失敗しました。時間をおいて再度お試しください。" }, status)
  }

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

    const db = createClient(url, serviceKey, { auth: { persistSession: false } })

    let body: any
    try { body = await req.json() } catch { return json({ error: "Invalid JSON" }, 400) }
    const action = body?.action as string

    // ── login はトークン不要。IP 単位のスロットリングは admin_login（DB）が判定する ──
    if (action === "login") {
      const { login_id, password } = body
      if (!login_id || !password) return json({ error: "ログインIDとパスワードを入力してください。" }, 400)
      const { data, error } = await db.rpc("admin_login", {
        p_login_id: login_id, p_password: password, p_ip: clientIp(req),
      })
      if (error) return fail("login", error, 500)
      if (data?.status === "ok") return json({ token: data.token })
      if (data?.status === "locked") {
        // 試行回数超過（バックオフ待ち or ハードロック）。Retry-After 秒を添えて 429。
        const retry = Math.max(1, Number(data.retry_after) || 60)
        return new Response(
          JSON.stringify({ error: `試行回数が多すぎます。${retry} 秒ほど待って再度お試しください。` }),
          { status: 429, headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(retry) } },
        )
      }
      return json({ error: "ログインIDかパスワードが違います。" }, 401)
    }

    // ── 以降はトークン必須。DB はハッシュ保存なので照合はハッシュで行う ──
    const token = (req.headers.get("x-admin-token") ?? "").trim()
    if (!token) return json({ error: "認証が必要です。" }, 401)
    const tokenHash = await sha256hex(token)

    if (action === "logout") {
      await db.from("admin_sessions").delete().eq("token", tokenHash)
      return json({ ok: true })
    }

    // トークン → セッション検証
    const { data: sess } = await db
      .from("admin_sessions")
      .select("admin_id, expires_at")
      .eq("token", tokenHash)
      .maybeSingle()
    if (!sess || new Date(sess.expires_at) <= new Date()) {
      return json({ error: "セッションが無効です。再ログインしてください。" }, 401)
    }
    // 発行元の管理者が論理削除されていないか確認する。
    // 論理削除（deleted_at）は行削除ではないため FK の on delete cascade が効かず、
    // ここで弾かないと失効まで（最大7日）トークンが有効なままになる。
    const { data: admin } = await db
      .from("admins")
      .select("id")
      .eq("id", sess.admin_id)
      .is("deleted_at", null)
      .maybeSingle()
    if (!admin) {
      return json({ error: "セッションが無効です。再ログインしてください。" }, 401)
    }

    switch (action) {
      case "me":
        return json({ ok: true })

      case "saveLesson": {
        const l = body.lesson ?? {}
        const row = {
          level: l.level, title: l.title, description: l.desc,
          size: l.size, palette: l.palette, ref: l.ref,
        }
        if (l.id) {
          const { data, error } = await db.from("lessons")
            .update({ ...row, updated_at: new Date().toISOString() })
            .eq("id", l.id).select().single()
          if (error) return fail("saveLesson.update", error)
          return json({ lesson: data })
        }
        // 新規は末尾に追加（未削除の最大 sort_order + 1、無ければ 1）
        const { data: maxRows } = await db.from("lessons")
          .select("sort_order").is("deleted_at", null)
          .order("sort_order", { ascending: false }).limit(1)
        const nextOrder = maxRows && maxRows.length ? maxRows[0].sort_order + 1 : 1
        const { data, error } = await db.from("lessons")
          .insert({ ...row, sort_order: nextOrder }).select().single()
        if (error) return fail("saveLesson.insert", error)
        return json({ lesson: data })
      }

      case "deleteLesson": {
        const { error } = await db.from("lessons")
          .update({ deleted_at: new Date().toISOString() }).eq("id", body.id)
        if (error) return fail("deleteLesson", error)
        return json({ ok: true })
      }

      case "reorderLessons": {
        const { error } = await db.rpc("reorder_lessons", { ids: body.ids })
        if (error) return fail("reorderLessons", error)
        return json({ ok: true })
      }

      case "createUploadUrl": {
        // 署名付きアップロードURLをユニークなパスに発行する（クライアントが直接 PUT する）。
        // レスポンスから path と token を受け取り、公開URLはクライアント側で組み立てる。（SUPABASE_URL はコンテナ間の内部ホストで、ローカルではブラウザから届かないため。）
        const ext = String(body.ext ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png"
        const path = `${crypto.randomUUID()}.${ext}`
        const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path)
        if (error) return fail("createUploadUrl", error)
        return json({ path, uploadToken: data.token })
      }

      case "deleteImage": {
        // 公開URLからバケット内パスを割り出して削除（クリーンアップ用途・失敗は無視）
        const marker = `/object/public/${BUCKET}/`
        const i = String(body.url ?? "").indexOf(marker)
        if (i === -1) return json({ ok: true })
        const path = String(body.url).slice(i + marker.length)
        // createUploadUrl が発行するのは常に単一階層の `uuid.ext`。
        // その形以外（サブパス・パストラバーサル等）は掃除対象外として無視し、削除範囲を限定する。
        if (/^[a-z0-9-]+\.[a-z0-9]+$/i.test(path)) await db.storage.from(BUCKET).remove([path])
        return json({ ok: true })
      }

      default:
        return json({ error: `unknown action: ${action}` }, 400)
    }
  } catch (e) {
    // 想定外の例外でも CORS 付き JSON で返す（クライアントが原因不明の CORS エラーにならないように）。
    // 詳細はサーバーログにだけ残し、クライアントには汎用文言を返す。
    return fail("unhandled", e, 500)
  }
})
