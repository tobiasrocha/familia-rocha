// frontend/src/components/espiritual/TelaEspiritual.jsx
import React, { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { Heart, Plus, Calendar, BookOpen, Users, Trash2, Pencil, CheckCircle, MessageSquare } from 'lucide-react';

export default function TelaEspiritual({ cores }) {
  const { dados: registros, carregando, recarregar } = useFirestore('espiritual');

  const [exibirForm, setExibirForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [idEditando, setIdEditando] = useState(null);

  // Estados do Formulário
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('Célula'); // Célula, Igreja, Devocional/Estudo, Pedido de Oração
  const [dataEvento, setDataEvento] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [conteudo, setConteudo] = useState(''); // Notas da palavra, reflexão ou detalhes do pedido

  const resetarFormulario = () => {
    setTitulo(''); setTipo('Célula'); setDataEvento(''); setResponsavel(''); setConteudo('');
    setIdEditando(null); setExibirForm(false);
  };

  const handleSalvarEspiritual = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const novoRegistro = {
        titulo,
        tipo,
        dataEvento: dataEvento || new Date().toISOString().slice(0, 10),
        responsavel,
        conteudo,
        criadoEm: new Date().toISOString()
      };

      if (idEditando) {
        await updateDoc(doc(db, 'espiritual', idEditando), { ...novoRegistro, atualizadoEm: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'espiritual'), novoRegistro);
      }
      
      resetarFormulario();
      recarregar();
    } catch (err) {
      console.error("Erro ao guardar registro espiritual:", err);
      alert("Falha ao salvar as informações.");
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = (reg) => {
    setTitulo(reg.titulo); setTipo(reg.tipo); setDataEvento(reg.dataEvento || '');
    setResponsavel(reg.responsavel || ''); setConteudo(reg.conteudo || '');
    setIdEditando(reg.id); setExibirForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Remover este registro permanentemente?")) return;
    try {
      await deleteDoc(doc(db, 'espiritual', id));
      recarregar();
    } catch (err) {
      alert("Erro ao remover.");
    }
  };

  const renderIconeTipo = (t) => {
    switch (t) {
      case 'Célula': return <Users size={18} color="#6f42c1" />;
      case 'Igreja': return <Heart size={18} color="#dc3545" />;
      case 'Devocional/Estudo': return <BookOpen size={18} color="#17a2b8" />;
      default: return <MessageSquare size={18} color={cores?.dourado} />;
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: cores?.texto, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={28} color={cores?.dourado} /> Espiritual & Célula
        </h2>
        <button 
          onClick={() => { if (exibirForm) resetarFormulario(); else setExibirForm(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer', backgroundColor: exibirForm ? '#6c757d' : cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
        >
          {exibirForm ? 'Cancelar' : <><Plus size={18} /> Novo Registro</>}
        </button>
      </div>

      {/* FORMULÁRIO */}
      {exibirForm && (
        <form onSubmit={handleSalvarEspiritual} style={{ backgroundColor: cores?.branco, padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap', borderTop: `4px solid ${idEditando ? '#17a2b8' : cores?.dourado}` }}>
          
          <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Título / Identificação</label>
            <input type="text" placeholder="Ex: Escala de Louvor, Devocional Isaías 40, Oração pela Família..." value={titulo} onChange={e => setTitulo(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Tipo de Registro</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}>
              <option value="Célula">Célula (Encontros/Escalas)</option>
              <option value="Igreja">Igreja (Cultos/Ações)</option>
              <option value="Devocional/Estudo">Devocional / Estudo Bíblico</option>
              <option value="Pedido de Oração">Pedido de Oração</option>
            </select>
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Data do Evento/Foco</label>
            <input type="date" value={dataEvento} onChange={e => setDataEvento(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Pessoa / Responsável (Opcional)</label>
            <input type="text" placeholder="Quem está na escala ou pediu" value={responsavel} onChange={e => setResponsavel(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Conteúdo / Detalhes / Anotações da Palavra</label>
            <textarea placeholder="Escreva passagens bíblicas, reflexões do dia ou descrição detalhada das necessidades..." value={conteudo} onChange={e => setConteudo(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', minHeight: '120px' }} />
          </div>

          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" disabled={salvando} style={{ padding: '12px 25px', backgroundColor: cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              {salvando ? 'Salvando...' : 'Guardar Registro'}
            </button>
          </div>
        </form>
      )}

      {/* RENDERIZAÇÃO DA TIMELINE / REGISTOS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {carregando ? (
          <div style={{ color: '#6c757d' }}>Sincronizando base de fé...</div>
        ) : registros.length === 0 ? (
          <div style={{ color: '#6c757d', backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', textAlign: 'center' }}>Nenhum registro espiritual lançado até o momento.</div>
        ) : (
          registros.sort((a,b) => new Date(b.dataEvento) - new Date(a.dataEvento)).map(reg => (
            <div key={reg.id} style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', display: 'flex', gap: '15px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              
              <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {renderIconeTipo(reg.tipo)}
              </div>

              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: cores?.texto }}>{reg.titulo}</h3>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleEditar(reg)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3' }}><Pencil size={14} /></button>
                    <button onClick={() => handleExcluir(reg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}><Trash2 size={14} /></button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#888', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 'bold', color: cores?.dourado }}>{reg.tipo}</span>
                  <span>Data: <strong>{reg.dataEvento.split('-').reverse().join('/')}</strong></span>
                  {reg.responsavel && <span>Por: <strong>{reg.responsavel}</strong></span>}
                </div>

                {reg.conteudo && (
                  <p style={{ margin: 0, fontSize: '14px', color: '#495057', whiteSpace: 'pre-line', backgroundColor: '#fafafa', padding: '12px', borderRadius: '8px', lineHeight: '1.5', borderLeft: '3px solid #eee' }}>
                    {reg.conteudo}
                  </p>
                )}
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}