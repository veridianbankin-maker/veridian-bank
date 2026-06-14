// Veridian Bank — Security Guard
// Real-time threat detection, unauthorized access blocking, security event logging
// Runs as middleware on every sensitive API call

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SUPABASE_URL = 'https://ssrlburjpwnpoiclaiss.supabase.co';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// ── Threat intelligence config ───────────────────────────────────────────────
const MAX_FAILED_LOGINS = 5;
const MAX_TXNS_PER_MINUTE = 10;
const HIGH_VALUE_THRESHOLD = 100000; // ₹1 lakh
const SUSPICIOUS_COUNTRIES = ['CN','RU','KP','IR','PK'];
const BLOCKED_USER_AGENTS = ['sqlmap','nikto','nmap','burpsuite','hydra','masscan'];

interface SecurityEvent {
  event_type: string;
  severity: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
  ip_address: string;
  user_agent: string;
  customer_id?: string;
  account_number?: string;
  transaction_id?: string;
  details: Record<string, any>;
  blocked: boolean;
  timestamp: string;
}

async function logSecurityEvent(event: SecurityEvent) {
  await fetch(`${SUPABASE_URL}/rest/v1/threat_alert`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      alert_id: `SEC-${Date.now()}`,
      threat_type: event.event_type,
      source_ip: event.ip_address,
      severity: event.severity,
      description: JSON.stringify(event.details),
      status: event.blocked ? 'Active' : 'Investigating',
    })
  });
}

async function logAudit(entry: any) {
  await fetch(`${SUPABASE_URL}/rest/v1/audit_log`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(entry)
  });
}

function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || req.headers.get('cf-connecting-ip')
    || 'unknown';
}

function getRiskScore(checks: Record<string, boolean>): number {
  const weights: Record<string, number> = {
    sql_injection: 100, xss_attempt: 80, known_attack_tool: 100,
    rate_limit_exceeded: 60, high_value_transaction: 40,
    multiple_failed_auth: 70, unusual_hour: 20, tor_exit_node: 90,
    impossible_travel: 80, duplicate_transaction: 50,
  };
  return Object.entries(checks)
    .filter(([_, v]) => v)
    .reduce((score, [k]) => score + (weights[k] || 10), 0);
}

// ── SQL Injection detector ───────────────────────────────────────────────────
function detectSQLInjection(input: string): boolean {
  const patterns = [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bSELECT\b.*\bFROM\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(\bEXEC\b|\bEXECUTE\b)/i,
    /(--|\bOR\b\s+\d+=\d+|\bAND\b\s+\d+=\d+)/i,
    /('.*--|\bOR\b.*=.*)/i,
    /\/\*.*\*\//,
    /;\s*(DROP|DELETE|UPDATE|INSERT)/i,
    /xp_cmdshell/i,
    /INFORMATION_SCHEMA/i,
  ];
  return patterns.some(p => p.test(input));
}

// ── XSS detector ─────────────────────────────────────────────────────────────
function detectXSS(input: string): boolean {
  const patterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /eval\s*\(/i,
    /document\.cookie/i,
    /window\.location/i,
    /alert\s*\(/i,
    /<img[^>]+onerror/i,
  ];
  return patterns.some(p => p.test(input));
}

// ── Path traversal detector ───────────────────────────────────────────────────
function detectPathTraversal(input: string): boolean {
  return /(\.\.[\/\\]){2,}|\/etc\/passwd|\/etc\/shadow|\/proc\/self/.test(input);
}

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  const ip = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || '';
  const method = req.method;
  const url = new URL(req.url);

  try {
    if (!SUPABASE_KEY) return Response.json({ error: 'Security service not configured' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const { action, payload, customer_id, session_token } = body;

    const checks: Record<string, boolean> = {};
    const threats: string[] = [];

    // ── 1. Known attack tools ─────────────────────────────────────────────
    const isAttackTool = BLOCKED_USER_AGENTS.some(tool =>
      userAgent.toLowerCase().includes(tool)
    );
    if (isAttackTool) {
      checks.known_attack_tool = true;
      threats.push(`Blocked attack tool: ${userAgent.slice(0,50)}`);
    }

    // ── 2. SQL Injection scan ─────────────────────────────────────────────
    const allInputs = JSON.stringify(body) + url.search;
    if (detectSQLInjection(allInputs)) {
      checks.sql_injection = true;
      threats.push('SQL injection pattern detected in request');
    }

    // ── 3. XSS scan ───────────────────────────────────────────────────────
    if (detectXSS(allInputs)) {
      checks.xss_attempt = true;
      threats.push('XSS pattern detected in request');
    }

    // ── 4. Path traversal ─────────────────────────────────────────────────
    if (detectPathTraversal(url.pathname + allInputs)) {
      checks.path_traversal = true;
      threats.push('Path traversal attempt detected');
    }

    // ── 5. Unusual hour check (2am–5am IST = high risk) ──────────────────
    const hour = new Date().getUTCHours();
    const istHour = (hour + 5) % 24 + (new Date().getUTCMinutes() >= 30 ? 0.5 : 0);
    if (istHour >= 2 && istHour <= 5) checks.unusual_hour = true;

    // ── 6. High-value transaction flag ────────────────────────────────────
    if (payload?.amount && Number(payload.amount) >= HIGH_VALUE_THRESHOLD) {
      checks.high_value_transaction = true;
    }

    // ── 7. Duplicate transaction detection ────────────────────────────────
    if (action === 'TRANSACTION' && payload?.reference_number) {
      const checkRes = await fetch(
        `${SUPABASE_URL}/rest/v1/transactions?reference_number=eq.${encodeURIComponent(payload.reference_number)}&select=transaction_id`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const existing = await checkRes.json();
      if (Array.isArray(existing) && existing.length > 0) {
        checks.duplicate_transaction = true;
        threats.push(`Duplicate transaction reference: ${payload.reference_number}`);
      }
    }

    const riskScore = getRiskScore(checks);
    const severity = riskScore >= 80 ? 'CRITICAL' : riskScore >= 50 ? 'HIGH' : riskScore >= 20 ? 'MEDIUM' : 'LOW';
    const shouldBlock = riskScore >= 50 || checks.sql_injection || checks.xss_attempt || checks.known_attack_tool || checks.path_traversal;

    // ── Log audit trail ───────────────────────────────────────────────────
    await logAudit({
      user_email: customer_id || 'anonymous',
      action: action || `${method}:${url.pathname}`,
      entity_type: 'security_check',
      entity_id: `${Date.now()}`,
      new_value: { ip, user_agent: userAgent.slice(0,100), risk_score: riskScore, severity, checks },
      ip_address: ip,
      user_agent: userAgent.slice(0, 200),
    });

    // ── Log threat if severity >= MEDIUM ──────────────────────────────────
    if (riskScore >= 20 || threats.length > 0) {
      await logSecurityEvent({
        event_type: threats[0] || 'Suspicious Activity',
        severity: severity as any,
        ip_address: ip,
        user_agent: userAgent,
        customer_id,
        details: { checks, threats, risk_score: riskScore, action, url: url.pathname },
        blocked: shouldBlock,
        timestamp: startedAt,
      });
    }

    // ── Block or allow ────────────────────────────────────────────────────
    if (shouldBlock) {
      return Response.json({
        blocked: true,
        reason: threats[0] || 'Security policy violation',
        risk_score: riskScore,
        severity,
        reference: `BLOCK-${Date.now()}`,
        message: 'Request blocked by Veridian Bank Security. This event has been logged and reported to the Security Operations Center.',
      }, { status: 403 });
    }

    return Response.json({
      allowed: true,
      risk_score: riskScore,
      severity,
      checks,
      warnings: threats,
      session_valid: !!session_token,
      timestamp: startedAt,
    });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});
