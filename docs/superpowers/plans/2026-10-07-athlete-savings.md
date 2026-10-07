# Athlete Savings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure auditable per-athlete savings ledger and split the Info Board payment methods by purpose/location.

**Architecture:** Pure ledger helpers own validation and balance calculations. Firestore stores transactions plus append-only edit audits. Authenticated API routes verify Firebase tokens and admin role before writes; clients read via Firestore under restrictive rules.

**Tech Stack:** Next.js 14, TypeScript, React 18, Firebase Auth/Firestore/Admin SDK, Node test runner, Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-07-athlete-savings-design.md`

## Global Constraints

- No transaction deletion.
- Admin-only create/edit; authenticated members can read all balances/history.
- Negative balance is valid and labelled debt.
- Edit requires reason and creates before/after audit.
- Preserve existing unrelated dirty files.
- Do not deploy.

---

### Task 1: Ledger domain

**Files:**
- Create: `src/lib/athlete-savings.ts`
- Test: `src/lib/athlete-savings.test.ts`

**Interfaces:**
- Produces `calculateSavingsBalance`, `validateSavingsInput`, ledger types and formatting helpers.

- [ ] Write tests covering deposits, withdrawals, negative debt, invalid amount/date/type/purpose, edit reason.
- [ ] Run tests and verify RED due to missing module.
- [ ] Implement minimal pure helpers.
- [ ] Run tests and verify GREEN.

### Task 2: Secure persistence

**Files:**
- Create: `src/lib/server-auth.ts`
- Create: `src/app/api/savings/route.ts`
- Create: `src/app/api/savings/[id]/route.ts`
- Modify: `firestore.rules`
- Modify: `scripts/test-firestore-rules.mjs`

**Interfaces:**
- Consumes validated ledger input.
- Produces admin-only POST/PATCH routes and member-readable collections.

- [ ] Extend emulator assertions first; verify RED.
- [ ] Add rules: authenticated read, no direct transaction write/delete, admin-only audit read, no client audit writes.
- [ ] Implement bearer-token admin verification.
- [ ] Implement create and transactional edit+audit routes.
- [ ] Run emulator tests and domain tests.

### Task 3: Savings UI

**Files:**
- Create: `src/app/dashboard/savings/page.tsx`
- Modify: `src/components/sidebar.tsx`

**Interfaces:**
- Reads `crown-athletes`, savings transactions and audits; calls POST/PATCH with Firebase ID token.

- [ ] Add sidebar menu visible to every authenticated member.
- [ ] Build searchable athlete balances and selected-athlete history.
- [ ] Add admin-only deposit/withdrawal form and edit dialog with mandatory reason.
- [ ] Show negative balance as debt and expose edit history.
- [ ] Type-check.

### Task 4: QRIS payment cards

**Files:**
- Create: `public/qris-kas-bandung.jpg`
- Create: `public/qris-kas-jakarta.jpeg`
- Create: `public/qris-donasi.jpeg`
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Produces three purpose-labelled payment cards.

- [ ] Copy the three named source images from Downloads and verify hashes.
- [ ] Replace the single payment card with Bandung, Jakarta, donation/non-cash cards.
- [ ] Include merchant, NMID, purpose, and Rp13,000/practice for both cities.
- [ ] Add an explicit choose-the-correct-QR warning.

### Task 5: Full verification

**Files:** all changed files.

- [ ] Run domain tests.
- [ ] Run Firestore emulator tests.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Start local app and browser-check desktop/mobile, member read-only and admin controls where credentials permit.
- [ ] Review diff independently; fix blocking findings.
- [ ] Report exact verification results. Do not commit/push/deploy unless requested.
