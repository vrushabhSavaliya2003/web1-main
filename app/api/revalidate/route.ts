import { revalidatePath, revalidateTag } from "next/cache";
import { getAdminUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Admin-only cache purge. After any admin mutation (product/category/review/
 * home-content/UPI save), the admin UI POSTs here and the storefront SWR caches
 * are purged — so the very next shopper request reads fresh data, while every
 * other request is still served instantly from cache.
 */
export async function POST() {
  const session = await getAdminUser();
  if (!session) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }

  revalidateTag("catalog");
  revalidateTag("settings");
  revalidatePath("/home");

  return Response.json({ ok: true });
}
