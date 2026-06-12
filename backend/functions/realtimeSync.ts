// Veridian Bank — Real-time Sync: Base44 → Supabase
// Triggered on every entity change (create/update/delete)
// NOT nightly — syncs immediately on every action

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SUPABASE_URL = 'https://ssrlburjpwnpoiclaiss.supabase.co';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

async function upsert(table: string, records: any[], conflictCol = 'id') {
  if (!records.length) return { ok: true, count: 0 };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(records)
  });
  return { ok: res.ok, status: res.status, count: records.length };
}

async function deleteRecord(table: string, col: string, val: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  return { ok: res.ok, status: res.status };
}

Deno.serve(async (req) => {
  try {
    if (!SUPABASE_KEY) {
      return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { entity, event_type, data } = body;
    // event_type: 'create' | 'update' | 'delete'

    const syncedAt = new Date().toISOString();

    if (!entity || !event_type || !data) {
      // Full sync mode — sync all entities
      const base44 = createClientFromRequest(req);
      const results: Record<string, any> = {};

      const branches = await base44.asServiceRole.entities.Branch.list();
      results.branches = await upsert('branches', branches.map((b: any) => ({
        branch_code: b.branch_code, branch_name: b.branch_name,
        city: b.city, state: b.state, manager_name: b.manager_name,
        phone_number: b.phone_number, status: b.status || 'Active',
        total_customers: b.total_customers || 0, total_deposits: b.total_deposits || 0
      })));

      const customers = await base44.asServiceRole.entities.Customer.list();
      results.customers = await upsert('customers', customers.map((c: any) => ({
        customer_id: c.customer_id, full_name: c.full_name,
        phone_number: c.phone_number, email: c.email,
        account_number: c.account_number, account_type: c.account_type || 'Savings',
        balance: c.balance || 0, branch_code: c.branch_code || null,
        kyc_status: c.kyc_status || 'Pending', account_status: c.account_status || 'Active',
        date_of_birth: c.date_of_birth || null, address: c.address || null
      })));

      const transactions = await base44.asServiceRole.entities.Transaction.list();
      results.transactions = await upsert('transactions', transactions.map((t: any) => ({
        transaction_id: t.transaction_id, customer_id: t.customer_id || null,
        account_number: t.account_number, transaction_type: t.transaction_type,
        amount: t.amount, balance_after: t.balance_after || null,
        recipient_account: t.recipient_account || null, recipient_name: t.recipient_name || null,
        transfer_mode: t.transfer_mode || 'Internal', description: t.description || null,
        reference_number: t.reference_number || null, status: t.status || 'Success',
        initiated_from: t.initiated_from || 'Web', processing_fee: t.processing_fee || 0
      })));

      const loans = await base44.asServiceRole.entities.Loan.list();
      results.loans = await upsert('loans', loans.map((l: any) => ({
        loan_id: l.loan_id, customer_id: l.customer_id || null,
        account_number: l.account_number || null, loan_type: l.loan_type,
        loan_amount: l.loan_amount, approved_amount: l.approved_amount || null,
        interest_rate: l.interest_rate || null, tenure_months: l.tenure_months || null,
        emi_amount: l.emi_amount || null, outstanding_amount: l.outstanding_amount || null,
        status: l.status || 'Applied', application_date: l.application_date || null
      })));

      const csps = await base44.asServiceRole.entities.CSP.list();
      results.csps = await upsert('csps', csps.map((c: any) => ({
        csp_id: c.csp_id, csp_name: c.csp_name, owner_name: c.owner_name || null,
        phone_number: c.phone_number || null, state: c.state || null,
        parent_branch: c.parent_branch || null, status: c.status || 'Active',
        services_offered: c.services_offered || [], daily_transaction_limit: c.daily_transaction_limit || 50000,
        cash_available: c.cash_available || 0
      })));

      return Response.json({ success: true, mode: 'full_sync', synced_at: syncedAt, results });
    }

    // Single-entity event sync
    const TABLE_MAP: Record<string, string> = {
      'Customer': 'customers', 'Transaction': 'transactions',
      'Loan': 'loans', 'Branch': 'branches', 'CSP': 'csps'
    };
    const table = TABLE_MAP[entity];
    if (!table) return Response.json({ error: `Unknown entity: ${entity}` }, { status: 400 });

    let result;
    if (event_type === 'delete') {
      const idField = entity === 'Customer' ? 'customer_id'
        : entity === 'Transaction' ? 'transaction_id'
        : entity === 'Loan' ? 'loan_id'
        : entity === 'Branch' ? 'branch_code'
        : 'csp_id';
      result = await deleteRecord(table, idField, data[idField]);
    } else {
      result = await upsert(table, [data]);
    }

    return Response.json({ success: true, mode: 'event_sync', entity, event_type, synced_at: syncedAt, result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
