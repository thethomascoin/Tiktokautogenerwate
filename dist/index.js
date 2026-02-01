// server/_core/index.ts
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var videos = mysqlTable("videos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productUrl: text("productUrl").notNull(),
  productName: varchar("productName", { length: 500 }),
  productImage: text("productImage"),
  productPrice: varchar("productPrice", { length: 100 }),
  productDescription: text("productDescription"),
  videoUrl: text("videoUrl"),
  thumbnailUrl: text("thumbnailUrl"),
  caption: text("caption"),
  hashtags: text("hashtags"),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "posted"]).default("pending").notNull(),
  tiktokPostId: varchar("tiktokPostId", { length: 255 }),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var userSettings = mysqlTable("userSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  hfToken: text("hfToken"),
  tiktokClientId: text("tiktokClientId"),
  tiktokClientSecret: text("tiktokClientSecret"),
  tiktokAccessToken: text("tiktokAccessToken"),
  tiktokRefreshToken: text("tiktokRefreshToken"),
  tiktokTokenExpiry: timestamp("tiktokTokenExpiry"),
  videoLength: int("videoLength").default(8),
  videoQuality: mysqlEnum("videoQuality", ["fast", "balanced", "high"]).default("balanced"),
  defaultPrivacy: mysqlEnum("defaultPrivacy", ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"]).default("PUBLIC_TO_EVERYONE"),
  enableComments: boolean("enableComments").default(true),
  enableDuets: boolean("enableDuets").default(true),
  enableStitch: boolean("enableStitch").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var videoQueue = mysqlTable("videoQueue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  videoId: int("videoId").notNull(),
  productUrl: text("productUrl").notNull(),
  status: mysqlEnum("status", ["queued", "processing", "completed", "failed"]).default("queued").notNull(),
  priority: int("priority").default(0),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getVideoById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
  return result[0] || null;
}
async function getUserVideos(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(videos).where(eq(videos.userId, userId)).orderBy(videos.createdAt);
}
async function updateVideo(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(videos).set(data).where(eq(videos.id, id));
}
async function deleteVideo(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(videos).where(eq(videos.id, id));
}
async function getUserSettings(userId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return result[0] || null;
}
async function upsertUserSettings(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(userSettings).where(eq(userSettings.userId, data.userId)).limit(1);
  if (existing.length > 0) {
    await db.update(userSettings).set(data).where(eq(userSettings.userId, data.userId));
  } else {
    await db.insert(userSettings).values(data);
  }
}
async function createQueueItem(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(videoQueue).values({
    ...data,
    status: "queued",
    createdAt: /* @__PURE__ */ new Date()
  });
  return result[0].insertId;
}
async function getQueueItems(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(videoQueue).where(eq(videoQueue.userId, userId));
}
async function deleteQueueItem(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(videoQueue).where(eq(videoQueue.id, id));
}
async function getQueueStats(userId) {
  const db = await getDb();
  if (!db) return { total: 0, queued: 0, processing: 0, completed: 0, failed: 0 };
  const items = await db.select().from(videoQueue).where(eq(videoQueue.userId, userId));
  return {
    total: items.length,
    queued: items.filter((i) => i.status === "queued").length,
    processing: items.filter((i) => i.status === "processing").length,
    completed: items.filter((i) => i.status === "completed").length,
    failed: items.filter((i) => i.status === "failed").length
  };
}

// server/_core/cookies.ts
var LOCAL_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "::1"]);
function isIpAddress(host) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getParentDomain(hostname) {
  if (LOCAL_HOSTS.has(hostname) || isIpAddress(hostname)) {
    return void 0;
  }
  const parts = hostname.split(".");
  if (parts.length < 3) {
    return void 0;
  }
  return "." + parts.slice(-2).join(".");
}
function getSessionCookieOptions(req) {
  const hostname = req.hostname;
  const domain = getParentDomain(hostname);
  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client2) {
    this.client = client2;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(EXCHANGE_TOKEN_PATH, payload);
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(GET_USER_INFO_PATH, {
      accessToken: token.accessToken
    });
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client2 = createOAuthHttpClient()) {
    this.client = client2;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(platforms.filter((p) => typeof p === "string"));
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length).trim();
    }
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = token || cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
async function syncUser(userInfo) {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }
  const lastSignedIn = /* @__PURE__ */ new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn
  });
  const saved = await getUserByOpenId(userInfo.openId);
  return saved ?? {
    openId: userInfo.openId,
    name: userInfo.name,
    email: userInfo.email,
    loginMethod: userInfo.loginMethod ?? null,
    lastSignedIn
  };
}
function buildUserResponse(user) {
  return {
    id: user?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? /* @__PURE__ */ new Date()).toISOString()
  };
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      const frontendUrl = process.env.EXPO_WEB_PREVIEW_URL || process.env.EXPO_PACKAGER_PROXY_URL || "http://localhost:8081";
      res.redirect(302, frontendUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
  app2.get("/api/oauth/mobile", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user)
      });
    } catch (error) {
      console.error("[OAuth] Mobile exchange failed", error);
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
  app2.get("/api/auth/me", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });
  app2.post("/api/auth/session", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/session failed:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
}

// server/routers.ts
import { z as z2 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL("webdevtoken.v1.WebDevService/SendNotification", normalizedBase).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error("tool_choice 'required' was provided but no tools were configured");
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error("responseFormat json_schema requires a defined schema object");
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const payload = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(toolChoice || tool_choice, tools);
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  payload.max_tokens = 32768;
  payload.thinking = {
    budget_tokens: 128
  };
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`);
  }
  return await response.json();
}

// server/_core/productScraper.ts
import axios2 from "axios";
import * as cheerio from "cheerio";
async function scrapeProduct(url) {
  const { data } = await axios2.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const $ = cheerio.load(data);
  const title = $('meta[property="og:title"]').attr("content") || $("title").text();
  const description = $('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content") || "";
  const images = /* @__PURE__ */ new Set();
  $('meta[property="og:image"]').each((_, el) => {
    const src = $(el).attr("content");
    if (src) images.add(src);
  });
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    if (src && src.startsWith("http")) images.add(src);
  });
  return {
    title: title?.slice(0, 200),
    description: description?.slice(0, 500),
    images: Array.from(images).slice(0, 6)
    // limit for sanity
  };
}

// server/_core/scriptGenerator.ts
import OpenAI from "openai";
var openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
async function generateUGCScript(product) {
  const prompt = `
Create a short TikTok UGC style ad script.

Product: ${product.title}
Description: ${product.description}

Include:
- Hook (1 sentence)
- 3 benefit bullets
- Call to action

Keep under 60 seconds.
`;
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });
  return res.choices[0].message.content || "";
}
function parseUGCScript(script) {
  const lines = script.split("\n").filter(Boolean);
  return {
    hook: lines[0] ?? "You need this",
    cta: lines[lines.length - 1] ?? "Shop now",
    subtitles: script
  };
}

// server/_core/creatomateVideo.ts
import { Client } from "creatomate";
var client = new Client(process.env.CREATOMATE_API_KEY);
async function renderProductVideo(params) {
  const templateId = process.env.CREATOMATE_TEMPLATE_ID || "YOUR_TEMPLATE_ID_HERE";
  const renders = await client.render({
    templateId,
    modifications: {
      product_image: params.image,
      hook_text: params.hook,
      cta_text: params.cta
    },
    // @ts-ignore: subtitles is a valid option but missing in types
    subtitles: {
      source: "script",
      text: params.script
    },
    outputFormat: "mp4"
  });
  return renders[0].url;
}

// server/_core/videoGeneration.ts
async function generateUGCVideoFromUrl(url, customScript) {
  const product = await scrapeProduct(url);
  if (!product.images.length) {
    throw new Error("No product images found");
  }
  let script = customScript || "";
  if (!script) {
    script = await generateUGCScript(product);
  }
  const parsed = parseUGCScript(script);
  const videoUrl = await renderProductVideo({
    image: product.images[0],
    hook: parsed.hook,
    cta: parsed.cta,
    script: parsed.subtitles
  });
  return {
    videoUrl,
    script,
    product
  };
}

// server/_core/analytics.ts
function getTrendingMetrics(videos2) {
  const topPerformers = videos2.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  const totalViews = videos2.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalLikes = videos2.reduce((sum, v) => sum + (v.likes || 0), 0);
  const averageEngagement = videos2.length > 0 ? videos2.reduce((sum, v) => sum + (v.engagement || 0), 0) / videos2.length : 0;
  return {
    topPerformers,
    averageEngagement,
    totalViews,
    totalLikes
  };
}

// server/routers.ts
import axios3 from "axios";
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  // Product analysis and scraping
  product: router({
    analyze: publicProcedure.input(z2.object({
      url: z2.string().url()
    })).mutation(async ({ ctx, input }) => {
      try {
        let productData;
        try {
          const response = await axios3.get(input.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.5",
              "Referer": "https://www.tiktok.com/"
            },
            timeout: 5e3
          });
          const html = response.data;
          const llmResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "Extract product info from HTML. Return JSON with: name, price, description. If missing, estimate reasonable values."
              },
              {
                role: "user",
                content: `Extract from HTML (first 8000 chars):

${html.substring(0, 8e3)}`
              }
            ]
          });
          const content = llmResponse.choices[0].message.content;
          const contentText = typeof content === "string" ? content : content[0].text;
          try {
            productData = JSON.parse(contentText);
          } catch {
            productData = {
              name: "TikTok Shop Product",
              price: "$19.99",
              description: contentText || "Product from TikTok Shop"
            };
          }
        } catch (fetchError) {
          console.warn("Scraping failed, using fallback data:", fetchError.message);
          productData = {
            name: "Premium TikTok Shop Product",
            price: "$29.99",
            description: "High-quality product trending on TikTok. Perfect for content creators and influencers. Limited time offer with free shipping."
          };
        }
        const db = await getDb();
        if (!db) throw new Error("Database not connected");
        const videoId = await db.insert(videos).values({
          userId: ctx.user?.id || 0,
          productUrl: input.url,
          productName: productData.name || "Product",
          productPrice: productData.price || "N/A",
          productDescription: productData.description || "Amazing TikTok Shop product",
          productImage: productData.imageUrl || null,
          status: "pending"
        });
        return {
          videoId,
          product: productData
        };
      } catch (error) {
        console.error("Product analysis error:", error);
        throw new Error(`Failed to analyze product: ${error.message}`);
      }
    })
  }),
  // Video generation
  video: router({
    generateScript: publicProcedure.input(z2.object({
      videoId: z2.number()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");
      const video = await getVideoById(input.videoId);
      if (!video) throw new Error("Video not found");
      const scriptResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a UGC (User Generated Content) video script writer for TikTok. Create engaging, authentic scripts that feel like real people reviewing products. Keep it short (30-60 seconds), conversational, and enthusiastic. Include a hook, main points, and call-to-action."
          },
          {
            role: "user",
            content: `Create a UGC-style TikTok video script for this product:

Name: ${video.productName}
Price: ${video.productPrice}
Description: ${video.productDescription}

Make it sound natural and exciting!`
          }
        ]
      });
      const scriptContent = scriptResponse.choices[0].message.content;
      const script = typeof scriptContent === "string" ? scriptContent : scriptContent[0].text;
      return {
        script
      };
    }),
    generate: publicProcedure.input(z2.object({
      videoId: z2.number(),
      script: z2.string()
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");
      const video = await getVideoById(input.videoId);
      if (!video) throw new Error("Video not found");
      await updateVideo(input.videoId, { status: "processing" });
      try {
        const result = await generateUGCVideoFromUrl(video.productUrl, input.script);
        await updateVideo(input.videoId, {
          videoUrl: result.videoUrl,
          thumbnailUrl: result.product.images[0],
          status: "completed"
        });
        return {
          videoUrl: result.videoUrl,
          thumbnailUrl: result.product.images[0]
        };
      } catch (error) {
        await updateVideo(input.videoId, {
          status: "failed",
          errorMessage: error.message
        });
        throw error;
      }
    }),
    generateCaption: publicProcedure.input(z2.object({
      videoId: z2.number()
    })).mutation(async ({ input }) => {
      const video = await getVideoById(input.videoId);
      if (!video) throw new Error("Video not found");
      const captionResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a TikTok caption and hashtag expert. Create engaging captions with viral hashtags. Keep captions short, punchy, and include relevant emojis. Generate 10-15 hashtags mixing popular and niche tags."
          },
          {
            role: "user",
            content: `Create a TikTok caption and hashtags for this product: ${video.productName}

Description: ${video.productDescription}`
          }
        ]
      });
      const captionContent = captionResponse.choices[0].message.content;
      const caption = typeof captionContent === "string" ? captionContent : captionContent[0].text;
      await updateVideo(input.videoId, {
        caption
      });
      return {
        caption
      };
    }),
    generateFromUrl: publicProcedure.input(z2.object({ url: z2.string().url() })).mutation(async ({ input }) => {
      const result = await generateUGCVideoFromUrl(input.url);
      return result;
    })
  }),
  // Video history
  videos: router({
    list: publicProcedure.query(async ({ ctx }) => {
      return getUserVideos(ctx.user?.id || 0);
    }),
    get: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getVideoById(input.id);
    }),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await deleteVideo(input.id);
      return { success: true };
    }),
    updateDetails: publicProcedure.input(z2.object({
      id: z2.number(),
      productName: z2.string(),
      productPrice: z2.string(),
      productDescription: z2.string()
    })).mutation(async ({ input }) => {
      await updateVideo(input.id, {
        productName: input.productName,
        productPrice: input.productPrice,
        productDescription: input.productDescription
      });
      return { success: true };
    })
  }),
  // User settings
  settings: router({
    get: publicProcedure.query(async ({ ctx }) => {
      return getUserSettings(ctx.user?.id || 0);
    }),
    update: publicProcedure.input(z2.object({
      hfToken: z2.string().optional(),
      tiktokClientId: z2.string().optional(),
      tiktokClientSecret: z2.string().optional(),
      videoLength: z2.number().optional(),
      videoQuality: z2.enum(["fast", "balanced", "high"]).optional(),
      defaultPrivacy: z2.enum(["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"]).optional(),
      enableComments: z2.boolean().optional(),
      enableDuets: z2.boolean().optional(),
      enableStitch: z2.boolean().optional()
    })).mutation(async ({ ctx, input }) => {
      await upsertUserSettings({
        userId: ctx.user?.id || 0,
        ...input
      });
      return { success: true };
    })
  }),
  queue: router({
    list: publicProcedure.query(async ({ ctx }) => {
      return getQueueItems(ctx.user?.id || 0);
    }),
    add: publicProcedure.input(z2.object({
      videoId: z2.number(),
      productUrl: z2.string(),
      priority: z2.number().optional()
    })).mutation(async ({ ctx, input }) => {
      const queueId = await createQueueItem({
        userId: ctx.user?.id || 0,
        videoId: input.videoId,
        productUrl: input.productUrl,
        priority: input.priority || 0
      });
      return { id: queueId };
    }),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      await deleteQueueItem(input.id);
      return { success: true };
    }),
    stats: publicProcedure.query(async ({ ctx }) => {
      return getQueueStats(ctx.user?.id || 0);
    })
  }),
  analytics: router({
    metrics: publicProcedure.query(async ({ ctx }) => {
      const videos2 = await getUserVideos(ctx.user?.id || 0);
      return getTrendingMetrics(videos2);
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server2 = net.createServer();
    server2.listen(port, () => {
      server2.close(() => resolve(true));
    });
    server2.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
var app = express();
var server = createServer(app);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerOAuthRoutes(app);
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
if (process.env.VERCEL !== "1") {
  startStandaloneServer();
}
async function startStandaloneServer() {
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}
var index_default = app;
export {
  index_default as default
};
