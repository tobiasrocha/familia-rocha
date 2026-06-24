// frontend/src/components/viagens/TelaViagens.jsx
import React, { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { Compass, Plus, Calendar, DollarSign, MapPin, ClipboardList, Trash2, Pencil, CheckCircle, Clock, X, ChevronDown } from 'lucide-react';
import GerenciadorRoteiros from './GerenciadorRoteiros';
import GerenciadorChecklist from './GerenciadorChecklist';

export default function TelaViagens({ cores }) {
  const { dados: viagens, carregando, recarregar } = useFirestore('viagens');

  const [exibirForm, setExibirForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [idEditando, setIdEditando] = useState(null);
  const [viagemSelecionada, setViagenselecionada] = useState(null);

  // Estados do Formulário
  const [destino, setDestino] = useState('');
  const [dataPartida, setDataPartida] = useState('');
  const [dataRetorno, setDataRetorno] = useState('');
  const [orcamento, setOrcamento] = useState('');
  const [status, setStatus] = useState('Planejada'); // Planejada, Confirmada, Concluída
  const [roteiro, setRoteiro] = useState('');
  const [checklist, setChecklist] = useState('');

  const resetarFormulario = () => {
    setDestino(''); setDataPartida(''); setDataRetorno(''); setOrcamento('');
    setStatus('Planejada'); setRoteiro(''); setChecklist('');
    setIdEditando(null); setExibirForm(false);
  };

  const handleSalvarViagem = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const novaViagem = {
        destino,
        dataPartida,
        dataRetorno,
        orcamento: parseFloat(orcamento) || 0,
        status,
        roteiro,
        checklist,
        criadoEm: new Date().toISOString()
      };

      if (idEditando) {
        await updateDoc(doc(db, 'viagens', idEditando), { ...novaViagem, atualizadoEm: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'viagens'), novaViagem);
      }
      
      resetarFormulario();
      recarregar();
    } catch (err) {
      console.error("Erro ao guardar viagem:", err);
      alert("Falha ao registrar a viagem.");
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = (viagem) => {
    setDestino(viagem.destino); setDataPartida(viagem.dataPartida || '');
    setDataRetorno(viagem.dataRetorno || ''); setOrcamento(viagem.orcamento);
    setStatus(viagem.status); setRoteiro(viagem.roteiro || ''); setChecklist(viagem.checklist || '');
    setIdEditando(viagem.id); setExibirForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Remover esta viagem permanentemente?")) return;
    try {
      await deleteDoc(doc(db, 'viagens', id));
      recarregar();
    } catch (err) {
      alert("Erro ao remover o registro.");
    }
  };

  const formatarMoeda = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarData = (dt) => dt ? dt.split('-').reverse().join('/') : '-';

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: cores?.texto, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Compass size={28} color={cores?.dourado} /> Planejamento de Viagens
        </h2>
        <button 
          onClick={() => { if (exibirForm) resetarFormulario(); else setExibirForm(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer', backgroundColor: exibirForm ? '#6c757d' : cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
        >
          {exibirForm ? 'Cancelar' : <><Plus size={18} /> Planejar Viagem</>}
        </button>
      </div>

      {/* FORMULÁRIO */}
      {exibirForm && (
        <form onSubmit={handleSalvarViagem} style={{ backgroundColor: cores?.branco, padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap', borderTop: `4px solid ${idEditando ? '#17a2b8' : cores?.dourado}` }}>
          
          <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Destino / Objetivo</label>
            <input type="text" placeholder="Ex: Fim de semana em Pipa, Férias em Gramado..." value={destino} onChange={e => setDestino(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Data de Partida</label>
            <input type="date" value={dataPartida} onChange={e => setDataPartida(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Data de Retorno</label>
            <input type="date" value={dataRetorno} onChange={e => setDataRetorno(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Orçamento Estimado (R$)</label>
            <input type="number" step="0.01" value={orcamento} onChange={e => setOrcamento(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}>
              <option value="Planejada">Planejada</option>
              <option value="Confirmada">Confirmada / Reservas Feitas</option>
              <option value="Concluída">Concluída</option>
            </select>
          </div>

          <div style={{ flex: '1 1 100%', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Roteiro / Locais para Visitar</label>
              <textarea placeholder="Ex: Dia 1: Praia do Amor; Dia 2: Passeio de barco..." value={roteiro} onChange={e => setRoteiro(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', minHeight: '100px' }} />
            </div>
            <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Checklist / Itens de Bagagem e Preparativos</label>
              <textarea placeholder="Ex: Revisar carro, Comprar protetor solar, Confirmar Airbnb..." value={checklist} onChange={e => setChecklist(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', minHeight: '100px' }} />
            </div>
          </div>

          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" disabled={salvando} style={{ padding: '12px 25px', backgroundColor: cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              {salvando ? 'Salvando...' : 'Guardar Plano'}
            </button>
          </div>
        </form>
      )}

      {/* LISTAGEM DE VIAGENS */}
      {!viagemSelecionada ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>
          {carregando ? (
            <div style={{ color: '#6c757d' }}>Carregando cronogramas de viagem...</div>
          ) : viagens.length === 0 ? (
            <div style={{ color: '#6c757d', gridColumn: '1/-1', backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', textAlign: 'center' }}>Nenhuma viagem planejada no horizonte.</div>
          ) : (
            viagens.sort((a,b) => new Date(a.dataPartida) - new Date(b.dataPartida)).map(viagem => (
              <div key={viagem.id} style={{ backgroundColor: cores?.branco, borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', borderTop: `4px solid ${viagem.status === 'Concluída' ? '#28a745' : (viagem.status === 'Confirmada' ? '#17a2b8' : cores?.dourado)}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: cores?.texto, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={18} color={cores?.dourado} /> {viagem.destino}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEditar(viagem)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3' }}><Pencil size={15} /></button>
                      <button onClick={() => handleExcluir(viagem.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}><Trash2 size={15} /></button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#6c757d', marginBottom: '15px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {formatarData(viagem.dataPartida)} a {formatarData(viagem.dataRetorno)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', color: '#28a745' }}><DollarSign size={14} /> {formatarMoeda(viagem.orcamento)}</span>
                  </div>

                  {viagem.roteiro && (
                    <div style={{ marginBottom: '12px', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: cores?.texto }}>Roteiro:</span>
                      <p style={{ margin: 0, fontSize: '13px', color: '#495057', whiteSpace: 'pre-line', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{viagem.roteiro}</p>
                    </div>
                  )}

                  {viagem.checklist && (
                    <div style={{ backgroundColor: '#fffaf0', padding: '10px', borderRadius: '8px', border: '1px solid #ffeeba' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: '#856404' }}>Preparações / Checklist:</span>
                      <p style={{ margin: 0, fontSize: '13px', color: '#495057', whiteSpace: 'pre-line', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{viagem.checklist}</p>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px', backgroundColor: viagem.status === 'Concluída' ? '#d4edda' : (viagem.status === 'Confirmada' ? '#d1f2f7' : '#fff3cd'), color: viagem.status === 'Concluída' ? '#155724' : (viagem.status === 'Confirmada' ? '#0056b3' : '#856404') }}>
                    {viagem.status}
                  </span>
                  <button
                    onClick={() => setViagenselecionada(viagem)}
                    style={{ padding: '6px 12px', backgroundColor: cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ChevronDown size={14} /> Gerenciar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div style={{ backgroundColor: cores?.branco, borderRadius: '12px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: `1px solid ${cores?.borda}` }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: cores?.texto }}>
              <MapPin size={24} color={cores?.dourado} /> {viagemSelecionada.destino}
            </h2>
            <button
              onClick={() => setViagenselecionada(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', padding: '8px', fontSize: '20px' }}
            >
              <X size={24} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#6c757d', marginBottom: '25px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {formatarData(viagemSelecionada.dataPartida)} a {formatarData(viagemSelecionada.dataRetorno)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', color: '#28a745' }}><DollarSign size={14} /> {formatarMoeda(viagemSelecionada.orcamento)}</span>
            <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '12px', backgroundColor: viagemSelecionada.status === 'Concluída' ? '#d4edda' : (viagemSelecionada.status === 'Confirmada' ? '#d1f2f7' : '#fff3cd'), color: viagemSelecionada.status === 'Concluída' ? '#155724' : (viagemSelecionada.status === 'Confirmada' ? '#0056b3' : '#856404') }}>
              {viagemSelecionada.status}
            </span>
          </div>

          <GerenciadorRoteiros viagemId={viagemSelecionada.id} cores={cores} />
          <GerenciadorChecklist viagemId={viagemSelecionada.id} cores={cores} />
        </div>
      )}
    </div>
  );
}