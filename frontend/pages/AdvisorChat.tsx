/**
 * Veridian Bank — Full Advisor Chat Page
 * Integrates AIAdvisor + VoiceCommandEngine + Customer Analysis
 */

import React, { useState, useEffect } from 'react';
import AIAdvisor from '../components/AIAdvisor';
import VoiceCommandEngine, { VoiceCommand, speakText } from '../components/VoiceCommandEngine';

interface CustomerSummary {
  customerId: string;
  name: string;
  accountNumber: string;
  balance: number;
  accountType: string;
  kycStatus: string;
  loans: any[];
  recentTransactions: any[];
  creditScore?: number;
  riskProfile?: string;
}

// ─── Customer Analysis Panel ─────────────────────────────────────────────────

const CustomerAnalysisCard: React.FC<{ customer: CustomerSummary }> = ({ customer }) => {
  const balanceHealth = customer.balance > 50000 ? 'Excellent' : customer.balance > 10000 ? 'Good' : 'Low';
  const balanceColor = customer.balance > 50000 ? '#4ade80' : customer.balance > 10000 ? '#fbbf24' : '#ef4444';
  const totalLoans = customer.loans?.reduce((s, l) => s + (l.outstanding_amount || 0), 0) || 0;

  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
          style={{ background: 'linear-gradient(135deg,#1e40af,#2563eb)', color: '#fff' }}>
          {customer.name?.charAt(0)?.toUpperCase()}
        </div>
        <div>
          <div className="font-bold text-white">{customer.name}</div>
          <div className="text-xs text-slate-400">{customer.accountNumber} · {customer.accountType}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs font-medium" style={{ color: balanceColor }}>{balanceHealth}</div>
          <div className="text-xs text-slate-400">Balance Health</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Balance', value: `₹${(customer.balance || 0).toLocaleString('en-IN')}`, color: '#60a5fa' },
          { label: 'Active Loans', value: `₹${(totalLoans).toLocaleString('en-IN')}`, color: '#f59e0b' },
          { label: 'Credit Score', value: customer.creditScore || 'N/A', color: '#4ade80' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* AI Suggestions */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Suggestions</div>
        {customer.balance > 100000 && (
          <div className="flex items-start gap-2 text-xs p-2.5 rounded-lg" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <span>💡</span>
            <div>
              <span className="font-medium text-green-400">Invest Surplus</span>
              <span className="text-slate-400"> — Open FD @ 7.2% or start SIP for ₹{Math.floor(customer.balance * 0.3).toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}
        {totalLoans > 0 && (
          <div className="flex items-start gap-2 text-xs p-2.5 rounded-lg" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <span>⚠️</span>
            <div>
              <span className="font-medium text-yellow-400">Loan Outstanding</span>
              <span className="text-slate-400"> — ₹{totalLoans.toLocaleString('en-IN')} pending. Consider prepayment to save interest.</span>
            </div>
          </div>
        )}
        {customer.kycStatus !== 'Verified' && (
          <div className="flex items-start gap-2 text-xs p-2.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span>🔴</span>
            <div>
              <span className="font-medium text-red-400">KYC Pending</span>
              <span className="text-slate-400"> — Complete KYC to unlock all features</span>
            </div>
          </div>
        )}
        {customer.balance < 5000 && (
          <div className="flex items-start gap-2 text-xs p-2.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span>📉</span>
            <div>
              <span className="font-medium text-red-400">Low Balance Alert</span>
              <span className="text-slate-400"> — Maintain minimum ₹5,000 to avoid charges</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Voice Command Handler ────────────────────────────────────────────────────

const VOICE_RESPONSES: Record<string, (params: any) => string> = {
  CHECK_BALANCE: () => 'Aapka balance check kiya ja raha hai.',
  OPEN_ACCOUNT: () => 'Account opening process shuru ho rahi hai.',
  TRANSFER: (p) => `₹${p.amount} ${p.recipient} ko bhejne ki request receive hui. Confirm karein?`,
  HELP: () => 'Main aapki help kar sakta hoon. Balance check, transfer, loan, ya account opening — bas bolein.',
  CANCEL: () => 'Request cancel kar di gayi.',
  CONFIRM: () => 'Confirm kar liya. Processing...',
  LOAN_ENQUIRY: () => 'Loan options ke baare mein batata hoon.',
  FD_ENQUIRY: () => 'Fixed Deposit ki details de raha hoon.',
  BLOCK_CARD: () => 'Card block karne ke liye confirmation chahiye.',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdvisorChatPage: React.FC = () => {
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [language, setLanguage] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  const [voiceLog, setVoiceLog] = useState<VoiceCommand[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Simulated customer load — replace with real entity fetch
  useEffect(() => {
    setCustomer({
      customerId: 'CUST001',
      name: 'Mujtaba Mia',
      accountNumber: 'ACC0506719348',
      balance: 125000,
      accountType: 'Savings',
      kycStatus: 'Verified',
      creditScore: 742,
      riskProfile: 'Moderate',
      loans: [],
      recentTransactions: [
        { transaction_type: 'Deposit', amount: 50000, description: 'Salary Credit', status: 'Success' },
        { transaction_type: 'Withdrawal', amount: 5000, description: 'ATM Withdrawal', status: 'Success' },
        { transaction_type: 'Transfer', amount: 2000, description: 'UPI Transfer', status: 'Success' },
      ]
    });
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleVoiceCommand = (cmd: VoiceCommand) => {
    setVoiceLog(prev => [cmd, ...prev].slice(0, 10));
    const responseText = VOICE_RESPONSES[cmd.intent]?.(cmd.params) || `Samajh nahi aaya: "${cmd.transcript}"`;
    speakText(responseText, language);
    showNotification(`🎙️ ${cmd.intent}: ${cmd.transcript}`);
  };

  return (
    <div className="min-h-screen p-6" style={{ background: '#070f1e', color: '#e2e8f0' }}>
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium"
          style={{ background: 'linear-gradient(135deg,#1e40af,#2563eb)', color: '#fff', maxWidth: '300px' }}>
          {notification}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">🤖 AI Banking Advisor</h1>
            <p className="text-slate-400 text-sm mt-1">Virtual Relationship Manager · Voice + Chat · Multi-language</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Voice Lang:</span>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as any)}
              className="text-xs rounded-lg px-3 py-2 outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <option value="hi-IN">🇮🇳 Hinglish / Hindi</option>
              <option value="en-IN">🌐 English (India)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Customer Analysis */}
          <div className="space-y-5">
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Customer Profile</div>
            {customer && <CustomerAnalysisCard customer={customer} />}

            {/* Voice Command Center */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">🎙️ Voice Command</div>
              <div className="flex justify-center mb-3">
                <VoiceCommandEngine
                  onCommand={handleVoiceCommand}
                  onTranscript={t => {}}
                  language={language}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-500 text-center mb-2">Try saying:</div>
                {['Balance check karo', 'Rahul ko ₹500 bhejo', 'Loan ke baare mein batao', 'Savings account kholna hai'].map(ex => (
                  <div key={ex} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd' }}>
                    💬 "{ex}"
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Voice Commands */}
            {voiceLog.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xs font-semibold text-slate-500 uppercase mb-3">Recent Commands</div>
                {voiceLog.slice(0,5).map((cmd, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1.5">
                    <span className="text-green-400">✓</span>
                    <span className="text-slate-300 truncate">{cmd.transcript}</span>
                    <span className="ml-auto text-slate-500 flex-shrink-0">{cmd.intent}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: AI Chat (2 cols wide) */}
          <div className="lg:col-span-2">
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">AI Chat Assistant</div>
            <div className="rounded-2xl overflow-hidden" style={{ background: '#0f1f3d', border: '1px solid rgba(59,130,246,0.2)', minHeight: '550px', position: 'relative' }}>
              {/* Embedded chat (not floating) */}
              <EmbeddedChat customer={customer || undefined} language="hinglish" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI Button available everywhere */}
      {customer && (
        <AIAdvisor
          customer={customer}
          onTransaction={(data) => showNotification(`✅ Transaction: ₹${data.amount} to ${data.recipient}`)}
        />
      )}
    </div>
  );
};

// ─── Embedded (non-floating) chat version ────────────────────────────────────

type EmbeddedChatProps = { customer?: any; language?: 'en' | 'hi' | 'hinglish' };

const EmbeddedChat: React.FC<EmbeddedChatProps> = ({ customer, language: defaultLang = 'hinglish' }) => {
  // Reuse AIAdvisor logic but rendered inline
  // For actual integration, pass customer prop and use AIAdvisor in embedded mode
  return (
    <div className="flex flex-col h-full min-h-[550px]">
      <div className="p-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,#1a3c6e,#1e40af)' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: 'rgba(255,255,255,0.15)' }}>🤖</div>
        <div>
          <div className="font-bold text-white text-sm">Veridian AI — Relationship Manager</div>
          <div className="text-xs text-blue-200 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
            Active · Multi-language · Voice enabled
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: '#0f1f3d' }}>
        <div className="text-center space-y-4">
          <div className="text-4xl">🤖</div>
          <div className="text-white font-semibold">Veridian AI Advisor</div>
          <div className="text-sm text-slate-400 max-w-xs">
            Click the 🤖 button (bottom-right) to open the full AI chat.<br/>
            Or use the Voice Command panel on the left.
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 max-w-sm mx-auto">
            {[
              { icon: '💬', title: 'Chat', desc: 'Ask anything in English or Hindi' },
              { icon: '🎙️', title: 'Voice', desc: 'Speak commands in Hinglish' },
              { icon: '💰', title: 'Transactions', desc: 'Transfer by voice command' },
              { icon: '🏦', title: 'Account Opening', desc: 'Full onboarding via chatbot' },
              { icon: '📊', title: 'Analysis', desc: 'Personal financial insights' },
              { icon: '🤝', title: 'Advisor', desc: 'Virtual relationship manager' },
            ].map(f => (
              <div key={f.title} className="rounded-xl p-3 text-left" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-lg mb-1">{f.icon}</div>
                <div className="text-xs font-semibold text-white">{f.title}</div>
                <div className="text-xs text-slate-500">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvisorChatPage;
