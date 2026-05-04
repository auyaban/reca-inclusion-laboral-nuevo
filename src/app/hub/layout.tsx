import { Suspense, type ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";
import HubAdminLinkLoader from "@/components/layout/HubAdminLinkLoader";
import HubDraftsControlsFallback from "@/components/layout/HubDraftsControlsFallback";
import HubDraftsLoader from "@/components/layout/HubDraftsLoader";
import HubShell, { type HubShellUser } from "@/components/layout/HubShell";
import { getCurrentUserContext } from "@/lib/auth/roles";
import { getHubShellData, type HubShellData } from "@/lib/drafts/hubInitialData";

type HubLayoutProps = {
  children: ReactNode;
};

function readUsuarioLogin(user: HubShellData["initialUser"]) {
  const value = (user?.app_metadata as Record<string, unknown> | undefined)
    ?.usuario_login;

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildInitialUser(
  shellData: HubShellData,
  context: Awaited<ReturnType<typeof getCurrentUserContext>> | null
): HubShellUser {
  if (context?.ok) {
    return {
      email: context.profile.email,
      displayName: context.profile.displayName,
      usuarioLogin: context.profile.usuarioLogin,
      profesionalId: context.profile.id,
      roles: context.roles,
    };
  }

  return {
    email: shellData.initialUser?.email ?? null,
    displayName: shellData.initialUserName,
    usuarioLogin: readUsuarioLogin(shellData.initialUser),
    profesionalId: null,
    roles: [],
  };
}

async function getCurrentUserContextForShell() {
  try {
    return await getCurrentUserContext();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[hub-layout] getCurrentUserContext failed", error);
    return null;
  }
}

export default async function HubLayout({ children }: HubLayoutProps) {
  const [shellData, currentUserContext] = await Promise.all([
    getHubShellData(),
    getCurrentUserContextForShell(),
  ]);

  const initialUser = buildInitialUser(shellData, currentUserContext);

  return (
    <HubShell
      initialUser={initialUser}
      adminEntry={
        <Suspense fallback={null}>
          <HubAdminLinkLoader
            user={shellData.initialUser}
            roles={initialUser.roles}
          />
        </Suspense>
      }
      draftsControls={
        <Suspense fallback={<HubDraftsControlsFallback />}>
          <HubDraftsLoader userId={shellData.initialUserId} />
        </Suspense>
      }
    >
      {children}
    </HubShell>
  );
}
