"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import HubAnalyticsListener from "@/components/layout/HubAnalyticsListener";
import HubHeader from "@/components/layout/HubHeader";
import HubSentryUserContext from "@/components/layout/HubSentryUserContext";
import HubSidebar from "@/components/layout/HubSidebar";
import HubTabListener from "@/components/layout/HubTabListener";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import type { AppRole } from "@/lib/auth/appRoles";

export const HUB_SIDEBAR_STORAGE_KEY = "reca:hub-sidebar-collapsed";

export type HubShellUser = {
  authUserId?: string | null;
  email: string | null;
  displayName: string;
  usuarioLogin: string | null;
  profesionalId: number | null;
  roles: AppRole[];
};

type HubShellProps = {
  initialUser: HubShellUser;
  adminEntry?: ReactNode;
  draftsControls: ReactNode;
  children: ReactNode;
};

export default function HubShell({
  initialUser,
  adminEntry,
  draftsControls,
  children,
}: HubShellProps) {
  const currentRole = useCurrentRole({ initialData: initialUser });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(
      window.localStorage.getItem(HUB_SIDEBAR_STORAGE_KEY) === "true"
    );
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    window.localStorage.setItem(
      HUB_SIDEBAR_STORAGE_KEY,
      String(sidebarCollapsed)
    );
  }, [sidebarCollapsed, storageReady]);

  function handleOpenMobileSidebar() {
    setMobileSidebarOpen(true);
  }

  function handleToggleCollapsed() {
    setSidebarCollapsed((current) => !current);
  }

  function handleCloseMobile() {
    setMobileSidebarOpen(false);
  }

  const displayName = currentRole.displayName ?? initialUser.displayName;
  const showEmpresas =
    currentRole.hasRole("inclusion_empresas_admin") ||
    currentRole.hasRole("inclusion_empresas_profesional");
  const showOds = currentRole.hasRole("ods_operador");

  return (
    <div className="min-h-screen bg-gray-50">
      <HubAnalyticsListener />
      <HubSentryUserContext
        user={{
          authUserId: initialUser.authUserId ?? null,
          email: initialUser.email,
          usuarioLogin: initialUser.usuarioLogin,
        }}
      />
      <HubTabListener />
      <div className="flex min-h-screen">
        <HubSidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          showEmpresas={showEmpresas}
          showOds={showOds}
          onCloseMobile={handleCloseMobile}
          onNavigate={handleCloseMobile}
          onToggleCollapsed={handleToggleCollapsed}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <HubHeader
            displayName={displayName}
            adminEntry={adminEntry}
            draftsControls={draftsControls}
            onOpenMobileSidebar={handleOpenMobileSidebar}
          />
          <div className="min-w-0 flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
