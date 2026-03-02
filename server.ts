import { SimulationEngine } from "./lib/simulation/SimulationEngine";
import type { IncomingWSMessage, OutgoingWSMessage } from "./lib/types";

const modeArg = Bun.argv[2] ?? "dev";
const nextMode = modeArg === "prod" ? "start" : "dev";
const nextPort = Number(Bun.env.NEXT_PORT ?? 3000);
const wsPort = Number(Bun.env.SIM_PORT ?? 3001);

const simulation = new SimulationEngine();

const nextProcess = Bun.spawn([
  "bunx",
  "--bun",
  "next",
  nextMode,
  "-p",
  String(nextPort)
], {
  stdio: ["inherit", "inherit", "inherit"],
  env: {
    ...Bun.env,
    NEXT_PUBLIC_SIM_SERVER: `ws://localhost:${wsPort}/ws`,
    NEXT_PUBLIC_SIM_HTTP: `http://localhost:${wsPort}`
  }
});

const server = Bun.serve<{ subscribed: boolean }>({
  port: wsPort,
  async fetch(req, srv) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === "/ws") {
      const upgraded = srv.upgrade(req, {
        data: { subscribed: true }
      });
      if (upgraded) {
        return;
      }
      return withCors(new Response("WebSocket upgrade failed", { status: 400 }));
    }

    if (url.pathname === "/api/rfid-scan" && req.method === "POST") {
      try {
        const body = (await req.json()) as { uid?: string; zone?: string; secondUid?: string };
        const uid = String(body.uid ?? "UID_1193");
        const zone = String(body.zone ?? "MAIN_ENTRANCE");
        const secondUid = body.secondUid ? String(body.secondUid) : undefined;
        simulation.scanRFID(uid, zone, secondUid);
        return withCors(Response.json({ ok: true, state: simulation.getState() }));
      } catch {
        return withCors(new Response("Invalid JSON payload", { status: 400 }));
      }
    }

    if (url.pathname === "/health") {
      return withCors(Response.json({ status: "ok", wsPort, nextPort }));
    }

    return withCors(new Response("Not Found", { status: 404 }));
  },
  websocket: {
    open(ws) {
      ws.subscribe("sim");
      const payload: OutgoingWSMessage = {
        type: "state",
        payload: simulation.getState()
      };
      ws.send(JSON.stringify(payload));
    },
    message(ws, message) {
      try {
        const parsed = JSON.parse(String(message)) as IncomingWSMessage;
        simulation.processMessage(parsed);
        const ack: OutgoingWSMessage = { type: "ack", payload: { message: "accepted" } };
        ws.send(JSON.stringify(ack));
      } catch {
        const err: OutgoingWSMessage = { type: "error", payload: { message: "invalid_message" } };
        ws.send(JSON.stringify(err));
      }
    }
  }
});

const timer = setInterval(() => {
  const state = simulation.tick(1);
  const payload: OutgoingWSMessage = {
    type: "state",
    payload: state
  };
  server.publish("sim", JSON.stringify(payload));
}, 1000);

const shutdown = async () => {
  clearInterval(timer);
  server.stop(true);
  nextProcess.kill();
  await nextProcess.exited;
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`Simulation WebSocket server running at ws://localhost:${wsPort}/ws`);
console.log(`RFID endpoint available at http://localhost:${wsPort}/api/rfid-scan`);

function withCors(response: Response): Response {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}