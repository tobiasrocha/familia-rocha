import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, CheckCircle, AlertCircle } from 'lucide-react';

export default function PagarConta({ cores, logo }) {
  const { id } = useParams();
  const [conta, setConta] = useState(null);
  const [erro, setErro] = useState(null);
  const [copiadoPix, setCopiadoPix] = useState(false);
  const [copiadoBarras, setCopiadoBarras] = useState(false);

  useEffect(() => {
    try {
      const b64 = id.replace(/-/g, '+').replace(/_/g, '/');
      const binStr = atob(b64);
      const bytes = Uint8Array.from(binStr, c => c.charCodeAt(0));
      const jsonString = new TextDecoder('utf-8').decode(bytes);
      const parsed = JSON.parse(jsonString);

      setConta({
        descricao: parsed.d,
        valor: parsed.v,
        pixCopiaCola: parsed.p,
        codigoBarras: parsed.b
      });
    } catch (err) {
      setErro('O link de pagamento é inválido ou está corrompido.');
    }
  }, [id]);

  const handleCopiar = (texto, tipo) => {
    navigator.clipboard.writeText(texto).then(() => {
      if (tipo === 'pix') {
        setCopiadoPix(true);
        setTimeout(() => setCopiadoPix(false), 3000);
      } else {
        setCopiadoBarras(true);
        setTimeout(() => setCopiadoBarras(false), 3000);
      }
    }).catch(() => alert('Não foi possível copiar o texto automaticamente.'));
  };

  if (erro) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px' }}>
          <AlertCircle size={48} color="#dc3545" style={{ marginBottom: '20px' }} />
          <h2 style={{ color: '#333', marginBottom: '10px' }}>Ops!</h2>
          <p style={{ color: '#666' }}>{erro}</p>
        </div>
      </div>
    );
  }

  if (!conta) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <p style={{ color: cores?.dourado || '#C5A059', fontWeight: 'bold' }}>Carregando dados para pagamento...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', padding: '20px' }}>
      {logo && <img src={logo} alt="Familia Rocha" style={{ height: '80px', objectFit: 'contain', marginBottom: '30px' }} />}
      <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ fontSize: '22px', color: cores?.primaria || '#2c3e50', marginBottom: '10px' }}>{conta.descricao}</h1>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: cores?.dourado || '#C5A059', marginBottom: '30px' }}>
          R$ {Number(conta.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>

        {!conta.pixCopiaCola && !conta.codigoBarras && (
          <p style={{ color: '#666', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            Nenhum código de pagamento automático encontrado para esta conta.
          </p>
        )}

        {conta.pixCopiaCola && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => handleCopiar(conta.pixCopiaCola, 'pix')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                width: '100%', padding: '15px', borderRadius: '10px', border: 'none',
                backgroundColor: copiadoPix ? '#28a745' : (cores?.primaria || '#2c3e50'),
                color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {copiadoPix ? <CheckCircle size={20} /> : <Copy size={20} />}
              {copiadoPix ? 'PIX Copiado!' : 'Copiar PIX para Pagar'}
            </button>
          </div>
        )}

        {conta.codigoBarras && (
          <div>
            <button
              onClick={() => handleCopiar(conta.codigoBarras, 'barras')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid ' + (cores?.borda || '#ccc'),
                backgroundColor: copiadoBarras ? '#28a745' : '#fff',
                color: copiadoBarras ? '#fff' : '#333', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {copiadoBarras ? <CheckCircle size={20} /> : <Copy size={20} />}
              {copiadoBarras ? 'Código Copiado!' : 'Copiar Código de Barras'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
