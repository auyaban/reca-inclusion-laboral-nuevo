import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "@/lib/security/csp";

describe("buildContentSecurityPolicy", () => {
  it("incluye los origenes HTTPS y WSS de Supabase en produccion", () => {
    const policy = buildContentSecurityPolicy({
      supabaseUrl: "https://demo-project.supabase.co",
      environment: "production",
    });

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain(
      "connect-src 'self' https://demo-project.supabase.co wss://demo-project.supabase.co"
    );
    expect(policy).not.toContain("ws:");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("mantiene una politica base sin Supabase configurado", () => {
    const policy = buildContentSecurityPolicy({
      supabaseUrl: "",
      environment: "production",
    });

    expect(policy).toContain("connect-src 'self'");
    expect(policy).toContain("worker-src 'self' blob:");
    expect(policy).not.toContain("supabase.co");
  });

  it("habilita compatibilidad de desarrollo para Turbopack", () => {
    const policy = buildContentSecurityPolicy({
      supabaseUrl: "https://demo-project.supabase.co",
      environment: "development",
    });

    expect(policy).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(policy).toContain(
      "connect-src 'self' https://demo-project.supabase.co wss://demo-project.supabase.co ws:"
    );
  });

  it("habilita vercel.live solo en previews para evitar ruido de CSP en QA", () => {
    const policy = buildContentSecurityPolicy({
      supabaseUrl: "https://demo-project.supabase.co",
      environment: "production",
      vercelEnv: "preview",
    });

    expect(policy).toContain(
      "script-src 'self' 'unsafe-inline' https://vercel.live"
    );
    expect(policy).toContain("frame-src https://vercel.live");
    expect(policy).toContain(
      "connect-src 'self' https://demo-project.supabase.co wss://demo-project.supabase.co https://vercel.live"
    );
  });

  it("no habilita vercel.live en produccion", () => {
    const policy = buildContentSecurityPolicy({
      supabaseUrl: "https://demo-project.supabase.co",
      environment: "production",
      vercelEnv: "production",
    });

    expect(policy).not.toContain("https://vercel.live");
  });
});
