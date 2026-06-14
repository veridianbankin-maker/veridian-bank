/**
 * Veridian Bank — AI Advisor Full Page
 * Embedded chat + customer analysis + voice command center
 * 4 languages: English | Hindi | Hinglish | Bengali
 */

import React, { useState, useEffect } from 'react';
import AIAdvisor, { CustomerProfile, Language } from '../components/AIAdvisor';
import VoiceCommandEngine, { VoiceCommand, speakText } from '../components/VoiceCommandEngine';

interface AnalysisItem { icon: string; title: string; desc: string; color: string; priority: 'high'|'medium'|'low' }

function buildAnalysis(c: CustomerProfile): AnalysisItem[] {
  const items: AnalysisItem[] = [];
  if ((c.balance || 0) > 200000) items.push({ icon:'💡', title:'Invest Surplus', desc:`Park ₹${Math.floor((c.balance||0)*0.3).toLocaleString('en-IN')} in FD @ 7.2%`, color:'#4ade80', priority:'medium' });
  if ((c.balance || 0) < 5000) items.push({ icon:'📉', title:'Low Balance', desc:'Below minimum ₹5,000 — charges may apply', color:'#ef4444', priority:'high' });
  if (c.kyc_status !== 'Verified') items.push({ icon:'🔴', title:'KYC Pending', desc:'Complete KYC to unlock all features', color:'#ef4444', priority:'high' });
  if (!items.length) items.push({ icon:'✅', title:'Profile Healthy', desc:'No issues found. Consider opening an FD!', color:'#4ade80', priority:'low' });
  return items;
}

const AdvisorChatPage: React.FC = () => {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [voiceLang, setVoiceLang] = useState<'hi-IN'|'en-IN'|'bn-IN'>('hi-IN');
  const [voiceLog, setVoiceLog] = useState<VoiceCommand[]>([]);
  const [notification, setNotification] = useState<string|null>(null);

  useEffect(() => {
    setCustomer({
      customer_id:'CUST001', full_name:'Mujtaba Mia',
      account_number:'ACC0506719348', balance:125000,
      account_type:'Savings', kyc_status:'Verified',
      branch_code:'VB001',
      recent_transactions:[
        { transaction_type:'Credit', amount:50000, description:'Salary', status:'Success' },
        { transaction_type:'Debit', amount:5000, description:'ATM Withdrawal', status:'Success' },
        { transaction_type:'Transfer', amount:2000, description:'UPI Transfer', status:'Success' },
      ]
    });
  }, []);

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3500); };

  const handleVoice = (cmd: VoiceCommand) => {
    setVoiceLog(prev => [cmd, ...prev].slice(0,8));
    const responses: Record<string, string> = {
      CHECK_BALANCE:   'Aapka balance check ho raha hai.',
      OPEN_ACCOUNT:    'Account opening process shuru ho rahi hai.',
      TRANSFER:        `₹${cmd.params.amount} ${cmd.params.recipient} ko bhejne ki request receive hui.`,
      LOAN_ENQUIRY:    'Loan options show ho rahe hain.',
      BLOCK_CARD:      'Card block ke liye confirmation chahiye.',
      TRANSACTION_HISTORY: 'Recent transactions dikhaye ja rahe hain.',
      HELP:            'Main aapki help karne ke liye hoon. Balance, transfer, loan — bolein!',
    };
    const reply = responses[cmd.intent] || `Command received: ${cmd.transcript}`;
    speakText(reply, voiceLang);
    notify(`🎙️ ${cmd.intent.replace(/_/g,' ')}: "${cmd.transcript}"`);
  };

  const analysis = customer ? buildAnalysis(customer) : [];
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  return (
    <div className="min-h-screen p-6" style={{ background:'#070f1e', color:'#e2e8f0' }}>
      {notification && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl max-w-xs"
          style={{ background:'linear-gradient(135deg,#1e40af,#2563eb)', color:'#fff' }}>
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">🤖 AI Banking Advisor</h1>
          <p className="text-slate-400 text-sm mt-1">
            Virtual Relationship Manager · Voice + Chat · 4 Languages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Voice:</span>
          {([['hi-IN','🇮🇳 Hinglish'],['en-IN','🌐 English'],['bn-IN','🇧🇩 Bengali']] as const).map(([l, label]) => (
            <button key={l} onClick={() => setVoiceLang(l as any)}
              className="text-xs px-3 py-1.5 rounded-full transition-all"
              style={voiceLang===l ? {background:'linear-gradient(135deg,#1e40af,#2563eb)',color:'#fff'} : {background:'rgba(255,255,255,0.08)',color:'#94a3b8'}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="space-y-5">
          {/* Customer Card */}
          {customer && (
            <div className="rounded-2xl p-5" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white"
                  style={{ background:'linear-gradient(135deg,#1e40af,#2563eb)' }}>
                  {customer.full_name?.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-white">{customer.full_name}</div>
                  <div className="text-xs text-slate-400">{customer.account_number} · {customer.account_type}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3 text-center" style={{ background:'rgba(0,0,0,0.3)' }}>
                  <div className="text-base font-bold text-blue-400">{fmt(customer.balance||0)}</div>
                  <div className="text-xs text-slate-400">Balance</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background:'rgba(0,0,0,0.3)' }}>
                  <div className="text-base font-bold" style={{ color: customer.kyc_status==='Verified' ? '#4ade80' : '#ef4444' }}>
                    {customer.kyc_status}
                  </div>
                  <div className="text-xs text-slate-400">KYC</div>
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis */}
          <div className="rounded-2xl p-4" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">🤖 AI Suggestions</div>
            <div className="space-y-2">
              {analysis.map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg text-xs"
                  style={{ background:`${item.color}10`, border:`1px solid ${item.color}20` }}>
                  <span>{item.icon}</span>
                  <div>
                    <span className="font-semibold" style={{ color:item.color }}>{item.title}</span>
                    <span className="text-slate-400"> — {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Voice Command Center */}
          <div className="rounded-2xl p-5" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">🎙️ Voice Commands</div>
            <div className="flex justify-center mb-4">
              <VoiceCommandEngine onCommand={handleVoice} language={voiceLang} />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs text-slate-500 mb-2">Try saying:</div>
              {[
                '"Balance check karo"',
                '"Rahul ko ₹500 bhejo"',
                '"Savings account kholna hai"',
                '"Home loan ke baare mein batao"',
                '"আমার ব্যালেন্স কত?"',
              ].map(ex => (
                <div key={ex} className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background:'rgba(59,130,246,0.1)', color:'#93c5fd' }}>
                  💬 {ex}
                </div>
              ))}
            </div>
          </div>

          {/* Recent voice commands */}
          {voiceLog.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-xs font-semibold text-slate-500 uppercase mb-3">Recent Voice</div>
              {voiceLog.slice(0,5).map((cmd, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1.5">
                  <span className="text-green-400">✓</span>
                  <span className="text-slate-300 truncate flex-1">"{cmd.transcript}"</span>
                  <span className="text-slate-500 flex-shrink-0 text-xs">{cmd.intent}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Embedded AI Chat (2 cols) */}
        <div className="lg:col-span-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">💬 AI Chat Assistant</div>
          {customer && (
            <AIAdvisor
              customer={customer}
              embedded={true}
              onTransaction={(data) => notify(`✅ Transfer: ₹${data.amount} → ${data.recipient}`)}
            />
          )}
          {!customer && (
            <div className="rounded-2xl p-12 text-center" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-4xl mb-3">⏳</div>
              <div className="text-slate-400">Loading AI Advisor...</div>
            </div>
          )}
        </div>
      </div>

      {/* Floating bot always available */}
      {customer && (
        <AIAdvisor
          customer={customer}
          onTransaction={(data) => notify(`✅ ₹${data.amount} → ${data.recipient}`)}
        />
      )}
    </div>
  );
};

export default AdvisorChatPage;
