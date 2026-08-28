/* =====================================================================
   時代戦線 序戦 ── Service Worker（itch.io / Web 版のみ）
   画像アセットが0枚でビルド成果物が小さいゲームなので、
   殻（HTML・JS・CSS・マニフェスト・アイコン・書体）さえ持てば完全にオフラインで動く。
   ただし data/master.json だけは「運営が差し替える値」なので必ず網から先に取りにいく。

   Steam(Tauri)版はこのファイルを登録しない（platform/env.ts の IS_WEB で分岐）。

   VER はビルドのたびに変える必要がある。手で書き換えず、
   scripts/stamp-sw.mjs が package.json の version を流し込む。
   ===================================================================== */
const VER = "jidai-__APP_VERSION__";

// ビルド成果物のファイル名はハッシュ付きで毎回変わる。
// 列挙せず「その場で取れたものを貯める」方式にして、殻だけ固定で持つ。
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

// 書体は別オリジン。落ちても本文は明朝/ゴシックの代替に落ちるだけなので、任意扱いにする
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const c = await caches.open(VER);
      // 1つ欠けただけで install ごと失敗させない（addAll は全滅する）
      await Promise.all(SHELL.map((u) => c.add(u).catch(() => {})));
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VER).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = FONT_HOSTS.includes(url.hostname);
  if (!sameOrigin && !isFont) return;

  // マスタデータは網が先。運営が差し替えた値を古いキャッシュで塗り潰さない
  if (sameOrigin && url.pathname.endsWith("/data/master.json")) {
    e.respondWith(networkFirst(req));
    return;
  }
  e.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const hit = await caches.match(req, { ignoreSearch: false });
  if (hit) {
    // 裏で静かに更新しておく（次の起動から新しくなる）
    fetchAndPut(req).catch(() => {});
    return hit;
  }
  try {
    return await fetchAndPut(req);
  } catch (err) {
    const shell = await caches.match("./index.html");
    // 遷移要求（アドレスバーからの起動）だけは殻を返してオフラインでも立ち上げる
    if (req.mode === "navigate" && shell) return shell;
    throw err;
  }
}

async function networkFirst(req) {
  try {
    return await fetchAndPut(req);
  } catch (err) {
    const hit = await caches.match(req);
    if (hit) return hit;
    throw err;
  }
}

async function fetchAndPut(req) {
  const res = await fetch(req);
  // opaque（別オリジンの no-cors）も書体としては使えるので、そのまま持っておく
  if (res && (res.ok || res.type === "opaque")) {
    const c = await caches.open(VER);
    c.put(req, res.clone()).catch(() => {});
  }
  return res;
}
