"use client";

import type { ReactNode } from "react";
import { Bell, Menu } from "lucide-react";
import HubSignOutButton from "@/components/layout/HubSignOutButton";

type HubHeaderProps = {
  displayName: string;
  adminEntry?: ReactNode;
  draftsControls: ReactNode;
  onOpenMobileSidebar: () => void;
};

export default function HubHeader({
  displayName,
  adminEntry,
  draftsControls,
  onOpenMobileSidebar,
}: HubHeaderProps) {
  const avatarLabel = displayName.trim().charAt(0) || "P";

  return (
    <header className="sticky top-0 z-20 bg-reca shadow-lg">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              data-testid="hub-sidebar-mobile-toggle"
              onClick={onOpenMobileSidebar}
              className="rounded-lg p-2 text-reca-100 transition-colors hover:bg-white/10 md:hidden"
              aria-label="Abrir navegación"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-none text-white">Hub</p>
              <p className="mt-0.5 truncate text-xs leading-none text-reca-200">
                Inclusión Laboral
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            {draftsControls}
            {adminEntry}
            <button
              className="rounded-lg p-2 text-reca-100 transition-colors hover:bg-white/10"
              aria-label="Notificaciones"
              type="button"
            >
              <Bell className="h-5 w-5" />
            </button>
            <div className="mx-1 hidden h-6 w-px bg-white/20 sm:block" />
            <div className="flex min-w-0 items-center gap-2">
              <div className="hidden min-w-0 text-right sm:block">
                <p className="truncate text-xs font-medium leading-none text-white">
                  {displayName}
                </p>
                <p className="mt-0.5 text-xs leading-none text-reca-200">
                  En línea
                </p>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
                {avatarLabel}
              </div>
            </div>
            <HubSignOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
