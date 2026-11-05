// 팩트체크 도구용 작은 로컬 중계 서버 (설치할 것 없음: Node.js만 있으면 됩니다)
// - index.html 을 http://localhost:8787 에서 보여 주고
// - /tavily 로 들어온 요청을 Tavily 로 그대로 전달합니다. (브라우저의 CORS 차단을 피하기 위함)
// - 키는 파일에 저장하지 않습니다. 화면이 보낸 Authorization 헤더를 그대로 전달만 합니다.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8787;
const HOST = "127.0.0.1"; // 이 컴퓨터에서만 접속 가능
const ROUTES = { "/tavily": "https://api.tavily.com/search", "/tavily-extract": "https://api.tavily.com/extract" };

const server = http.createServer(async (req, res) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Private-Network": "true",
  };

  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }

  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    try {
      const html = fs.readFileSync(path.join(__dirname, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html);
    } catch (e) {
      res.writeHead(500); return res.end("index.html 을 읽을 수 없습니다.");
    }
  }

  const target = ROUTES[req.url];
  if (req.method === "POST" && target) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    try {
      const r = await fetch(target, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": req.headers["authorization"] || "",
        },
        body: Buffer.concat(chunks),
      });
      const text = await r.text();
      res.writeHead(r.status, { ...cors, "Content-Type": "application/json; charset=utf-8" });
      return res.end(text);
    } catch (e) {
      res.writeHead(502, { ...cors, "Content-Type": "application/json" });
      return res.end(JSON.stringify({ detail: { error: "Tavily 연결 실패: " + e.message } }));
    }
  }

  res.writeHead(404); res.end("not found");
});

server.listen(PORT, HOST, () => {
  console.log("팩트체크 도구 실행 중:  http://localhost:" + PORT);
  console.log("끝내려면 이 창에서 Ctrl+C 를 누르세요.");
});
