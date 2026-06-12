# Veridian Bank — Changelog

All notable changes to this project are documented here.

---

## [v4.0.0] — 2026-06-12 — FULL SYSTEM RELEASE

### 🗄️ Supabase — 63 Production Tables Live
- **Migration v3 complete** — all 63 tables created with indexes, RLS, triggers
- Core: `branches (5)`, `customers`, `transactions`, `loans`, `csps`
- KYC & Docs: `kyc_document`, `kyc_review_note`, `biometric_log`, `signature_card`, `signed_document`, `physical_document_submission`, `bank_document`, `document_version`
- Cards & Payments: `card`, `wallet`, `cash_vault`, `cash_transaction`, `beneficiary`, `biller`, `scheduled_payment`, `bulk_payment_batch`, `transaction_dispute`
- Investments: `recurring_deposit`, `investment`, `savings_goal`
- Loans Extended: `loan_charge_config`, `loan_document`, `npa_risk_assessment`
- CSP Extended: `csp_commission`, `csp_counter_qr`, `csp_payment_request`, `csp_wallet`
- Staff & Ops: `staff_availability`, `staff_shift`, `appointment`, `advisor_chat`, `internal_task`, `procurement_request`, `branch_asset`, `asset_log`, `branch_location`
- Compliance: `audit_log`, `fraud_alert`, `threat_alert`, `rbi_filing`, `device_session`, `voice_call_record`
- Roles: `role_permission`, `business_role`, `executive_role`
- Notifications: `system_mail`, `system_mail_v2`, `system_notification`, `notification_preference`, `alert_setting`
- Products: `bank_product`, `product_application`
- Claims: `death_claim`, `grievance`, `grievance_update`
- Config: `system_config`, `dashboard`, `footer_settings`

### 🔄 Real-time Sync (every 15 min)
- Replaced nightly sync with **15-minute real-time sync**
- `realtimeSync` function: 3 modes — `health`, `event_sync`, `bulk_upsert`
- **Fixed 500 error**: was caused by calling `base44.asServiceRole.entities` from wrong app context
- Health mode uses direct Supabase REST API (no Base44 context needed)

### 🤖 AI Advisor — Full Virtual Relationship Manager
- `frontend/components/AIAdvisor.tsx` — floating chatbot widget
  - Multi-language: **English, Hindi, Hinglish** (auto switch)
  - NLP intent engine: balance, transfer, loan, account opening, financial advice
  - **Account opening via chatbot**: full 7-field onboarding workflow
  - **Voice transactions**: "Rahul ko 500 rupaye bhejo" → confirm → process
  - Text-to-speech responses (hi-IN + en-IN)
  - Customer financial analysis & personalized suggestions
- `frontend/components/VoiceCommandEngine.tsx` — standalone voice processor
  - Web Speech API, hold-to-speak, Hinglish/Hindi/English
  - Intents: TRANSFER, CHECK_BALANCE, OPEN_ACCOUNT, LOAN_ENQUIRY, BLOCK_CARD, FD_ENQUIRY
- `frontend/pages/AdvisorChat.tsx` — full advisor page
  - Customer health card, AI suggestions, voice command log

### 📧 Email Policy — Enforced
- Admin/SuperAdmin emails **DISABLED** — portal dashboard only
- Customer emails only for: Withdrawal, Deposit, Account Opening, OTP
- `system_mail.portal_only = true` for all internal alerts
- See `docs/EMAIL_POLICY.md`

### 📁 Entity Schemas — All 63 entities documented
- Added 53 new entity JSON files to `entities/`
- Every entity includes: schema, supabase_table mapping, sync config

---

## [v3.0.0] — 2026-06-11

### Added
- `scripts/supabase_migration_v3_full.sql` — full 63-table schema
- `docs/EMAIL_POLICY.md` — strict no-admin-email rule
- `backend/functions/realtimeSync.ts` — real-time sync function
- Entity schemas: `SystemMail.json`, `BiometricLog.json`, `FraudAlert.json`, `AuditLog.json`, `SystemNotification.json`

---

## [v2.0.0] — 2026-06-11

### Added
- `scripts/supabase_migration.sql` — initial 5-table schema (branches, customers, transactions, loans, csps)
- Backend functions: `createTransaction.ts`, `getCustomer.ts`, `getLoanStatus.ts`, `syncToSupabase.ts`
- `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/SUPABASE.md`

---

## [v1.0.0] — 2026-06-11

### Added
- Initial repository setup
- Core entity schemas: `Customer.json`, `Transaction.json`, `Branch.json`, `CSP.json`, `Loan.json`
- `README.md` with project overview
