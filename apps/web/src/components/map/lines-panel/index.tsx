"use client";
import React, { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useBusFinder } from "@/context/buses";
import type { Lines } from "@moventis/shared";
import LineCard from "./line-card";
import LineStopList from "./line-stop-list";

const codeOrder = (code: string) => {
  const n = parseInt(code, 10);
  return isNaN(n) ? Infinity : n;
};

interface LinesPanelProps {
  open: boolean;
  onClose: () => void;
}

const LinesPanel = ({ open, onClose }: LinesPanelProps) => {
  const { routes, activeRouteCodes } = useBusFinder();
  const [selectedLine, setSelectedLine] = useState<Lines | null>(null);

  const activeSet = new Set(activeRouteCodes);
  const sortedRoutes = [...routes].sort((a, b) => {
    const diff = codeOrder(a.code) - codeOrder(b.code);
    return diff !== 0 ? diff : a.code.localeCompare(b.code);
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setTimeout(() => setSelectedLine(null), 300);
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} direction="left">
      <DrawerContent className="overflow-hidden">
        <DrawerTitle className="sr-only">totes les línies</DrawerTitle>
        <DrawerDescription className="sr-only">
          llista de totes les línies de bus de Lleida
        </DrawerDescription>

        {selectedLine ? (
          <LineStopList
            code={selectedLine}
            onBack={() => setSelectedLine(null)}
          />
        ) : (
          <>
            <DrawerHeader className="flex flex-row items-center justify-between py-3">
              <span className="font-semibold">totes les línies</span>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="-mr-1">
                  <X />
                </Button>
              </DrawerClose>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <div className="space-y-2">
                {sortedRoutes.map((route) => (
                  <LineCard
                    key={route.id}
                    route={route}
                    isActive={activeSet.size === 0 || activeSet.has(route.code)}
                    onClick={() => setSelectedLine(route.code)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default LinesPanel;
