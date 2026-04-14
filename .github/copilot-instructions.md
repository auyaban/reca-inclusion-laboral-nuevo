When performing a code review for this repository, respond in Spanish.

Prioritize production-impacting findings: bugs, regressions, broken deploys, invalid data writes, missing validation, and missing tests for risky changes.

This project uses Next.js 16 App Router, Tailwind CSS v4, shadcn/ui, React Hook Form, Zod, Supabase, and Google Sheets/Drive integrations.

For repo context and documentation tasks, prefer minimal reads:
- Read `memory/MEMORY.md` first.
- For Notion workflow, read `memory/notion_workflow.md`.
- Do not read broad Notion history by default; prefer canonical pages (`10`, `20`, `30`, `40`, `50`) and open `60` or `70` only if blocked.
- When documenting, update one canonical Notion page first and at most one supporting page.
- Keep Notion updates short: what changed, what is pending, next step, and local/preview/prod status.

Apply these repository rules during review:
- Use `"use client"` only when a component needs browser state, hooks, or event handlers.
- Define the Zod schema before the component and use React Hook Form with `zodResolver` for forms.
- Use `cn()` from `@/lib/utils` for Tailwind class composition.
- API routes belong in `app/api/` and should return `NextResponse.json()`.
- Do not fetch Supabase directly from client components; use hooks, server actions, or server-side utilities.
- Keep component names in PascalCase and hooks/utils in camelCase.

Review especially carefully any change that touches form schemas, API routes, Supabase access, or the Google Sheets/Drive flow because those paths can affect production data.
