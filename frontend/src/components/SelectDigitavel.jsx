import React, { useState, useRef, useEffect } from 'react';

export default function SelectDigitavel({ value, onChange, opcoes, placeholder, style }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickFora = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        placeholder={placeholder}
        style={{ ...style, width: '100%', boxSizing: 'border-box' }}
      />
      {open && opcoes.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ccc', zIndex: 9999, maxHeight: '200px', overflowY: 'auto', borderRadius: '6px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginTop: '4px' }}>
          {opcoes.filter(o => o.toLowerCase().includes((value || '').toLowerCase())).map(o => (
            <div 
              key={o} 
              style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f1f1', color: '#333' }}
              onClick={() => { onChange(o); setOpen(false); }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {o}
            </div>
          ))}
          {opcoes.filter(o => o.toLowerCase().includes((value || '').toLowerCase())).length === 0 && (
            <div style={{ padding: '10px 12px', color: '#999', fontStyle: 'italic' }}>Nenhuma opção encontrada</div>
          )}
        </div>
      )}
    </div>
  );
}
