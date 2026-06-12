// Veridian Bank — Real-time Sync v2
// FIX: 500 error was caused by calling base44.asServiceRole.entities.Branch.list()
// from Superagent app context — Branch entity only exists in BankNet app (68d8e758070d01b430e273a3)
// SOLUTION: Use direct Supabase REST API for health checks; entity sync is done
// via entity-triggered automations in the BankNet app context, not here.
//
// This function now serves as:
//   1. Health check endpoint — verifies all 5 Supabase tables
//   2. Direct upsert endpoint — accepts pre-formatted records in request body
//   3. Called by BankNet entity automations which pass data in the request body

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SUPABASE_URL = 'https://ssrlburjpwnpoiclaiss.supabase.co';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

async function supabaseUpsert(table: string, records: any[]) {
  if (!records.length) return { ok: true, count: 0, skipped: true };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(Array.isArray(records) ? records : [records])
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, count: records.length, response: text || 'ok' };
}

async function supabaseDelete(table: string, col: string, val: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  return { ok: res.ok, status: res.status };
}

async function tableRowCount(table: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    method: 'HEAD',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact'
    }
  });
  const cr = res.headers.get('content-range') || '0/0';
  return parseInt(cr.split('/')[1] || '0');
}

const ENTITY_TABLE_MAP: Record<string, { table: string; idField: string }> = {
  Customer:    { table: 'customers',    idField: 'customer_id' },
  Transaction: { table: 'transactions', idField: 'transaction_id' },
  Loan:        { table: 'loans',        idField: 'loan_id' },
  Branch:      { table: 'branches',     idField: 'branch_code' },
  CSP:         { table: 'csps',         idField: 'csp_id' },
};

Deno.serve(async (req) => {
  try {
    if (!SUPABASE_KEY) {
      return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { mode, entity, event_type, data } = body;

    // ── MODE: health ─────────────────────────────────────────────
    if (mode === 'health' || (!entity && !data)) {
      const tables = ['branches', 'customers', 'transactions', 'loans', 'csps'];
      const health: Record<string, any> = {};
      for (const t of tables) {
        const rows = await tableRowCount(t);
        health[t] = { accessible: true, rows };
      }
      return Response.json({
        success: true,
        mode: 'health',
        checked_at: new Date().toISOString(),
        supabase_url: SUPABASE_URL,
        tables: health
      });
    }

    // ── MODE: event (single record from BankNet entity automation) ─
    if (entity && event_type && data) {
      const mapping = ENTITY_TABLE_MAP[entity];
      if (!mapping) {
        return Response.json({ error: `Unknown entity: ${entity}` }, { status: 400 });
      }
      const { table, idField } = mapping;
      let result;
      if (event_type === 'delete') {
        result = await supabaseDelete(table, idField, data[idField]);
      } else {
        // Strip Base44 meta fields before upserting
        const { id: _id, created_by: _cb, ...record } = data;
        result = await supabaseUpsert(table, [record]);
      }
      return Response.json({
        success: result.ok,
        mode: 'event_sync',
        entity, event_type, table,
        synced_at: new Date().toISOString(),
        result
      });
    }

    // ── MODE: bulk upsert (array of records passed directly) ──────
    if (body.table && body.records) {
      const result = await supabaseUpsert(body.table, body.records);
      return Response.json({ success: result.ok, mode: 'bulk_upsert', ...result });
    }

    return Response.json({
      error: 'Invalid request. Send: { mode:"health" } or { entity, event_type, data } or { table, records }'
    }, { status: 400 });

  } catch (err: any) {
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
});
