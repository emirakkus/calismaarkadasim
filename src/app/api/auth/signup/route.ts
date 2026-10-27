import { db } from "@/db";
import { examSettings, settings, studyStreak, users } from "@/db/schema";
import { ok, bad, serverError } from "@/lib/api";
import {
  hashPassword,
  createSession,
  isValidEmail,
} from "@/lib/auth";
import { DEFAULT_EXAM_DATE, ensureGlobalSeed } from "@/lib/seed";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let createdUserId: number | undefined;
  try {
    const body = await req.json().catch(() => null);
    if (!body) return bad("Geçersiz istek");

    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim().slice(0, 40);
    const password = String(body.password ?? "");

    if (!isValidEmail(email)) return bad("Geçerli bir e-posta girin");
    if (password.length < 6) return bad("Parola en az 6 karakter olmalı");

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing[0]) return bad("Bu e-posta ile zaten bir hesap var", 409);

    await ensureGlobalSeed();

    const user = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({ email, passwordHash: hashPassword(password), name })
        .returning();
      await tx.insert(settings).values({ userId: created.id, userName: name });
      await tx.insert(examSettings).values({
        userId: created.id,
        examName: "YKS",
        examDate: DEFAULT_EXAM_DATE,
      });
      await tx.insert(studyStreak).values({ userId: created.id });
      return created;
    });
    createdUserId = user.id;
    await createSession(user.id);

    return ok(
      { user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 },
    );
  } catch (error) {
    console.error("[auth/signup] Registration failed", error);
    if (createdUserId !== undefined) {
      try {
        await db.delete(users).where(eq(users.id, createdUserId));
      } catch (cleanupError) {
        console.error("[auth/signup] Failed to roll back created user", cleanupError);
      }
    }
    return serverError();
  }
}
