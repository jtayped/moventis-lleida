import { db } from "@moventis/db";

// Nothing about this response is cacheable: a health check answered from the
// build-time render would report "ok" forever, including while the database is down.
export const dynamic = "force-dynamic";

/**
 * Liveness *and* readiness: the app process being up says nothing useful on its
 * own, since every page here is a database read. One trivial round trip is what
 * separates "serving" from "serving 500s".
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Health check failed:", error);
    return new Response("db unreachable", { status: 503 });
  }
}
