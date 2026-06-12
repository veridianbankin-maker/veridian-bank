# 🏦 Veridian Bank

**Full-stack digital banking platform** built on Base44 with Supabase backend, real-time sync, and AI-powered relationship manager.

[![Supabase](https://img.shields.io/badge/Supabase-63%20Tables-green)](https://supabase.com/dashboard/project/ssrlburjpwnpoiclaiss)
[![GitHub](https://img.shields.io/badge/GitHub-27%20Files-blue)](https://github.com/veridianbankin-maker/veridian-bank)
[![Sync](https://img.shields.io/badge/Sync-Every%2015%20Min-orange)]()
[![AI](https://img.shields.io/badge/AI-Voice%20%2B%20Chat-purple)]()

---

## 🚀 Architecture

```
Base44 App (BankNet)          Supabase (ssrlburjpwnpoiclaiss)
┌─────────────────────┐       ┌──────────────────────────────┐
│  63 Entities        │──────▶│  63 PostgreSQL Tables        │
│  Frontend Pages     │       │  16 Indexes                  │
│  Backend Functions  │       │  4 RLS Policies              │
│  AI Advisor         │       │  Triggers (updated_at)       │
└─────────────────────┘       └──────────────────────────────┘
        │ every 15 min (realtimeSync)
        ▼
┌─────────────────────┐
│  GitHub Repository  │
│  27 files tracked   │
└─────────────────────┘
```

---

## 🤖 AI Advisor (Key Feature)

Veridian Bank's **Virtual Relationship Manager** — AI chatbot + voice commands.

### Languages Supported
| Language | Voice | Chat |
|----------|-------|------|
| Hinglish (Hindi+English) | ✅ | ✅ |
| Hindi | ✅ | ✅ |
| English | ✅ | ✅ |

### Capabilities
- **Account Opening**: Full conversational onboarding — customer says "savings account kholna hai" → AI collects all 7 fields step by step
- **Voice Transactions**: "Rahul ko 500 rupaye bhejo" → confirmation → execute
- **Balance & History**: Voice/chat queries
- **Financial Advisory**: Investment suggestions, FD rates, loan eligibility
- **Customer Analysis**: Balance health, loan burden, KYC status alerts

### Usage
```tsx
import AIAdvisor from './components/AIAdvisor';
import VoiceCommandEngine from './components/VoiceCommandEngine';

// Floating widget (any page)
<AIAdvisor customer={customerProfile} onTransaction={handleTxn} />

// Standalone voice
<VoiceCommandEngine onCommand={handleVoiceCmd} language="hi-IN" />
```

---

## 🗄️ Database (Supabase)

**Project**: `ssrlburjpwnpoiclaiss`  
**Tables**: 63 production tables  
**URL**: https://supabase.com/dashboard/project/ssrlburjpwnpoiclaiss

### Core Entities
| Table | Description |
|-------|-------------|
| `branches` | 5 seeded branches across India |
| `customers` | Account holders with KYC status |
| `transactions` | All banking transactions |
| `loans` | Loan applications & disbursements |
| `csps` | Customer Service Points |

### Run Migration
```sql
-- In Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ssrlburjpwnpoiclaiss/sql/new
-- Run: scripts/supabase_migration_v3_full.sql
```

---

## 📧 Email Policy

| Event | Email Sent To |
|-------|--------------|
| Account Opening | ✅ Customer only |
| Withdrawal | ✅ Customer only |
| Deposit | ✅ Customer only |
| OTP | ✅ Customer only |
| Biometric alerts | ❌ Portal only |
| Fraud alerts | ❌ Portal only |
| All admin events | ❌ Portal only |

See `docs/EMAIL_POLICY.md` for full details.

---

## 🔄 Real-time Sync

Sync runs **every 15 minutes** via `realtimeSync` backend function.

```
POST /functions/realtimeSync
{ "mode": "health" }              → check all 5 core tables
{ entity, event_type, data }      → sync single entity event
{ table, records }                → bulk upsert
```

---

## 📁 Repository Structure

```
veridian-bank/
├── backend/functions/
│   ├── realtimeSync.ts         ← Real-time Base44→Supabase sync
│   ├── syncToSupabase.ts       ← Health check + bulk sync
│   ├── createTransaction.ts    ← Create transactions
│   ├── getCustomer.ts          ← Fetch customer data
│   └── getLoanStatus.ts        ← Loan status check
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── EMAIL_POLICY.md         ← Email rules (customers only)
│   └── SUPABASE.md
├── entities/                   ← 63 entity JSON schemas
│   ├── Customer.json
│   ├── Transaction.json
│   └── ... (63 total)
├── frontend/
│   ├── components/
│   │   ├── AIAdvisor.tsx       ← AI chatbot + voice widget
│   │   └── VoiceCommandEngine.tsx ← Voice command processor
│   └── pages/
│       └── AdvisorChat.tsx     ← Full advisor page
└── scripts/
    ├── supabase_migration.sql
    └── supabase_migration_v3_full.sql  ← RUN THIS
```

---

## 🔒 Security

- Row Level Security (RLS) on all sensitive tables
- Customers can only read their own records
- Service role key stored as `SUPABASE_SERVICE_ROLE_KEY` env secret
- Audit log on all admin actions
- Biometric + KYC verification required for full access

---

*Built with Base44 · Supabase · TypeScript · React*
