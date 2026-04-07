When performing a code review for this repository, respond in Spanish.

Prioritize production-impacting findings: bugs, regressions, broken deploys, invalid data writes, missing validation, and missing tests for risky changes.

This project uses Next.js 16 App Router, Tailwind CSS v4, shadcn/ui, React Hook Form, Zod, Supabase, and Google Sheets/Drive integrations.

Apply these repository rules during review:
- Use `"use client"` only when a component needs browser state, hooks, or event handlers.
- Define the Zod schema before the component and use React Hook Form with `zodResolver` for forms.
- Use `cn()` from `@/lib/utils` for Tailwind class composition.
- API routes belong in `app/api/` and should return `NextResponse.json()`.
- Do not fetch Supabase directly from client components; use hooks, server actions, or server-side utilities.
- Keep component names in PascalCase and hooks/utils in camelCase.

Review especially carefully any change that touches form schemas, API routes, Supabase access, or the Google Sheets/Drive flow because those paths can affect production data.
