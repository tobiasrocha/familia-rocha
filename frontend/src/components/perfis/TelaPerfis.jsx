// frontend/src/components/perfis/TelaPerfis.jsx
import { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { Users, User, PawPrint, Baby, Calendar, Droplet, AlertTriangle, Pencil, Trash2, Plus, Mail, Phone } from 'lucide-react';

export default function TelaPerfis({ cores, userUid, isSuperadmin }) {
  const { dados: todosPerfis, carregando, erro, recarregar } = useFirestore('perfis');

  const perfis = isSuperadmin
    ? todosPerfis
    : todosPerfis.filter(p => p.tipo === 'Pet' || p.userId === userUid);
  
  const [exibirForm, setExibirForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  
  // Campos do Perfil
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('Adulto'); 
  const [dataNascimento, setDataNascimento] = useState('');
  const [tipoSanguineo, setTipoSanguineo] = useState('');
  const [alergias, setAlergias] = useState('');
  
  // NOVOS CAMPOS INJETADOS
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  const resetarFormulario = () => {
    setNome(''); setTipo('Adulto'); setDataNascimento(''); setTipoSanguineo(''); setAlergias('');
    setEmail(''); setTelefone('');
    setIdEditando(null); setExibirForm(false);
  };

  const handleSalvarPerfil = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const dadosDoPerfil = {
        nome, tipo, dataNascimento, tipoSanguineo, alergias, email, telefone,
        criadoEm: new Date().toISOString()
      };
      if (idEditando) {
        await updateDoc(doc(db, 'perfis', idEditando), { ...dadosDoPerfil, atualizadoEm: new Date().toISOString() });
      } else {
        if (tipo !== 'Pet' && userUid) dadosDoPerfil.userId = userUid;
        await addDoc(collection(db, 'perfis'), dadosDoPerfil);
      }
      resetarFormulario(); recarregar();
    } catch (e) {
      console.error("Erro ao salvar perfil:", e);
      alert("Falha ao salvar o perfil no banco de dados.");
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = (perfil) => {
    setNome(perfil.nome); setTipo(perfil.tipo); setDataNascimento(perfil.dataNascimento || '');
    setTipoSanguineo(perfil.tipoSanguineo || ''); setAlergias(perfil.alergias || '');
    setEmail(perfil.email || ''); setTelefone(perfil.telefone || '');
    setIdEditando(perfil.id); setExibirForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Atenção: Excluir este perfil permanentemente?")) return;
    try { await deleteDoc(doc(db, 'perfis', id)); recarregar(); } 
    catch { alert("Falha ao excluir."); }
  };

  const calcularIdade = (dataNasc) => {
    if (!dataNasc) return '-';
    const hoje = new Date();
    const nascimento = new Date(dataNasc);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return idade;
  };

  const renderIconeTipo = (tipoPerfil, tamanho = 24) => {
    switch (tipoPerfil) {
      case 'Criança': return <Baby size={tamanho} color={cores?.dourado} />;
      case 'Pet': return <PawPrint size={tamanho} color={cores?.dourado} />;
      default: return <User size={tamanho} color={cores?.dourado} />;
    }
  };

  if (carregando) return <div style={{ padding: '40px', textAlign: 'center', color: cores?.dourado }}>Carregando Identidades...</div>;
  if (erro) return <div style={{ padding: '40px', color: 'red' }}>Erro: {erro}</div>;

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: cores?.texto, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={28} color={cores?.dourado} /> Perfis da Família
        </h2>
        <button onClick={() => { if (exibirForm) resetarFormulario(); else setExibirForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer', backgroundColor: exibirForm ? '#6c757d' : cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
          {exibirForm ? 'Cancelar' : <><Plus size={18} /> Novo Perfil</>}
        </button>
      </div>

      {/* FORMULÁRIO */}
      {exibirForm && (
        <form onSubmit={handleSalvarPerfil} style={{ backgroundColor: cores?.branco, padding: '25px', borderRadius: '12px', borderTop: `4px solid ${idEditando ? '#17a2b8' : cores?.dourado}`, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          
          <div style={{ flex: '2 1 250px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>Nome Completo / Apelido</label><input type="text" value={nome} onChange={e => setNome(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>Categoria</label><select value={tipo} onChange={e => setTipo(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}><option value="Adulto">Adulto</option><option value="Criança">Criança / Adolescente</option><option value="Pet">Pet (Animal de Estimação)</option></select></div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>Nascimento</label><input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>Tipo Sanguíneo</label><select value={tipoSanguineo} onChange={e => setTipoSanguineo(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}><option value="">Desconhecido</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option></select></div>

          {/* NOVOS INPUTS NO FORMULÁRIO */}
          <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>E-mail de Contato</label><input type="email" placeholder="exemplo@gmail.com" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>Telefone / WhatsApp</label><input type="tel" placeholder="(84) 99999-9999" value={telefone} onChange={e => setTelefone(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>

          <div style={{ flex: '2 1 100%', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>Restrições Médicas / Alergias</label><input type="text" value={alergias} onChange={e => setAlergias(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>

          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" disabled={salvando} style={{ padding: '12px 25px', backgroundColor: cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>{salvando ? 'Salvando...' : 'Gravar Perfil'}</button>
          </div>
        </form>
      )}

      {/* CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {perfis.map(perfil => (
          <div key={perfil.id} style={{ backgroundColor: cores?.branco, borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', position: 'relative', borderTop: `4px solid ${cores?.dourado}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e9ecef' }}>{renderIconeTipo(perfil.tipo, 28)}</div>
                <div><h3 style={{ margin: '0 0 5px 0', color: cores?.texto, fontSize: '18px' }}>{perfil.nome}</h3><span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#e9ecef', color: '#495057', fontWeight: 'bold' }}>{perfil.tipo}</span></div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleEditar(perfil)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3' }}><Pencil size={16} /></button>
                <button onClick={() => handleExcluir(perfil.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}><Trash2 size={16} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: '#495057' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={16} color="#6c757d" /><span>{perfil.dataNascimento ? `${perfil.dataNascimento.split('-').reverse().join('/')} (${calcularIdade(perfil.dataNascimento)} anos)` : 'Não informado'}</span></div>
              
              {/* RENDERIZAÇÃO DOS NOVOS DADOS NOS CARDS */}
              {perfil.email && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={16} color="#6c757d" /><span style={{fontSize:'13px'}}>{perfil.email}</span></div>}
              {perfil.telefone && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={16} color="#6c757d" /><span style={{fontSize:'13px'}}>{perfil.telefone}</span></div>}
              
              {perfil.tipo !== 'Pet' && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Droplet size={16} color="#dc3545" /><span>Sangue: <strong>{perfil.tipoSanguineo || 'Não informado'}</strong></span></div>}
              {perfil.alergias && <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', backgroundColor: '#fff3cd', padding: '8px', borderRadius: '6px', color: '#856404', marginTop: '5px' }}><AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} /><span><strong>Atenção:</strong> {perfil.alergias}</span></div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}