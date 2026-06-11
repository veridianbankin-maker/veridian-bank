-- ============================================================
-- Veridian Bank — Supabase Migration Script
-- Generated: 2026-06-11
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(15),
  email VARCHAR(255),
  aadhaar_number VARCHAR(12),
  account_number VARCHAR(20) UNIQUE,
  account_type VARCHAR(20) CHECK (account_type IN ('Savings','Current','FD','RD','NRI')),
  balance NUMERIC(15,2) DEFAULT 0,
  branch_code VARCHAR(20),
  kyc_status VARCHAR(20) DEFAULT 'Pending' CHECK (kyc_status IN ('Pending','Verified','Rejected','Expired')),
  account_status VARCHAR(20) DEFAULT 'Active' CHECK (account_status IN ('Active','Inactive','Frozen','Closed')),
  date_of_birth DATE,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id VARCHAR(30) UNIQUE NOT NULL,
  customer_id VARCHAR(20) REFERENCES public.customers(customer_id),
  account_number VARCHAR(20),
  transaction_type VARCHAR(30) CHECK (transaction_type IN ('Credit','Debit','Transfer','Bill Payment','EMI','Withdrawal','Deposit')),
  amount NUMERIC(15,2) NOT NULL,
  balance_after NUMERIC(15,2),
  recipient_account VARCHAR(20),
  recipient_name VARCHAR(255),
  transfer_mode VARCHAR(20) CHECK (transfer_mode IN ('NEFT','RTGS','IMPS','UPI','NACH','Internal')),
  description TEXT,
  reference_number VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending','Success','Failed','Reversed')),
  initiated_from VARCHAR(20) CHECK (initiated_from IN ('Mobile','Web','Branch','ATM','CSP')),
  processing_fee NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOANS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  loan_id VARCHAR(30) UNIQUE NOT NULL,
  customer_id VARCHAR(20) REFERENCES public.customers(customer_id),
  account_number VARCHAR(20),
  loan_type VARCHAR(50) CHECK (loan_type IN ('Home Loan','Personal Loan','Car Loan','Education Loan','Business Loan','Gold Loan','Agri Loan')),
  loan_amount NUMERIC(15,2),
  approved_amount NUMERIC(15,2),
  interest_rate NUMERIC(5,2),
  tenure_months INTEGER,
  emi_amount NUMERIC(10,2),
  outstanding_amount NUMERIC(15,2),
  status VARCHAR(30) DEFAULT 'Applied' CHECK (status IN ('Applied','Under Review','Approved','Rejected','Disbursed','Active','Closed','NPA')),
  application_date DATE,
  disbursement_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BRANCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  branch_code VARCHAR(20) UNIQUE NOT NULL,
  branch_name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  manager_name VARCHAR(255),
  phone_number VARCHAR(15),
  total_customers INTEGER DEFAULT 0,
  total_deposits NUMERIC(18,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Under Renovation')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CSP TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.csps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  csp_id VARCHAR(20) UNIQUE NOT NULL,
  csp_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255),
  phone_number VARCHAR(15),
  address TEXT,
  village VARCHAR(100),
  district VARCHAR(100),
  state VARCHAR(100),
  parent_branch VARCHAR(20) REFERENCES public.branches(branch_code),
  services_offered JSONB DEFAULT '[]',
  daily_transaction_limit NUMERIC(12,2) DEFAULT 50000,
  cash_available NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csps ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customers_account ON public.customers(account_number);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loans_customer ON public.loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
