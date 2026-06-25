import { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { Plus, Trash2, Pencil, Wrench, Calendar, Landmark, QrCode, Package, Utensils, AlertTriangle, Bell, Check, X } from 'lucide-react';

const tiposServico = ['Encanador', 'Eletricista', 'Pintor', 'Pedreiro', 'Diarista', 'Jardineiro', 'Marceneiro', 'Técnico', 'Motorista', 'Outros'];

export default function GerenciadorPrestadores({ cores, formatarMoeda, contasBancarias }) {
  const { dados: prestadores, recarregar } = useFirestore('prestadores');
  const [exibirForm, setExibirForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [tipoServico, setTipoServico] = useState('Encanador');
  const [telefone, setTelefone] = useState('');
  const [banco, setBanco] = useState('');
  const [conta, setConta] = useState('');
  const [pix, setPix] = useState('');
  const [contaId, setContaId] = useState('');

  // Agendamento
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [horaAgendamento, setHoraAgendamento] = useState('');
  const [valorServico, setValorServico] = useState('');
  const [materiais, setMateriais] = useState('');
  const [alimentos, setAlimentos] = useState('');
  const [providencias, setProvidencias] = useState('');

  // Histórico de serviços prestados
  const [showHistorico, setShowHistorico] = useState(null);
  const [novaDataServico, setNovaDataServico] = useState('');
  const [novoValorServico, setNovoValorServico] = useState('');

  // Disparar alerta
  const [disparando, setDisparando] = useState(null);

  const resetForm = () => {
    setNome(''); setTipoServico('Encanador'); setTelefone(''); setBanco(''); setConta(''); setPix(''); setContaId('');
    setDataAgendamento(''); setHoraAgendamento(''); setValorServico(''); setMateriais(''); setAlimentos(''); setProvidencias('');
    setEditandoId(null); setExibirForm(false);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    const payload = {
      nome, tipoServico, telefone, banco, conta, pix, contaId: contaId || null,
      dataAgendamento, horaAgendamento, valorServico: parseFloat(valorServico) || 0,
      materiais, alimentos, providencias,
    };
    if (editandoId) {
      await updateDoc(doc(db, 'prestadores', editandoId), { ...payload, atualizadoEm: new Date().toISOString() });
    } else {
      await addDoc(collection(db, 'prestadores'), { ...payload, criadoEm: new Date().toISOString() });
    }
    resetForm(); recarregar();
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir este prestador?")) return;
    try { await deleteDoc(doc(db, 'prestadores', id)); recarregar(); } catch { /* erro */ }
  };

  const handleEditar = (p) => {
    setNome(p.nome); setTipoServico(p.tipoServico); setTelefone(p.telefone || '');
    setBanco(p.banco || ''); setConta(p.conta || ''); setPix(p.pix || ''); setContaId(p.contaId || '');
    setDataAgendamento(p.dataAgendamento || ''); setHoraAgendamento(p.horaAgendamento || '');
    setValorServico(p.valorServico?.toString() || ''); setMateriais(p.materiais || '');
    setAlimentos(p.alimentos || ''); setProvidencias(p.providencias || '');
    setEditandoId(p.id); setExibirForm(true);
  };

  const handleAdicionarServico = async (p) => {
    if (!novaDataServico) return;
    const servicos = p.servicos || [];
    servicos.push({ data: novaDataServico, valor: parseFloat(novoValorServico) || 0 });
    await updateDoc(doc(db, 'prestadores', p.id), { servicos, atualizadoEm: new Date().toISOString() });
    setShowHistorico(null); setNovaDataServico(''); setNovoValorServico('');
    recarregar();
  };

  const handleRemoverServico = async (p, idx) => {
    const servicos = [...(p.servicos || [])];
    servicos.splice(idx, 1);
    await updateDoc(doc(db, 'prestadores', p.id), { servicos, atualizadoEm: new Date().toISOString() });
    recarregar();
  };

  const handleDispararAlerta = async (p) => {
    setDisparando(p.id);
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://familiarocha-api-694824783472.us-central1.run.app/api' : '/api'}/disparar-alerta-prestador`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prestadorId: p.id }),
      });
      const data = await res.json();
      alert(data.ok ? 'Alerta enviado!' : 'Erro: ' + (data.erro || ''));
    } catch { alert('Falha ao enviar alerta.'); }
    finally { setDisparando(null); }
  };

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => { resetForm(); setExibirForm(!exibirForm); }} style={{ padding: '10px 20px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18}/> {exibirForm ? 'Cancelar' : 'Novo Prestador'}
        </button>
      </div>

      {exibirForm && (
        <form onSubmit={handleSalvar} style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Dados do prestador */}
          <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Nome</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Tipo</label>
            <select value={tipoServico} onChange={e => setTipoServico(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>{tiposServico.map(t => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Telefone</label>
            <input type="text" value={telefone} onChange={e => setTelefone(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ width: '100%', borderTop: '1px solid #eee', margin: '5px 0' }} />

          {/* Agendamento */}
          <div style={{ flex: '1 1 130px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}><Calendar size={14} /> Data</label>
            <input type="date" value={dataAgendamento} onChange={e => setDataAgendamento(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '0 0 100px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Hora</label>
            <input type="time" value={horaAgendamento} onChange={e => setHoraAgendamento(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Valor (R$)</label>
            <input type="number" step="0.01" value={valorServico} onChange={e => setValorServico(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ width: '100%', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold' }}><Package size={14} /> Materiais necessários</label>
              <textarea value={materiais} onChange={e => setMateriais(e.target.value)} rows={2} placeholder="Lista de materiais..." style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }} />
            </div>
            <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold' }}><Utensils size={14} /> Alimentos</label>
              <textarea value={alimentos} onChange={e => setAlimentos(e.target.value)} rows={2} placeholder="Lista de alimentos..." style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }} />
            </div>
            <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold' }}><AlertTriangle size={14} /> Providências</label>
              <textarea value={providencias} onChange={e => setProvidencias(e.target.value)} rows={2} placeholder="Providências a tomar..." style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }} />
            </div>
          </div>

          <div style={{ width: '100%', borderTop: '1px solid #eee', margin: '5px 0' }} />

          {/* Dados bancários */}
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}><Landmark size={14} /> Banco</label>
            <input type="text" value={banco} onChange={e => setBanco(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Conta</label>
            <input type="text" value={conta} onChange={e => setConta(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}><QrCode size={14} /> Chave PIX</label>
            <input type="text" value={pix} onChange={e => setPix(e.target.value)} placeholder="CPF/CNPJ/Email/Tel/Chave" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Conta Débito</label>
            <select value={contaId} onChange={e => setContaId(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}><option value="">Nenhuma</option>{contasBancarias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', width: '100%' }}>
            <button type="button" onClick={resetForm} style={{ padding: '10px 20px', height: '40px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '10px 20px', height: '40px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{editandoId ? 'Atualizar' : 'Salvar'}</button>
          </div>
        </form>
      )}

      {/* CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
        {(prestadores || []).sort((a, b) => (a.dataAgendamento || '').localeCompare(b.dataAgendamento || '')).map(p => {
          const isProximo = p.dataAgendamento && p.dataAgendamento >= hoje;
          const servicos = p.servicos || [];
          return (
            <div key={p.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eee', borderTop: `4px solid ${isProximo ? '#d97706' : '#6b7280'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative' }}>
              <div style={{ display: 'flex', gap: '4px', position: 'absolute', top: '15px', right: '15px' }}>
                <button type="button" onClick={() => handleDispararAlerta(p)} disabled={disparando === p.id} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '2px' }}>
                  <Bell size={14} />
                </button>
                <button type="button" onClick={() => handleEditar(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3', padding: '2px' }}><Pencil size={14} /></button>
                <button type="button" onClick={() => handleExcluir(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '2px' }}><Trash2 size={14} /></button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '10px', backgroundColor: '#fef3c7', borderRadius: '50%' }}><Wrench size={24} color="#d97706" /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>{p.nome}</h3>
                  <span style={{ fontSize: '11px', color: '#888', padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '10px' }}>{p.tipoServico}</span>
                </div>
              </div>

              {p.dataAgendamento && (
                <div style={{ marginBottom: '8px', padding: '8px 10px', backgroundColor: isProximo ? '#fef3c7' : '#f9fafb', borderRadius: '8px', fontSize: '13px' }}>
                  <Calendar size={12} /> {p.dataAgendamento.split('-').reverse().join('/')}{p.horaAgendamento ? ` às ${p.horaAgendamento}` : ''}
                  {p.valorServico > 0 && <span style={{ marginLeft: 8, fontWeight: 'bold' }}>— {formatarMoeda(p.valorServico)}</span>}
                </div>
              )}

              {(p.materiais || p.alimentos || p.providencias) && (
                <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px', lineHeight: 1.6 }}>
                  {p.materiais && <div><strong>Materiais:</strong> {p.materiais}</div>}
                  {p.alimentos && <div><strong>Alimentos:</strong> {p.alimentos}</div>}
                  {p.providencias && <div><strong>Providências:</strong> {p.providencias}</div>}
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                {p.banco && <span><Landmark size={12} /> {p.banco}</span>}
                {p.conta && <span>C/C: {p.conta}</span>}
                {p.pix && <span><QrCode size={12} /> PIX: {p.pix}</span>}
                {p.telefone && <span>📞 {p.telefone}</span>}
              </div>

              {/* Histórico de serviços */}
              <div style={{ borderTop: '1px solid #eee', paddingTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#888' }}>Serviços prestados ({servicos.length})</span>
                  <button type="button" onClick={() => setShowHistorico(showHistorico === p.id ? null : p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C5A059', fontSize: '12px', fontWeight: 'bold' }}>
                    {showHistorico === p.id ? 'Fechar' : '+ Adicionar'}
                  </button>
                </div>
                {showHistorico === p.id && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                    <input type="date" value={novaDataServico} onChange={e => setNovaDataServico(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px', flex: 1 }} />
                    <input type="number" step="0.01" value={novoValorServico} onChange={e => setNovoValorServico(e.target.value)} placeholder="R$" style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px', width: '80px' }} />
                    <button type="button" onClick={() => handleAdicionarServico(p)} style={{ background: '#28a745', border: 'none', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer' }}><Check size={14} color="#fff" /></button>
                  </div>
                )}
                {servicos.slice(0, 5).map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', padding: '2px 0' }}>
                    <span>{s.data?.split('-').reverse().join('/')}</span>
                    <span style={{ fontWeight: 'bold' }}>{formatarMoeda(s.valor || 0)}</span>
                    <button type="button" onClick={() => handleRemoverServico(p, i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '0 4px' }}><X size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
