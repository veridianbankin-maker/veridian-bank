/**
 * Veridian Bank — AI Advisor (Chat + Voice)
 * 
 * Features:
 *  - Full financial advisory chatbot (relationship manager style)
 *  - Multi-language: English, Hindi, Hinglish
 *  - Voice commands: speak transactions, queries, account opening
 *  - Account opening workflow via chat
 *  - Transaction via voice command ("Send 500 rupees to Rahul")
 *  - Customer analysis & personalized suggestions
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Language = 'en' | 'hi' | 'hinglish';
type MessageRole = 'user' | 'ai' | 'system';
type WorkflowStep = 'idle' | 'account_opening' | 'transaction' | 'loan_enquiry' | 'analysis';

interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
  language?: Language;
  action?: string;
  data?: Record<string, any>;
}

interface CustomerProfile {
  customerId?: string;
  name?: string;
  accountNumber?: string;
  balance?: number;
  accountType?: string;
  kycStatus?: string;
  loans?: any[];
  recentTransactions?: any[];
}

// ─── Language strings ────────────────────────────────────────────────────────

const STRINGS: Record<Language, Record<string, string>> = {
  en: {
    greeting: "Hello! I'm Veridian AI — your personal banking assistant and relationship manager. How can I help you today?\n\nYou can:\n• Open a new account\n• Check balance or transactions\n• Apply for a loan\n• Get financial advice\n• Transfer money by voice",
    listening: "Listening... speak now",
    processing: "Processing your request...",
    voice_hint: "Try saying: 'Send 500 rupees to Rahul' or 'Check my balance'",
    account_opening_start: "I'll help you open a savings account right now! Let's start.\n\nPlease tell me your **full name**:",
    transaction_confirm: "Please confirm this transaction:",
  },
  hi: {
    greeting: "नमस्ते! मैं Veridian AI हूँ — आपका व्यक्तिगत बैंकिंग सहायक। आज मैं आपकी कैसे मदद कर सकता हूँ?\n\n• नया खाता खोलें\n• बैलेंस जाँचें\n• लोन के लिए आवेदन करें\n• वित्तीय सलाह लें",
    listening: "सुन रहा हूँ... अभी बोलें",
    processing: "आपका अनुरोध प्रोसेस हो रहा है...",
    voice_hint: "कहें: 'राहुल को 500 रुपये भेजो' या 'मेरा बैलेंस बताओ'",
    account_opening_start: "मैं अभी आपका बचत खाता खोलने में मदद करूँगा!\n\nकृपया अपना **पूरा नाम** बताएं:",
    transaction_confirm: "इस लेनदेन की पुष्टि करें:",
  },
  hinglish: {
    greeting: "Namaste! Main Veridian AI hoon — aapka personal banking assistant aur relationship manager. Aaj main aapki kaise help kar sakta hoon?\n\n• Naya account kholein\n• Balance check karein\n• Loan ke liye apply karein\n• Financial advice lein\n• Voice se paise bhejein",
    listening: "Sun raha hoon... abhi bolein",
    processing: "Aapki request process ho rahi hai...",
    voice_hint: "Bolein: 'Rahul ko 500 rupaye bhejo' ya 'Mera balance batao'",
    account_opening_start: "Main abhi aapka savings account kholne mein help karta hoon!\n\nPehle apna **poora naam** batayein:",
    transaction_confirm: "Is transaction ko confirm karein:",
  }
};

// ─── Account Opening Workflow Steps ──────────────────────────────────────────

const ACCOUNT_OPENING_FIELDS = [
  { key: 'full_name',    label: { en: 'Full Name', hi: 'पूरा नाम', hinglish: 'Poora Naam' },           validate: (v: string) => v.trim().length >= 3 },
  { key: 'phone',        label: { en: 'Mobile Number (10 digits)', hi: 'मोबाइल नंबर', hinglish: 'Mobile Number' }, validate: (v: string) => /^[6-9]\d{9}$/.test(v.replace(/\s/g,'')) },
  { key: 'email',        label: { en: 'Email Address', hi: 'ईमेल पता', hinglish: 'Email Address' },    validate: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
  { key: 'dob',          label: { en: 'Date of Birth (DD/MM/YYYY)', hi: 'जन्म तिथि', hinglish: 'Date of Birth' }, validate: (v: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(v) },
  { key: 'aadhaar',      label: { en: 'Aadhaar Number (12 digits)', hi: 'आधार नंबर', hinglish: 'Aadhaar Number' }, validate: (v: string) => /^\d{12}$/.test(v.replace(/\s/g,'')) },
  { key: 'address',      label: { en: 'Full Address', hi: 'पूरा पता', hinglish: 'Poora Address' },      validate: (v: string) => v.trim().length >= 10 },
  { key: 'account_type', label: { en: 'Account Type (Savings / Current)', hi: 'खाता प्रकार', hinglish: 'Account Type' }, validate: (v: string) => ['savings','current','बचत','चालू'].some(x => v.toLowerCase().includes(x)) },
];

// ─── NLP: parse voice/text commands ─────────────────────────────────────────

function parseIntent(text: string): { intent: string; params: Record<string, any> } {
  const lower = text.toLowerCase();

  // Transaction intents
  const txnMatch = lower.match(
    /(?:send|transfer|bhejo|transfer karo|bhejiye|pay)\s+(?:rs\.?|rupees?|rupaye?|₹)?\s*(\d[\d,]*)\s+(?:to|ko)\s+([a-zA-Z\s]+)/i
  );
  if (txnMatch) return { intent: 'transfer', params: { amount: parseInt(txnMatch[1].replace(/,/g,'')), recipient: txnMatch[2].trim() } };

  // Balance check
  if (/balance|bakiya|kitna hai|how much/.test(lower)) return { intent: 'balance', params: {} };

  // Account opening
  if (/open.*account|account.*open|khata.*khol|naya.*account|saving.*account|savings account/.test(lower)) return { intent: 'open_account', params: {} };

  // Loan
  if (/loan|karj|emi|borrow|lending/.test(lower)) return { intent: 'loan', params: {} };

  // Transactions history
  if (/transaction|history|statement|passbook|last.*payment/.test(lower)) return { intent: 'transactions', params: {} };

  // Financial advice
  if (/advice|suggest|invest|fd|fixed deposit|mutual fund|tips|sahi hai|batao|guide/.test(lower)) return { intent: 'advice', params: {} };

  // Greet
  if (/^(hi|hello|namaste|namaskar|hey|hola)\b/.test(lower)) return { intent: 'greet', params: {} };

  return { intent: 'unknown', params: { original: text } };
}

// ─── AI Response Engine ──────────────────────────────────────────────────────

function generateAIResponse(
  intent: string,
  params: Record<string, any>,
  lang: Language,
  customer?: CustomerProfile
): { text: string; action?: string; data?: Record<string, any> } {
  const name = customer?.name ? `, ${customer.name.split(' ')[0]}` : '';

  switch (intent) {
    case 'greet':
      return { text: STRINGS[lang].greeting };

    case 'balance':
      if (customer?.balance !== undefined) {
        const bal = customer.balance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
        return {
          text: lang === 'hi'
            ? `आपका वर्तमान बैलेंस **${bal}** है${name}। क्या आप कोई लेनदेन करना चाहते हैं?`
            : lang === 'hinglish'
            ? `Aapka current balance **${bal}** hai${name}. Kya aap koi transaction karna chahte hain?`
            : `Your current balance is **${bal}**${name}. Would you like to make a transaction?`
        };
      }
      return {
        text: lang === 'hinglish'
          ? `Balance check karne ke liye please apna account number batayein.`
          : `Please provide your account number to check balance.`
      };

    case 'transfer':
      return {
        text: lang === 'hinglish'
          ? `**₹${params.amount?.toLocaleString('en-IN')}** ${params.recipient} ko bhejne ki request receive hui.\n\nKya aap confirm karte hain? (Haan / Nahi)`
          : lang === 'hi'
          ? `**₹${params.amount?.toLocaleString('en-IN')}** ${params.recipient} को भेजने की अनुरोध मिली।\n\nक्या आप पुष्टि करते हैं? (हाँ / नहीं)`
          : `Transfer request received: **₹${params.amount?.toLocaleString('en-IN')}** to **${params.recipient}**.\n\nPlease confirm. (Yes / No)`,
        action: 'confirm_transfer',
        data: params
      };

    case 'open_account':
      return { text: STRINGS[lang].account_opening_start, action: 'start_account_opening' };

    case 'loan':
      return {
        text: lang === 'hinglish'
          ? `Main aapko loan options ke baare mein guide karta hoon:\n\n🏠 **Home Loan** — 8.5% se shuruaat, 30 saal tak\n🚗 **Car Loan** — 9.2% se shuruaat, 7 saal tak\n💼 **Personal Loan** — 10.5% se shuruaat, 5 saal tak\n📚 **Education Loan** — 9.0% se shuruaat, 15 saal tak\n🌾 **Agri Loan** — 7.0% se shuruaat, 5 saal tak\n\nKaunsa loan aapke kaam ka hai? Main aapki eligibility check karta hoon.`
          : `Here are our loan options:\n\n🏠 **Home Loan** — from 8.5%, up to 30 years\n🚗 **Car Loan** — from 9.2%, up to 7 years\n💼 **Personal Loan** — from 10.5%, up to 5 years\n📚 **Education Loan** — from 9.0%, up to 15 years\n🌾 **Agri Loan** — from 7.0%, up to 5 years\n\nWhich loan interests you? I'll check your eligibility.`
      };

    case 'advice':
      const balanceAdvice = customer?.balance
        ? customer.balance > 100000
          ? lang === 'hinglish' ? `Aapke paas ₹${customer.balance.toLocaleString('en-IN')} hain. Main suggest karunga:\n\n💡 **FD (Fixed Deposit)** — 7.2% guaranteed return\n📈 **Mutual Funds** — 12-15% potential return\n🛡️ **Insurance** — term plan lena chahiye\n\nAapka financial goal kya hai?`
            : `You have ₹${customer.balance.toLocaleString('en-IN')}. I recommend:\n\n💡 **Fixed Deposit** — 7.2% guaranteed\n📈 **Mutual Funds** — 12-15% potential\n🛡️ **Insurance** — get a term plan\n\nWhat's your financial goal?`
          : lang === 'hinglish' ? `Pahle apni savings badhayein. Main aapko ek savings plan banata hoon!` : `Let's build your savings plan first!`
        : lang === 'hinglish'
          ? `Financial advice ke liye:\n\n1. **Emergency Fund** — 6 months ka kharcha bachayein\n2. **SIP** — ₹500/month se shuru karein\n3. **FD** — guaranteed returns ke liye\n4. **Insurance** — life & health cover lein\n\nAapki monthly income kitni hai? Personalized plan banaata hoon.`
          : `Financial advice:\n\n1. **Emergency Fund** — save 6 months expenses\n2. **SIP** — start with ₹500/month\n3. **Fixed Deposit** — for guaranteed returns\n4. **Insurance** — life & health cover\n\nShare your monthly income for a personalized plan.`;
      return { text: balanceAdvice };

    case 'transactions':
      if (customer?.recentTransactions?.length) {
        const txns = customer.recentTransactions.slice(0, 5).map((t: any) =>
          `• ${t.transaction_type} **₹${t.amount?.toLocaleString('en-IN')}** — ${t.description || t.status}`
        ).join('\n');
        return { text: `Recent transactions${name}:\n\n${txns}` };
      }
      return { text: lang === 'hinglish' ? `Abhi koi transaction nahi mili. Kya aap naya transaction karna chahte hain?` : `No recent transactions found. Would you like to make a transaction?` };

    default:
      return {
        text: lang === 'hinglish'
          ? `Samajh nahi aaya. Kya aap yeh try kar sakte hain:\n• "Balance check karo"\n• "Savings account kholna hai"\n• "Loan ke baare mein batao"\n• "Rahul ko 1000 rupaye bhejo"`
          : lang === 'hi'
          ? `क्षमा करें, मैं समझ नहीं पाया। कृपया दोबारा कोशिश करें।`
          : `I didn't understand that. Try:\n• "Check my balance"\n• "Open a savings account"\n• "Tell me about loans"\n• "Send ₹1000 to Rahul"`
      };
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

const AIAdvisor: React.FC<{ customer?: CustomerProfile; onTransaction?: (data: any) => void }> = ({
  customer,
  onTransaction
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<Language>('hinglish');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowStep>('idle');
  const [workflowData, setWorkflowData] = useState<Record<string, any>>({});
  const [workflowStep, setWorkflowStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Init
  useEffect(() => {
    setVoiceSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
    addMessage('ai', STRINGS[language].greeting);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: MessageRole, text: string, action?: string, data?: Record<string,any>) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role, text, timestamp: new Date(), language, action, data
    }]);
  };

  // Text-to-Speech
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/\*\*/g, '').replace(/[•#]/g, ''));
    utterance.lang = language === 'hi' ? 'hi-IN' : 'hi-IN'; // hi-IN works for Hinglish too
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }, [language]);

  // Voice Recognition
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;

    recognitionRef.current = new SpeechRecognition();
    const rec = recognitionRef.current;
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = language === 'hi' ? 'hi-IN' : 'hi-IN'; // hi-IN handles Hinglish well
    rec.maxAlternatives = 1;

    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };

    rec.start();
  }, [language]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // Account opening workflow handler
  const handleAccountOpeningStep = (userInput: string) => {
    const field = ACCOUNT_OPENING_FIELDS[workflowStep];
    if (!field.validate(userInput)) {
      const hint = language === 'hinglish' ? `Yeh sahi nahi laga. Kripaya dobaara try karein.` : `That doesn't look right. Please try again.`;
      addMessage('ai', `❌ ${hint}\n\nPlease enter your **${field.label[language]}**:`);
      return;
    }

    const newData = { ...workflowData, [field.key]: userInput };
    setWorkflowData(newData);

    const nextStep = workflowStep + 1;
    if (nextStep >= ACCOUNT_OPENING_FIELDS.length) {
      // Complete — show summary
      setWorkflow('idle');
      setWorkflowStep(0);
      const summary = Object.entries(newData).map(([k, v]) => `• **${k.replace(/_/g,' ')}**: ${v}`).join('\n');
      const confirm = language === 'hinglish'
        ? `✅ Sabhi details capture ho gayi!\n\n${summary}\n\nKya aap confirm karte hain? Agar haan, to aapka account 24 ghante mein activate ho jayega aur account number SMS/email se milega.\n\n**Confirm (Haan/Yes)** ya **Cancel (Nahi/No)**`
        : `✅ All details captured!\n\n${summary}\n\nConfirm to submit your account opening request. Your account will be activated within 24 hours.\n\n**Confirm (Yes)** or **Cancel (No)**`;
      addMessage('ai', confirm, 'account_opening_review', newData);
      speak(language === 'hinglish' ? 'Sabhi details sahi hai. Confirm karein?' : 'All details captured. Please confirm.');
    } else {
      setWorkflowStep(nextStep);
      const nextField = ACCOUNT_OPENING_FIELDS[nextStep];
      addMessage('ai', `✅ Got it!\n\nNow please enter your **${nextField.label[language]}**:`);
    }
  };

  // Main send handler
  const handleSend = useCallback(async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText) return;
    setInput('');
    setIsProcessing(true);
    addMessage('user', userText);

    await new Promise(r => setTimeout(r, 600));

    // Account opening workflow
    if (workflow === 'account_opening') {
      handleAccountOpeningStep(userText);
      setIsProcessing(false);
      return;
    }

    // Handle confirmation responses
    const lastAIMsg = messages.filter(m => m.role === 'ai').slice(-1)[0];
    if (lastAIMsg?.action === 'confirm_transfer') {
      if (/yes|haan|ha|confirm|ok|sure/.test(userText.toLowerCase())) {
        const response = language === 'hinglish'
          ? `✅ Transaction initiated! ₹${lastAIMsg.data?.amount?.toLocaleString('en-IN')} ${lastAIMsg.data?.recipient} ko bheja ja raha hai.\n\nTransaction ID: VB${Date.now().toString().slice(-8)}\nStatus: Processing...`
          : `✅ Transaction initiated! ₹${lastAIMsg.data?.amount?.toLocaleString('en-IN')} to ${lastAIMsg.data?.recipient} is being processed.\n\nTransaction ID: VB${Date.now().toString().slice(-8)}`;
        addMessage('ai', response);
        speak(language === 'hinglish' ? 'Transaction successful' : 'Transaction has been initiated');
        onTransaction?.(lastAIMsg.data);
        setIsProcessing(false);
        return;
      } else if (/no|nahi|nai|cancel/.test(userText.toLowerCase())) {
        addMessage('ai', language === 'hinglish' ? '❌ Transaction cancel kar di gayi.' : '❌ Transaction cancelled.');
        setIsProcessing(false);
        return;
      }
    }

    if (lastAIMsg?.action === 'account_opening_review') {
      if (/yes|haan|ha|confirm|ok|sure/.test(userText.toLowerCase())) {
        addMessage('ai', language === 'hinglish'
          ? `🎉 **Account Opening Request Submitted!**\n\nAapka application number: **VB-ACC-${Date.now().toString().slice(-6)}**\n\n• KYC verification 24-48 hours mein\n• Account number SMS pe milega\n• Net banking credentials email pe milenge\n\nKoi aur help?`
          : `🎉 **Account Opening Request Submitted!**\n\nApplication No: **VB-ACC-${Date.now().toString().slice(-6)}**\n\n• KYC verification within 24-48 hours\n• Account number via SMS\n• Net banking credentials via email\n\nAnything else?`
        );
        speak(language === 'hinglish' ? 'Account opening request submit ho gayi. Badhai ho!' : 'Account opening request submitted successfully!');
        setIsProcessing(false);
        return;
      }
    }

    // Standard intent
    const { intent, params } = parseIntent(userText);
    const response = generateAIResponse(intent, params, language, customer);

    if (response.action === 'start_account_opening') {
      setWorkflow('account_opening');
      setWorkflowStep(0);
      setWorkflowData({});
    }

    addMessage('ai', response.text, response.action, response.data);
    speak(response.text.split('\n')[0]);
    setIsProcessing(false);
  }, [input, workflow, workflowStep, workflowData, messages, language, customer, onTransaction]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110"
        style={{ background: 'linear-gradient(135deg, #1a3c6e 0%, #2563eb 100%)' }}
        aria-label="Open AI Advisor"
      >
        <span className="text-2xl">{isOpen ? '✕' : '🤖'}</span>
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse border-2 border-white" />
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 z-50 w-96 max-h-[600px] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: '#0f1f3d', border: '1px solid rgba(59,130,246,0.3)' }}>

          {/* Header */}
          <div className="p-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #1a3c6e 0%, #1e40af 100%)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(255,255,255,0.15)' }}>🤖</div>
            <div className="flex-1">
              <div className="font-bold text-white text-sm">Veridian AI</div>
              <div className="text-xs text-blue-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
                Virtual Relationship Manager
              </div>
            </div>
            {/* Language Selector */}
            <select
              value={language}
              onChange={e => {
                setLanguage(e.target.value as Language);
                setMessages([]);
                setTimeout(() => addMessage('ai', STRINGS[e.target.value as Language].greeting), 100);
              }}
              className="text-xs rounded-lg px-2 py-1 border-0 cursor-pointer font-medium"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              <option value="hinglish" style={{ color: '#000' }}>🇮🇳 Hinglish</option>
              <option value="en" style={{ color: '#000' }}>🌐 English</option>
              <option value="hi" style={{ color: '#000' }}>🇮🇳 हिंदी</option>
            </select>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#0f1f3d', minHeight: '380px', maxHeight: '380px' }}>
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1"
                    style={{ background: 'linear-gradient(135deg,#1e40af,#2563eb)' }}>🤖</div>
                )}
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                  style={msg.role === 'user'
                    ? { background: 'linear-gradient(135deg,#1e40af,#2563eb)', color: '#fff', borderBottomRightRadius: '4px' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', borderBottomLeftRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                  dangerouslySetInnerHTML={{
                    __html: msg.text
                      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#60a5fa">$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2" style={{ background: 'linear-gradient(135deg,#1e40af,#2563eb)' }}>🤖</div>
                <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice hint */}
          {voiceSupported && (
            <div className="px-4 py-1 text-center text-xs" style={{ color: 'rgba(148,163,184,0.6)', background: 'rgba(0,0,0,0.2)' }}>
              {isListening ? `🎙️ ${STRINGS[language].listening}` : STRINGS[language].voice_hint}
            </div>
          )}

          {/* Input */}
          <div className="p-3 flex gap-2" style={{ background: '#0a1628', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {voiceSupported && (
              <button
                onClick={isListening ? stopListening : startListening}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: isListening ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'rgba(255,255,255,0.08)',
                  border: `2px solid ${isListening ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                  animation: isListening ? 'pulse 1.5s infinite' : 'none'
                }}
                title="Voice command"
              >
                {isListening ? '⏹' : '🎙️'}
              </button>
            )}
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={language === 'hinglish' ? 'Kuch poochein ya bolein...' : language === 'hi' ? 'कुछ पूछें...' : 'Ask anything...'}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}
              disabled={isProcessing}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isProcessing}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#1e40af,#2563eb)', opacity: !input.trim() ? 0.5 : 1 }}
            >
              ➤
            </button>
          </div>

          {/* Quick Actions */}
          <div className="px-3 pb-3 flex gap-1.5 flex-wrap" style={{ background: '#0a1628' }}>
            {[
              { label: '💰 Balance', cmd: 'Check my balance' },
              { label: '🏦 Open Account', cmd: 'I want to open savings account' },
              { label: '💳 Loan', cmd: 'Tell me about loans' },
              { label: '📊 Advice', cmd: 'Give me financial advice' },
            ].map(q => (
              <button
                key={q.label}
                onClick={() => { setInput(q.cmd); setTimeout(() => handleSend(q.cmd), 50); }}
                className="text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105"
                style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default AIAdvisor;
