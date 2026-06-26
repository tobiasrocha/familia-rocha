import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { apiFetch } from './config';
import logoFamiliarocha from './assets/familiarocha.png';

const Dashboard = lazy(() => import('./components/Dashboard'));
const PainelFinanceiro = lazy(() => import('./components/financeiro/PainelFinanceiro'));
const TelaTarefas = lazy(() => import('./components/tarefas/TelaTarefas'));
const TelaSaude = lazy(() => import('./components/saude/TelaSaude'));
const TelaEstudos = lazy(() => import('./components/estudos/TelaEstudos'));
const TelaPatrimonio = lazy(() => import('./components/patrimonio/TelaPatrimonio'));
const TelaViagens = lazy(() => import('./components/viagens/TelaViagens'));
const TelaEspiritual = lazy(() => import('./components/espiritual/TelaEspiritual'));
const TelaLogin = lazy(() => import('./components/auth/TelaLogin'));
const AdminUsuarios = lazy(() => import('./components/admin/AdminUsuarios'));
const Pessoas = lazy(() => import('./components/Pessoas'));
const Inicio = lazy(() => import('./components/Inicio'));

import { 
  LayoutDashboard, Wallet, ClipboardList, 
  HeartPulse, BookOpen, Package, Compass, LogOut, Users 
} from 'lucide-react';

const coresApp = { primaria: '#2c3e50', secundaria: '#f8f9fa', dourado: '#C5A059', texto: '#333333', branco: '#ffffff', borda: '#e9ecef' };

const Carregando = () => <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: coresApp.dourado, fontFamily: 'system-ui, sans-serif' }}>Carregando...</div>;

const todosMenuItems = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={16} />, sempreVisivel: true },
  { to: '/financeiro', label: 'Financeiro', icon: <Wallet size={16} />, modulo: 'financeiro' },
  { to: '/tarefas', label: 'Tarefas', icon: <ClipboardList size={16} />, modulo: 'tarefas' },
  { to: '/saude', label: 'Saúde', icon: <HeartPulse size={16} />, modulo: 'saude' },
  { to: '/estudos', label: 'Estudos', icon: <BookOpen size={16} />, modulo: 'estudos' },
  { to: '/patrimonio', label: 'Patrimônio', icon: <Package size={16} />, modulo: 'patrimonio' },
  { to: '/viagens', label: 'Viagens', icon: <Compass size={16} />, modulo: 'viagens' },
  { to: '/espiritual', label: 'Espiritual', icon: <BookOpen size={16} />, modulo: 'espiritual' },
];

function BarraNavegacao({ userEmail, onLogout, permissoes, isSuperadmin }) {
  const location = useLocation();

  const menuVisiveis = todosMenuItems.filter(item => item.sempreVisivel || (item.modulo && permissoes[item.modulo]));

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
          {isSuperadmin && (
            <Link to="/pessoas" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: 'transparent', border: `1px solid ${coresApp.primaria}`, color: coresApp.primaria, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none' }}>
              <Users size={14} /> Pessoas
            </Link>
          )}
          <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: 'transparent', border: `1px solid ${coresApp.dourado}`, color: coresApp.dourado, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>
      <nav style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px' }}>
        {menuVisiveis.map((item) => (
          <Link key={item.to} to={item.to} style={{ ...obterEstiloBotao(item.to), flexShrink: 0 }}>
            {item.icon} {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [permissoes, setPermissoes] = useState({});
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u?.email) {
        try {
          const res = await apiFetch(`/admin/permissoes?email=${encodeURIComponent(u.email)}`);
          const data = await res.json();
          setPermissoes(data.permissoes || {});
          setIsSuperadmin(data.isSuperadmin || false);
        } catch {
          setPermissoes({});
          setIsSuperadmin(false);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    setPermissoes({});
    setIsSuperadmin(false);
    await signOut(auth);
  };

  // Sessão 30 minutos — pergunta se quer continuar
  useEffect(() => {
    if (!user) return;
    const TIMEOUT = 30 * 60 * 1000;
    let timer = setTimeout(() => {
      const continuar = window.confirm('Sua sessão expirou por inatividade. Deseja continuar?');
      if (continuar) {
        timer = setTimeout(() => handleLogout(), TIMEOUT);
      } else {
        handleLogout();
      }
    }, TIMEOUT);
    const resetar = () => { clearTimeout(timer); timer = setTimeout(() => { const c = window.confirm('Sua sessão expirou. Continuar?'); if (c) resetar(); else handleLogout(); }, TIMEOUT); };
    window.addEventListener('mousemove', resetar);
    window.addEventListener('keydown', resetar);
    window.addEventListener('click', resetar);
    return () => { clearTimeout(timer); window.removeEventListener('mousemove', resetar); window.removeEventListener('keydown', resetar); window.removeEventListener('click', resetar); };
  }, [user]);

  if (user === undefined) return <Carregando />;

  const temPermissao = (modulo) => isSuperadmin || (permissoes[modulo] === true);

  return (
    <Router>
      {!user ? (
        <TelaLogin cores={coresApp} logo={logoFamiliarocha} />
      ) : (
        <div style={{ backgroundColor: coresApp.secundaria, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
          <BarraNavegacao userEmail={user.email} onLogout={handleLogout} permissoes={permissoes} isSuperadmin={isSuperadmin} />
          <main style={{ paddingBottom: '40px' }}>
            <Suspense fallback={<Carregando />}>
            <Routes>
              <Route path="/" element={<Dashboard cores={coresApp} />} />
              <Route path="/inicio" element={<Inicio cores={coresApp} />} />
              <Route path="/login" element={<TelaLogin cores={coresApp} logo={logoFamiliarocha} />} />
              <Route path="/dashboard" element={<Dashboard cores={coresApp} />} />
              {temPermissao('financeiro') && <Route path="/financeiro" element={<PainelFinanceiro cores={coresApp} />} />}
              {temPermissao('tarefas') && <Route path="/tarefas" element={<TelaTarefas cores={coresApp} />} />}
              {temPermissao('saude') && <Route path="/saude" element={<TelaSaude cores={coresApp} />} />}
              {temPermissao('estudos') && <Route path="/estudos" element={<TelaEstudos cores={coresApp} />} />}
              {temPermissao('patrimonio') && <Route path="/patrimonio" element={<TelaPatrimonio cores={coresApp} />} />}
              {temPermissao('viagens') && <Route path="/viagens" element={<TelaViagens cores={coresApp} />} />}
              {temPermissao('espiritual') && <Route path="/espiritual" element={<TelaEspiritual cores={coresApp} />} />}
              {isSuperadmin && <Route path="/pessoas" element={<Pessoas cores={coresApp} />} />}
              {isSuperadmin && <Route path="/admin" element={<AdminUsuarios cores={coresApp} />} />}
            </Routes>
            </Suspense>
          </main>
        </div>
      )}
    </Router>
  );
}
