import { Router } from "express";

const clients = new Set();

export const eventsRouter = Router();

eventsRouter.get("/", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  res.write(": connected\n\n");

  clients.add(res);
  req.on("close", () => clients.delete(res));
});

export function broadcast(resource) {
  const payload = `data: ${JSON.stringify({ resource, at: Date.now() })}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}
