import http from "node:http";
import net from "node:net";

const PROXY_PORT = Number.parseInt(process.env.PROXY_PORT ?? "8080", 10);
const WEB_PORT = Number.parseInt(process.env.WEB_PORT ?? "3000", 10);
const SERVER_PORT = Number.parseInt(process.env.SERVER_PORT ?? "4000", 10);
const HOST = process.env.PROXY_HOST ?? "127.0.0.1";

function pickTarget(url = "/") {
  const parsed = new URL(url, "http://localhost");

  if (parsed.pathname === "/api" || parsed.pathname.startsWith("/api/")) {
    const rewrittenPath = `${parsed.pathname.replace(/^\/api(?=\/|$)/, "") || "/"}${parsed.search}`;
    return { port: SERVER_PORT, path: rewrittenPath, label: "server" };
  }

  if (parsed.pathname.startsWith("/socket.io")) {
    return { port: SERVER_PORT, path: `${parsed.pathname}${parsed.search}`, label: "socket" };
  }

  return { port: WEB_PORT, path: `${parsed.pathname}${parsed.search}`, label: "web" };
}

function isBenignProxyError(error) {
  return Boolean(error && ["ECONNRESET", "ECONNABORTED", "EPIPE"].includes(error.code));
}

function logProxyError(prefix, error) {
  if (isBenignProxyError(error)) {
    console.warn(`[proxy] ${prefix}: ${error.code}`);
    return;
  }

  console.error(`[proxy] ${prefix}:`, error);
}

function attachSocketErrorHandlers(label, socket) {
  socket.on("error", (error) => {
    logProxyError(`${label} socket error`, error);
  });
}

function safeDestroy(stream) {
  if (stream && !stream.destroyed) {
    stream.destroy();
  }
}

const server = http.createServer((req, res) => {
  const target = pickTarget(req.url);

  const headers = {
    ...req.headers,
    host: `${HOST}:${target.port}`,
    "x-forwarded-host": req.headers.host ?? `localhost:${PROXY_PORT}`,
    "x-forwarded-proto": "http"
  };

  const options = {
    host: HOST,
    port: target.port,
    method: req.method,
    path: target.path,
    headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    if (!res.headersSent && !res.destroyed) {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
    }

    proxyRes.on("error", (error) => {
      logProxyError(`${target.label} upstream response reset`, error);
      safeDestroy(res);
    });

    res.on("close", () => {
      safeDestroy(proxyRes);
    });

    proxyRes.pipe(res);
  });

  proxyReq.on("error", (error) => {
    logProxyError(`${target.label} upstream request failed`, error);

    if (!res.headersSent && !res.destroyed) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      res.end("Proxy upstream error");
      return;
    }

    safeDestroy(res);
  });

  req.on("error", (error) => {
    logProxyError("client request reset", error);
    safeDestroy(proxyReq);
  });

  res.on("error", (error) => {
    logProxyError("client response reset", error);
    safeDestroy(proxyReq);
  });

  req.on("aborted", () => {
    safeDestroy(proxyReq);
  });

  req.pipe(proxyReq);
});

server.on("upgrade", (req, socket, head) => {
  const target = pickTarget(req.url);

  attachSocketErrorHandlers("client upgrade", socket);

  if (target.label !== "socket") {
    socket.destroy();
    return;
  }

  const upstream = net.connect(target.port, HOST, () => {
    const lines = [`${req.method} ${target.path} HTTP/${req.httpVersion}`];

    for (const [name, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          lines.push(`${name}: ${item}`);
        }
      } else if (value !== undefined) {
        lines.push(`${name}: ${value}`);
      }
    }

    lines.push("", "");
    upstream.write(lines.join("\r\n"));

    if (head.length > 0) {
      upstream.write(head);
    }

    upstream.pipe(socket);
    socket.pipe(upstream);
  });

  attachSocketErrorHandlers("upstream upgrade", upstream);

  upstream.on("error", (error) => {
    logProxyError(`${target.label} upgrade upstream failed`, error);
    safeDestroy(socket);
  });

  socket.on("close", () => {
    safeDestroy(upstream);
  });

  upstream.on("close", () => {
    safeDestroy(socket);
  });
});

server.on("clientError", (error, socket) => {
  logProxyError("client protocol error", error);

  if (!socket.destroyed) {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  }
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(`Port ${PROXY_PORT} is already in use.`);
    console.error("Close the old process or run the launcher again so it can clean stale ports.");
    console.error(`Manual fix: netstat -ano | findstr :${PROXY_PORT}`);
    process.exit(1);
  }

  console.error("Proxy failed:", error);
  process.exit(1);
});

server.listen(PROXY_PORT, HOST, () => {
  console.log(`Tabletop local proxy listening at http://localhost:${PROXY_PORT}`);
  console.log(`  /              -> http://${HOST}:${WEB_PORT}`);
  console.log(`  /api           -> http://${HOST}:${SERVER_PORT}`);
  console.log(`  /socket.io     -> http://${HOST}:${SERVER_PORT}`);
});