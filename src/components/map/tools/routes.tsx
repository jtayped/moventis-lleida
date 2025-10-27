import React from "react";
import { Badge } from "../../ui/badge";
import { Plus, Check } from "lucide-react"; // 1. Import the Check icon
import { useBusFinder } from "@/context/buses";
import { ScrollArea, ScrollBar } from "../../ui/scroll-area";

const BusRoutes = () => {
  const { routes, isRouteSelected, toggleRoute } = useBusFinder();

  // Create a sorted copy of the routes array
  // We use [...routes] to create a shallow copy before sorting
  const sortedRoutes = [...routes].sort((a, b) => {
    const aIsSelected = isRouteSelected(a.code);
    const bIsSelected = isRouteSelected(b.code);

    // This moves selected items (true) to the front
    return Number(bIsSelected) - Number(aIsSelected);
  });

  return (
    <ScrollArea className="pb-3">
      <ol className="flex gap-1">
        {sortedRoutes.map((r) => (
          <Badge
            key={r.id}
            variant={isRouteSelected(r.code) ? "default" : "outline"}
            onClick={() => toggleRoute(r.code)}
            className="cursor-pointer py-2"
          >
            {isRouteSelected(r.code) ? <Check /> : <Plus />}
            <span
              style={{ backgroundColor: r.color }}
              className="ml-2 flex size-5 items-center justify-center rounded-sm text-white"
            >
              {r.code}
            </span>
          </Badge>
        ))}
      </ol>
      <ScrollBar orientation="horizontal" className="" />
    </ScrollArea>
  );
};

export default BusRoutes;
