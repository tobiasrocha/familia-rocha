import { useNavigate } from 'react-router-dom';
import { Wallet, LayoutDashboard } from 'lucide-react';
import logoFamiliarocha from '../assets/familiarocha.png';

export default function Inicio({ cores }) {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: cores.secundaria, fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '40px 30px', backgroundColor: cores.branco, borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
        <img src={logoFamiliarocha} alt="Familia Rocha" style={{ height: '80px', marginBottom: '20px', objectFit: 'contain' }} />
        <h2 style={{ color: cores.texto, margin: '0 0 6px 0' }}>Bem-vindo(a)!</h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '30px' }}>Escolha o que deseja acessar:</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <button onClick={() => navigate('/financeiro?aba=carteira')} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '18px', cursor: 'pointer', backgroundColor: '#059669', color: '#fff',
            border: 'none', borderRadius: '12px', fontSize: '17px', fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(5,150,105,0.3)'
          }}>
            <Wallet size={24} /> Carteira da Família Rocha
          </button>

          <button onClick={() => navigate('/dashboard')} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '18px', cursor: 'pointer', backgroundColor: cores.dourado, color: cores.branco,
            border: 'none', borderRadius: '12px', fontSize: '17px', fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(197,160,89,0.3)'
          }}>
            <LayoutDashboard size={24} /> Acessar Sistema
          </button>
        </div>
      </div>
    </div>
  );
}
