"use client";
import React, { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Panel, PanelHeader } from "@/components/map/panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBusFinder } from "@/context/buses";
import type { Lines } from "@moventis/shared";
import LineCard from "./line-card";
import LineStopList from "./line-stop-list";
import { track } from "@/lib/analytics";

const codeOrder = (code: string) => {
  const n = parseInt(code, 10);
  return isNaN(n) ? Infinity : n;
};

/**
 * `drawer` slides in from the edge over a dimmed map — the phone treatment.
 * `panel` is the floating card in the desktop left column, where the map beside
 * it stays live and the whole point is not to cover it.
 */
type LinesPanelVariant = "drawer" | "panel";

interface LinesPanelProps {
  open: boolean;
  onClose: () => void;
  variant?: LinesPanelVariant;
}

const LinesPanel = ({ open, onClose, variant = "drawer" }: LinesPanelProps) => {
  const { routes, activeRouteCodes } = useBusFinder();
  const [selectedLine, setSelectedLine] = useState<Lines | null>(null);

  const activeSet = new Set(activeRouteCodes);
  const sortedRoutes = [...routes].sort((a, b) => {
    const diff = codeOrder(a.code) - codeOrder(b.code);
    return diff !== 0 ? diff : a.code.localeCompare(b.code);
  });

  // The line detail is reached from this list and returns to it, so closing
  // while a line is open has to reset — otherwise reopening lands mid-drill
  // on whatever was last tapped. The delay is the drawer's exit animation;
  // resetting immediately swaps the contents of a sheet still on screen.
  const close = () => {
    onClose();
    setTimeout(() => setSelectedLine(null), 300);
  };

  const body = selectedLine ? (
    <LineStopList
      code={selectedLine}
      onBack={() => setSelectedLine(null)}
      onClose={close}
    />
  ) : (
    <>
      <PanelHeader onClose={close} closeLabel="tanca les línies">
        <span className="font-semibold">totes les línies</span>
      </PanelHeader>
      <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
        <div className="space-y-2">
          {sortedRoutes.map((route) => (
            <LineCard
              key={route.id}
              route={route}
              isActive={activeSet.size === 0 || activeSet.has(route.code)}
              onClick={() => {
                track("line detail opened", { code: route.code });
                setSelectedLine(route.code);
              }}
            />
          ))}
        </div>
      </ScrollArea>
    </>
  );

  if (variant === "panel") {
    if (!open) return null;
    return (
      <Panel aria-label="totes les línies" className="h-full">
        {body}
      </Panel>
    );
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) close();
      }}
      direction="left"
    >
      <DrawerContent className="overflow-hidden">
        <DrawerTitle className="sr-only">totes les línies</DrawerTitle>
        <DrawerDescription className="sr-only">
          llista de totes les línies de bus de Lleida
        </DrawerDescription>
        {body}
      </DrawerContent>
    </Drawer>
  );
};

export default LinesPanel;
