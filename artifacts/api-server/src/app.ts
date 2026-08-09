import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

app.use("/api", router);

// The Render service starts the API server as the single public process.
// Serve the built Telegram Web client from the same process so "/" is a
// working application URL instead of an API-only 404.
const frontendDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../app/dist/public",
);
const frontendIndex = path.join(frontendDist, "index.html");

app.use(express.static(frontendDist, { index: false }));
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  return res.sendFile(frontendIndex, (error) => {
    if (error) next(error);
  });
});

export default app;
