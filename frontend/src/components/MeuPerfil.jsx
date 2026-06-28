import React, { useState } from 'react';
import { apiFetch } from '../config';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, CheckCircle, AlertCircle } from 'lucide-react';

export default function MeuPerfil({ cores }) {
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCadastrarWindowsHello = async () => {
    setErro('');
    setMensagem('');
    setLoading(true);

    try {
      // 1. Pede opções de registro ao backend
      const resOp = await apiFetch('/auth/webauthn-registration-options', { method: 'POST' });
      const options = await resOp.json();
      
      if (!resOp.ok) throw new Error(options.erro || 'Erro ao obter opções');

      // 2. Chama a API do navegador (Windows Hello, TouchID, etc.)
      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: options });
      } catch (e) {
        if (e.name === 'NotAllowedError') {
          throw new Error('Você cancelou a leitura ou o navegador bloqueou.');
        } else if (e.name === 'NotSupportedError') {
          throw new Error('Seu dispositivo não suporta Windows Hello / Biometria.');
        }
        throw e;
      }

      // 3. Envia a resposta de volta ao backend
      const resVerify = await apiFetch('/auth/webauthn-registration-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp),
      });

      const verification = await resVerify.json();
      if (!resVerify.ok) throw new Error((verification.erro || 'Erro na verificação') + (verification.detalhes ? ': ' + verification.detalhes : ''));

      if (verification.verified) {
        setMensagem('Windows Hello cadastrado com sucesso! Agora você pode usá-lo para fazer login.');
      } else {
        setErro('Falha ao verificar o Windows Hello.');
      }
    } catch (error) {
      setErro(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ color: cores.primaria, marginBottom: '24px' }}>Meu Perfil e Segurança</h2>

      <div style={{ backgroundColor: cores.branco, padding: '24px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: cores.primaria, marginBottom: '16px' }}>
          <Fingerprint size={20} color={cores.dourado} /> Windows Hello / Biometria
        </h3>
        <p style={{ color: cores.texto, fontSize: '14px', marginBottom: '16px' }}>
          Cadastre o Windows Hello (PIN, impressão digital ou reconhecimento facial do seu computador) para fazer login rapidamente sem precisar digitar sua senha.
        </p>
        
        <button
          onClick={handleCadastrarWindowsHello}
          disabled={loading}
          style={{
            width: '100%', padding: '12px', backgroundColor: cores.primaria, color: cores.branco, border: 'none',
            borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
            opacity: loading ? 0.7 : 1
          }}
        >
          <Fingerprint size={18} /> {loading ? 'Aguardando...' : 'Cadastrar Windows Hello'}
        </button>

        <div style={{ marginTop: '12px' }}>
          {mensagem && <div style={{ color: 'green', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={16} /> {mensagem}</div>}
          {erro && <div style={{ color: 'red', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={16} /> {erro}</div>}
        </div>

        <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', fontSize: '13px', color: '#666' }}>
          <strong>Como funciona:</strong>
          <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
            <li>No PC: usa o PIN, digital ou câmera do Windows Hello</li>
            <li>No celular: usa digital ou reconhecimento facial</li>
            <li>Após cadastrar, use o botão "Entrar com Windows Hello" na tela de login</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
