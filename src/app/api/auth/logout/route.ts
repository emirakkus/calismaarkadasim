import { ok, serverError } from "@/lib/api";
import { destroyCurrentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await destroyCurrentSession();
    return ok({ ok: true });
  } catch {
    return serverError();
  }
}
