import { db } from "@/db";
import { users } from "@/db/schema";
import { ok, bad, serverError } from "@/lib/api";
import { verifyPassword, createSession, isValidEmail } from "@/lib/auth";
import { ensureUserData } from "@/lib/seed";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!isValidEmail(email)) return bad("Geçerli bir e-posta girin");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return bad("E-posta veya parola hatalı", 401);
    }

    await ensureUserData(user.id, user.name);
    await createSession(user.id);
    return ok({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error(
      "[auth/login] Login failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return serverError();
  }
}
