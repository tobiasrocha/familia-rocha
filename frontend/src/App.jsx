import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';
import logoFamiliarocha from './assets/familiarocha.png';

import Dashboard from './components/Dashboard';
import PainelFinanceiro from './components/financeiro/PainelFinanceiro';
import TelaPerfis from './components/perfis/TelaPerfis';
import TelaTarefas from './components/tarefas/TelaTarefas';
import TelaSaude from './components/saude/TelaSaude';
import TelaEstudos from './components/estudos/TelaEstudos';
import TelaPatrimonio from './components/patrimonio/TelaPatrimonio';
import TelaViagens from './components/viagens/TelaViagens';
import TelaEspiritual from './components/espiritual/TelaEspiritual';
import TelaLogin from './components/auth/TelaLogin';

import { 
  LayoutDashboard, Wallet, Users, ClipboardList, 
  HeartPulse, BookOpen, Package, Compass, LogOut 
} from 'lucide-react';

const coresApp = { primaria: '#2c3e50', secundaria: '#f8f9fa', dourado: '#C5A059', texto: '#333333', branco: '#ffffff', borda: '#e9ecef' };

const menuItems = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { to: '/financeiro', label: 'Financeiro', icon: <Wallet size={16} /> },
  { to: '/perfis', label: 'Perfis', icon: <Users size={16} /> },
  { to: '/tarefas', label: 'Tarefas', icon: <ClipboardList size={16} /> },
  { to: '/saude', label: 'Saúde', icon: <HeartPulse size={16} /> },
  { to: '/estudos', label: 'Estudos', icon: <BookOpen size={16} /> },
  { to: '/patrimonio', label: 'Patrimônio', icon: <Package size={16} /> },
  { to: '/viagens', label: 'Viagens', icon: <Compass size={16} /> },
  { to: '/espiritual', label: 'Espiritual', icon: <BookOpen size={16} /> },
];

function BarraNavegacao({ userEmail, onLogout }) {
  const location = useLocation();

  const obterEstiloBotao = (path) => {
    const ativo = location.pathname === path;
    return {
      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
      textDecoration: 'none', color: ativo ? coresApp.branco : '#6c757d',
      backgroundColor: ativo ? coresApp.dourado : 'transparent',
      borderRadius: '8px', fontWeight: 'bold', fontSize: '14px',
      transition: 'all 0.2s ease', whiteSpace: 'nowrap'
    };
  };

  return (
    <header style={{ backgroundColor: coresApp.branco, borderBottom: `1px solid ${coresApp.borda}`, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <img src={logoFamiliarocha} alt="Familia Rocha" style={{ height: '60px', objectFit: 'contain' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', color: '#6c757d' }}>Olá, <strong style={{ color: coresApp.primaria }}>{userEmail}</strong></span>
          <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: 'transparent', border: `1px solid ${coresApp.dourado}`, color: coresApp.dourado, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>
      <nav style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px' }}>
        {menuItems.map((item) => (
          <Link key={item.to} to={item.to} style={{ ...obterEstiloBotao(item.to), flexShrink: 0 }}>
            {item.icon} {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(undefined);
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  if (user === undefined) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: coresApp.dourado, fontFamily: 'system-ui, sans-serif' }}>Carregando...</div>;
  if (!user) {
    window.location.href = '/login';
    return null;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (user === undefined) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: coresApp.dourado, fontFamily: 'system-ui, sans-serif' }}>Carregando...</div>;

  return (
    <Router>
      {!user ? (
        <TelaLogin cores={coresApp} logo={logoFamiliarocha} />
      ) : (
        <div style={{ backgroundColor: coresApp.secundaria, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
          <BarraNavegacao userEmail={user.email} onLogout={handleLogout} />
          <main style={{ paddingBottom: '40px' }}>
            <Routes>
              <Route path="/" element={<Dashboard cores={coresApp} />} />
              <Route path="/login" element={<TelaLogin cores={coresApp} logo={logoFamiliarocha} />} />
              <Route path="/financeiro" element={<PainelFinanceiro cores={coresApp} />} />
              <Route path="/perfis" element={<TelaPerfis cores={coresApp} />} />
              <Route path="/tarefas" element={<TelaTarefas cores={coresApp} />} />
              <Route path="/saude" element={<TelaSaude cores={coresApp} />} />
              <Route path="/estudos" element={<TelaEstudos cores={coresApp} />} />
              <Route path="/patrimonio" element={<TelaPatrimonio cores={coresApp} />} />
              <Route path="/viagens" element={<TelaViagens cores={coresApp} />} />
              <Route path="/espiritual" element={<TelaEspiritual cores={coresApp} />} />
            </Routes>
          </main>
        </div>
      )}
    </Router>
  );
}
