# 🗄️ Supabase Integration — Veridian Bank

## ✅ Connection Status: LIVE

| Detail | Value |
|--------|-------|
| **Project URL** | https://ssrlburjpwnpoiclaiss.supabase.co |
| **Project Ref** | ssrlburjpwnpoiclaiss |
| **Region** | ap-southeast-1 (Singapore) |
| **Status** | ACTIVE_HEALTHY |
| **Migration** | v2.0 — Completed ✅ |

---

## 📋 Live Tables (6 total)

| Table | Columns | Indexes | RLS |
|-------|---------|---------|-----|
| `branches` | 13 | 3 | ✅ Public read (active) |
| `customers` | 16 | 5 | ✅ Own record only |
| `transactions` | 16 | 5 | ✅ Own records only |
| `loans` | 16 | 3 | ✅ Own records only |
| `csps` | 16 | 3 | ✅ Service role |
| `Veridian Bank` | 2 | — | — (legacy) |

**Total: 16 custom performance indexes + 4 RLS policies + 4 auto-updated_at triggers**

---

## 🏢 Sample Branches (pre-loaded)

| Code | Branch | City |
|------|--------|------|
| VB001 | Connaught Place | New Delhi |
| VB002 | Bandra West | Mumbai |
| VB003 | Koramangala | Bengaluru |
| VB004 | Salt Lake | Kolkata |
| VB005 | Anna Nagar | Chennai |

---

## 🔗 Connecting from Backend Functions

```typescript
const SUPABASE_URL = 'https://ssrlburjpwnpoiclaiss.supabase.co';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Query customers
const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?account_status=eq.Active`, {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  }
});
const customers = await res.json();
```

## 🔄 Sync from Base44 → Supabase

Use the `syncToSupabase` backend function to push entity data:
```
POST /functions/syncToSupabase
```
Automated nightly sync runs daily at 2:00 AM IST.

---

## 🛡️ Security Checklist

- [x] Row Level Security (RLS) enabled on all tables
- [x] Service role key stored as environment variable only
- [x] Anon key safe for client-side (RLS enforced)
- [x] No sensitive fields (pin_hash, aadhaar) synced to Supabase
- [x] Auto-updated_at triggers on customers, loans, branches, csps
