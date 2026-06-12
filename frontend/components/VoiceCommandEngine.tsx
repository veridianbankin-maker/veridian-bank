/**
 * Veridian Bank — Voice Command Engine
 * 
 * Standalone voice processor that can:
 * - Trigger transactions via speech
 * - Navigate app via voice
 * - Read out account info
 * - Multi-language: English, Hindi, Hinglish
 * - Integrates with AIAdvisor workflow
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

export type VoiceLanguage = 'hi-IN' | 'en-IN' | 'en-US';

export interface VoiceCommand {
  transcript: string;
  confidence: number;
  intent: string;
  params: Record<string, any>;
  timestamp: Date;
}

interface VoiceCommandEngineProps {
  onCommand: (cmd: VoiceCommand) => void;
  onTranscript?: (text: string) => void;
  language?: VoiceLanguage;
  autoStart?: boolean;
  wakword?: string; // e.g. "hey veridian"
}

// ─── Intent Parser ──────────────────────────────────────────────────────────

export function parseVoiceIntent(text: string): { intent: string; params: Record<string, any> } {
  const t = text.toLowerCase().trim();

  // Transfer / Payment
  const transferMatch = t.match(
    /(?:send|transfer|pay|bhejo|de do|bhejiye|transfer karo)\s+(?:rs\.?|rupees?|rupaye?|₹)?\s*([\d,]+)\s+(?:to|ko)\s+(.+)/i
  );
  if (transferMatch) return {
    intent: 'TRANSFER',
    params: { amount: parseInt(transferMatch[1].replace(/,/g,'')), recipient: transferMatch[2].trim() }
  };

  // Balance
  if (/(?:check|show|batao|dekho|mera).*balance|balance.*(?:check|batao|dekho)|kitna.*(?:paisa|balance|amount)|how much.*(?:money|balance)/.test(t))
    return { intent: 'CHECK_BALANCE', params: {} };

  // Transactions
  if (/(?:last|recent|aakhri).*(?:transaction|payment|transfer)|transaction.*history|statement|passbook/.test(t))
    return { intent: 'TRANSACTION_HISTORY', params: {} };

  // Open Account
  if (/(?:open|kholna|kholiye|start).*(?:account|khata)|(?:naya|new).*(?:account|khata)/.test(t))
    return { intent: 'OPEN_ACCOUNT', params: {} };

  // Loan
  if (/(?:loan|karj|emi|advance)/.test(t)) {
    const amountMatch = t.match(/([\d,]+)/);
    return { intent: 'LOAN_ENQUIRY', params: { amount: amountMatch ? parseInt(amountMatch[1].replace(/,/g,'')) : null } };
  }

  // Block card
  if (/(?:block|freeze|band karo|rok do).*(?:card|debit|credit)/.test(t))
    return { intent: 'BLOCK_CARD', params: {} };

  // Fixed deposit
  if (/(?:fd|fixed deposit|fix deposit)/.test(t))
    return { intent: 'FD_ENQUIRY', params: {} };

  // Help
  if (/(?:help|madad|kya kar sakte|what can you do|features)/.test(t))
    return { intent: 'HELP', params: {} };

  // Stop / Cancel
  if (/(?:stop|cancel|band karo|ruk jao|nahi|no)/.test(t))
    return { intent: 'CANCEL', params: {} };

  // Confirm
  if (/(?:yes|haan|ha|confirm|ok|theek hai|sahi hai|proceed)/.test(t))
    return { intent: 'CONFIRM', params: {} };

  return { intent: 'UNKNOWN', params: { original: text } };
}

// ─── Text-to-Speech helper ───────────────────────────────────────────────────

export function speakText(text: string, lang: VoiceLanguage = 'hi-IN', rate = 0.95): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/\*\*/g,'').replace(/[•#\[\]]/g,'').replace(/https?:\/\/\S+/g,'');
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = lang;
  utter.rate = rate;
  utter.pitch = 1.1;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

// ─── Component ───────────────────────────────────────────────────────────────

const VoiceCommandEngine: React.FC<VoiceCommandEngineProps> = ({
  onCommand,
  onTranscript,
  language = 'hi-IN',
  autoStart = false,
  wakword = 'hey veridian'
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    setIsSupported(supported);
    if (supported && autoStart) startListening();
  }, []);

  const startListening = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.lang = language;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 3;

    rec.onstart = () => { setIsListening(true); setError(null); setTranscript(''); };
    rec.onend = () => setIsListening(false);
    rec.onerror = (e: any) => {
      setIsListening(false);
      setError(e.error === 'no-speech' ? 'No speech detected' : e.error);
    };

    rec.onresult = (event: any) => {
      const results = event.results;
      const latest = results[results.length - 1];
      const text = latest[0].transcript;
      const confidence = latest[0].confidence;
      setTranscript(text);
      onTranscript?.(text);

      if (latest.isFinal) {
        const { intent, params } = parseVoiceIntent(text);
        const cmd: VoiceCommand = { transcript: text, confidence, intent, params, timestamp: new Date() };
        setLastCommand(cmd);
        onCommand(cmd);
      }
    };

    recognitionRef.current = rec;
    rec.start();
  }, [language, onCommand, onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  if (!isSupported) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onTouchStart={startListening}
        onTouchEnd={stopListening}
        className="relative w-16 h-16 rounded-full flex items-center justify-center transition-all select-none"
        style={{
          background: isListening
            ? 'linear-gradient(135deg, #dc2626, #ef4444)'
            : 'linear-gradient(135deg, #1e40af, #2563eb)',
          boxShadow: isListening ? '0 0 0 8px rgba(239,68,68,0.25), 0 0 0 16px rgba(239,68,68,0.1)' : '0 4px 15px rgba(37,99,235,0.4)',
          transform: isListening ? 'scale(1.1)' : 'scale(1)'
        }}
        title="Hold to speak"
      >
        <span className="text-2xl">{isListening ? '🔴' : '🎙️'}</span>
      </button>
      {transcript && (
        <div className="text-xs text-center px-3 py-1.5 rounded-full max-w-48 truncate"
          style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>
          "{transcript}"
        </div>
      )}
      {lastCommand && lastCommand.intent !== 'UNKNOWN' && (
        <div className="text-xs text-center" style={{ color: '#4ade80' }}>
          ✓ {lastCommand.intent.replace(/_/g,' ')}
        </div>
      )}
      {error && <div className="text-xs text-red-400">{error}</div>}
      <div className="text-xs text-center" style={{ color: 'rgba(148,163,184,0.5)' }}>
        {isListening ? '🔴 Listening...' : 'Hold to speak'}
      </div>
    </div>
  );
};

export default VoiceCommandEngine;
