-- ============================================================
-- Veridian Bank — FULL Migration Script v3.0
-- ALL 60+ entities from BankNet app
-- Run in: https://supabase.com/dashboard/project/ssrlburjpwnpoiclaiss/sql/new
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- DROP ALL (clean re-run)
-- ============================================================
DROP TABLE IF EXISTS public.system_mail_v2 CASCADE;
DROP TABLE IF EXISTS public.system_mail CASCADE;
DROP TABLE IF EXISTS public.system_notification CASCADE;
DROP TABLE IF EXISTS public.system_config CASCADE;
DROP TABLE IF EXISTS public.fraud_alert CASCADE;
DROP TABLE IF EXISTS public.threat_alert CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.voice_call_record CASCADE;
DROP TABLE IF EXISTS public.device_session CASCADE;
DROP TABLE IF EXISTS public.rbi_filing CASCADE;
DROP TABLE IF EXISTS public.npa_risk_assessment CASCADE;
DROP TABLE IF EXISTS public.loan_charge_config CASCADE;
DROP TABLE IF EXISTS public.loan_document CASCADE;
DROP TABLE IF EXISTS public.loans CASCADE;
DROP TABLE IF EXISTS public.recurring_deposit CASCADE;
DROP TABLE IF EXISTS public.investment CASCADE;
DROP TABLE IF EXISTS public.savings_goal CASCADE;
DROP TABLE IF EXISTS public.scheduled_payment CASCADE;
DROP TABLE IF EXISTS public.wallet CASCADE;
DROP TABLE IF EXISTS public.cash_vault CASCADE;
DROP TABLE IF EXISTS public.cash_transaction CASCADE;
DROP TABLE IF EXISTS public.card CASCADE;
DROP TABLE IF EXISTS public.beneficiary CASCADE;
DROP TABLE IF EXISTS public.biller CASCADE;
DROP TABLE IF EXISTS public.bulk_payment_batch CASCADE;
DROP TABLE IF EXISTS public.transaction_dispute CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.product_application CASCADE;
DROP TABLE IF EXISTS public.bank_product CASCADE;
DROP TABLE IF EXISTS public.bank_document CASCADE;
DROP TABLE IF EXISTS public.document_version CASCADE;
DROP TABLE IF EXISTS public.signed_document CASCADE;
DROP TABLE IF EXISTS public.physical_document_submission CASCADE;
DROP TABLE IF EXISTS public.kyc_document CASCADE;
DROP TABLE IF EXISTS public.kyc_review_note CASCADE;
DROP TABLE IF EXISTS public.signature_card CASCADE;
DROP TABLE IF EXISTS public.biometric_log CASCADE;
DROP TABLE IF EXISTS public.death_claim CASCADE;
DROP TABLE IF EXISTS public.grievance_update CASCADE;
DROP TABLE IF EXISTS public.grievance CASCADE;
DROP TABLE IF EXISTS public.internal_task CASCADE;
DROP TABLE IF EXISTS public.notification_preference CASCADE;
DROP TABLE IF EXISTS public.alert_setting CASCADE;
DROP TABLE IF EXISTS public.appointment CASCADE;
DROP TABLE IF EXISTS public.staff_shift CASCADE;
DROP TABLE IF EXISTS public.staff_availability CASCADE;
DROP TABLE IF EXISTS public.advisor_chat CASCADE;
DROP TABLE IF EXISTS public.procurement_request CASCADE;
DROP TABLE IF EXISTS public.branch_asset CASCADE;
DROP TABLE IF EXISTS public.asset_log CASCADE;
DROP TABLE IF EXISTS public.branch_location CASCADE;
DROP TABLE IF EXISTS public.csp_commission CASCADE;
DROP TABLE IF EXISTS public.csp_counter_qr CASCADE;
DROP TABLE IF EXISTS public.csp_payment_request CASCADE;
DROP TABLE IF EXISTS public.csp_wallet CASCADE;
DROP TABLE IF EXISTS public.executive_role CASCADE;
DROP TABLE IF EXISTS public.business_role CASCADE;
DROP TABLE IF EXISTS public.role_permission CASCADE;
DROP TABLE IF EXISTS public.footer_settings CASCADE;
DROP TABLE IF EXISTS public.dashboard CASCADE;
DROP TABLE IF EXISTS public.csps CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE public.branches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  branch_code VARCHAR(20) UNIQUE NOT NULL,
  branch_name VARCHAR(255) NOT NULL,
  address TEXT, city VARCHAR(100), state VARCHAR(100),
  manager_name VARCHAR(255), phone_number VARCHAR(15),
  total_customers INTEGER DEFAULT 0, total_deposits NUMERIC(18,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Under Renovation')),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL, phone_number VARCHAR(15), email VARCHAR(255),
  account_number VARCHAR(20) UNIQUE, account_type VARCHAR(20) DEFAULT 'Savings',
  balance NUMERIC(15,2) DEFAULT 0.00, branch_code VARCHAR(20) REFERENCES public.branches(branch_code) ON DELETE SET NULL,
  kyc_status VARCHAR(20) DEFAULT 'Pending', account_status VARCHAR(20) DEFAULT 'Active',
  date_of_birth DATE, address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id VARCHAR(30) UNIQUE NOT NULL,
  customer_id VARCHAR(20) REFERENCES public.customers(customer_id) ON DELETE SET NULL,
  account_number VARCHAR(20), transaction_type VARCHAR(30), amount NUMERIC(15,2) NOT NULL,
  balance_after NUMERIC(15,2), recipient_account VARCHAR(20), recipient_name VARCHAR(255),
  transfer_mode VARCHAR(20), description TEXT, reference_number VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Pending', initiated_from VARCHAR(20), processing_fee NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.loans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  loan_id VARCHAR(30) UNIQUE NOT NULL,
  customer_id VARCHAR(20) REFERENCES public.customers(customer_id) ON DELETE SET NULL,
  account_number VARCHAR(20), loan_type VARCHAR(50),
  loan_amount NUMERIC(15,2), approved_amount NUMERIC(15,2),
  interest_rate NUMERIC(5,2), tenure_months INTEGER, emi_amount NUMERIC(10,2),
  outstanding_amount NUMERIC(15,2),
  status VARCHAR(30) DEFAULT 'Applied', application_date DATE DEFAULT CURRENT_DATE,
  disbursement_date DATE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.csps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  csp_id VARCHAR(20) UNIQUE NOT NULL, csp_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255), phone_number VARCHAR(15), address TEXT,
  village VARCHAR(100), district VARCHAR(100), state VARCHAR(100),
  parent_branch VARCHAR(20) REFERENCES public.branches(branch_code) ON DELETE SET NULL,
  services_offered JSONB DEFAULT '[]', daily_transaction_limit NUMERIC(12,2) DEFAULT 50000,
  cash_available NUMERIC(12,2) DEFAULT 0, status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CARDS & WALLET
-- ============================================================

CREATE TABLE public.card (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  card_number VARCHAR(20) UNIQUE, customer_id VARCHAR(20) REFERENCES public.customers(customer_id),
  account_number VARCHAR(20), card_type VARCHAR(20), network VARCHAR(20),
  expiry_date DATE, cvv_hash TEXT, daily_limit NUMERIC(12,2),
  is_active BOOLEAN DEFAULT TRUE, is_blocked BOOLEAN DEFAULT FALSE,
  pin_set BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.wallet (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_id VARCHAR(30) UNIQUE NOT NULL,
  customer_id VARCHAR(20) REFERENCES public.customers(customer_id),
  balance NUMERIC(12,2) DEFAULT 0, currency VARCHAR(5) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.cash_vault (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vault_id VARCHAR(20) UNIQUE NOT NULL, branch_code VARCHAR(20) REFERENCES public.branches(branch_code),
  current_balance NUMERIC(15,2) DEFAULT 0, minimum_balance NUMERIC(15,2) DEFAULT 0,
  maximum_capacity NUMERIC(15,2), last_replenished_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.cash_transaction (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  txn_ref VARCHAR(30) UNIQUE NOT NULL, vault_id VARCHAR(20),
  transaction_type VARCHAR(20), amount NUMERIC(12,2), performed_by VARCHAR(255),
  notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS & BENEFICIARIES
-- ============================================================

CREATE TABLE public.beneficiary (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id VARCHAR(20) REFERENCES public.customers(customer_id),
  name VARCHAR(255), account_number VARCHAR(20), ifsc_code VARCHAR(15),
  bank_name VARCHAR(255), transfer_mode VARCHAR(20),
  is_verified BOOLEAN DEFAULT FALSE, nick_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.biller (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  biller_id VARCHAR(30) UNIQUE NOT NULL, biller_name VARCHAR(255),
  category VARCHAR(100), logo_url TEXT, is_active BOOLEAN DEFAULT TRUE,
  payment_modes JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.scheduled_payment (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  payment_ref VARCHAR(30) UNIQUE, customer_id VARCHAR(20) REFERENCES public.customers(customer_id),
  payment_type VARCHAR(30), amount NUMERIC(12,2), frequency VARCHAR(20),
  next_execution_date DATE, end_date DATE, status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.bulk_payment_batch (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  batch_id VARCHAR(30) UNIQUE NOT NULL, initiated_by VARCHAR(255),
  total_count INTEGER DEFAULT 0, success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0, total_amount NUMERIC(15,2),
  status VARCHAR(20) DEFAULT 'Pending', file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.transaction_dispute (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  dispute_id VARCHAR(30) UNIQUE, transaction_id VARCHAR(30),
  customer_id VARCHAR(20) REFERENCES public.customers(customer_id),
  reason TEXT, status VARCHAR(20) DEFAULT 'Open',
  resolution TEXT, resolved_by VARCHAR(255), resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEPOSITS & INVESTMENTS
-- ============================================================

CREATE TABLE public.recurring_deposit (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rd_id VARCHAR(30) UNIQUE, customer_id VARCHAR(20) REFERENCES public.customers(customer_id),
  monthly_amount NUMERIC(12,2), tenure_months INTEGER, interest_rate NUMERIC(5,2),
  maturity_amount NUMERIC(15,2), start_date DATE, maturity_date DATE,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.investment (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  investment_id VARCHAR(30) UNIQUE, customer_id VARCHAR(20) REFERENCES public.customers(customer_id),
  investment_type VARCHAR(50), amount NUMERIC(15,2), current_value NUMERIC(15,2),
  purchase_date DATE, maturity_date DATE, status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.savings_goal (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  goal_id VARCHAR(30) UNIQUE, customer_id VARCHAR(20) REFERENCES public.customers(customer_id),
  goal_name VARCHAR(255), target_amount NUMERIC(15,2), current_amount NUMERIC(15,2) DEFAULT 0,
  target_date DATE, status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOANS EXTENDED
-- ============================================================

CREATE TABLE public.loan_charge_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  loan_type VARCHAR(50), charge_name VARCHAR(100),
  charge_type VARCHAR(20), charge_value NUMERIC(10,4),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.loan_document (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  loan_id VARCHAR(30), document_type VARCHAR(100),
  file_url TEXT, uploaded_by VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.npa_risk_assessment (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  loan_id VARCHAR(30), customer_id VARCHAR(20),
  risk_score INTEGER, risk_category VARCHAR(20),
  days_overdue INTEGER DEFAULT 0, last_assessed_at TIMESTAMPTZ,
  notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- KYC & DOCUMENTS
-- ============================================================

CREATE TABLE public.kyc_document (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id VARCHAR(20) REFERENCES public.customers(customer_id),
  document_type VARCHAR(50), document_number VARCHAR(50),
  file_url TEXT, status VARCHAR(20) DEFAULT 'Pending',
  reviewed_by VARCHAR(255), reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.kyc_review_note (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id VARCHAR(20), reviewed_by VARCHAR(255),
  note TEXT, action_taken VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.signature_card (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id VARCHAR(20) REFERENCES public.customers(customer_id),
  account_number VARCHAR(20), signature_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.biometric_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id VARCHAR(20), account_number VARCHAR(20),
  biometric_type VARCHAR(30), status VARCHAR(20),
  quality_level VARCHAR(20), enrolled_at TIMESTAMPTZ,
  device_id VARCHAR(50), created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.bank_document (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  doc_id VARCHAR(30) UNIQUE, title VARCHAR(255),
  category VARCHAR(100), file_url TEXT, version VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE, uploaded_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.document_version (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  doc_id VARCHAR(30), version VARCHAR(10),
  file_url TEXT, change_notes TEXT, created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.signed_document (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id VARCHAR(20), document_type VARCHAR(100),
  file_url TEXT, signed_at TIMESTAMPTZ,
  ip_address VARCHAR(45), device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.physical_document_submission (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id VARCHAR(20), document_type VARCHAR(100),
  submitted_at TIMESTAMPTZ, received_by VARCHAR(255),
  branch_code VARCHAR(20), status VARCHAR(20) DEFAULT 'Received',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS & APPLICATIONS
-- ============================================================

CREATE TABLE public.bank_product (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id VARCHAR(30) UNIQUE, product_name VARCHAR(255),
  category VARCHAR(100), description TEXT,
  interest_rate NUMERIC(5,2), min_amount NUMERIC(15,2), max_amount NUMERIC(15,2),
  tenure_min INTEGER, tenure_max INTEGER,
  is_active BOOLEAN DEFAULT TRUE, features JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.product_application (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  application_id VARCHAR(30) UNIQUE, customer_id VARCHAR(20),
  product_id VARCHAR(30), status VARCHAR(30) DEFAULT 'Pending',
  applied_at TIMESTAMPTZ DEFAULT NOW(), reviewed_by VARCHAR(255),
  notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STAFF & OPERATIONS
-- ============================================================

CREATE TABLE public.staff_availability (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  staff_email VARCHAR(255), branch_code VARCHAR(20),
  available_date DATE, time_slots JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.staff_shift (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  staff_email VARCHAR(255), branch_code VARCHAR(20),
  shift_date DATE, shift_type VARCHAR(20),
  start_time TIME, end_time TIME, status VARCHAR(20) DEFAULT 'Scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.appointment (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  appointment_id VARCHAR(30) UNIQUE, customer_id VARCHAR(20),
  branch_code VARCHAR(20), purpose VARCHAR(255),
  appointment_date DATE, appointment_time TIME,
  status VARCHAR(20) DEFAULT 'Scheduled', staff_email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.advisor_chat (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id VARCHAR(50), customer_id VARCHAR(20),
  advisor_email VARCHAR(255), message TEXT,
  sender_role VARCHAR(20), is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.internal_task (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id VARCHAR(30) UNIQUE, title VARCHAR(255),
  assigned_to VARCHAR(255), assigned_by VARCHAR(255),
  priority VARCHAR(20) DEFAULT 'Medium', status VARCHAR(20) DEFAULT 'Open',
  due_date DATE, description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.procurement_request (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id VARCHAR(30) UNIQUE, item_name VARCHAR(255),
  quantity INTEGER, estimated_cost NUMERIC(12,2),
  requested_by VARCHAR(255), branch_code VARCHAR(20),
  status VARCHAR(20) DEFAULT 'Pending', approved_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.branch_asset (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  asset_id VARCHAR(30) UNIQUE, asset_name VARCHAR(255),
  branch_code VARCHAR(20), category VARCHAR(100),
  purchase_date DATE, purchase_value NUMERIC(12,2),
  current_value NUMERIC(12,2), status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.asset_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  asset_id VARCHAR(30), action VARCHAR(50),
  performed_by VARCHAR(255), notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.branch_location (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  branch_code VARCHAR(20) REFERENCES public.branches(branch_code),
  latitude NUMERIC(10,7), longitude NUMERIC(10,7),
  google_maps_url TEXT, landmark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CSP EXTENDED
-- ============================================================

CREATE TABLE public.csp_commission (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  csp_id VARCHAR(20), transaction_type VARCHAR(50),
  commission_rate NUMERIC(5,4), flat_amount NUMERIC(10,2),
  month_year VARCHAR(7), total_transactions INTEGER DEFAULT 0,
  total_commission NUMERIC(12,2) DEFAULT 0, status VARCHAR(20) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.csp_counter_qr (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  csp_id VARCHAR(20), qr_code TEXT,
  qr_image_url TEXT, is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.csp_payment_request (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id VARCHAR(30) UNIQUE, csp_id VARCHAR(20),
  customer_id VARCHAR(20), amount NUMERIC(12,2),
  payment_type VARCHAR(30), status VARCHAR(20) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.csp_wallet (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  csp_id VARCHAR(20) UNIQUE, balance NUMERIC(12,2) DEFAULT 0,
  last_recharge_amount NUMERIC(12,2), last_recharge_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROLES & PERMISSIONS
-- ============================================================

CREATE TABLE public.role_permission (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role_name VARCHAR(50), module_name VARCHAR(100),
  can_view BOOLEAN DEFAULT FALSE, can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE, can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.business_role (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role_id VARCHAR(30) UNIQUE, role_name VARCHAR(100),
  description TEXT, is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.executive_role (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  staff_email VARCHAR(255), role_id VARCHAR(30),
  branch_code VARCHAR(20), assigned_by VARCHAR(255),
  valid_from DATE, valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMPLIANCE & SECURITY
-- ============================================================

CREATE TABLE public.audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_email VARCHAR(255), action VARCHAR(100),
  entity_type VARCHAR(100), entity_id VARCHAR(50),
  old_value JSONB, new_value JSONB,
  ip_address VARCHAR(45), user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.fraud_alert (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  alert_id VARCHAR(30) UNIQUE, customer_id VARCHAR(20),
  transaction_id VARCHAR(30), alert_type VARCHAR(50),
  severity VARCHAR(20), description TEXT,
  status VARCHAR(20) DEFAULT 'Open', resolved_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.threat_alert (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  alert_id VARCHAR(30) UNIQUE, threat_type VARCHAR(50),
  source_ip VARCHAR(45), severity VARCHAR(20),
  description TEXT, status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.rbi_filing (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  filing_id VARCHAR(30) UNIQUE, filing_type VARCHAR(100),
  period VARCHAR(20), submitted_by VARCHAR(255),
  submitted_at TIMESTAMPTZ, file_url TEXT,
  status VARCHAR(20) DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.device_session (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id VARCHAR(20), device_id VARCHAR(100),
  device_type VARCHAR(30), os_version VARCHAR(50),
  app_version VARCHAR(20), ip_address VARCHAR(45),
  is_active BOOLEAN DEFAULT TRUE, last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.voice_call_record (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  call_id VARCHAR(30) UNIQUE, customer_id VARCHAR(20),
  staff_email VARCHAR(255), call_type VARCHAR(20),
  duration_seconds INTEGER, recording_url TEXT,
  call_purpose TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GRIEVANCES & NOTIFICATIONS
-- ============================================================

CREATE TABLE public.grievance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  grievance_id VARCHAR(30) UNIQUE, customer_id VARCHAR(20),
  subject VARCHAR(255), category VARCHAR(100),
  description TEXT, priority VARCHAR(20) DEFAULT 'Medium',
  status VARCHAR(20) DEFAULT 'Open', assigned_to VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.grievance_update (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  grievance_id VARCHAR(30), updated_by VARCHAR(255),
  note TEXT, status_changed_to VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.notification_preference (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id VARCHAR(20) REFERENCES public.customers(customer_id),
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  transaction_alerts BOOLEAN DEFAULT TRUE,
  promotional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.alert_setting (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id VARCHAR(20), alert_type VARCHAR(50),
  threshold_amount NUMERIC(12,2), is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SYSTEM MAIL (PORTAL ONLY — NO ADMIN EMAIL)
-- Purpose: store all internal alerts for Super Admin dashboard
-- Emails ONLY go to customers for: Withdrawal, Deposit,
--   Account Opening, OTP — NOT to admin/super admin
-- ============================================================

CREATE TABLE public.system_mail (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mail_id VARCHAR(30) UNIQUE,
  mail_type VARCHAR(50) NOT NULL,    -- 'CUSTOMER_SERVICE' | 'INTERNAL_ALERT'
  recipient_type VARCHAR(20) NOT NULL, -- 'CUSTOMER' only for email
  recipient_email VARCHAR(255),
  subject VARCHAR(500),
  body TEXT,
  customer_id VARCHAR(20),
  account_number VARCHAR(20),
  transaction_id VARCHAR(30),
  metadata JSONB DEFAULT '{}',
  email_sent BOOLEAN DEFAULT FALSE,  -- TRUE only for customer service mails
  portal_only BOOLEAN DEFAULT FALSE, -- TRUE = show on dashboard, no email
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.system_mail_v2 (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mail_id VARCHAR(30) UNIQUE,
  category VARCHAR(50),              -- 'transaction','account','otp','alert'
  send_email BOOLEAN DEFAULT FALSE,  -- ONLY true for customer-facing
  recipient_email VARCHAR(255),
  subject VARCHAR(500), body TEXT,
  customer_id VARCHAR(20),
  portal_display BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.system_notification (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  notification_id VARCHAR(30) UNIQUE,
  target_role VARCHAR(30),           -- 'super_admin','admin','customer'
  title VARCHAR(255), message TEXT,
  notification_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  customer_id VARCHAR(20), metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DASHBOARD & CONFIG
-- ============================================================

CREATE TABLE public.dashboard (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  widget_key VARCHAR(100) UNIQUE, title VARCHAR(255),
  widget_type VARCHAR(50), config JSONB DEFAULT '{}',
  visible_to VARCHAR(30) DEFAULT 'super_admin',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.footer_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE, setting_value TEXT,
  category VARCHAR(50), updated_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.system_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL, config_value TEXT,
  category VARCHAR(50), description TEXT,
  updated_by VARCHAR(255), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEATH CLAIM
-- ============================================================

CREATE TABLE public.death_claim (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  claim_id VARCHAR(30) UNIQUE, customer_id VARCHAR(20),
  claimant_name VARCHAR(255), relationship VARCHAR(50),
  death_certificate_url TEXT, account_number VARCHAR(20),
  claim_amount NUMERIC(15,2), status VARCHAR(20) DEFAULT 'Filed',
  processed_by VARCHAR(255), created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_customers_account ON public.customers(account_number);
CREATE INDEX idx_customers_branch ON public.customers(branch_code);
CREATE INDEX idx_customers_status ON public.customers(account_status);
CREATE INDEX idx_transactions_customer ON public.transactions(customer_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX idx_loans_customer ON public.loans(customer_id);
CREATE INDEX idx_loans_status ON public.loans(status);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_email);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_fraud_alert_customer ON public.fraud_alert(customer_id);
CREATE INDEX idx_system_mail_type ON public.system_mail(mail_type);
CREATE INDEX idx_system_mail_portal ON public.system_mail(portal_only);
CREATE INDEX idx_system_mail_created ON public.system_mail(created_at DESC);
CREATE INDEX idx_system_notification_role ON public.system_notification(target_role);
CREATE INDEX idx_kyc_customer ON public.kyc_document(customer_id);
CREATE INDEX idx_biometric_customer ON public.biometric_log(customer_id);
CREATE INDEX idx_device_session_customer ON public.device_session(customer_id);
CREATE INDEX idx_grievance_customer ON public.grievance(customer_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_mail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_public_read" ON public.branches FOR SELECT USING (status = 'Active');
CREATE POLICY "customers_own_record" ON public.customers FOR SELECT USING (auth.uid()::text = customer_id OR auth.role() = 'service_role');
CREATE POLICY "transactions_own" ON public.transactions FOR SELECT USING (auth.uid()::text = customer_id OR auth.role() = 'service_role');
CREATE POLICY "loans_own" ON public.loans FOR SELECT USING (auth.uid()::text = customer_id OR auth.role() = 'service_role');
CREATE POLICY "system_mail_service_role" ON public.system_mail FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "system_notification_service_role" ON public.system_notification FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "audit_log_service_role" ON public.audit_log FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- AUTO updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_csps_updated_at BEFORE UPDATE ON public.csps FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_wallet_updated_at BEFORE UPDATE ON public.wallet FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_card_updated_at BEFORE UPDATE ON public.card FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- SAMPLE DATA
-- ============================================================
INSERT INTO public.branches (branch_code, branch_name, city, state, manager_name, phone_number) VALUES
  ('VB001','Veridian Bank - Connaught Place','New Delhi','Delhi','Priya Sharma','011-23456789'),
  ('VB002','Veridian Bank - Bandra West','Mumbai','Maharashtra','Rajan Mehta','022-34567890'),
  ('VB003','Veridian Bank - Koramangala','Bengaluru','Karnataka','Anita Rao','080-45678901'),
  ('VB004','Veridian Bank - Salt Lake','Kolkata','West Bengal','Debasis Sen','033-56789012'),
  ('VB005','Veridian Bank - Anna Nagar','Chennai','Tamil Nadu','Kavitha Suresh','044-67890123');

-- System config: email rules
INSERT INTO public.system_config (config_key, config_value, category, description) VALUES
  ('email_customer_only','true','email','Only send emails to customers for: withdrawal, deposit, account opening, OTP'),
  ('email_admin_disabled','true','email','Admin/SuperAdmin email notifications are DISABLED — use portal dashboard only'),
  ('portal_alerts_enabled','true','portal','All internal alerts shown on Super Admin portal dashboard only');

-- ============================================================
-- VERIFY
-- ============================================================
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as cols
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_name NOT LIKE 'Veridian%'
ORDER BY table_name;
