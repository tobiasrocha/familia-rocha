// frontend/src/components/estudos/TelaEstudos.jsx
import React, { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { BookOpen, Plus, Clock, Target, Calendar, Trash2, CheckCircle2, AlertCircle, BarChart3, Settings, User } from 'lucide-react';

export default function TelaEstudos({ cores }) {
  // Conexão com múltiplas coleções (Chaves Relacionais)
  const { dados: sessoes, carregando: carregandoSessoes, recarregar: recarregarSessoes } = useFirestore('estudos');
  const { dados: perfis, carregando: carregandoPerfis } = useFirestore('perfis');
  const { dados: disciplinas, carregando: carregandoDisc, recarregar: recarregarDisc } = useFirestore('disciplinas');

  const [exibirFormSessao, setExibirFormSessao] = useState(false);
  const [exibirGerenciadorDisc, setExibirGerenciadorDisc] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Filtro Global do Dashboard
  const [filtroPerfil, setFiltroPerfil] = useState('Todos');

  // Estados do Formulário de Sessão
  const [perfilId, setPerfilId] = useState('');
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState('');
  const [topico, setTopico] = useState('');
  const [tempoMinutos, setTempoMinutos] = useState('');
  const [dataSessao, setDataSessao] = useState(new Date().toISOString().slice(0, 10));
  const [statusRevisao, setStatusRevisao] = useState('Pendente');

  // Estado do Formulário de Disciplina (CRUD)
  const [novaDisciplina, setNovaDisciplina] = useState('');

  // --- CRUD DE DISCIPLINAS ---
  const handleAdicionarDisciplina = async (e) => {
    e.preventDefault();
    if (!novaDisciplina.trim()) return;
    try {
      await addDoc(collection(db, 'disciplinas'), { nome: novaDisciplina, criadoEm: new Date().toISOString() });
      setNovaDisciplina('');
      recarregarDisc();
    } catch (err) {
      alert("Erro ao adicionar disciplina.");
    }
  };

  const handleExcluirDisciplina = async (id) => {
    if (!window.confirm("Remover esta disciplina do sistema?")) return;
    try {
      await deleteDoc(doc(db, 'disciplinas', id));
      recarregarDisc();
    } catch (err) {
      alert("Erro ao excluir disciplina.");
    }
  };

  // --- CRUD DE SESSÕES DE ESTUDO ---
  const resetarFormularioSessao = () => {
    setPerfilId(''); setDisciplinaSelecionada(''); setTopico(''); setTempoMinutos('');
    setDataSessao(new Date().toISOString().slice(0, 10)); setStatusRevisao('Pendente');
    setExibirFormSessao(false);
  };

  const handleSalvarSessao = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await addDoc(collection(db, 'estudos'), {
        perfilId,
        disciplina: disciplinaSelecionada,
        topico,
        tempoMinutos: parseInt(tempoMinutos),
        dataSessao,
        statusRevisao,
        criadoEm: new Date().toISOString()
      });
      resetarFormularioSessao();
      recarregarSessoes();
    } catch (err) {
      alert("Falha ao registrar a sessão.");
    } finally {
      setSalvando(false);
    }
  };

  const handleAlternarRevisao = async (id, statusAtual) => {
    try {
      const novoStatus = statusAtual === 'Concluída' ? 'Pendente' : 'Concluída';
      await updateDoc(doc(db, 'estudos', id), { statusRevisao: novoStatus });
      recarregarSessoes();
    } catch (err) {
      alert("Erro ao atualizar status.");
    }
  };

  const handleExcluirSessao = async (id) => {
    if (!window.confirm("Remover este registro?")) return;
    try { await deleteDoc(doc(db, 'estudos', id)); recarregarSessoes(); } 
    catch (err) { alert("Erro ao excluir."); }
  };

  // --- UTILITÁRIOS E CÁLCULOS ANALÍTICOS ---
  const obterNomePerfil = (id) => {
    const p = perfis.find(p => p.id === id);
    return p ? p.nome : 'Perfil Removido';
  };

  // Aplica o filtro de perfil aos dados do painel
  const sessoesFiltradas = filtroPerfil === 'Todos' 
    ? sessoes 
    : sessoes.filter(s => s.perfilId === filtroPerfil);

  const totalMinutosEstudados = sessoesFiltradas.reduce((acc, curr) => acc + Number(curr.tempoMinutos || 0), 0);
  const totalHorasLiquidas = (totalMinutosEstudados / 60).toFixed(1);
  const revisoesPendentes = sessoesFiltradas.filter(s => s.statusRevisao === 'Pendente').length;

  const calcularHorasPorMateria = (nomeMateria) => {
    const minutos = sessoesFiltradas.filter(s => s.disciplina === nomeMateria).reduce((acc, curr) => acc + Number(curr.tempoMinutos || 0), 0);
    return (minutos / 60).toFixed(1);
  };

  if (carregandoSessoes || carregandoPerfis || carregandoDisc) {
    return <div style={{ padding: '40px', textAlign: 'center', color: cores?.dourado }}>A compilar métricas de aprendizado...</div>;
  }

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* CABEÇALHO E CONTROLES GLOBAIS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: cores?.texto, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={28} color={cores?.dourado} /> Desempenho e Estudos
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* FILTRO GLOBAL DE PERFIL */}
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: cores?.branco, padding: '8px 15px', borderRadius: '8px', border: '1px solid #e0e0e0', gap: '8px' }}>
            <User size={18} color={cores?.dourado} />
            <select value={filtroPerfil} onChange={(e) => setFiltroPerfil(e.target.value)} style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', fontWeight: 'bold', color: cores?.texto }}>
              <option value="Todos">Visão Geral da Família</option>
              {perfis.map(p => <option key={p.id} value={p.id}>Estudos: {p.nome}</option>)}
            </select>
          </div>

          <button onClick={() => setExibirGerenciadorDisc(!exibirGerenciadorDisc)} style={{ padding: '10px', backgroundColor: exibirGerenciadorDisc ? '#6c757d' : cores?.branco, color: exibirGerenciadorDisc ? '#fff' : '#666', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }} title="Gerenciar Disciplinas">
            <Settings size={20} />
          </button>

          <button onClick={() => { setExibirFormSessao(!exibirFormSessao); setExibirGerenciadorDisc(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer', backgroundColor: exibirFormSessao ? '#6c757d' : cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            {exibirFormSessao ? 'Cancelar' : <><Plus size={18} /> Computar Sessão</>}
          </button>
        </div>
      </div>

      {/* GERENCIADOR DE DISCIPLINAS (CRUD) */}
      {exibirGerenciadorDisc && (
        <div style={{ backgroundColor: '#fdfdfd', padding: '25px', borderRadius: '12px', border: '1px solid #e0e0e0', marginBottom: '30px', borderTop: `4px solid #17a2b8` }}>
          <h3 style={{ marginTop: 0, color: cores?.texto, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={18} color="#17a2b8"/> Cadastro de Disciplinas e Assuntos</h3>
          
          <form onSubmit={handleAdicionarDisciplina} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input type="text" placeholder="Ex: Redes TCP/IP, Matemática, Legislação..." value={novaDisciplina} onChange={e => setNovaDisciplina(e.target.value)} required style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Adicionar</button>
          </form>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {disciplinas.length === 0 ? <p style={{ color: '#999', fontSize: '13px' }}>Nenhuma disciplina cadastrada.</p> : (
              disciplinas.map(disc => (
                <div key={disc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', border: '1px solid #ddd', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', color: '#495057' }}>
                  {disc.nome}
                  <button onClick={() => handleExcluirDisciplina(disc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', display: 'flex', alignItems: 'center' }}><Trash2 size={14}/></button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* FORMULÁRIO DE NOVA SESSÃO DE ESTUDOS */}
      {exibirFormSessao && (
        <form onSubmit={handleSalvarSessao} style={{ backgroundColor: cores?.branco, padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap', borderTop: `4px solid ${cores?.dourado}` }}>
          
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Estudante / Perfil</label>
            <select value={perfilId} onChange={e => setPerfilId(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}>
              <option value="">Selecione...</option>
              {perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Disciplina</label>
            <select value={disciplinaSelecionada} onChange={e => setDisciplinaSelecionada(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}>
              <option value="">Selecione a matéria...</option>
              {disciplinas.map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
            </select>
          </div>

          <div style={{ flex: '2 1 250px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Tópico do Edital / Resumo</label>
            <input type="text" placeholder="Ex: Protocolo IPv4, Artigo 2º..." value={topico} onChange={e => setTopico(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Minutos</label>
            <input type="number" placeholder="Ex: 60" value={tempoMinutos} onChange={e => setTempoMinutos(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Data da Sessão</label>
            <input type="date" value={dataSessao} onChange={e => setDataSessao(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Ciclo de Revisão</label>
            <select value={statusRevisao} onChange={e => setStatusRevisao(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}>
              <option value="Pendente">Agendar Revisão</option>
              <option value="Concluída">Material Revisado</option>
            </select>
          </div>

          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" disabled={salvando || disciplinas.length === 0} style={{ padding: '12px 25px', backgroundColor: cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: (salvando || disciplinas.length === 0) ? 'not-allowed' : 'pointer' }}>
              {salvando ? 'Computando...' : 'Registrar Horas'}
            </button>
          </div>
          {disciplinas.length === 0 && <p style={{width:'100%', textAlign:'right', color:'#dc3545', fontSize:'12px', marginTop:'5px'}}>Cadastre ao menos uma disciplina primeiro.</p>}
        </form>
      )}

      {/* KPI METRICS (Baseado no filtro ativo) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderLeft: `4px solid ${cores?.dourado}`, display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Clock size={32} color={cores?.dourado} />
          <div>
            <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Horas Líquidas</span>
            <h3 style={{ margin: '5px 0 0 0', color: cores?.texto, fontSize: '22px' }}>{totalHorasLiquidas}h</h3>
          </div>
        </div>
        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderLeft: '4px solid #17a2b8', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Target size={32} color="#17a2b8" />
          <div>
            <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Sessões Concluídas</span>
            <h3 style={{ margin: '5px 0 0 0', color: cores?.texto, fontSize: '22px' }}>{sessoesFiltradas.length}</h3>
          </div>
        </div>
        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderLeft: '4px solid #ffc107', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <AlertCircle size={32} color="#ffc107" />
          <div>
            <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Revisões na Fila</span>
            <h3 style={{ margin: '5px 0 0 0', color: cores?.texto, fontSize: '22px' }}>{revisoesPendentes}</h3>
          </div>
        </div>
      </div>

      {/* DISCIPLINAS E DETALHAMENTO LADO A LADO */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '25px', alignItems: 'start' }}>
        
        {/* PROGRESSO POR MATÉRIA */}
        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', color: cores?.texto, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} color={cores?.dourado} /> Cobertura do Edital
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {disciplinas.length === 0 ? <p style={{ fontSize: '13px', color: '#999' }}>Sem disciplinas.</p> : 
              disciplinas.map(disc => {
                const horas = calcularHorasPorMateria(disc.nome);
                const metaVirtual = 40; // Exemplo de meta de horas
                const porcentagem = Math.min((horas / metaVirtual) * 100, 100);

                if (horas <= 0) return null; // Oculta as disciplinas sem horas estudadas pelo perfil ativo

                return (
                  <div key={disc.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold', color: '#495057' }}>{disc.nome}</span>
                      <span style={{ fontWeight: 'bold', color: cores?.dourado }}>{horas}h</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${porcentagem}%`, height: '100%', backgroundColor: cores?.dourado, borderRadius: '3px' }}></div>
                    </div>
                  </div>
                );
            })}
          </div>
        </div>

        {/* TABELA DE SESSÕES */}
        <div style={{ backgroundColor: cores?.branco, borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '750px' }}>
            <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
              <tr>
                <th style={{ padding: '15px', color: '#495057' }}>Data</th>
                <th style={{ padding: '15px', color: '#495057' }}>Estudante</th>
                <th style={{ padding: '15px', color: '#495057' }}>Conteúdo Estudado</th>
                <th style={{ padding: '15px', color: '#495057', textAlign: 'center' }}>Tempo</th>
                <th style={{ padding: '15px', color: '#495057', textAlign: 'center' }}>Revisão</th>
                <th style={{ padding: '15px', color: '#495057', textAlign: 'center' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {sessoesFiltradas.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#6c757d' }}>Nenhuma sessão computada para este filtro.</td></tr>
              ) : (
                sessoesFiltradas.sort((a, b) => new Date(b.dataSessao) - new Date(a.dataSessao)).map(sessao => (
                  <tr key={sessao.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <td style={{ padding: '15px', fontSize: '14px' }}>{sessao.dataSessao.split('-').reverse().join('/')}</td>
                    <td style={{ padding: '15px', fontSize: '13px', color: '#666', fontWeight: 'bold' }}>{obterNomePerfil(sessao.perfilId)}</td>
                    <td style={{ padding: '15px', fontSize: '14px' }}>
                      <strong style={{ color: '#333' }}>{sessao.disciplina}</strong><br/>
                      <span style={{ fontSize: '12px', color: '#888' }}>{sessao.topico}</span>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#17a2b8' }}>{sessao.tempoMinutos}m</td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleAlternarRevisao(sessao.id, sessao.statusRevisao)}
                        style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: 'none', backgroundColor: sessao.statusRevisao === 'Concluída' ? '#d4edda' : '#fff3cd', color: sessao.statusRevisao === 'Concluída' ? '#155724' : '#856404', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        {sessao.statusRevisao === 'Concluída' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {sessao.statusRevisao}
                      </button>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <button onClick={() => handleExcluirSessao(sessao.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }} title="Excluir"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}