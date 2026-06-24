// frontend/src/components/tarefas/TelaTarefas.jsx
import { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { ClipboardList, Calendar, User, ArrowRight, ArrowLeft, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function TelaTarefas({ cores }) {
  // Chamadas duplas ao useFirestore renomeando as propriedades para evitar conflitos de contexto
  const { dados: tarefas, carregando: carregandoTarefas, recarregar: recarregarTarefas } = useFirestore('tarefas');
  const { dados: perfis, carregando: carregandoPerfis } = useFirestore('perfis');

  const [exibirForm, setExibirForm] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Estados do formulário
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [prioridade, setPrioridade] = useState('Média');
  const [dataLimite, setDataLimite] = useState('');

  const resetarFormulario = () => {
    setTitulo('');
    setDescricao('');
    setResponsavelId('');
    setPrioridade('Média');
    setDataLimite('');
    setExibirForm(false);
  };

  const handleCriarTarefa = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const novaTarefa = {
        titulo,
        descricao,
        responsavelId,
        prioridade,
        dataLimite,
        status: 'A Fazer', // Estado inicial do fluxo Kanban
        criadoEm: new Date().toISOString()
      };
      await addDoc(collection(db, 'tarefas'), novaTarefa);
      resetarFormulario();
      recarregarTarefas();
    } catch (err) {
      console.error("Erro ao salvar tarefa:", err);
      alert("Falha ao registrar a tarefa.");
    } finally {
      setSalvando(false);
    }
  };

  const handleMudarStatus = async (id, novoStatus) => {
    try {
      await updateDoc(doc(db, 'tarefas', id), {
        status: novoStatus,
        atualizadoEm: new Date().toISOString()
      });
      recarregarTarefas();
    } catch (err) {
      console.error("Erro ao mover tarefa:", err);
      alert("Não foi possível atualizar o estado da tarefa.");
    }
  };

  const handleExcluirTarefa = async (id) => {
    if (!window.confirm("Deseja remover esta tarefa do quadro permanentemente?")) return;
    try {
      await deleteDoc(doc(db, 'tarefas', id));
      recarregarTarefas();
    } catch {
      alert("Erro ao eliminar o registro.");
    }
  };

  const obterNomeResponsavel = (id) => {
    const perfil = perfis.find(p => p.id === id);
    return perfil ? perfil.nome : 'Não atribuído';
  };

  const obterCorPrioridade = (prio) => {
    switch (prio) {
      case 'Alta': return '#dc3545';
      case 'Média': return '#ffc107';
      default: return '#28a745';
    }
  };

  if (carregandoTarefas || carregandoPerfis) {
    return <div style={{ padding: '40px', textAlign: 'center', color: cores?.dourado }}>Carregando a Engenharia de Rotinas...</div>;
  }

  const colunas = [
    { id: 'A Fazer', titulo: 'A Fazer', corBorda: cores?.dourado },
    { id: 'Em Andamento', titulo: 'Em Andamento', corBorda: '#17a2b8' },
    { id: 'Concluído', titulo: 'Concluído', corBorda: '#28a745' }
  ];

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* SEÇÃO SUPERIOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: cores?.texto, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ClipboardList size={28} color={cores?.dourado} /> Tarefas e Rotinas Domésticas
        </h2>
        <button 
          onClick={() => setExibirForm(!exibirForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer', backgroundColor: exibirForm ? '#6c757d' : cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
        >
          {exibirForm ? 'Ocultar Painel' : '+ Nova Tarefa'}
        </button>
      </div>

      {/* FORMULÁRIO DE INSERÇÃO */}
      {exibirForm && (
        <form onSubmit={handleCriarTarefa} style={{ backgroundColor: cores?.branco, padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap', borderTop: `4px solid ${cores?.dourado}` }}>
          
          <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Título da Atividade</label>
            <input type="text" placeholder="Ex: Vacinar o Marley, Lavar filtros do Ar Condicionado..." value={titulo} onChange={e => setTitulo(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Responsável Atribuído</label>
            <select value={responsavelId} onChange={e => setResponsavelId(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}>
              <option value="">Escolha um membro...</option>
              {perfis.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.tipo})</option>)}
            </select>
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Nível de Prioridade</label>
            <select value={prioridade} onChange={e => setPrioridade(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
            </select>
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Data Limite</label>
            <input type="date" value={dataLimite} onChange={e => setDataLimite(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Instruções / Observações</label>
            <textarea placeholder="Detalhes adicionais sobre a tarefa..." value={descricao} onChange={e => setDescricao(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical', minHeight: '60px' }} />
          </div>

          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" disabled={salvando} style={{ padding: '12px 25px', backgroundColor: cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: salvando ? 'not-allowed' : 'pointer' }}>
              {salvando ? 'Processando...' : 'Alocar no Quadro'}
            </button>
          </div>
        </form>
      )}

      {/* QUADRO KANBAN (ESTRUTURA DE COLUNAS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', alignItems: 'start' }}>
        {colunas.map(col => {
          const tarefasDaColuna = tarefas.filter(t => t.status === col.id);
          
          return (
            <div key={col.id} style={{ backgroundColor: '#f4f4f2', borderRadius: '12px', padding: '15px', minHeight: '520px', borderTop: `4px solid ${col.corBorda}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: cores?.texto, fontWeight: 'bold' }}>{col.titulo}</h3>
                <span style={{ fontSize: '12px', fontWeight: 'bold', backgroundColor: '#e2e2de', padding: '2px 8px', borderRadius: '10px', color: '#666' }}>
                  {tarefasDaColuna.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tarefasDaColuna.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#999', fontSize: '13px', marginTop: '30px' }}>Fila limpa por aqui.</p>
                ) : (
                  tarefasDaColuna.map(tarefa => {
                    const hoje = new Date().toISOString().slice(0, 10);
                    const estaAtrasada = tarefa.status !== 'Concluído' && tarefa.dataLimite && tarefa.dataLimite < hoje;

                    return (
                      <div key={tarefa.id} style={{ backgroundColor: cores?.branco, borderRadius: '8px', padding: '15px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', borderLeft: `4px solid ${obterCorPrioridade(tarefa.prioridade)}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h4 style={{ margin: 0, fontSize: '14px', color: cores?.texto, fontWeight: 'bold' }}>{tarefa.titulo}</h4>
                          <button onClick={() => handleExcluirTarefa(tarefa.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: 0 }}><Trash2 size={14} /></button>
                        </div>

                        {tarefa.descricao && <p style={{ margin: 0, fontSize: '12px', color: '#666', lineHeight: '1.4' }}>{tarefa.descricao}</p>}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#555', borderTop: '1px solid #f0f0f0', paddingTop: '8px', marginTop: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={13} color="#888" />
                            <span>Executor: <strong>{obterNomeResponsavel(tarefa.responsavelId)}</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: estaAtrasada ? '#dc3545' : '#555', fontWeight: estaAtrasada ? 'bold' : 'normal' }}>
                            {estaAtrasada ? <AlertTriangle size={13} color="#dc3545" /> : <Calendar size={13} color="#888" />}
                            <span>Prazo: {tarefa.dataLimite ? tarefa.dataLimite.split('-').reverse().join('/') : '-'} {estaAtrasada && '(ATRASADA)'}</span>
                          </div>
                        </div>

                        {/* DESLOCAMENTO FLUIDO DE ESTADOS */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '5px', borderTop: '1px solid #f9f9f9', paddingTop: '6px' }}>
                          {col.id === 'Em Andamento' && (
                            <button onClick={() => handleMudarStatus(tarefa.id, 'A Fazer')} style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'none', border: '1px solid #ccc', borderRadius: '4px', padding: '3px 6px', fontSize: '11px', cursor: 'pointer', color: '#666' }}>
                              <ArrowLeft size={12} /> Recuar
                            </button>
                          )}
                          {col.id === 'A Fazer' && (
                            <button onClick={() => handleMudarStatus(tarefa.id, 'Em Andamento')} style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'none', border: `1px solid ${cores?.dourado}`, borderRadius: '4px', padding: '3px 6px', fontSize: '11px', cursor: 'pointer', color: cores?.dourado, fontWeight: 'bold' }}>
                              Puxar <ArrowRight size={12} />
                            </button>
                          )}
                          {col.id === 'Em Andamento' && (
                            <button onClick={() => handleMudarStatus(tarefa.id, 'Concluído')} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#28a745', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', color: '#fff', fontWeight: 'bold' }}>
                              <CheckCircle size={12} /> Finalizar
                            </button>
                          )}
                          {col.id === 'Concluído' && (
                            <button onClick={() => handleMudarStatus(tarefa.id, 'Em Andamento')} style={{ background: 'none', border: '1px solid #28a745', borderRadius: '4px', padding: '3px 6px', fontSize: '11px', cursor: 'pointer', color: '#28a745' }}>
                              Reabrir Fluxo
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}