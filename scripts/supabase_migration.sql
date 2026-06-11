-- ============================================================
-- Veridian Bank — Full Supabase Migration Script v2.0
-- Updated: 2026-06-12
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- URL: https://supabase.com/dashboard/project/ssrlburjpwnpoiclaiss/sql/new
-- ============================================================

-- Enable required extensions (already available on your project)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- DROP existing tables (for clean re-run)
-- ============================================================
DROP TABLE IF EXISTS public.csps CASCADE;
DROP TABLE IF EXISTS public.loans CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;

-- ============================================================
-- 1. BRANCHES TABLE
-- ============================================================
CREATE TABLE public.branches (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  branch_code     VARCHAR(20) UNIQUE NOT NULL,
  branch_name     VARCHAR(255) NOT NULL,
  address         TEXT,
  city            VARCHAR(100),
  state           VARCHAR(100),
  manager_name    VARCHAR(255),
  phone_number    VARCHAR(15),
  total_customers INTEGER DEFAULT 0,
  total_deposits  NUMERIC(18,2) DEFAULT 0,
  status          VARCHAR(30) DEFAULT 'Active'
                    CHECK (status IN ('Active','Inactive','Under Renovation')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. CUSTOMERS TABLE
-- ============================================================
CREATE TABLE public.customers (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id     VARCHAR(20) UNIQUE NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  phone_number    VARCHAR(15),
  email           VARCHAR(255),
  aadhaar_number  VARCHAR(12),
  account_number  VARCHAR(20) UNIQUE,
  account_type    VARCHAR(20) DEFAULT 'Savings'
                    CHECK (account_type IN ('Savings','Current','FD','RD','NRI')),
  balance         NUMERIC(15,2) DEFAULT 0.00,
  branch_code     VARCHAR(20) REFERENCES public.branches(branch_code) ON DELETE SET NULL,
  kyc_status      VARCHAR(20) DEFAULT 'Pending'
                    CHECK (kyc_status IN ('Pending','Verified','Rejected','Expired')),
  account_status  VARCHAR(20) DEFAULT 'Active'
                    CHECK (account_status IN ('Active','Inactive','Frozen','Closed')),
  date_of_birth   DATE,
  address         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE public.transactions (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id    VARCHAR(30) UNIQUE NOT NULL,
  customer_id       VARCHAR(20) REFERENCES public.customers(customer_id) ON DELETE SET NULL,
  account_number    VARCHAR(20),
  transaction_type  VARCHAR(30)
                      CHECK (transaction_type IN ('Credit','Debit','Transfer','Bill Payment','EMI','Withdrawal','Deposit')),
  amount            NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  balance_after     NUMERIC(15,2),
  recipient_account VARCHAR(20),
  recipient_name    VARCHAR(255),
  transfer_mode     VARCHAR(20)
                      CHECK (transfer_mode IN ('NEFT','RTGS','IMPS','UPI','NACH','Internal','Cash')),
  description       TEXT,
  reference_number  VARCHAR(50),
  status            VARCHAR(20) DEFAULT 'Pending'
                      CHECK (status IN ('Pending','Success','Failed','Reversed')),
  initiated_from    VARCHAR(20)
                      CHECK (initiated_from IN ('Mobile','Web','Branch','ATM','CSP')),
  processing_fee    NUMERIC(10,2) DEFAULT 0.00,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. LOANS TABLE
-- ============================================================
CREATE TABLE public.loans (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  loan_id             VARCHAR(30) UNIQUE NOT NULL,
  customer_id         VARCHAR(20) REFERENCES public.customers(customer_id) ON DELETE SET NULL,
  account_number      VARCHAR(20),
  loan_type           VARCHAR(50)
                        CHECK (loan_type IN ('Home Loan','Personal Loan','Car Loan','Education Loan','Business Loan','Gold Loan','Agri Loan')),
  loan_amount         NUMERIC(15,2) CHECK (loan_amount > 0),
  approved_amount     NUMERIC(15,2),
  interest_rate       NUMERIC(5,2) CHECK (interest_rate >= 0),
  tenure_months       INTEGER CHECK (tenure_months > 0),
  emi_amount          NUMERIC(10,2),
  outstanding_amount  NUMERIC(15,2),
  status              VARCHAR(30) DEFAULT 'Applied'
                        CHECK (status IN ('Applied','Under Review','Approved','Rejected','Disbursed','Active','Closed','NPA')),
  application_date    DATE DEFAULT CURRENT_DATE,
  disbursement_date   DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. CSPs TABLE
-- ============================================================
CREATE TABLE public.csps (
  id                      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  csp_id                  VARCHAR(20) UNIQUE NOT NULL,
  csp_name                VARCHAR(255) NOT NULL,
  owner_name              VARCHAR(255),
  phone_number            VARCHAR(15),
  address                 TEXT,
  village                 VARCHAR(100),
  district                VARCHAR(100),
  state                   VARCHAR(100),
  parent_branch           VARCHAR(20) REFERENCES public.branches(branch_code) ON DELETE SET NULL,
  services_offered        JSONB DEFAULT '[]'::jsonb,
  daily_transaction_limit NUMERIC(12,2) DEFAULT 50000.00,
  cash_available          NUMERIC(12,2) DEFAULT 0.00,
  status                  VARCHAR(20) DEFAULT 'Active'
                            CHECK (status IN ('Active','Inactive','Suspended')),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES — performance optimization
-- ============================================================
CREATE INDEX idx_customers_account_number  ON public.customers(account_number);
CREATE INDEX idx_customers_phone           ON public.customers(phone_number);
CREATE INDEX idx_customers_kyc_status      ON public.customers(kyc_status);
CREATE INDEX idx_customers_account_status  ON public.customers(account_status);
CREATE INDEX idx_customers_branch          ON public.customers(branch_code);

CREATE INDEX idx_transactions_customer     ON public.transactions(customer_id);
CREATE INDEX idx_transactions_account      ON public.transactions(account_number);
CREATE INDEX idx_transactions_status       ON public.transactions(status);
CREATE INDEX idx_transactions_type         ON public.transactions(transaction_type);
CREATE INDEX idx_transactions_created      ON public.transactions(created_at DESC);

CREATE INDEX idx_loans_customer            ON public.loans(customer_id);
CREATE INDEX idx_loans_status              ON public.loans(status);
CREATE INDEX idx_loans_type                ON public.loans(loan_type);

CREATE INDEX idx_csps_branch               ON public.csps(parent_branch);
CREATE INDEX idx_csps_state                ON public.csps(state);
CREATE INDEX idx_csps_status               ON public.csps(status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.branches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csps         ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (for backend/admin use)
-- Public read policy for branches (branch locator feature)
CREATE POLICY "Public can view active branches"
  ON public.branches FOR SELECT
  USING (status = 'Active');

-- Authenticated users can view their own customer record
CREATE POLICY "Customers can view own record"
  ON public.customers FOR SELECT
  USING (auth.uid()::text = customer_id OR auth.role() = 'service_role');

-- Authenticated users can view their own transactions
CREATE POLICY "Customers can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid()::text = customer_id OR auth.role() = 'service_role');

-- Authenticated users can view their own loans
CREATE POLICY "Customers can view own loans"
  ON public.loans FOR SELECT
  USING (auth.uid()::text = customer_id OR auth.role() = 'service_role');

-- ============================================================
-- AUTO-UPDATE updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_csps_updated_at
  BEFORE UPDATE ON public.csps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- SAMPLE DATA — Branches
-- ============================================================
INSERT INTO public.branches (branch_code, branch_name, city, state, manager_name, phone_number, status) VALUES
  ('VB001', 'Veridian Bank - Connaught Place', 'New Delhi', 'Delhi', 'Priya Sharma', '011-23456789', 'Active'),
  ('VB002', 'Veridian Bank - Bandra West', 'Mumbai', 'Maharashtra', 'Rajan Mehta', '022-34567890', 'Active'),
  ('VB003', 'Veridian Bank - Koramangala', 'Bengaluru', 'Karnataka', 'Anita Rao', '080-45678901', 'Active'),
  ('VB004', 'Veridian Bank - Salt Lake', 'Kolkata', 'West Bengal', 'Debasis Sen', '033-56789012', 'Active'),
  ('VB005', 'Veridian Bank - Anna Nagar', 'Chennai', 'Tamil Nadu', 'Kavitha Suresh', '044-67890123', 'Active');

-- ============================================================
-- VERIFY: Show created tables
-- ============================================================
SELECT
  t.table_name,
  COUNT(c.column_name) AS columns,
  obj_description(pgc.oid, 'pg_class') AS description
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
JOIN pg_class pgc ON pgc.relname = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_name NOT LIKE 'Veridian%'
GROUP BY t.table_name, pgc.oid
ORDER BY t.table_name;
