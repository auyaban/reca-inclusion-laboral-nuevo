"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ClipboardList,
  Menu,
  PanelLeftClose,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type HubSidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  showEmpresas: boolean;
  onCloseMobile: () => void;
  onNavigate: () => void;
  onToggleCollapsed: () => void;
};

const SIDEBAR_ITEMS = [
  {
    id: "formatos",
    label: "Formatos",
    href: "/hub",
    icon: ClipboardList,
    disabled: false,
  },
  {
    id: "empresas",
    label: "Empresas",
    href: "/hub/empresas",
    icon: Building2,
    disabled: false,
  },
  {
    id: "ods",
    label: "ODS",
    href: null,
    icon: BarChart3,
    disabled: true,
  },
] as const;

function isActiveItem(id: (typeof SIDEBAR_ITEMS)[number]["id"], pathname: string) {
  if (id === "empresas") {
    return pathname.startsWith("/hub/empresas");
  }

  if (id === "formatos") {
    return pathname === "/hub" || pathname.startsWith("/hub/admin");
  }

  return false;
}

export default function HubSidebar({
  collapsed,
  mobileOpen,
  showEmpresas,
  onCloseMobile,
  onNavigate,
  onToggleCollapsed,
}: HubSidebarProps) {
  const pathname = usePathname() ?? "/hub";

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Cerrar navegación"
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside
        data-testid="hub-sidebar"
        data-collapsed={String(collapsed)}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex border-r border-gray-200 bg-white",
          "shadow-xl transition-[transform,width] duration-200 md:sticky md:top-0",
          "md:z-30 md:min-h-screen md:translate-x-0 md:shadow-none",
          collapsed ? "md:w-20" : "md:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex w-full flex-col">
          <div
            className={cn(
              "flex h-16 items-center border-b border-gray-200 px-4",
              collapsed ? "justify-center" : "justify-between"
            )}
          >
            {collapsed ? (
              <button
                type="button"
                data-testid="hub-sidebar-toggle"
                onClick={onToggleCollapsed}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                aria-label="Expandir navegación"
                title="Expandir navegación"
              >
                <Menu className="h-5 w-5" />
              </button>
            ) : (
              <>
                <Link
                  href="/hub"
                  onClick={onNavigate}
                  className="flex min-w-0 items-center gap-3 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-reca text-white">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-none text-gray-900">
                      RECA
                    </span>
                    <span className="mt-0.5 block text-xs leading-none text-gray-500">
                      Inclusión Laboral
                    </span>
                  </span>
                </Link>

                <button
                  type="button"
                  data-testid="hub-sidebar-toggle"
                  onClick={onToggleCollapsed}
                  className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 md:inline-flex"
                  aria-label="Colapsar navegación"
                  title="Colapsar navegación"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </>
            )}

            <button
              type="button"
              aria-label="Cerrar navegación"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
              onClick={onCloseMobile}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav aria-label="Áreas del hub" className="flex-1 px-3 py-4">
            <div className="space-y-1">
              {SIDEBAR_ITEMS.map((item) => {
                if (item.id === "empresas" && !showEmpresas) {
                  return null;
                }

                const Icon = item.icon;
                const active = isActiveItem(item.id, pathname);
                const labelClassName = collapsed ? "md:sr-only" : "";

                if (item.disabled) {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="Próximamente"
                      data-testid={`hub-sidebar-link-${item.id}`}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5",
                        "text-sm font-semibold text-gray-400",
                        collapsed ? "md:justify-center" : ""
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className={labelClassName}>{item.label}</span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    data-testid={`hub-sidebar-link-${item.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5",
                      "text-sm font-semibold transition-colors",
                      collapsed ? "md:justify-center" : "",
                      active
                        ? "bg-reca text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className={labelClassName}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-gray-200 px-3 py-3">
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2",
                collapsed ? "md:justify-center md:px-2" : ""
              )}
            >
              {collapsed ? (
                <PanelLeftClose className="hidden h-4 w-4 text-gray-400 md:block" />
              ) : (
                <p className="text-xs leading-relaxed text-gray-500">
                  ODS estará disponible en una expansión futura.
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
