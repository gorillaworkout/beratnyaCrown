# Athlete Savings Design

## Goal
Add a transparent per-athlete savings ledger for future competitions such as Kejurnas and Asian championships.

## Access
- Every authenticated Crown member can view every athlete's balance and transaction history.
- Only admins can create or edit transactions.
- Transactions cannot be deleted.

## Data model
`crown-athlete-savings-transactions` stores one immutable-identity ledger row per deposit or withdrawal: athlete ID/name, type, positive integer amount, purpose label, transaction date, optional note, creator identity/time, updater identity/time.

`crown-athlete-savings-audits` stores every edit: transaction ID, full before/after snapshots, mandatory edit reason, editor identity, edit time.

Balance is derived from the ledger: deposits minus withdrawals. Negative balances are valid and displayed as debt.

## Security
Reads use Firestore client access for authenticated users. Writes use authenticated server API routes only. Routes verify Firebase ID tokens and re-check the caller's `crown-athletes/{uid}.role == admin` status. Firestore rules deny direct client writes and all deletes.

## UI
A new `Tabungan Atlet` sidebar menu opens a dedicated page. Summary cards show total savings, total debt, and athlete count. Athlete cards/table show balance or debt. Selecting an athlete reveals transaction history. Admins receive add/edit dialogs; members receive read-only UI. Editing requires a reason and exposes audit history.

## QRIS change
The Info Board replaces one payment card with Bandung, Jakarta, and donation/non-cash QRIS cards, using the three user-provided named assets and explicit purpose labels. Bandung and Jakarta both show Rp13,000 per practice.

## Verification
Unit-test ledger calculations and validation, emulator-test read/write rules, type-check, production build, then browser-test desktop/mobile locally. Do not deploy without explicit instruction.
