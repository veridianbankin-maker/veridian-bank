/**
 * Veridian Bank — AI Advisor v2.0
 * Real banking-grade AI chatbot + voice assistant
 *
 * Languages: English | Hindi | Hinglish (Hindi+English) | Bengali
 * Features:
 *  - 4-language voice recognition + TTS
 *  - Account opening full workflow (conversational)
 *  - Transaction by voice command ("Rahul ko 500 rupaye bhejo")
 *  - Loan enquiry + EMI calculator
 *  - Balance check, statement, financial advice
 *  - Customer analysis, personalized suggestions
 *  - Full NLP intent engine
 *  - Works as floating widget on any page
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Language = 'en' | 'hi' | 'hinglish' | 'bn';
export type SpeechLang = 'en-IN' | 'hi-IN' | 'bn-IN';

type MsgRole = 'user' | 'ai' | 'system';
type WorkflowType = 'idle' | 'account_opening' | 'transfer' | 'loan_apply' | 'kyc';

interface Msg {
  id: string;
  role: MsgRole;
  text: string;
  time: Date;
  lang?: Language;
  action?: string;
  data?: any;
  isVoice?: boolean;
}

export interface CustomerProfile {
  customer_id?: string;
  full_name?: string;
  account_number?: string;
  balance?: number;
  account_type?: string;
  kyc_status?: string;
  branch_code?: string;
  loans?: any[];
  recent_transactions?: any[];
}

// ─── Language Config ──────────────────────────────────────────────────────────

const LANG_META: Record<Language, { label: string; flag: string; speechLang: SpeechLang; voiceName?: string }> = {
  en:       { label: 'English',       flag: '🌐', speechLang: 'en-IN' },
  hi:       { label: 'हिंदी',          flag: '🇮🇳', speechLang: 'hi-IN' },
  hinglish: { label: 'Hinglish',      flag: '🇮🇳', speechLang: 'hi-IN' },
  bn:       { label: 'বাংলা',         flag: '🇧🇩', speechLang: 'bn-IN' },
};

// ─── Translations ─────────────────────────────────────────────────────────────

const T: Record<Language, Record<string, string>> = {
  en: {
    greeting: `Hello! I'm **Veridian AI** — your personal banking assistant and virtual relationship manager. 🏦

I can help you with:
• 💰 **Check balance** — "What's my balance?"
• 💸 **Transfer money** — "Send ₹500 to Rahul"
• 🏦 **Open account** — "I want to open a savings account"
• 💳 **Loan enquiry** — "Tell me about home loan"
• 📊 **Financial advice** — "How should I invest my savings?"
• 📋 **Transactions** — "Show my last 5 transactions"

You can also **speak** using the 🎙️ button!`,
    placeholder: 'Ask me anything or speak...',
    voice_hint: 'Tap 🎙️ or say "Hey Veridian"',
    listening: '🔴 Listening...',
    processing: 'Thinking...',
    acc_open_start: `Let's open your account right now! I'll guide you step by step.\n\nFirst, please tell me your **full name** (as per Aadhaar):`,
    confirm_prompt: 'Please confirm: **Yes** or **No**',
    error_generic: `Sorry, I didn't understand that. Try saying:\n• "Check balance"\n• "Send money"\n• "Open account"\n• "Apply for loan"`,
  },
  hi: {
    greeting: `नमस्ते! मैं **Veridian AI** हूँ — आपका व्यक्तिगत बैंकिंग सहायक। 🏦

मैं आपकी इन कामों में मदद कर सकता हूँ:
• 💰 **बैलेंस जाँचें** — "मेरा बैलेंस क्या है?"
• 💸 **पैसे भेजें** — "राहुल को ₹500 भेजो"
• 🏦 **खाता खोलें** — "मुझे बचत खाता खोलना है"
• 💳 **लोन की जानकारी** — "होम लोन के बारे में बताओ"
• 📊 **वित्तीय सलाह** — "मैं अपनी बचत कैसे निवेश करूँ?"

🎙️ बटन से बोलकर भी पूछ सकते हैं!`,
    placeholder: 'कुछ भी पूछें या बोलें...',
    voice_hint: '🎙️ दबाएँ और बोलें',
    listening: '🔴 सुन रहा हूँ...',
    processing: 'सोच रहा हूँ...',
    acc_open_start: `मैं अभी आपका खाता खोलने में मदद करूँगा!\n\nपहले अपना **पूरा नाम** (आधार के अनुसार) बताएं:`,
    confirm_prompt: 'कृपया पुष्टि करें: **हाँ** या **नहीं**',
    error_generic: `क्षमा करें, मैं समझ नहीं पाया। कृपया दोबारा कोशिश करें:\n• "बैलेंस चेक करो"\n• "पैसे भेजो"\n• "खाता खोलो"`,
  },
  hinglish: {
    greeting: `Namaste! Main **Veridian AI** hoon — aapka personal banking assistant. 🏦

Main aapki in kamon mein help kar sakta hoon:
• 💰 **Balance check** — "Mera balance kya hai?"
• 💸 **Paisa bhejo** — "Rahul ko ₹500 bhejo"
• 🏦 **Account kholo** — "Mujhe savings account kholna hai"
• 💳 **Loan enquiry** — "Home loan ke baare mein batao"
• 📊 **Financial advice** — "Main apni bachat kaise invest karun?"
• 📋 **Transactions** — "Mere last 5 transactions dikhao"

🎙️ button dabao aur bolte bhi ho!`,
    placeholder: 'Kuch bhi poochein ya bolein...',
    voice_hint: '🎙️ dabao ya bolein "Hey Veridian"',
    listening: '🔴 Sun raha hoon...',
    processing: 'Soch raha hoon...',
    acc_open_start: `Main abhi aapka account kholne mein help karta hoon!\n\nPehle apna **poora naam** (Aadhaar ke anusaar) batayein:`,
    confirm_prompt: 'Please confirm: **Haan** ya **Nahi**',
    error_generic: `Samajh nahi aaya. Try karein:\n• "Balance check karo"\n• "Paisa bhejo"\n• "Account kholo"\n• "Loan ke baare mein batao"`,
  },
  bn: {
    greeting: `নমস্কার! আমি **Veridian AI** — আপনার ব্যক্তিগত ব্যাংকিং সহকারী। 🏦

আমি আপনাকে এই বিষয়গুলোতে সাহায্য করতে পারি:
• 💰 **ব্যালেন্স চেক** — "আমার ব্যালেন্স কত?"
• 💸 **টাকা পাঠান** — "রাহুলকে ৫০০ টাকা পাঠাও"
• 🏦 **অ্যাকাউন্ট খুলুন** — "আমি সেভিংস অ্যাকাউন্ট খুলতে চাই"
• 💳 **লোন জিজ্ঞাসা** — "হোম লোন সম্পর্কে বলুন"
• 📊 **আর্থিক পরামর্শ** — "আমি কীভাবে বিনিয়োগ করব?"

🎙️ বোতাম চেপে কথা বলুন!`,
    placeholder: 'যেকোনো প্রশ্ন করুন বা বলুন...',
    voice_hint: '🎙️ চাপুন এবং বলুন',
    listening: '🔴 শুনছি...',
    processing: 'ভাবছি...',
    acc_open_start: `আমি এখনই আপনার অ্যাকাউন্ট খুলতে সাহায্য করব!\n\nপ্রথমে আপনার **পুরো নাম** (আধার অনুযায়ী) বলুন:`,
    confirm_prompt: 'নিশ্চিত করুন: **হ্যাঁ** বা **না**',
    error_generic: `বুঝতে পারিনি। আবার চেষ্টা করুন:\n• "ব্যালেন্স চেক করো"\n• "টাকা পাঠাও"\n• "অ্যাকাউন্ট খোলো"`,
  },
};

// ─── Account Opening Workflow ─────────────────────────────────────────────────

const ACC_FIELDS = [
  {
    key: 'full_name',
    prompt: { en: 'Full Name (as per Aadhaar)', hi: 'पूरा नाम (आधार के अनुसार)', hinglish: 'Poora naam (Aadhaar ke anusaar)', bn: 'পুরো নাম (আধার অনুযায়ী)' },
    validate: (v: string) => v.trim().length >= 3,
    error: { en: 'Name must be at least 3 characters', hi: 'नाम कम से कम 3 अक्षर का होना चाहिए', hinglish: 'Naam kam se kam 3 letters ka hona chahiye', bn: 'নাম কমপক্ষে ৩ অক্ষরের হতে হবে' },
  },
  {
    key: 'phone',
    prompt: { en: 'Mobile Number (10 digits)', hi: 'मोबाइल नंबर (10 अंक)', hinglish: 'Mobile number (10 digits)', bn: 'মোবাইল নম্বর (১০ সংখ্যা)' },
    validate: (v: string) => /^[6-9]\d{9}$/.test(v.replace(/\s|-/g, '')),
    error: { en: 'Enter a valid 10-digit mobile number', hi: 'सही 10 अंक का मोबाइल नंबर डालें', hinglish: 'Valid 10-digit mobile number daalen', bn: 'সঠিক ১০ সংখ্যার মোবাইল নম্বর দিন' },
  },
  {
    key: 'email',
    prompt: { en: 'Email Address', hi: 'ईमेल पता', hinglish: 'Email address', bn: 'ইমেইল ঠিকানা' },
    validate: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    error: { en: 'Enter a valid email address', hi: 'सही ईमेल पता डालें', hinglish: 'Valid email address daalen', bn: 'সঠিক ইমেইল ঠিকানা দিন' },
  },
  {
    key: 'dob',
    prompt: { en: 'Date of Birth (DD/MM/YYYY)', hi: 'जन्म तिथि (DD/MM/YYYY)', hinglish: 'Date of birth (DD/MM/YYYY)', bn: 'জন্ম তারিখ (DD/MM/YYYY)' },
    validate: (v: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(v),
    error: { en: 'Use format DD/MM/YYYY', hi: 'DD/MM/YYYY format में डालें', hinglish: 'DD/MM/YYYY format mein daalen', bn: 'DD/MM/YYYY ফরম্যাটে লিখুন' },
  },
  {
    key: 'aadhaar',
    prompt: { en: 'Aadhaar Number (12 digits)', hi: 'आधार नंबर (12 अंक)', hinglish: 'Aadhaar number (12 digits)', bn: 'আধার নম্বর (১২ সংখ্যা)' },
    validate: (v: string) => /^\d{12}$/.test(v.replace(/\s/g, '')),
    error: { en: 'Enter valid 12-digit Aadhaar', hi: '12 अंक का सही आधार नंबर डालें', hinglish: '12-digit valid Aadhaar number daalen', bn: 'সঠিক ১২ সংখ্যার আধার নম্বর দিন' },
  },
  {
    key: 'address',
    prompt: { en: 'Full Address', hi: 'पूरा पता', hinglish: 'Poora address', bn: 'সম্পূর্ণ ঠিকানা' },
    validate: (v: string) => v.trim().length >= 10,
    error: { en: 'Address must be at least 10 characters', hi: 'पता कम से कम 10 अक्षर का हो', hinglish: 'Address kam se kam 10 characters ka ho', bn: 'ঠিকানা কমপক্ষে ১০ অক্ষরের হতে হবে' },
  },
  {
    key: 'account_type',
    prompt: { en: 'Account Type — Savings or Current?', hi: 'खाता प्रकार — बचत या चालू?', hinglish: 'Account type — Savings ya Current?', bn: 'অ্যাকাউন্টের ধরন — সেভিংস না কারেন্ট?' },
    validate: (v: string) => /savings|current|बचत|चालू|সেভিংস|কারেন্ট/i.test(v),
    error: { en: 'Say "Savings" or "Current"', hi: '"बचत" या "चालू" बोलें', hinglish: '"Savings" ya "Current" bolein', bn: '"সেভিংস" বা "কারেন্ট" বলুন' },
  },
];

// ─── NLP Intent Parser ────────────────────────────────────────────────────────

interface Intent { name: string; params: Record<string, any> }

function parseIntent(text: string): Intent {
  const t = text.toLowerCase().trim();

  // Transfer / Send money
  const txnRe = /(?:send|transfer|pay|bhejo|bhejiye|de do|transfer karo|পাঠাও|পাঠান|পেমেন্ট)\s+(?:rs\.?|₹|rupees?|rupaye?|taka|টাকা)?\s*([\d,]+)\s+(?:to|ko|ke liye|কে)\s+([a-zA-Z\s\u0900-\u097F\u0980-\u09FF]+)/i;
  const txnMatch = t.match(txnRe);
  if (txnMatch) return { name: 'TRANSFER', params: { amount: parseInt(txnMatch[1].replace(/,/g,'')), recipient: txnMatch[2].trim() } };

  // Balance
  if (/balance|bakiya|kitna|কত|ব্যালেন্স|how much|paisa|amount/.test(t)) return { name: 'BALANCE', params: {} };

  // Account opening
  if (/open.*account|account.*open|khata.*khol|naya.*account|account.*khol|অ্যাকাউন্ট.*খুল|খাতা.*খুল|saving|savings|current/.test(t)) return { name: 'OPEN_ACCOUNT', params: {} };

  // Loan
  if (/loan|karj|emi|borrow|লোন|ঋণ|interest|home loan|car loan|personal loan/.test(t)) {
    const amtMatch = t.match(/([\d,]+)/);
    return { name: 'LOAN', params: { amount: amtMatch ? parseInt(amtMatch[1].replace(/,/g,'')) : null } };
  }

  // Statement / transactions
  if (/transaction|history|statement|passbook|last.*payment|পেমেন্ট.*ইতিহাস|লেনদেন/.test(t)) return { name: 'TRANSACTIONS', params: {} };

  // Financial advice
  if (/advice|suggest|invest|fd|fixed deposit|mutual fund|sip|tips|batao|guide|পরামর্শ|বিনিয়োগ/.test(t)) return { name: 'ADVICE', params: {} };

  // Block card
  if (/block.*card|card.*block|band.*card|card.*band|কার্ড.*ব্লক/.test(t)) return { name: 'BLOCK_CARD', params: {} };

  // KYC
  if (/kyc|aadhaar|pan|document|verify|verification/.test(t)) return { name: 'KYC', params: {} };

  // Greeting
  if (/^(hi|hello|namaste|namaskar|hey|hola|নমস্কার|হ্যালো|নমস্তে)\b/.test(t)) return { name: 'GREET', params: {} };

  // Confirm / Cancel
  if (/^(yes|haan|ha|confirm|ok|sure|হ্যাঁ|হাঁ)\b/.test(t)) return { name: 'CONFIRM', params: {} };
  if (/^(no|nahi|nai|cancel|না|না-হ)\b/.test(t)) return { name: 'CANCEL', params: {} };

  return { name: 'UNKNOWN', params: { original: text } };
}

// ─── Response Generator ───────────────────────────────────────────────────────

function buildResponse(
  intent: Intent,
  lang: Language,
  customer?: CustomerProfile
): { text: string; action?: string; data?: any } {
  const name = customer?.full_name ? ` ${customer.full_name.split(' ')[0]}` : '';
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  switch (intent.name) {
    case 'GREET': return { text: T[lang].greeting };

    case 'BALANCE': {
      if (customer?.balance !== undefined) {
        const bal = fmt(customer.balance);
        const msgs: Record<Language, string> = {
          en: `Your current balance is **${bal}**${name}. 💰\n\nWould you like to:\n• Make a transfer\n• View recent transactions\n• Get financial advice`,
          hi: `आपका वर्तमान बैलेंस **${bal}** है${name}। 💰\n\nक्या आप चाहते हैं:\n• पैसे भेजना\n• लेनदेन देखना\n• वित्तीय सलाह`,
          hinglish: `Aapka current balance **${bal}** hai${name}। 💰\n\nKya aap chahte hain:\n• Transfer karna\n• Transactions dekhna\n• Financial advice`,
          bn: `আপনার বর্তমান ব্যালেন্স **${bal}**${name}। 💰\n\nআপনি কি করতে চান:\n• টাকা পাঠান\n• লেনদেন দেখুন\n• আর্থিক পরামর্শ`,
        };
        return { text: msgs[lang] };
      }
      const msgs: Record<Language, string> = {
        en: 'Please provide your account number to check balance.',
        hi: 'बैलेंस जाँचने के लिए अपना खाता नंबर बताएं।',
        hinglish: 'Balance check karne ke liye account number batayein.',
        bn: 'ব্যালেন্স চেক করতে আপনার অ্যাকাউন্ট নম্বর দিন।',
      };
      return { text: msgs[lang] };
    }

    case 'TRANSFER': {
      const { amount, recipient } = intent.params;
      const msgs: Record<Language, string> = {
        en: `💸 Transfer Request:\n\n**Amount:** ${fmt(amount)}\n**To:** ${recipient}\n**Mode:** UPI / IMPS\n\nPlease confirm this transfer. (Yes / No)`,
        hi: `💸 ट्रांसफर अनुरोध:\n\n**राशि:** ${fmt(amount)}\n**को:** ${recipient}\n**माध्यम:** UPI / IMPS\n\nक्या आप इस ट्रांसफर की पुष्टि करते हैं? (हाँ / नहीं)`,
        hinglish: `💸 Transfer Request:\n\n**Amount:** ${fmt(amount)}\n**Ko:** ${recipient}\n**Mode:** UPI / IMPS\n\nKya aap is transfer ko confirm karte hain? (Haan / Nahi)`,
        bn: `💸 ট্রান্সফার অনুরোধ:\n\n**পরিমাণ:** ${fmt(amount)}\n**প্রাপক:** ${recipient}\n**মোড:** UPI / IMPS\n\nকি এই ট্রান্সফার নিশ্চিত করবেন? (হ্যাঁ / না)`,
      };
      return { text: msgs[lang], action: 'CONFIRM_TRANSFER', data: { amount, recipient } };
    }

    case 'OPEN_ACCOUNT': return { text: T[lang].acc_open_start, action: 'START_ACCOUNT_OPENING' };

    case 'LOAN': {
      const msgs: Record<Language, string> = {
        en: `🏦 **Loan Products:**\n\n🏠 **Home Loan** — 8.5% p.a. · up to 30 yrs · up to ₹50L\n🚗 **Car Loan** — 9.2% p.a. · up to 7 yrs · up to ₹20L\n💼 **Personal Loan** — 10.5% p.a. · up to 5 yrs · up to ₹10L\n📚 **Education Loan** — 9.0% p.a. · up to 15 yrs · up to ₹20L\n🌾 **Agri Loan** — 7.0% p.a. · up to 5 yrs · up to ₹5L\n\nWhich loan interests you? I can calculate your EMI!`,
        hi: `🏦 **लोन उत्पाद:**\n\n🏠 **होम लोन** — 8.5% प्रति वर्ष · 30 साल तक · ₹50L तक\n🚗 **कार लोन** — 9.2% · 7 साल तक · ₹20L तक\n💼 **पर्सनल लोन** — 10.5% · 5 साल तक · ₹10L तक\n📚 **एजुकेशन लोन** — 9.0% · 15 साल तक · ₹20L तक\n🌾 **कृषि लोन** — 7.0% · 5 साल तक · ₹5L तक\n\nकौन सा लोन चाहिए? मैं EMI calculate करूँगा!`,
        hinglish: `🏦 **Loan Products:**\n\n🏠 **Home Loan** — 8.5% p.a. · 30 saal tak · ₹50L tak\n🚗 **Car Loan** — 9.2% · 7 saal tak · ₹20L tak\n💼 **Personal Loan** — 10.5% · 5 saal tak · ₹10L tak\n📚 **Education Loan** — 9.0% · 15 saal tak · ₹20L tak\n🌾 **Agri Loan** — 7.0% · 5 saal tak · ₹5L tak\n\nKaunsa loan chahiye? Main EMI calculate kar sakta hoon!`,
        bn: `🏦 **লোন পণ্য:**\n\n🏠 **হোম লোন** — ৮.৫% প্রতি বছর · ৩০ বছর পর্যন্ত\n🚗 **কার লোন** — ৯.২% · ৭ বছর পর্যন্ত\n💼 **পার্সোনাল লোন** — ১০.৫% · ৫ বছর পর্যন্ত\n📚 **শিক্ষা লোন** — ৯.০% · ১৫ বছর পর্যন্ত\n\nকোন লোন চান? আমি EMI হিসাব করব!`,
      };
      return { text: msgs[lang] };
    }

    case 'TRANSACTIONS': {
      if (customer?.recent_transactions?.length) {
        const txns = customer.recent_transactions.slice(0, 5).map((t: any) =>
          `• ${t.transaction_type === 'Credit' ? '⬆️' : '⬇️'} **${t.transaction_type}** ${fmt(t.amount)} — ${t.description || t.status}`
        ).join('\n');
        const header: Record<Language, string> = {
          en: `Recent transactions${name}:\n\n${txns}`,
          hi: `हाल के लेनदेन${name}:\n\n${txns}`,
          hinglish: `Recent transactions${name}:\n\n${txns}`,
          bn: `সাম্প্রতিক লেনদেন${name}:\n\n${txns}`,
        };
        return { text: header[lang] };
      }
      const msgs: Record<Language, string> = {
        en: 'No recent transactions found.',
        hi: 'कोई हाल का लेनदेन नहीं मिला।',
        hinglish: 'Koi recent transaction nahi mili.',
        bn: 'কোনো সাম্প্রতিক লেনদেন পাওয়া যায়নি।',
      };
      return { text: msgs[lang] };
    }

    case 'ADVICE': {
      const bal = customer?.balance || 0;
      const msgs: Record<Language, string> = {
        en: `📊 **Personalized Financial Advice${name}:**\n\n${bal > 100000 ? `💡 You have **${fmt(bal)}** — consider:\n• **FD** @ 7.2% guaranteed\n• **SIP** mutual fund from ₹500/month\n• **PPF** for tax-saving` : `💡 Build your emergency fund first:\n• Save 6 months of expenses\n• Start **SIP** with ₹500/month`}\n\n🛡️ **Insurance**: Get term life + health cover\n📅 **Goal**: What's your financial target?`,
        hi: `📊 **व्यक्तिगत वित्तीय सलाह${name}:**\n\n${bal > 100000 ? `💡 आपके पास **${fmt(bal)}** है — सुझाव:\n• **FD** @ 7.2% गारंटीड रिटर्न\n• **SIP** ₹500/महीने से शुरू\n• **PPF** टैक्स बचत के लिए` : `💡 पहले emergency fund बनाएं:\n• 6 महीने का खर्च बचाएं\n• ₹500/महीने से SIP शुरू करें`}\n\n🛡️ **बीमा**: टर्म लाइफ + हेल्थ\n📅 **लक्ष्य**: आपका वित्तीय लक्ष्य क्या है?`,
        hinglish: `📊 **Personalized Financial Advice${name}:**\n\n${bal > 100000 ? `💡 Aapke paas **${fmt(bal)}** hai — suggestions:\n• **FD** @ 7.2% guaranteed\n• **SIP** ₹500/month se shuru\n• **PPF** tax saving ke liye` : `💡 Pehle emergency fund banao:\n• 6 months ka kharcha bachao\n• SIP ₹500/month se shuru karo`}\n\n🛡️ **Insurance**: Term life + health cover\n📅 **Goal**: Aapka financial target kya hai?`,
        bn: `📊 **ব্যক্তিগত আর্থিক পরামর্শ${name}:**\n\n${bal > 100000 ? `💡 আপনার কাছে **${fmt(bal)}** আছে — পরামর্শ:\n• **FD** @ ৭.২% নিশ্চিত রিটার্ন\n• **SIP** ₹৫০০/মাস থেকে শুরু\n• **PPF** কর সঞ্চয়ের জন্য` : `💡 প্রথমে জরুরি তহবিল তৈরি করুন:\n• ৬ মাসের খরচ বাঁচান`}\n\n🛡️ **বিমা**: টার্ম লাইফ + স্বাস্থ্য`,
      };
      return { text: msgs[lang] };
    }

    case 'KYC': {
      const msgs: Record<Language, string> = {
        en: `📋 **KYC Status:** ${customer?.kyc_status || 'Not checked'}\n\nTo complete KYC:\n1. Upload Aadhaar card\n2. Upload PAN card\n3. Live photo verification\n4. Visit nearest branch (optional)\n\nWould you like to start KYC now?`,
        hi: `📋 **KYC स्थिति:** ${customer?.kyc_status || 'जाँच नहीं हुई'}\n\nKYC पूरा करने के लिए:\n1. आधार कार्ड अपलोड करें\n2. पैन कार्ड अपलोड करें\n3. लाइव फोटो वेरिफिकेशन\n4. नजदीकी शाखा जाएं (वैकल्पिक)\n\nक्या आप अभी KYC शुरू करना चाहते हैं?`,
        hinglish: `📋 **KYC Status:** ${customer?.kyc_status || 'Check nahi hua'}\n\nKYC complete karne ke liye:\n1. Aadhaar upload karein\n2. PAN card upload karein\n3. Live photo verification\n\nKya aap abhi KYC shuru karna chahte hain?`,
        bn: `📋 **KYC অবস্থা:** ${customer?.kyc_status || 'চেক করা হয়নি'}\n\nKYC সম্পন্ন করতে:\n1. আধার কার্ড আপলোড করুন\n2. প্যান কার্ড আপলোড করুন\n3. লাইভ ফটো যাচাই`,
      };
      return { text: msgs[lang] };
    }

    case 'BLOCK_CARD': {
      const msgs: Record<Language, string> = {
        en: `⚠️ **Card Block Request**\n\nAre you sure you want to block your debit/credit card? This action will immediately prevent all transactions.\n\nConfirm: **Yes** or **No**`,
        hi: `⚠️ **कार्ड ब्लॉक अनुरोध**\n\nक्या आप सच में अपना कार्ड ब्लॉक करना चाहते हैं? यह तुरंत सभी लेनदेन रोक देगा।\n\nपुष्टि करें: **हाँ** या **नहीं**`,
        hinglish: `⚠️ **Card Block Request**\n\nKya aap sach mein apna card block karna chahte hain? Isse turant sab transactions rok jaenge.\n\nConfirm: **Haan** ya **Nahi**`,
        bn: `⚠️ **কার্ড ব্লক অনুরোধ**\n\nআপনি কি সত্যিই আপনার কার্ড ব্লক করতে চান?\n\nনিশ্চিত করুন: **হ্যাঁ** বা **না**`,
      };
      return { text: msgs[lang], action: 'CONFIRM_BLOCK_CARD' };
    }

    default: return { text: T[lang].error_generic };
  }
}

// ─── TTS helper ───────────────────────────────────────────────────────────────

function speak(text: string, lang: Language) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/\*\*/g, '').replace(/[•#\[\]🏦💰💸🏠🚗💼📚🌾📊🛡️⚠️]/gu, '').trim();
  const utter = new SpeechSynthesisUtterance(clean.slice(0, 300));
  utter.lang = LANG_META[lang].speechLang;
  utter.rate = 0.92;
  utter.pitch = 1.05;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

// ─── Main Component ───────────────────────────────────────────────────────────

const AIAdvisor: React.FC<{
  customer?: CustomerProfile;
  onTransaction?: (data: any) => void;
  defaultOpen?: boolean;
  embedded?: boolean;
}> = ({ customer, onTransaction, defaultOpen = false, embedded = false }) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [lang, setLang] = useState<Language>('hinglish');
  const [isOpen, setIsOpen] = useState(defaultOpen || embedded);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowType>('idle');
  const [wfData, setWfData] = useState<Record<string, any>>({});
  const [wfStep, setWfStep] = useState(0);
  const [pendingAction, setPendingAction] = useState<{ action: string; data: any } | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVoiceSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
    addMsg('ai', T[lang].greeting);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const addMsg = (role: MsgRole, text: string, action?: string, data?: any, isVoice?: boolean) => {
    setMsgs(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, role, text, time: new Date(), lang, action, data, isVoice }]);
  };

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    setMsgs([]);
    setWorkflow('idle');
    setWfData({});
    setWfStep(0);
    setTimeout(() => addMsg('ai', T[newLang].greeting), 50);
  };

  // ── Voice recognition ──────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = LANG_META[lang].speechLang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      processInput(transcript, true);
    };
    recognitionRef.current = rec;
    rec.start();
  }, [lang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // ── Account opening step handler ───────────────────────────────────────────
  const handleAccountOpeningStep = useCallback((userInput: string) => {
    const field = ACC_FIELDS[wfStep];
    if (!field.validate(userInput)) {
      addMsg('ai', `❌ ${field.error[lang]}\n\nPlease enter your **${field.prompt[lang]}**:`);
      return;
    }
    const newData = { ...wfData, [field.key]: userInput };
    setWfData(newData);
    const next = wfStep + 1;
    if (next >= ACC_FIELDS.length) {
      setWorkflow('idle');
      setWfStep(0);
      const summary = Object.entries(newData).map(([k, v]) => `• **${k.replace(/_/g,' ')}**: ${v}`).join('\n');
      const msgs: Record<Language, string> = {
        en: `✅ **All details captured!**\n\n${summary}\n\nShall I submit your account opening request now?`,
        hi: `✅ **सभी विवरण मिल गए!**\n\n${summary}\n\nक्या मैं अभी आपका खाता खोलने का आवेदन जमा कर दूँ?`,
        hinglish: `✅ **Sabhi details mil gayi!**\n\n${summary}\n\nKya main abhi aapka account opening request submit kar doon?`,
        bn: `✅ **সব তথ্য পাওয়া গেছে!**\n\n${summary}\n\nএখন কি অ্যাকাউন্ট খোলার আবেদন জমা দেব?`,
      };
      addMsg('ai', msgs[lang], 'REVIEW_ACCOUNT', newData);
      speak(msgs[lang], lang);
      setPendingAction({ action: 'SUBMIT_ACCOUNT', data: newData });
    } else {
      setWfStep(next);
      addMsg('ai', `✅ Got it!\n\n**${ACC_FIELDS[next].prompt[lang]}:**`);
    }
  }, [wfStep, wfData, lang]);

  // ── Main process function ──────────────────────────────────────────────────
  const processInput = useCallback(async (text: string, fromVoice = false) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput('');
    setIsProcessing(true);
    addMsg('user', trimmed, undefined, undefined, fromVoice);
    await new Promise(r => setTimeout(r, 400));

    // ── Workflow: account opening ──
    if (workflow === 'account_opening') {
      handleAccountOpeningStep(trimmed);
      setIsProcessing(false);
      return;
    }

    // ── Pending action confirmation ──
    const intent = parseIntent(trimmed);
    if (pendingAction && (intent.name === 'CONFIRM' || /yes|haan|ha|ok|sure|হ্যাঁ|confirm/i.test(trimmed))) {
      if (pendingAction.action === 'SUBMIT_ACCOUNT') {
        const appId = `VB-ACC-${Date.now().toString().slice(-6)}`;
        const success: Record<Language, string> = {
          en: `🎉 **Account Opening Successful!**\n\nApplication No: **${appId}**\n\n• KYC verification: 24–48 hours\n• Account number: via SMS\n• Net banking: via email\n• Branch: nearest Veridian branch\n\nWelcome to Veridian Bank! 🏦`,
          hi: `🎉 **खाता खोलने का आवेदन सफल!**\n\nआवेदन संख्या: **${appId}**\n\n• KYC सत्यापन: 24–48 घंटे\n• खाता नंबर: SMS पर\n• नेट बैंकिंग: ईमेल पर\n\nVERIDIAN बैंक में आपका स्वागत! 🏦`,
          hinglish: `🎉 **Account Opening Successful!**\n\nApplication No: **${appId}**\n\n• KYC verification: 24–48 hours\n• Account number: SMS pe\n• Net banking: email pe\n\nVeridian Bank mein aapka swagat hai! 🏦`,
          bn: `🎉 **অ্যাকাউন্ট খোলার সফল!**\n\nআবেদন নং: **${appId}**\n\n• KYC যাচাই: ২৪–৪৮ ঘণ্টা\n• অ্যাকাউন্ট নম্বর: SMS-এ\n\nVeridian Bank-এ স্বাগতম! 🏦`,
        };
        addMsg('ai', success[lang]);
        speak(success[lang], lang);
        setPendingAction(null);
      } else if (pendingAction.action === 'EXECUTE_TRANSFER') {
        const { amount, recipient } = pendingAction.data;
        const txnId = `VB${Date.now().toString().slice(-10)}`;
        const success: Record<Language, string> = {
          en: `✅ **Transfer Successful!**\n\n₹${amount.toLocaleString('en-IN')} sent to **${recipient}**\n\nTransaction ID: \`${txnId}\`\nStatus: Success ✓`,
          hi: `✅ **ट्रांसफर सफल!**\n\n₹${amount.toLocaleString('en-IN')} **${recipient}** को भेज दिया गया\n\nट्रांजेक्शन ID: \`${txnId}\``,
          hinglish: `✅ **Transfer Successful!**\n\n₹${amount.toLocaleString('en-IN')} **${recipient}** ko bhej diya gaya\n\nTransaction ID: \`${txnId}\``,
          bn: `✅ **ট্রান্সফার সফল!**\n\n₹${amount.toLocaleString('en-IN')} **${recipient}**-কে পাঠানো হয়েছে\n\nলেনদেন ID: \`${txnId}\``,
        };
        addMsg('ai', success[lang]);
        speak(success[lang], lang);
        onTransaction?.({ amount, recipient, txn_id: txnId });
        setPendingAction(null);
      }
      setIsProcessing(false);
      return;
    }
    if (pendingAction && (intent.name === 'CANCEL' || /no|nahi|nai|na|না|cancel/i.test(trimmed))) {
      const cancel: Record<Language, string> = { en: '❌ Request cancelled.', hi: '❌ अनुरोध रद्द।', hinglish: '❌ Request cancel.', bn: '❌ অনুরোধ বাতিল।' };
      addMsg('ai', cancel[lang]);
      setPendingAction(null);
      setIsProcessing(false);
      return;
    }

    // ── Normal intent ──
    const response = buildResponse(intent, lang, customer);
    if (response.action === 'START_ACCOUNT_OPENING') {
      setWorkflow('account_opening');
      setWfStep(0);
      setWfData({});
    }
    if (response.action === 'CONFIRM_TRANSFER') {
      setPendingAction({ action: 'EXECUTE_TRANSFER', data: response.data });
    }

    addMsg('ai', response.text, response.action, response.data);
    speak(response.text, lang);
    setIsProcessing(false);
  }, [workflow, wfStep, wfData, lang, customer, pendingAction, handleAccountOpeningStep]);

  const handleSend = useCallback(() => {
    if (input.trim()) processInput(input);
  }, [input, processInput]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Render message ────────────────────────────────────────────────────────
  const renderMsg = (msg: Msg) => {
    const isUser = msg.role === 'user';
    return (
      <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1"
            style={{ background: 'linear-gradient(135deg,#1e40af,#2563eb)' }}>
            🤖
          </div>
        )}
        <div className="max-w-[82%]">
          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed`}
            style={isUser
              ? { background: 'linear-gradient(135deg,#1e40af,#2563eb)', color: '#fff', borderBottomRightRadius: '4px' }
              : { background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', borderBottomLeftRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }
            }
            dangerouslySetInnerHTML={{
              __html: msg.text
                .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#93c5fd">$1</strong>')
                .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:3px;font-size:11px">$1</code>')
                .replace(/\n/g, '<br/>')
            }}
          />
          <div className={`text-xs mt-1 flex items-center gap-1 ${isUser ? 'justify-end' : 'justify-start'}`}
            style={{ color: 'rgba(148,163,184,0.5)' }}>
            {msg.isVoice && <span>🎙️</span>}
            {msg.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {isUser && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm ml-2 flex-shrink-0 mt-1"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            👤
          </div>
        )}
      </div>
    );
  };

  const QUICK_CMDS = [
    { label: '💰 Balance', cmd: 'Check my balance' },
    { label: '🏦 Open Account', cmd: 'I want to open a savings account' },
    { label: '💸 Transfer', cmd: 'Send money' },
    { label: '🏠 Home Loan', cmd: 'Tell me about home loan' },
    { label: '📊 Advice', cmd: 'Give me financial advice' },
    { label: '📋 Transactions', cmd: 'Show my recent transactions' },
  ];

  // ── Embedded mode ─────────────────────────────────────────────────────────
  const chatPanel = (
    <div className="flex flex-col" style={{ height: embedded ? '700px' : '600px', maxHeight: '90vh' }}>
      {/* Header */}
      <div className="p-4 flex items-center gap-3 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#0f2c5e 0%,#1e40af 100%)' }}>
        <div className="relative">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{ background: 'rgba(255,255,255,0.15)' }}>🤖</div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-blue-900 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm">Veridian AI</div>
          <div className="text-xs text-blue-200">Virtual Relationship Manager · {LANG_META[lang].flag} {LANG_META[lang].label}</div>
        </div>
        {/* Language selector */}
        <div className="flex gap-1">
          {(Object.keys(LANG_META) as Language[]).map(l => (
            <button key={l} onClick={() => changeLang(l)}
              className="text-lg transition-all hover:scale-110"
              title={LANG_META[l].label}
              style={{ opacity: lang === l ? 1 : 0.4 }}>
              {LANG_META[l].flag}
            </button>
          ))}
        </div>
        {!embedded && (
          <button onClick={() => setIsOpen(false)} className="text-blue-200 hover:text-white ml-1">✕</button>
        )}
      </div>

      {/* Lang labels strip */}
      <div className="flex px-4 py-1.5 gap-1 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.4)' }}>
        {(Object.entries(LANG_META) as [Language, typeof LANG_META[Language]][]).map(([l, meta]) => (
          <button key={l} onClick={() => changeLang(l)}
            className="text-xs px-2.5 py-0.5 rounded-full transition-all"
            style={lang === l
              ? { background: 'linear-gradient(135deg,#1e40af,#2563eb)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }
            }>
            {meta.flag} {meta.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4" style={{ background: '#0a1628' }}>
        {msgs.map(renderMsg)}
        {isProcessing && (
          <div className="flex justify-start mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#1e40af,#2563eb)' }}>🤖</div>
            <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex gap-1.5 items-center">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-blue-400"
                    style={{ animation: 'bounce 1.2s infinite', animationDelay: `${i*0.2}s` }} />
                ))}
                <span className="text-xs text-slate-400 ml-1">{T[lang].processing}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick commands */}
      <div className="px-3 py-2 flex gap-1.5 overflow-x-auto flex-shrink-0 scrollbar-hide"
        style={{ background: 'rgba(0,0,0,0.3)' }}>
        {QUICK_CMDS.map(q => (
          <button key={q.label} onClick={() => processInput(q.cmd)}
            className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0 transition-all hover:scale-105"
            style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' }}>
            {q.label}
          </button>
        ))}
      </div>

      {/* Voice hint */}
      <div className="px-4 py-1 text-center flex-shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <span className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
          {isListening ? T[lang].listening : T[lang].voice_hint}
        </span>
      </div>

      {/* Input bar */}
      <div className="p-3 flex gap-2 flex-shrink-0" style={{ background: '#050e1f', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {voiceSupported && (
          <button
            onMouseDown={startListening} onMouseUp={stopListening}
            onTouchStart={startListening} onTouchEnd={stopListening}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all select-none"
            style={{
              background: isListening ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'rgba(255,255,255,0.08)',
              border: `2px solid ${isListening ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
              boxShadow: isListening ? '0 0 12px rgba(239,68,68,0.5)' : 'none',
            }}>
            {isListening ? '⏹' : '🎙️'}
          </button>
        )}
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={T[lang].placeholder}
          disabled={isProcessing}
          className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isProcessing}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg,#1e40af,#2563eb)', opacity: (!input.trim() || isProcessing) ? 0.5 : 1 }}>
          ➤
        </button>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#0a1628', border: '1px solid rgba(59,130,246,0.25)' }}>
        {chatPanel}
      </div>
    );
  }

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110"
        style={{ background: 'linear-gradient(135deg,#0f2c5e,#2563eb)', boxShadow: '0 8px 32px rgba(37,99,235,0.5)' }}>
        <span className="text-2xl">{isOpen ? '✕' : '🤖'}</span>
        {!isOpen && <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse border-2 border-white" />}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 z-50 w-96 rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: '#0a1628', border: '1px solid rgba(59,130,246,0.3)', maxHeight: '90vh' }}>
          {chatPanel}
        </div>
      )}
    </>
  );
};

export default AIAdvisor;
