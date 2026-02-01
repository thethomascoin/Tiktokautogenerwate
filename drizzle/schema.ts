import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Videos table - stores generated videos and their metadata
 */
export const videos = mysqlTable("videos", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Video = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;

/**
 * User settings table - stores API keys and preferences
 */
export const userSettings = mysqlTable("userSettings", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

/**
 * Video Queue table - stores batch processing queue for multiple videos
 */
export const videoQueue = mysqlTable("videoQueue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  videoId: int("videoId").notNull(),
  productUrl: text("productUrl").notNull(),
  status: mysqlEnum("status", ["queued", "processing", "completed", "failed"]).default("queued").notNull(),
  priority: int("priority").default(0),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VideoQueue = typeof videoQueue.$inferSelect;
export type InsertVideoQueue = typeof videoQueue.$inferInsert;
