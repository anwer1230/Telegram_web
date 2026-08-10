import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, type ChildProcess } from "node:child_process";
import "dotenv/config";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const legacyPort = Number(process.env.LEGACY_FLASK_PORT ?? 5001);
let legacyProcess: ChildProcess | undefined;

function legacyEnabled() {
  return process.env.LEGACY_FLASK_ENABLED === "true";
}

function startLegacyService() {
  if (!legacyEnabled()) return;
  if (!Number.isInteger(legacyPort) || legacyPort <= 0) {
    logger.error({ legacyPort }, "Invalid legacy Flask port");
    return;
  }

  legacyProcess = spawn(
    process.env.PYTHON_BIN ?? "python3",
    [path.join(workspaceRoot, "main.py")],
    {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        PORT: String(legacyPort),
        RENDER: process.env.RENDER ?? "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  legacyProcess.stdout?.on("data", (chunk: Buffer) => {
    logger.info({ service: "legacy-flask", output: chunk.toString().trim() });
  });
  legacyProcess.stderr?.on("data", (chunk: Buffer) => {
    logger.warn({ service: "legacy-flask", output: chunk.toString().trim() });
  });
  legacyProcess.on("error", (error) => {
    logger.error({ error }, "Legacy Flask service failed to start");
  });
  legacyProcess.on("exit", (code, signal) => {
    logger.warn({ code, signal }, "Legacy Flask service stopped");
  });
}

async function proxyLegacy(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (!legacyEnabled()) return next();
  // `req.originalUrl` keeps the public route, even when Express mounted this
  // handler under `/legacy` or `/static`. Strip only the legacy shell prefix;
  // all other Flask routes must be forwarded unchanged.
  const targetPath =
    req.originalUrl.replace(/^\/legacy(?=\/|$)/, "") || "/";
  try {
    const headers = new Headers();
    const forwardedCookie = req.headers.cookie;
    if (forwardedCookie) headers.set("cookie", forwardedCookie);
    const contentType = req.headers["content-type"];
    if (contentType) headers.set("content-type", contentType);
    const body =
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : JSON.stringify(req.body ?? {});
    const response = await fetch(`http://127.0.0.1:${legacyPort}${targetPath}`, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key !== "content-length" && key !== "transfer-encoding") {
        res.setHeader(key, value);
      }
    });
    return res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    logger.warn({ error, targetPath }, "Legacy Flask proxy unavailable");
    return res.status(503).json({ error: "LEGACY_SERVICE_UNAVAILABLE" });
  }
}

startLegacyService();

// The Render service starts the API server as the single public process.
// Serve the built Telegram Web client from the same process so "/" is a
// working application URL instead of an API-only 404.
const frontendDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../app/dist/public",
);
const frontendIndex = path.join(frontendDist, "index.html");

// Keep the mature services from the original Flask application available
// inside the unified shell. The React app opens `/legacy/` in its services
// center; its API and static assets are forwarded to the same child service.
// These handlers must run before the React SPA fallback, otherwise an old
// page is returned as index.html and Flask never receives the request.
app.use("/legacy", proxyLegacy);
app.use("/static", proxyLegacy);
app.use(
  [
    "/academic",
    "/formatter",
    "/presentation",
    "/link-finder",
    "/login",
    "/manifest.json",
    "/sw.js",
    "/geo_clear",
    "/admin",
  ],
  proxyLegacy,
);
app.use((req, res, next) => {
  if (
    (req.path === "/api" || req.path.startsWith("/api/")) &&
    req.path !== "/api/healthz" &&
    !req.path.startsWith("/api/telegram/")
  ) {
    return proxyLegacy(req, res, next);
  }
  return next();
});
app.use("/api", router);

app.use(express.static(frontendDist, { index: false }));
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  return res.sendFile(frontendIndex, (error) => {
    if (error) next(error);
  });
});

process.once("SIGTERM", () => legacyProcess?.kill("SIGTERM"));
process.once("SIGINT", () => legacyProcess?.kill("SIGINT"));

export default app;
