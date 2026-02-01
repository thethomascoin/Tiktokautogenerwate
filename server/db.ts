import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, videos, InsertVideo, Video, userSettings, InsertUserSettings, UserSettings, videoQueue } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Video operations
export async function createVideo(data: InsertVideo): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(videos).values(data);
  return result[0].insertId;
}

export async function getVideoById(id: number): Promise<Video | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
  return result[0] || null;
}

export async function getUserVideos(userId: number): Promise<Video[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(videos).where(eq(videos.userId, userId)).orderBy(videos.createdAt);
}

export async function updateVideo(id: number, data: Partial<InsertVideo>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(videos).set(data).where(eq(videos.id, id));
}

export async function deleteVideo(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(videos).where(eq(videos.id, id));
}

// User settings operations
export async function getUserSettings(userId: number): Promise<UserSettings | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return result[0] || null;
}

export async function upsertUserSettings(data: InsertUserSettings): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(userSettings).where(eq(userSettings.userId, data.userId)).limit(1);

  if (existing.length > 0) {
    await db.update(userSettings).set(data).where(eq(userSettings.userId, data.userId));
  } else {
    await db.insert(userSettings).values(data);
  }
}

// Queue operations
export async function createQueueItem(data: any): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(videoQueue).values({
    ...data,
    status: "queued",
    createdAt: new Date(),
  });
  return result[0].insertId;
}

export async function getQueueItems(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(videoQueue).where(eq(videoQueue.userId, userId));
}

export async function getNextQueueItem(): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(videoQueue).where(eq(videoQueue.status, "queued")).limit(1);
  return result[0] || null;
}

export async function updateQueueItem(id: number, data: any): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(videoQueue).set(data).where(eq(videoQueue.id, id));
}

export async function deleteQueueItem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(videoQueue).where(eq(videoQueue.id, id));
}

export async function getQueueStats(userId: number): Promise<any> {
  const db = await getDb();
  if (!db) return { total: 0, queued: 0, processing: 0, completed: 0, failed: 0 };

  const items = await db.select().from(videoQueue).where(eq(videoQueue.userId, userId));

  return {
    total: items.length,
    queued: items.filter((i: any) => i.status === "queued").length,
    processing: items.filter((i: any) => i.status === "processing").length,
    completed: items.filter((i: any) => i.status === "completed").length,
    failed: items.filter((i: any) => i.status === "failed").length,
  };
}
