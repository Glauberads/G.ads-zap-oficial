import { Server as SocketIO, Socket } from "socket.io";
import { Server } from "http";
import AppError from "../errors/AppError";
import logger from "../utils/logger";
import { instrument } from "@socket.io/admin-ui";
import User from "../models/User";
import { ReceibedWhatsAppService } from "../services/WhatsAppOficial/ReceivedWhatsApp";
import { JwtPayload, verify, decode } from "jsonwebtoken";
import authConfig from "../config/auth";
import BirthdayService from "../services/BirthdayService/BirthdayService";

let io: SocketIO | null = null;
let socketEmitter: any = null;
const heartbeatTimeouts = new Map<string, NodeJS.Timeout>();

const parseBoolean = (value: any): boolean => {
  if (typeof value === "boolean") return value;
  return String(value || "").toLowerCase() === "true";
};

const getCompanyNamespace = (companyId: number | string): string => `/${companyId}`;

const getCompanyRoom = (companyId: number | string): string => `company-${companyId}`;

const clearHeartbeatTimeout = (socketId: string): void => {
  const timeout = heartbeatTimeouts.get(socketId);
  if (timeout) {
    clearTimeout(timeout);
    heartbeatTimeouts.delete(socketId);
  }
};

const extractTokenFromSocket = (socket: Socket): string | null => {
  const rawToken = socket?.handshake?.query?.token;

  if (Array.isArray(rawToken)) {
    const tokenValue = rawToken[1] || rawToken[0];
    if (!tokenValue) return null;
    return String(tokenValue).startsWith("Bearer ")
      ? String(tokenValue).split(" ")[1]
      : String(tokenValue);
  }

  if (!rawToken) return null;

  const tokenValue = String(rawToken);
  return tokenValue.startsWith("Bearer ")
    ? tokenValue.split(" ")[1]
    : tokenValue;
};

type SocketAuthContext = {
  isApiOficialToken: boolean;
  companyId: number;
  userId?: number;
};

const resolveSocketAuth = (socket: Socket, token: string, tokenApiOficial: string): SocketAuthContext => {
  const companyId = Number(socket.nsp.name.split("/")[1]);

  if (!companyId) {
    throw new AppError("Invalid company namespace", 401);
  }

  if (token === tokenApiOficial) {
    return {
      isApiOficialToken: true,
      companyId
    };
  }

  try {
    const decodedToken = verify(token, authConfig.secret) as JwtPayload;
    const companyIdToken = Number(decodedToken.companyId);

    if (companyIdToken !== companyId) {
      logger.error(
        `CompanyId do token ${companyIdToken} diferente da companyId do socket ${companyId}`
      );
      throw new AppError("Invalid socket token company", 401);
    }

    return {
      isApiOficialToken: false,
      companyId,
      userId: Number(decodedToken.id)
    };
  } catch (error: any) {
    logger.error(JSON.stringify(error), "Error decoding token");

    if (error?.message === "jwt expired") {
      const expiredPayload = decode(token) as JwtPayload | null;
      const companyIdToken = Number(expiredPayload?.companyId || 0);

      if (companyIdToken && companyIdToken !== companyId) {
        logger.error(
          `CompanyId do token expirado ${companyIdToken} diferente da companyId do socket ${companyId}`
        );
        throw new AppError("Invalid expired socket token company", 401);
      }

      return {
        isApiOficialToken: false,
        companyId,
        userId: Number(expiredPayload?.id || 0)
      };
    }

    throw new AppError("Invalid socket token", 401);
  }
};

const initSocketRedisAdapter = async (socketServer: SocketIO): Promise<void> => {
  if (!parseBoolean(process.env.SOCKET_REDIS_ADAPTER)) {
    return;
  }

  if (!process.env.REDIS_URI) {
    logger.warn("[SOCKET] SOCKET_REDIS_ADAPTER=true, mas REDIS_URI não foi definido.");
    return;
  }

  try {
    const { createClient } = await import("redis");
    const { createAdapter } = await import("@socket.io/redis-adapter");

    const pubClient = createClient({ url: process.env.REDIS_URI });
    const subClient = pubClient.duplicate();

    await pubClient.connect();
    await subClient.connect();

    socketServer.adapter(createAdapter(pubClient, subClient));
    logger.info("[SOCKET] Redis adapter inicializado com sucesso.");
  } catch (error) {
    logger.error("[SOCKET] Erro ao inicializar Redis adapter:", error);
  }
};

const initSocketEmitter = async (): Promise<void> => {
  if (socketEmitter) {
    return;
  }

  if (!parseBoolean(process.env.SOCKET_REDIS_EMITTER) && !parseBoolean(process.env.SOCKET_REDIS_ADAPTER)) {
    return;
  }

  if (!process.env.REDIS_URI) {
    logger.warn("[SOCKET] Redis emitter não inicializado: REDIS_URI não definido.");
    return;
  }

  try {
    const { createClient } = await import("redis");
    const { Emitter } = await import("@socket.io/redis-emitter");

    const redisClient = createClient({ url: process.env.REDIS_URI });
    await redisClient.connect();

    socketEmitter = new Emitter(redisClient);
    logger.info("[SOCKET] Redis emitter inicializado com sucesso.");
  } catch (error) {
    logger.error("[SOCKET] Erro ao inicializar Redis emitter:", error);
  }
};

export const emitNamespaceEvent = async (
  namespace: string,
  event: string,
  payload: any
): Promise<void> => {
  try {
    if (io) {
      io.of(namespace).emit(event, payload);
      return;
    }

    await initSocketEmitter();

    if (socketEmitter) {
      socketEmitter.of(namespace).emit(event, payload);
      return;
    }

    logger.warn(
      `[SOCKET] Não foi possível emitir evento "${event}" no namespace "${namespace}": IO/emitter indisponível.`
    );
  } catch (error) {
    logger.error(`[SOCKET] Erro ao emitir evento "${event}" no namespace "${namespace}":`, error);
  }
};

export const emitCompanyEvent = async (
  companyId: number | string,
  event: string,
  payload: any
): Promise<void> => {
  await emitNamespaceEvent(getCompanyNamespace(companyId), event, payload);
};

const checkAndEmitBirthdays = async (companyId: number): Promise<void> => {
  try {
    const birthdayData = await BirthdayService.getTodayBirthdaysForCompany(companyId);

    if (birthdayData.users.length > 0) {
      for (const user of birthdayData.users) {
        await emitCompanyEvent(companyId, "user-birthday", {
          userId: user.id,
          userName: user.name,
          userAge: user.age
        });

        logger.info(`[GLOBAL] Emitido evento de aniversário para usuário: ${user.name}`);
      }
    }

    if (birthdayData.contacts.length > 0) {
      for (const contact of birthdayData.contacts) {
        await emitCompanyEvent(companyId, "contact-birthday", {
          contactId: contact.id,
          contactName: contact.name,
          contactAge: contact.age
        });

        logger.info(`[GLOBAL] Emitido evento de aniversário para contato: ${contact.name}`);
      }
    }
  } catch (error) {
    logger.error("[SOCKET] Error checking birthdays:", error);
  }
};

const handleHeartbeat = async (socket: Socket, companyId: number, userId: number): Promise<void> => {
  try {
    await User.update(
      {
        online: true,
        lastSeen: new Date()
      },
      { where: { id: userId } }
    );

    socket.broadcast.to(getCompanyRoom(companyId)).emit("user:online", {
      userId,
      lastSeen: new Date()
    });

    clearHeartbeatTimeout(socket.id);

    const timeout = setTimeout(async () => {
      try {
        await User.update(
          {
            online: false,
            lastSeen: new Date()
          },
          { where: { id: userId } }
        );

        socket.broadcast.to(getCompanyRoom(companyId)).emit("user:offline", {
          userId,
          lastSeen: new Date()
        });
      } catch (error) {
        logger.error("[SOCKET] Error in delayed heartbeat timeout:", error);
      }
    }, 30000);

    heartbeatTimeouts.set(socket.id, timeout);
  } catch (error) {
    logger.error("[SOCKET] Error in handleHeartbeat:", error);
  }
};

const handleAuthenticatedUserConnection = async (
  socket: Socket,
  companyId: number,
  userId: number
): Promise<void> => {
  try {
    socket.join(getCompanyRoom(companyId));

    await User.update(
      {
        online: true,
        lastSeen: new Date()
      },
      { where: { id: userId } }
    );

    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "profileImage", "lastSeen"]
    });

    socket.broadcast.to(getCompanyRoom(companyId)).emit("user:new", {
      userId,
      user
    });

    const onlineUsers = await User.findAll({
      where: {
        companyId,
        online: true
      },
      attributes: ["id", "name", "profileImage", "lastSeen"]
    });

    socket.emit("users:online", onlineUsers);

    await checkAndEmitBirthdays(companyId);
  } catch (error) {
    logger.error("[SOCKET] Error in authenticated user connection:", error);
  }
};

export const initIO = async (httpServer: Server): Promise<SocketIO> => {
  io = new SocketIO(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL
    }
  });

  await initSocketRedisAdapter(io);
  await initSocketEmitter();

  if (parseBoolean(process.env.SOCKET_ADMIN)) {
    User.findByPk(1).then(adminUser => {
      if (!adminUser) {
        logger.warn("[SOCKET] Usuário admin não encontrado para admin-ui.");
        return;
      }

      instrument(io as SocketIO, {
        auth: {
          type: "basic",
          username: process.env.SOCKET_ADMIN_USER || adminUser.email,
          password: process.env.SOCKET_ADMIN_PASS || adminUser.passwordHash
        },
        mode: "development"
      });
    });
  }

  const workspaces = io.of(/^\/\w+$/);

  workspaces.on("connection", async socket => {
    try {
      const tokenApiOficial = process.env.TOKEN_API_OFICIAL || "";
      const token = extractTokenFromSocket(socket);

      if (!token) {
        return socket.disconnect();
      }

      const authContext = resolveSocketAuth(socket, token, tokenApiOficial);

      if (authContext.isApiOficialToken) {
        logger.info(`Client connected namespace ${socket.nsp.name}`);
        logger.info("Conectado com sucesso na API OFICIAL");
      } else if (authContext.userId) {
        await handleAuthenticatedUserConnection(
          socket,
          authContext.companyId,
          authContext.userId
        );
      }

      socket.on("checkBirthdays", async () => {
        try {
          await checkAndEmitBirthdays(authContext.companyId);
        } catch (error) {
          logger.error("[SOCKET] Error in manual birthday check:", error);
        }
      });

      socket.on("joinChatBox", (ticketId: string) => {
        socket.join(ticketId);
      });

      socket.on("joinNotification", () => {
        socket.join("notification");
      });

      socket.on("joinVersion", () => {
        logger.info(`A client joined version channel namespace ${socket.nsp.name}`);
        socket.join("version");
      });

      socket.on("joinTickets", (status: string) => {
        socket.join(status);
      });

      socket.on("joinTicketsLeave", (status: string) => {
        socket.leave(status);
      });

      socket.on("joinChatBoxLeave", (ticketId: string) => {
        socket.leave(ticketId);
      });

      socket.on(
        "presenceSubscribe",
        async (data: { contactNumber: string; whatsappId: number; isGroup: boolean }) => {
          try {
            if (!data?.contactNumber || !data?.whatsappId) return;

            const { getWbot } = await import("./wbot");
            const wbot = getWbot(data.whatsappId);
            if (!wbot) return;

            const jid = data.isGroup
              ? `${data.contactNumber}@g.us`
              : `${data.contactNumber}@s.whatsapp.net`;

            await wbot.presenceSubscribe(jid);
          } catch (err) {
            // Silenciar — sessão pode não estar conectada
          }
        }
      );

      socket.on("receivedMessageWhatsAppOficial", (data: any) => {
        const receivedService = new ReceibedWhatsAppService();
        receivedService.getMessage(data);
      });

      socket.on("readMessageWhatsAppOficial", (data: any) => {
        const receivedService = new ReceibedWhatsAppService();
        receivedService.readMessage(data);
      });

      socket.on("heartbeat", async () => {
        if (authContext.isApiOficialToken || !authContext.userId) {
          return;
        }

        await handleHeartbeat(socket, authContext.companyId, authContext.userId);
      });

      socket.on("disconnect", async () => {
        try {
          clearHeartbeatTimeout(socket.id);

          if (authContext.isApiOficialToken || !authContext.userId) {
            return;
          }

          await User.update(
            {
              online: false,
              lastSeen: new Date()
            },
            { where: { id: authContext.userId } }
          );

          socket.broadcast.to(getCompanyRoom(authContext.companyId)).emit("user:offline", {
            userId: authContext.userId,
            lastSeen: new Date()
          });
        } catch (error) {
          logger.error("[SOCKET] Error in socket disconnect:", error);
        }
      });
    } catch (error) {
      logger.error("[SOCKET] Error on connection:", error);
      return socket.disconnect();
    }
  });

  return io;
};

export const getIO = (): SocketIO => {
  if (!io) {
    throw new AppError("Socket IO not initialized");
  }

  return io;
};

export const emitBirthdayEvents = async (companyId: number) => {
  try {
    await checkAndEmitBirthdays(companyId);
  } catch (error) {
    logger.error(
      `[RDS-SOCKET] Erro ao emitir eventos de aniversário para empresa ${companyId}:`,
      error instanceof Error ? error.message : "Unknown error"
    );

    if (error instanceof Error && error.stack) {
      logger.debug("[RDS-SOCKET] Error stack:", error.stack);
    }
  }
};