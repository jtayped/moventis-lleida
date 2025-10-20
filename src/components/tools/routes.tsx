import React from "react";
import { Badge } from "../ui/badge";
import { Plus, Check } from "lucide-react"; // 1. Import the Check icon
import { useBusFinder } from "@/context/buses";

const BusRoutes = () => {
  const { routes, isRouteSelected, toggleRoute } = useBusFinder();

  // Create a sorted copy of the routes array
  // We use [...routes] to create a shallow copy before sorting
  const sortedRoutes = [...routes].sort((a, b) => {
    const aIsSelected = isRouteSelected(a.id);
    const bIsSelected = isRouteSelected(b.id);

    // This moves selected items (true) to the front
    return Number(bIsSelected) - Number(aIsSelected);
  });

  return (
    <ol className="flex gap-1 overflow-x-scroll">
      {/* Map over the new sortedRoutes array */}
      {sortedRoutes.map((r) => (
        <Badge
          key={r.id}
          variant={isRouteSelected(r.id) ? "default" : "outline"}
          onClick={() => toggleRoute(r.id)}
          className="cursor-pointer py-2"
        >
          {isRouteSelected(r.id) ? <Check /> : <Plus />}
          <span
            style={{ backgroundColor: r.color }}
            className="ml-2 flex size-5 items-center justify-center rounded-sm text-white"
          >
            {r.code}
          </span>
        </Badge>
      ))}
    </ol>
  );
};

export default BusRoutes;
