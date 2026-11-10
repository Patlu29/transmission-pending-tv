# 0001: Use Vite, React, React Three Fiber and TypeScript 6 with ESLint

## Status
Accepted (2026-11-10)

## Context
The team default is Vite, React, TypeScript (strict), three.js through React Three Fiber, drei, zustand, Vitest, Playwright, ESLint and Prettier. The site is one page with a modelled TV (FR-7) and a DOM layer that must carry the intro text, controls and a non-WebGL presentation (FR-18, FR-20). Nothing in the requirements calls for server rendering, physics or a game engine.

On 2026-11-10 the Vite `react-ts` template ships TypeScript 7.0 and oxlint. typescript-eslint 8.72.2 declares support for `typescript >=4.8.4 <6.1.0`, so ESLint with TypeScript rules cannot run against TypeScript 7.

## Decision
- Keep the default stack: Vite 8.3.7, React 19.3.1, three 0.187.0, `@react-three/fiber` 9.8.2 (peer `react >=19 <19.4`), `@react-three/drei` 10.7.9, zustand 5.1.0, Vitest 5.1.0, Playwright 1.65.0.
- Use **TypeScript 6.0.3** (the newest typescript-eslint supports) and **ESLint 10 with typescript-eslint**, the team default, rather than the template's TypeScript 7 and oxlint. This keeps `eslint-plugin-react-hooks` 7 (React Compiler-aware rules) and a lint rule that enforces facts-test independence (ADR 0003).
- `strict`, `noUncheckedIndexedAccess` and `erasableSyntaxOnly` are on. The last keeps every `.ts` file runnable under Node's type stripping, so build scripts need no `tsx`.
- `leva` and `r3f-perf` are devDependencies, imported only behind `import.meta.env.DEV`.
- No `@react-three/postprocessing` (ADR 0005) and no `@react-three/rapier`.

## Consequences
- Agents get the stack and tooling the team skills assume.
- Type checking uses the slower JS compiler; the project is small, so this does not matter.
- Revisit when typescript-eslint supports TypeScript 7: bump `typescript`, and keep ESLint unless oxlint covers the React hooks and restricted-import rules.
