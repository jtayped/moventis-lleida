import axios from "axios";
import { db } from "@moventis/db";

// TODO: replace with the real Moventis route-listing endpoint once known.
// The stop-times endpoint is: /api/json/GetTiemposParada/es/{stopId}/{routeId}/0
// The route-listing endpoint may be something like: /api/json/GetLineas/es
const ROUTES_API_URL = process.env.MOVENTIS_ROUTES_URL ?? "";

interface MoventisRoute {
  id: string;
  name: string;
  code: string;
  color: string;
}

export async function syncRoutes() {
  if (!ROUTES_API_URL) {
    console.warn("[sync-routes] MOVENTIS_ROUTES_URL not set — skipping.");
    return;
  }

  console.log("[sync-routes] Starting…");

  const { data } = await axios.get<MoventisRoute[]>(ROUTES_API_URL);

  for (const route of data) {
    await db.route.upsert({
      where: { externalId: route.id },
      update: {
        name: route.name,
        code: route.code,
        color: route.color,
        deletedAt: null,
      },
      create: {
        externalId: route.id,
        name: route.name,
        code: route.code,
        color: route.color,
      },
    });
  }

  // Soft-delete routes that no longer appear in the API
  const activeIds = data.map((r) => r.id);
  await db.route.updateMany({
    where: { externalId: { notIn: activeIds }, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  console.log(`[sync-routes] Done — ${data.length} routes processed.`);
}
