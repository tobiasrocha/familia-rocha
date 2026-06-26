import { useState, useEffect, Suspense } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { LogOut, Wallet } from 'lucide-react';
import TelaLogin from './components/auth/TelaLogin';
import GerenciadorCarteira from './components/financeiro/GerenciadorCarteira';
import { useFirestore } from './hooks/useFirestore';

const coresApp = { primaria: '#2c3e50', secundaria: '#f8f9fa', dourado: '#C5A059', texto: '#333333', branco: '#ffffff', borda: '#e9ecef' };

function formatarMoeda(val) { return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

export default function AppCarteira() {
  const [user, setUser] = useState(undefined);
  const { dados: contasBancarias } = useFirestore('contas_bancarias');
  const { dados: cartoes } = useFirestore('cartoes');
  const { dados: investimentos } = useFirestore('investimentos');
  const { dados: cofre } = useFirestore('cofre');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  if (user === undefined) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: coresApp.dourado, fontFamily: 'system-ui' }}>Carregando...</div>;

  if (!user) return <TelaLogin cores={{ ...coresApp, fundo: coresApp.secundaria }} logo="/assets/familiarocha.png" />;

  return (
    <div style={{ backgroundColor: coresApp.secundaria, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ backgroundColor: coresApp.branco, borderBottom: `1px solid ${coresApp.borda}`, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Wallet size={24} color={coresApp.dourado} />
          <h2 style={{ margin: 0, fontSize: '16px', color: coresApp.texto }}>Carteira na Mão</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#6c757d' }}>{user.email}</span>
          <button onClick={() => signOut(auth)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'transparent', border: `1px solid ${coresApp.dourado}`, color: coresApp.dourado, borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>
      <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <Suspense fallback={<div style={{textAlign:'center',padding:'40px',color:coresApp.dourado}}>Carregando...</div>}>
          <GerenciadorCarteira
            cores={coresApp}
            formatarMoeda={formatarMoeda}
            contasBancarias={contasBancarias}
            cartoes={cartoes}
            investimentos={investimentos}
            cofre={cofre}
          />
        </Suspense>
      </main>
    </div>
  );
}
