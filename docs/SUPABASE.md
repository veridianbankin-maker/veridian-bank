# 🗄️ Supabase Integration Guide — Veridian Bank

## Connection Details

- **Project Region:** ap-southeast-1 (Singapore)
- **Project Ref:** ssrlburjpwnpoiclaiss
- **Database:** PostgreSQL (managed by Supabase)

## Current Tables

| Table | Description |
|-------|-------------|
| `Veridian Bank` | Base project table (id, created_at) |

## Recommended Schema Expansion

Run the migration script at `scripts/supabase_migration.sql` to set up the full schema.

## Usage Pattern

```js
// Using Supabase client
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ssrlburjpwnpoiclaiss.supabase.co',
  process.env.SUPABASE_ANON_KEY
)

// Query customers
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .eq('account_status', 'Active')
```

## Security Notes

- Always use Row Level Security (RLS) on all tables
- Never expose service_role key on the frontend
- Use anon key for client-side queries with RLS policies
- Enable 2FA on your Supabase dashboard
