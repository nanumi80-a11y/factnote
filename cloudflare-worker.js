// Tavily 중계용 Cloudflare Worker (선택)
// - 브라우저가 Tavily를 직접 부를 수 없어서(CORS), 요청을 대신 전달만 합니다.
// - 키는 저장하지 않습니다. 화면이 보낸 Authorization 헤더를 그대로 Tavily에 넘깁니다.
// - 배포 후 나온 주소(예: https://factnote-relay.내계정.workers.dev)를 팩트노트 '설정'의 '중계 주소'에 적으세요.
//
// 허용한 곳(팩트노트를 여는 주소)에서 온 요청만 받습니다.
// Origin이 없거나 목록에 없으면 403으로 막으므로, 주소를 아는 사람이 curl로 남의 Worker를
// 끌어다 쓰는 일은 막힙니다. 팩트노트를 다른 주소에 올리면 아래 ALLOWED_ORIGINS에 그 주소를 더하세요.
const ALLOWED_ORIGINS = new Set([
  "https://nanumi80-a11y.github.io",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
]);

const ROUTES = {
  "/tavily": "https://api.tavily.com/search",
  "/tavily-extract": "https://api.tavily.com/extract",
};

// 허용한 Origin에만 붙는 CORS 헤더 (Vary: Origin으로 캐시가 다른 Origin에 재사용되지 않게 한다)
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export default {
  async fetch(req) {
    const origin = req.headers.get("Origin") || "";
    if (!ALLOWED_ORIGINS.has(origin)) {
      return new Response("forbidden origin", {
        status: 403,
        headers: { "Content-Type": "text/plain; charset=utf-8", Vary: "Origin" },
      });
    }
    const CORS = corsHeaders(origin);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    const target = ROUTES[new URL(req.url).pathname];
    if (req.method !== "POST" || !target) return new Response("not found", { status: 404, headers: CORS });

    try {
      const r = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") || "" },
        body: await req.text(),
      });
      return new Response(await r.text(), {
        status: r.status,
        headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ detail: { error: "Tavily 연결 실패: " + e.message } }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
  },
};
