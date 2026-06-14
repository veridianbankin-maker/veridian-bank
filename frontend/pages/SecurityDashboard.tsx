/**
 * Veridian Bank — Super Admin Security Dashboard
 * Real-time threat monitoring, blocked attempts, audit trail
 * ALL alerts portal-only — zero emails to admin/super-admin
 */

import React, { useState, useEffect, useCallback } from 'react';

const SUPABASE_URL = 'https://ssrlburjpwnpoiclaiss.supabase.co';
const ANON_KEY = (window as any).__SUPABASE_ANON_KEY__ || '';

interface ThreatAlert {
  id: string;
  alert_id: string;
  threat_type: string;
  source_ip: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  status: string;
  created_at: string;
}

interface AuditEntry {
  id: string;
  user_email: string;
  action: string;
  entity_type: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

interface SecurityMetric {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: string;
}

const SEVERITY_CONFIG = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: '🚨' },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', icon: '⚠️' },
  MEDIUM:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', icon: '🔶' },
  LOW:      { color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)', icon: '🟢' },
};

const THREAT_TYPES = [
  { type: 'SQL_INJECTION',       label: 'SQL Injection',        icon: '💉', color: '#ef4444' },
  { type: 'XSS_ATTEMPT',         label: 'XSS Attack',           icon: '🖥️', color: '#f97316' },
  { type: 'BRUTE_FORCE',         label: 'Brute Force',          icon: '🔨', color: '#fbbf24' },
  { type: 'UNAUTHORIZED_ACCESS', label: 'Unauthorized Access',  icon: '🚫', color: '#ef4444' },
  { type: 'DUPLICATE_TXN',       label: 'Duplicate Transaction',icon: '♻️', color: '#8b5cf6' },
  { type: 'HIGH_VALUE',          label: 'High-Value Alert',     icon: '💰', color: '#06b6d4' },
  { type: 'SUSPICIOUS_IP',       label: 'Suspicious IP',        icon: '🌐', color: '#f59e0b' },
  { type: 'ATTACK_TOOL',         label: 'Attack Tool Detected', icon: '🛠️', color: '#ef4444' },
];

// ── Simulated live threat feed (replace with real Supabase subscription) ─────
function useSecurityData() {
  const [threats, setThreats] = useState<ThreatAlert[]>([
    { id:'1', alert_id:'SEC-001', threat_type:'SQL_INJECTION', source_ip:'185.220.101.45', severity:'CRITICAL', description:'SQL injection pattern in /api/login payload', status:'Active', created_at: new Date(Date.now()-180000).toISOString() },
    { id:'2', alert_id:'SEC-002', threat_type:'BRUTE_FORCE', source_ip:'103.21.244.0', severity:'HIGH', description:'Multiple failed login attempts (8/5 threshold)', status:'Investigating', created_at: new Date(Date.now()-360000).toISOString() },
    { id:'3', alert_id:'SEC-003', threat_type:'ATTACK_TOOL', source_ip:'45.142.212.100', severity:'HIGH', description:'Known attack tool: sqlmap detected in User-Agent', status:'Blocked', created_at: new Date(Date.now()-720000).toISOString() },
    { id:'4', alert_id:'SEC-004', threat_type:'HIGH_VALUE', source_ip:'49.36.128.45', severity:'MEDIUM', description:'High-value transaction ₹2,50,000 from new device', status:'Active', created_at: new Date(Date.now()-900000).toISOString() },
    { id:'5', alert_id:'SEC-005', threat_type:'UNAUTHORIZED_ACCESS', source_ip:'178.62.52.191', severity:'CRITICAL', description:'Unauthorized admin panel access attempt', status:'Blocked', created_at: new Date(Date.now()-1200000).toISOString() },
  ]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([
    { id:'a1', user_email:'branch.manager@vb.com', action:'CUSTOMER_UPDATE', entity_type:'Customer', ip_address:'192.168.1.10', user_agent:'Chrome/124', created_at: new Date(Date.now()-120000).toISOString() },
    { id:'a2', user_email:'admin@vb.com', action:'LOAN_APPROVE', entity_type:'Loan', ip_address:'192.168.1.5', user_agent:'Firefox/125', created_at: new Date(Date.now()-240000).toISOString() },
    { id:'a3', user_email:'teller@vb.com', action:'TRANSACTION_CREATE', entity_type:'Transaction', ip_address:'192.168.1.20', user_agent:'Chrome/124', created_at: new Date(Date.now()-480000).toISOString() },
    { id:'a4', user_email:'superadmin@vb.com', action:'SYSTEM_CONFIG_UPDATE', entity_type:'SystemConfig', ip_address:'192.168.1.1', user_agent:'Chrome/124', created_at: new Date(Date.now()-600000).toISOString() },
  ]);
  const [metrics, setMetrics] = useState({ total_blocked: 247, threats_today: 12, active_sessions: 38, scans_last_hour: 1847 });
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isLive, setIsLive] = useState(true);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(() => {
      setLastRefresh(new Date());
      setMetrics(m => ({ ...m, scans_last_hour: m.scans_last_hour + Math.floor(Math.random() * 5) }));
    }, 30000);
    return () => clearInterval(t);
  }, [isLive]);

  const resolveAlert = useCallback((id: string) => {
    setThreats(prev => prev.map(t => t.id === id ? { ...t, status: 'Resolved' } : t));
  }, []);

  const blockIP = useCallback((ip: string) => {
    setThreats(prev => prev.map(t => t.source_ip === ip ? { ...t, status: 'Blocked' } : t));
  }, []);

  return { threats, auditLog, metrics, lastRefresh, isLive, setIsLive, resolveAlert, blockIP };
}

// ── Components ────────────────────────────────────────────────────────────────

const SecurityBadge: React.FC<{ severity: keyof typeof SEVERITY_CONFIG }> = ({ severity }) => {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.icon} {severity}
    </span>
  );
};

const LivePulse: React.FC<{ active: boolean }> = ({ active }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className="w-2 h-2 rounded-full" style={{
      background: active ? '#4ade80' : '#ef4444',
      boxShadow: active ? '0 0 6px #4ade80' : 'none',
      animation: active ? 'pulse 2s infinite' : 'none'
    }} />
    <span className="text-xs" style={{ color: active ? '#4ade80' : '#ef4444' }}>
      {active ? 'LIVE' : 'OFFLINE'}
    </span>
  </span>
);

const ThreatCard: React.FC<{ alert: ThreatAlert; onResolve: ()=>void; onBlock: ()=>void }> = ({ alert, onResolve, onBlock }) => {
  const cfg = SEVERITY_CONFIG[alert.severity];
  const ago = Math.floor((Date.now() - new Date(alert.created_at).getTime()) / 60000);
  return (
    <div className="rounded-xl p-4 transition-all hover:scale-[1.01]"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="text-2xl flex-shrink-0 mt-0.5">
            {THREAT_TYPES.find(t => t.type === alert.threat_type)?.icon || '⚠️'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm">{alert.threat_type.replace(/_/g,' ')}</span>
              <SecurityBadge severity={alert.severity} />
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: alert.status === 'Blocked' ? 'rgba(239,68,68,0.2)' : alert.status === 'Resolved' ? 'rgba(74,222,128,0.2)' : 'rgba(251,191,36,0.2)',
                  color: alert.status === 'Blocked' ? '#ef4444' : alert.status === 'Resolved' ? '#4ade80' : '#fbbf24'
                }}>
                {alert.status}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 truncate">{alert.description}</div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>🌐 {alert.source_ip}</span>
              <span className="text-xs text-slate-500">{ago < 60 ? `${ago}m ago` : `${Math.floor(ago/60)}h ago`}</span>
              <span className="text-xs font-mono text-slate-600">{alert.alert_id}</span>
            </div>
          </div>
        </div>
        {alert.status !== 'Resolved' && (
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button onClick={onResolve}
              className="text-xs px-3 py-1 rounded-lg font-medium transition-all hover:scale-105"
              style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
              ✓ Resolve
            </button>
            <button onClick={onBlock}
              className="text-xs px-3 py-1 rounded-lg font-medium transition-all hover:scale-105"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              🚫 Block IP
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────

const SecurityDashboard: React.FC = () => {
  const { threats, auditLog, metrics, lastRefresh, isLive, setIsLive, resolveAlert, blockIP } = useSecurityData();
  const [activeTab, setActiveTab] = useState<'threats'|'audit'|'sessions'|'policies'>('threats');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const activeThreats = threats.filter(t => t.status !== 'Resolved');
  const criticalCount = threats.filter(t => t.severity === 'CRITICAL' && t.status !== 'Resolved').length;
  const filteredThreats = filterSeverity === 'ALL' ? threats : threats.filter(t => t.severity === filterSeverity);

  const securityMetrics: SecurityMetric[] = [
    { label: 'Requests Scanned',  value: metrics.scans_last_hour.toLocaleString('en-IN'), icon: '🔍', color: '#60a5fa', trend: '+↑ live' },
    { label: 'Threats Blocked',   value: metrics.total_blocked, icon: '🛡️', color: '#4ade80', trend: 'today' },
    { label: 'Active Threats',    value: activeThreats.length, icon: '🚨', color: criticalCount > 0 ? '#ef4444' : '#fbbf24' },
    { label: 'Active Sessions',   value: metrics.active_sessions, icon: '👤', color: '#a78bfa', trend: 'users online' },
    { label: 'Security Score',    value: criticalCount > 0 ? '72/100' : '94/100', icon: '📊', color: criticalCount > 0 ? '#f97316' : '#4ade80' },
    { label: 'Last Scan',         value: lastRefresh.toLocaleTimeString('en-IN'), icon: '⏱️', color: '#94a3b8' },
  ];

  const SECURITY_POLICIES = [
    { name: 'SQL Injection Protection',      status: true,  level: 'Critical' },
    { name: 'XSS Attack Prevention',         status: true,  level: 'Critical' },
    { name: 'Brute Force Protection',        status: true,  level: 'High' },
    { name: 'Rate Limiting (10 req/min)',    status: true,  level: 'High' },
    { name: 'HTTPS Enforcement',             status: true,  level: 'Critical' },
    { name: 'Session Timeout (30 min)',      status: true,  level: 'Medium' },
    { name: 'Multi-Factor Authentication',  status: true,  level: 'Critical' },
    { name: 'IP Blacklist Enforcement',      status: true,  level: 'High' },
    { name: 'Path Traversal Blocking',       status: true,  level: 'High' },
    { name: 'Attack Tool Detection',         status: true,  level: 'Critical' },
    { name: 'Audit Log Encryption',          status: true,  level: 'Medium' },
    { name: 'RLS Row-Level Security',        status: true,  level: 'Critical' },
    { name: 'Duplicate Transaction Guard',   status: true,  level: 'Medium' },
    { name: 'High-Value Transaction Alert',  status: true,  level: 'High' },
    { name: 'Unusual Hours Detection',       status: true,  level: 'Low' },
  ];

  return (
    <div className="min-h-screen p-6" style={{ background: '#040d1a', color: '#e2e8f0' }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">🔐 Security Operations Center</h1>
            <LivePulse active={isLive} />
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Real-time threat detection · {filteredThreats.length} events · Portal only — no emails
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: isLive ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
              color: isLive ? '#4ade80' : '#ef4444',
              border: `1px solid ${isLive ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`
            }}>
            {isLive ? '⏸ Pause' : '▶ Resume'} Live Feed
          </button>
        </div>
      </div>

      {/* ── Critical Alert Banner ── */}
      {criticalCount > 0 && (
        <div className="rounded-2xl p-4 mb-6 flex items-center gap-4 animate-pulse"
          style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.4)' }}>
          <span className="text-3xl">🚨</span>
          <div>
            <div className="font-bold text-red-400 text-sm">CRITICAL THREATS ACTIVE</div>
            <div className="text-xs text-red-300">{criticalCount} critical threat{criticalCount > 1 ? 's' : ''} require immediate attention. Review and resolve below.</div>
          </div>
        </div>
      )}

      {/* ── Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {securityMetrics.map(m => (
          <div key={m.label} className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-2xl mb-2">{m.icon}</div>
            <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
            <div className="text-xs text-slate-400 mt-0.5 leading-tight">{m.label}</div>
            {m.trend && <div className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.5)' }}>{m.trend}</div>}
          </div>
        ))}
      </div>

      {/* ── Threat Type Matrix ── */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-8">
        {THREAT_TYPES.map(t => {
          const count = threats.filter(a => a.threat_type === t.type).length;
          return (
            <div key={t.type} className="rounded-xl p-2.5 text-center"
              style={{ background: count > 0 ? `${t.color}15` : 'rgba(255,255,255,0.03)', border: `1px solid ${count > 0 ? t.color + '30' : 'rgba(255,255,255,0.06)'}` }}>
              <div className="text-xl">{t.icon}</div>
              <div className="text-xs font-bold mt-1" style={{ color: count > 0 ? t.color : '#475569' }}>{count}</div>
              <div className="text-xs text-slate-500 leading-tight mt-0.5" style={{ fontSize: '9px' }}>{t.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'threats',  label: `🚨 Threats (${activeThreats.length})` },
          { key: 'audit',    label: `📋 Audit Log` },
          { key: 'sessions', label: `👤 Sessions` },
          { key: 'policies', label: `🛡️ Policies` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={activeTab === tab.key
              ? { background: 'linear-gradient(135deg,#1e40af,#2563eb)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Threats Tab ── */}
      {activeTab === 'threats' && (
        <div>
          {/* Severity filter */}
          <div className="flex gap-2 mb-4">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
              <button key={s} onClick={() => setFilterSeverity(s)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={filterSeverity === s
                  ? { background: s === 'ALL' ? '#1e40af' : SEVERITY_CONFIG[s as keyof typeof SEVERITY_CONFIG]?.color || '#1e40af', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                {s}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {filteredThreats.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)' }}>
                <div className="text-4xl mb-2">✅</div>
                <div className="text-green-400 font-semibold">All Clear</div>
                <div className="text-slate-400 text-sm">No active threats in this category</div>
              </div>
            ) : (
              filteredThreats.map(alert => (
                <ThreatCard
                  key={alert.id}
                  alert={alert}
                  onResolve={() => resolveAlert(alert.id)}
                  onBlock={() => blockIP(alert.source_ip)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Audit Log Tab ── */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-sm font-semibold text-white">Audit Trail — All Admin Actions</div>
            <div className="text-xs text-slate-400">Every action logged with user, IP, timestamp</div>
          </div>
          <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.05)' }}>
            {auditLog.map(entry => (
              <div key={entry.id} className="p-4 flex items-center gap-4" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: 'rgba(59,130,246,0.2)' }}>
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{entry.user_email}</span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}>
                      {entry.action}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {entry.entity_type} · IP: {entry.ip_address} · {entry.user_agent?.slice(0,30)}
                  </div>
                </div>
                <div className="text-xs text-slate-500 flex-shrink-0">
                  {new Date(entry.created_at).toLocaleTimeString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sessions Tab ── */}
      {activeTab === 'sessions' && (
        <div className="space-y-3">
          {[
            { user:'superadmin@vb.com', role:'Super Admin', ip:'192.168.1.1', device:'Chrome · Windows', since:'2h ago', trusted:true },
            { user:'admin@vb.com', role:'Admin', ip:'192.168.1.5', device:'Firefox · Mac', since:'45m ago', trusted:true },
            { user:'manager.delhi@vb.com', role:'Branch Manager', ip:'103.21.244.1', device:'Chrome · Android', since:'12m ago', trusted:true },
            { user:'teller01@vb.com', role:'Teller', ip:'192.168.1.20', device:'Chrome · Windows', since:'1h ago', trusted:true },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4 flex items-center gap-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#1e40af,#2563eb)' }}>
                {s.user.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{s.user}</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}>{s.role}</span>
                  {s.trusted && <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>✓ Trusted</span>}
                </div>
                <div className="text-xs text-slate-400">{s.device} · {s.ip} · Active {s.since}</div>
              </div>
              <button className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                Terminate
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Policies Tab ── */}
      {activeTab === 'policies' && (
        <div className="space-y-2">
          {SECURITY_POLICIES.map((p, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: p.status ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)' }}>
                {p.status ? '🛡️' : '⚠️'}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{p.name}</div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  background: p.level === 'Critical' ? 'rgba(239,68,68,0.15)' : p.level === 'High' ? 'rgba(249,115,22,0.15)' : p.level === 'Medium' ? 'rgba(251,191,36,0.15)' : 'rgba(74,222,128,0.15)',
                  color: p.level === 'Critical' ? '#ef4444' : p.level === 'High' ? '#f97316' : p.level === 'Medium' ? '#fbbf24' : '#4ade80',
                }}>
                {p.level}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-10 h-5 rounded-full relative transition-all"
                  style={{ background: p.status ? '#22c55e' : '#374151' }}>
                  <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all"
                    style={{ left: p.status ? '22px' : '2px' }} />
                </div>
                <span className="text-xs" style={{ color: p.status ? '#4ade80' : '#ef4444' }}>
                  {p.status ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 pt-4 text-center text-xs text-slate-700" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        Veridian Bank SOC · All security events logged to Supabase · Zero admin emails · Auto-refresh every 30s
      </div>
    </div>
  );
};

export default SecurityDashboard;
