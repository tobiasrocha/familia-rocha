import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { apiFetch } from '../config';

export default function MentorIA() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', text: 'Olá! Sou a Geri. Quer saber como estão as finanças da família este mês ou pedir uma dica de economia?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatRef.current && !chatRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const newHistory = [...messages, { role: 'user', text: userMessage }];
    setMessages(newHistory);
    setLoading(true);

    try {
      const res = await apiFetch('/ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history: messages })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.erro || 'Erro ao comunicar com a IA');
      
      setMessages([...newHistory, { role: 'model', text: data.reply }]);
    } catch (err) {
      setMessages([...newHistory, { role: 'model', text: `Desculpe, ocorreu um erro: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '30px',
          backgroundColor: '#0f172a',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          display: isOpen ? 'none' : 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          transition: 'transform 0.2s',
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        title="Falar com a Geri"
      >
        <MessageCircle size={28} />
      </button>

      {/* Janela de Chat */}
      {isOpen && (
        <div ref={chatRef} style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '350px',
          height: '500px',
          minWidth: '300px',
          minHeight: '300px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          backgroundColor: '#fff',
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          overflow: 'hidden',
          resize: 'both'
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: '#0f172a',
            color: '#fff',
            padding: '15px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img 
                src="/geri-ai.png" 
                alt="Geri" 
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(2.5)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  objectPosition: 'center', 
                  border: '2px solid #334155', 
                  transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  transformOrigin: 'left top',
                  position: 'relative',
                  zIndex: 20
                }} 
              />
              <strong style={{ fontSize: '18px' }}>Geri IA</strong>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Mensagens */}
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                {m.role === 'model' && (
                  <img 
                    src="/geri-ai.png" 
                    alt="Geri" 
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      objectFit: 'cover', 
                      objectPosition: 'center',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                      flexShrink: 0
                    }} 
                  />
                )}
                <div style={{
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: '16px',
                  backgroundColor: m.role === 'user' ? '#0f172a' : '#fff',
                  color: m.role === 'user' ? '#fff' : '#333',
                  boxShadow: m.role === 'user' ? 'none' : '0 2px 5px rgba(0,0,0,0.05)',
                  borderBottomRightRadius: m.role === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: m.role === 'model' ? '4px' : '16px',
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}>
                  {m.text.split('\n').map((line, idx) => <span key={idx} style={{ display: 'block', minHeight: line ? 'auto' : '14px' }}>{line}</span>)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                <img 
                  src="/geri-ai.png" 
                  alt="Geri" 
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', objectPosition: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }} 
                />
                <div style={{ backgroundColor: '#fff', padding: '10px 14px', borderRadius: '16px', borderBottomLeftRadius: '4px', fontSize: '14px', color: '#888', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                  Digitando...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{ display: 'flex', padding: '15px', backgroundColor: '#fff', borderTop: '1px solid #eee' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pergunte algo..."
              style={{ flex: 1, padding: '10px 15px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none', backgroundColor: '#f8f9fa', color: '#333' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                marginLeft: '10px',
                width: '40px',
                height: '40px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: input.trim() && !loading ? '#f59e0b' : '#e2e8f0',
                color: '#fff',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                transition: 'background-color 0.2s'
              }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
