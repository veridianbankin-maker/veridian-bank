// Veridian Bank — Backend Function: syncToSupabase
// Syncs Base44 entity records to Supabase PostgreSQL
// Can be triggered manually or via automation

import { base44 } from '@base44/sdk';

const SUPABASE_URL = 'https://ssrlburjpwnpoiclaiss.supabase.co';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

async function supabaseUpsert(table: string, records: any[]) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(records)
  });
  return { status: res.status, ok: res.ok };
}

export default async function syncToSupabase(req: Request): Promise<Response> {
  const results: Record<string, any> = {};

  try {
    // Sync Branches
    const branches = await base44.asServiceRole.entities.Branch.list();
    const branchData = branches.map(b => ({
      branch_code: b.branch_code,
      branch_name: b.branch_name,
      city: b.city,
      state: b.state,
      manager_name: b.manager_name,
      phone_number: b.phone_number,
      total_customers: b.total_customers || 0,
      total_deposits: b.total_deposits || 0,
      status: b.status || 'Active'
    }));
    if (branchData.length) {
      results.branches = await supabaseUpsert('branches', branchData);
      results.branches.count = branchData.length;
    }

    // Sync Customers (without sensitive fields)
    const customers = await base44.asServiceRole.entities.Customer.list();
    const customerData = customers.map(c => ({
      customer_id: c.customer_id,
      full_name: c.full_name,
      phone_number: c.phone_number,
      email: c.email,
      account_number: c.account_number,
      account_type: c.account_type,
      balance: c.balance || 0,
      branch_code: c.branch_code,
      kyc_status: c.kyc_status || 'Pending',
      account_status: c.account_status || 'Active',
      date_of_birth: c.date_of_birth || null,
      address: c.address
    }));
    if (customerData.length) {
      results.customers = await supabaseUpsert('customers', customerData);
      results.customers.count = customerData.length;
    }

    // Sync Transactions
    const transactions = await base44.asServiceRole.entities.Transaction.list();
    const txnData = transactions.map(t => ({
      transaction_id: t.transaction_id,
      customer_id: t.customer_id,
      account_number: t.account_number,
      transaction_type: t.transaction_type,
      amount: t.amount,
      balance_after: t.balance_after,
      recipient_account: t.recipient_account,
      recipient_name: t.recipient_name,
      transfer_mode: t.transfer_mode,
      description: t.description,
      reference_number: t.reference_number,
      status: t.status || 'Success',
      initiated_from: t.initiated_from,
      processing_fee: t.processing_fee || 0
    }));
    if (txnData.length) {
      results.transactions = await supabaseUpsert('transactions', txnData);
      results.transactions.count = txnData.length;
    }

    return Response.json({
      success: true,
      synced_at: new Date().toISOString(),
      results
    });

  } catch (err) {
    return Response.json({ error: 'Sync failed', details: err.message }, { status: 500 });
  }
}
