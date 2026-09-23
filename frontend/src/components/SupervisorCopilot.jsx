import React, { useState } from 'react';
import { Bot, Send, Sparkles, X, ChevronDown, Check, ArrowRight } from 'lucide-react';

export default function SupervisorCopilot({ 
  latestAlert, 
  isOpen, 
  onClose 
}) {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello Supervisor Alex. I am your Safety Vision AI Copilot. I can explain confirmed violations, summarize temporal evidence, or draft shift handover reports. How can I help?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const newMessages = [...messages, { sender: 'user', text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          event_id: latestAlert ? latestAlert.id : null
        })
      });
      const data = await res.json();
      setMessages([...newMessages, {
        sender: 'ai',
        text: data.reply,
        actions: data.suggested_actions,
        citations: data.citations
      }]);
    } catch (err) {
      setMessages([...newMessages, {
        sender: 'ai',
        text: 'Sorry, I encountered a temporary connection issue. Please verify backend service status.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '420px',
      height: '560px',
      zIndex: 900,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(0, 240, 255, 0.3)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 240, 255, 0.15)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(10, 15, 26, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, rgba(0,240,255,0.3) 0%, rgba(2,132,199,0.4) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bot size={17} color="#00f0ff" />
          </div>
          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
              Supervisor Safety Copilot
            </h4>
            <span style={{ fontSize: '0.68rem', color: '#34d399', fontFamily: 'var(--font-mono)' }}>
              ONLINE · INCIDENT EXPLAINER
            </span>
          </div>
        </div>
        <button 
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Quick Prompts */}
      <div style={{
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.3)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        gap: '6px',
        overflowX: 'auto'
      }}>
        {[
          'Explain latest alert',
          'Shift handover summary',
          'High risk zones'
        ].map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(prompt)}
            style={{
              whiteSpace: 'nowrap',
              fontSize: '0.68rem',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--accent-cyan)',
              cursor: 'pointer'
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div style={{
        flex: 1,
        padding: '14px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontSize: '0.8rem'
      }}>
        {messages.map((m, idx) => (
          <div 
            key={idx}
            style={{
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: m.sender === 'user' ? 'rgba(0, 240, 255, 0.15)' : 'var(--bg-elevated)',
              border: m.sender === 'user' ? '1px solid rgba(0,240,255,0.3)' : '1px solid var(--border-subtle)',
              padding: '10px 14px',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              lineHeight: 1.45,
              whiteSpace: 'pre-line'
            }}
          >
            {m.text}

            {/* Suggested actions chips if returned by Copilot */}
            {m.actions && m.actions.length > 0 && (
              <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  RECOMMENDED NEXT ACTIONS:
                </span>
                {m.actions.map((act, aIdx) => (
                  <div key={aIdx} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#a5f3fc', marginBottom: '2px' }}>
                    <ArrowRight size={11} color="#00f0ff" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            background: 'var(--bg-elevated)',
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}>
            Analyzing telemetry & temporal logs...
          </div>
        )}
      </div>

      {/* Input row */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(10, 15, 26, 0.9)',
        display: 'flex',
        gap: '8px'
      }}>
        <input
          type="text"
          placeholder="Ask copilot about safety compliance..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          style={{
            flex: 1,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            color: '#fff',
            fontSize: '0.8rem',
            outline: 'none'
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="btn btn-primary"
          style={{ padding: '8px 12px' }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
