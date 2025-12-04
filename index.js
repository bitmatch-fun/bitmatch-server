// colyseus-server/index.js
import { Server, matchMaker } from "colyseus";
import { uWebSocketsTransport } from "@colyseus/uwebsockets-transport";
import { FpsRoom } from "./rooms/fps-room.js";

const PORT = Number(process.env.PORT || 2567);

// ✅ FIX: Add your live domains here
const ALLOWED = new Set([
  "http://localhost:3000",
  "https://www.bitmatch.fun",
  "https://bitmatch.fun"
]);

function pickOrigin(req) {
  const fromNode = req?.headers?.origin;
  const fromUws  = req?.getHeader?.("origin");
  const origin = fromNode || fromUws || "";
  
  // Checks if origin is in our ALLOWED list, otherwise defaults to localhost
  return ALLOWED.has(origin) ? origin : "http://localhost:3000";
}

// ✅ Only reflect ONE origin for matchmaker endpoints
matchMaker.controller.getCorsHeaders = function (req) {
  const allow = pickOrigin(req);
  return {
    "Access-Control-Allow-Origin": allow,
    "Vary": "Origin",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  };
};

const gameServer = new Server({
  transport: new uWebSocketsTransport({}),
});

gameServer.define("fps", FpsRoom);

const app = gameServer.transport.app;

// ✅ Preflight: reflect the SAME origin
app.options("/*", (res, req) => {
  const allow = pickOrigin(req);
  res.writeHeader("Access-Control-Allow-Origin", allow);
  res.writeHeader("Vary", "Origin");
  res.writeHeader("Access-Control-Allow-Credentials", "true");
  res.writeHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.writeHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.writeStatus("204 No Content");
  res.end();
});

// (optional) Healthcheck — also reflect SAME origin
app.get("/", (res, req) => {
  const allow = pickOrigin(req);
  res.writeHeader("Access-Control-Allow-Origin", allow);
  res.writeHeader("Vary", "Origin");
  res.writeHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Colyseus (uWebSockets) is up!");
});

gameServer.listen(PORT).then(() => {
  console.log(`✅ Colyseus (uWS) listening on ws://0.0.0.0:${PORT}`);
});