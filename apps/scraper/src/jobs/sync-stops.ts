import axios from "axios";
import { db } from "@moventis/db";

// TODO: replace with the real Moventis stop-listing endpoint.
// Likely parameterised by route external ID, e.g. /api/json/GetParadas/es/{routeId}
const STOPS_API_URL_TEMPLATE =
  process.env.MOVENTIS_STOPS_URL_TEMPLATE ?? "";

interface MoventisStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export async function syncStops() {
  if (!STOPS_API_URL_TEMPLATE) {
    console.warn("[sync-stops] MOVENTIS_STOPS_URL_TEMPLATE not set — skipping.");
    return;
  }

  const routes = await db.route.findMany({ where: { deletedAt: null } });

  console.log(`[sync-stops] Syncing stops for ${routes.length} routes…`);

  for (const route of routes) {
    const url = STOPS_API_URL_TEMPLATE.replace("{routeId}", route.externalId);
    const { data } = await axios.get<MoventisStop[]>(url);

    for (const stop of data) {
      await db.stop.upsert({
        where: { externalId: stop.id },
        update: {
          name: stop.name,
          latitude: stop.latitude,
          longitude: stop.longitude,
          deletedAt: null,
          routes: { connect: { id: route.id } },
        },
        create: {
          externalId: stop.id,
          name: stop.name,
          latitude: stop.latitude,
          longitude: stop.longitude,
          routes: { connect: { id: route.id } },
        },
      });
    }

    console.log(
      `[sync-stops] Route ${route.code}: ${data.length} stops processed.`,
    );
  }

  console.log("[sync-stops] Done.");
}
