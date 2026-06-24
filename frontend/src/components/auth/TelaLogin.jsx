// frontend/src/components/auth/TelaLogin.jsx
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

export default function TelaLogin({ cores, logo }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch {
      setErro("Credenciais inválidas.");
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
          <input 
            type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required 
            style={{ padding: '14px', borderRadius: '8px', border: '1px solid #E5E5E5', outlineColor: cores.dourado }}
          />
          {erro && <span style={{ color: '#d32f2f', fontSize: '14px' }}>{erro}</span>}
          
          <button type="submit" style={{ 
            padding: '14px', cursor: 'pointer', backgroundColor: cores.dourado, color: cores.branco, 
            border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', marginTop: '10px'
          }}>
            Acessar Sistema
          </button>
        </form>
      </div>
    </div>
  );
}