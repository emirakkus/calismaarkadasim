import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, authSessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export const SESSION_COOKIE = "cya_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const testBuf = scryptSync(password, salt, 64);
  if (hashBuf.length !== testBuf.length) return false;
  return timingSafeEqual(hashBuf, testBuf);
}

export function newToken(): string {
  return randomBytes(32).toString("hex");
}

/** Yeni oturum oluşturur ve httpOnly cookie'yi ayarlar. */
export async function createSession(userId: number): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.insert(authSessions).values({ token, userId, expiresAt });
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

/** Cookie'deki oturumu sunucudan siler ve cookie'yi temizler (çıkış). */
export async function destroyCurrentSession(): Promise<void> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(authSessions).where(eq(authSessions.token, token));
  }
  c.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/** Geçerli oturumdaki kullanıcıyı döndürür (yoksa null). */
export async function getCurrentUser(): Promise<{
  id: number;
  email: string;
  name: string;
} | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(eq(authSessions.token, token), gt(authSessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

/** Oturumdaki kullanıcı kimliğini döndürür (yoksa null). */
export async function getUserId(): Promise<number | null> {
  const u = await getCurrentUser();
  return u?.id ?? null;
}

export function unauthorized() {
  return Response.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 });
}

export function isValidEmail(s: unknown): s is string {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
