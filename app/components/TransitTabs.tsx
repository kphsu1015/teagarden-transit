"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "../context/LanguageContext";
import { BusIcon, CarIcon, MapIcon, TrainIcon } from "./icons";

const TABS = [
  { href: "/bus", icon: BusIcon, labelKey: "navBus" },
  { href: "/rail", icon: TrainIcon, labelKey: "navRail" },
  { href: "/drive", icon: CarIcon, labelKey: "navDrive" },
  { href: "/map", icon: MapIcon, labelKey: "navMap" },
] as const;

export default function TransitTabs() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="sticky top-[57px] z-30 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 sm:px-6">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-medium transition-colors ${
                active
                  ? "border-pine text-pine"
                  : "border-transparent text-ink-soft hover:border-line hover:text-ink"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {t[tab.labelKey]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
