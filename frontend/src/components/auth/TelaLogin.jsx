import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, signInWithCustomToken } from 'firebase/auth';
import { auth, googleProvider } from '../../firebaseConfig';
import { startAuthentication } from '@simplewebauthn/browser';
import { apiFetch } from '../../config';
import { Fingerprint } from 'lucide-react';

export default function TelaLogin({ cores, logo }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setMensagem('');
    setCarregando(true);
    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch (error) {
      const code = error.code || '';
      setErro(`Falha no login (${code}). Verifique suas credenciais.`);
    } finally {
      setCarregando(false);
    }
  };

  const handleWindowsHello = async () => {
    setErro('');
    setCarregando(true);
    try {
      const resOp = await apiFetch('/auth/webauthn-authentication-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await resOp.json();
      if (!resOp.ok) throw new Error(data.erro || 'Erro ao obter opções do Windows Hello');

      let asseResp;
      try {
        asseResp = await startAuthentication({ optionsJSON: data.options });
      } catch (e) {
        throw new Error('Autenticacao cancelada ou nao suportada neste dispositivo.');
      }

      const resVerify = await apiFetch('/auth/webauthn-authentication-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: asseResp, challengeId: data.challengeId }),
      });
      
      const verification = await resVerify.json();
      if (!resVerify.ok) throw new Error(verification.erro || 'Falha ao validar Windows Hello');

      if (verification.verified && verification.customToken) {
        await signInWithCustomToken(auth, verification.customToken);
      } else {
        throw new Error('Falha ao validar Windows Hello.');
      }
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErro('');
    setMensagem('');
    setCarregando(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user') {
        // usuario fechou o popup
      } else if (error.code === 'auth/unauthorized-domain') {
        setErro('Dominio nao autorizado. Contate o administrador.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // conflito de popup — ignorar
      } else {
        setErro('Falha ao autenticar com Google.');
      }
    } finally {
      setCarregando(false);
    }
  };

  const handleEsqueciSenha = async () => {
    if (!email) {
      setErro('Por favor, digite seu e-mail no campo acima para recuperar a senha.');
      setMensagem('');
      return;
    }
    try {
      setErro('');
      setMensagem('');
      await sendPasswordResetEmail(auth, email);
      setMensagem('E-mail de recuperação de senha enviado! Verifique sua caixa de entrada.');
    } catch (error) {
      setErro(`Falha ao redefinir a senha: ${error.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: cores.fundo, fontFamily: 'sans-serif' }}>
      <div style={{ 
        width: '100%', maxWidth: '400px', padding: '40px 30px', 
        backgroundColor: cores.branco, borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textAlign: 'center'
      }}>
        
        <img src={logo} alt="Família Rocha" style={{ height: '90px', marginBottom: '30px', objectFit: 'contain' }} />
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required 
            style={{ padding: '14px', borderRadius: '8px', border: '1px solid #E5E5E5', outlineColor: cores.dourado }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={handleEsqueciSenha}
                style={{ background: 'none', border: 'none', color: cores.dourado, fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Esqueci minha senha
              </button>
            </div>
            <input 
              type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required 
              style={{ padding: '14px', borderRadius: '8px', border: '1px solid #E5E5E5', outlineColor: cores.dourado }}
            />
          </div>
          {erro && <span style={{ color: '#d32f2f', fontSize: '14px' }}>{erro}</span>}
          {mensagem && <span style={{ color: '#2e7d32', fontSize: '14px', backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '6px' }}>{mensagem}</span>}
          
          <button type="submit" disabled={carregando} style={{ 
            padding: '14px', cursor: carregando ? 'not-allowed' : 'pointer', backgroundColor: cores.dourado, color: cores.branco, 
            border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', marginTop: '10px',
            opacity: carregando ? 0.7 : 1
          }}>
            {carregando ? 'Entrando...' : 'Acessar Sistema'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e0e0e0' }} />
          <span style={{ fontSize: '12px', color: '#999' }}>ou</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e0e0e0' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={handleWindowsHello}
            disabled={carregando}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              width: '100%', padding: '12px', cursor: carregando ? 'not-allowed' : 'pointer',
              backgroundColor: cores.primaria, color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500',
              opacity: carregando ? 0.7 : 1,
            }}
          >
            <Fingerprint size={18} /> Entrar com Windows Hello
          </button>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={carregando}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              width: '100%', padding: '12px', cursor: carregando ? 'not-allowed' : 'pointer',
              backgroundColor: '#fff', color: '#444',
              border: '1px solid #dadce0', borderRadius: '8px', fontSize: '14px', fontWeight: '500',
              opacity: carregando ? 0.7 : 1,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </button>
        </div>
      </div>
    </div>
  );
}
