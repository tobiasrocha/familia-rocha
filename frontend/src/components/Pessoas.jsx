import { useState } from 'react';
import { Users, Wrench, User } from 'lucide-react';
import AdminUsuarios from './admin/AdminUsuarios';
import GerenciadorPrestadores from './financeiro/GerenciadorPrestadores';
import MeuPerfil from './MeuPerfil';
import { useFirestore } from '../hooks/useFirestore';

export default function Pessoas({ cores }) {
  const [aba, setAba] = useState('usuarios');
  const { dados: contasBancarias } = useFirestore('contas_bancarias');
  const { dados: lancamentosGlobais } = useFirestore('financas');

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        <button onClick={() => setAba('usuarios')} style={{ padding: '10px 20px', border: 'none', background: aba === 'usuarios' ? cores?.dourado : '#e9ecef', color: aba === 'usuarios' ? '#fff' : '#666', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} /> Membros da Família
        </button>
        <button onClick={() => setAba('prestadores')} style={{ padding: '10px 20px', border: 'none', background: aba === 'prestadores' ? cores?.dourado : '#e9ecef', color: aba === 'prestadores' ? '#fff' : '#666', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wrench size={16} /> Prestadores de Serviço
        </button>
        <button onClick={() => setAba('perfil')} style={{ padding: '10px 20px', border: 'none', background: aba === 'perfil' ? cores?.dourado : '#e9ecef', color: aba === 'perfil' ? '#fff' : '#666', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={16} /> Meu Perfil
        </button>
      </div>

      {aba === 'usuarios' && <AdminUsuarios cores={cores} />}
      {aba === 'prestadores' && (
        <GerenciadorPrestadores
          cores={cores}
          formatarMoeda={(v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          contasBancarias={contasBancarias}
          lancamentosGlobais={lancamentosGlobais}
        />
      )}
      {aba === 'perfil' && <MeuPerfil cores={cores} />}
    </div>
  );
}
