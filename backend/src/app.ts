import "dotenv/config";
import "./bootstrap";
import "reflect-metadata";
import "express-async-errors";

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import * as Sentry from "@sentry/node";
import bodyParser from "body-parser";
import basicAuth from "basic-auth";

import "./database";
import uploadConfig from "./config/upload";
import AppError from "./errors/AppError";
import routes from "./routes";
import logger from "./utils/logger";

// Função de middleware para autenticação básica
export const isBullAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const user = basicAuth(req);

  if (
    !user ||
    user.name !== process.env.BULL_USER ||
    user.pass !== process.env.BULL_PASS
  ) {
    res.set("WWW-Authenticate", 'Basic realm="example"');
    return res.status(401).send("Authentication required.");
  }

  next();
};

// Inicializar Sentry
Sentry.init({ dsn: process.env.SENTRY_DSN });

const app = express();

const processRole = String(process.env.PROCESS_ROLE || "all").toLowerCase();
const isWebRole = processRole === "all" || processRole === "web";

const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  }
};

const registerBullBoard = (): void => {
  if (!isWebRole) {
    return;
  }

  if (String(process.env.BULL_BOARD).toLowerCase() !== "true") {
    return;
  }

  if (!process.env.REDIS_URI_ACK) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const BullQueue = require("./libs/queue").default;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const BullBoard = require("bull-board");

  const queues = (BullQueue.queues || [])
    .map((queue: any) => queue && queue.bull)
    .filter(Boolean);

  BullBoard.setQueues(queues);

  app.use("/admin/queues", isBullAuth, BullBoard.UI);
};

// Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(compression());
app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ limit: "5mb", extended: true }));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(Sentry.Handlers.requestHandler());

app.use(
  "/public",
  express.static(uploadConfig.directory, {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    }
  })
);

// Rotas auxiliares web-only
registerBullBoard();

// Rotas
app.use(routes);

// Manipulador de erros do Sentry
app.use(Sentry.Handlers.errorHandler());

// Middleware de tratamento de erros
app.use((err: Error, req: Request, res: Response, _: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn(err);
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

export default app;