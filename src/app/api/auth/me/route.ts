import { ok, serverError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return ok({ user });
  } catch {
    return serverError();
  }
}
