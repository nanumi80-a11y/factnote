// Tavily 중계용 Cloudflare Worker (선택)
// - 브라우저가 Tavily를 직접 부를 수 없어서(CORS), 요청을 대신 전달만 합니다.
// - 키는 저장하지 않습니다. 화면이 보낸 Authorization 헤더를 그대로 Tavily에 넘깁니다.
// - 배포 후 나온 주소(예: https://factnote-relay.내계정.workers.dev)를 팩트노트 '설정'의 '중계 주소'에 적으세요.
const ROUTES = {
  "/tavily": "https://api.tavily.com/search",
  "/tavily-extract": "https://api.tavily.com/extract",
};
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

export default {
  async fetch(req) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const target = ROUTES[new URL(req.url).pathname];
    if (req.method !== "POST" || !target) return new Response("not found", { status: 404, headers: CORS });
    try {
      const r = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") || "" },
        body: await req.text(),
      });
      return new Response(await r.text(), { status: r.status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
    } catch (e) {
      return new Response(JSON.stringify({ detail: { error: "Tavily 연결 실패: " + e.message } }), { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  },
};
