import { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Plus, TrendingUp, Trash2, Pencil } from 'lucide-react';

const tiposInvestimento = ['Renda Fixa', 'Renda Variável', 'Fundos', 'Imóveis', 'Criptomoedas', 'Previdência', 'Outros'];

export default function GerenciadorInvestimentos({ cores, investimentos, formatarMoeda, recarregarInvestimentos }) {
  const [exibirForm, setExibirForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('Renda Fixa');
  const [valor, setValor] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [rentabilidade, setRentabilidade] = useState('');
  const [corretora, setCorretora] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const resetForm = () => {
    setNome(''); setTipo('Renda Fixa'); setValor(''); setDataInicio('');
    setRentabilidade(''); setCorretora(''); setObservacoes('');
    setEditandoId(null); setExibirForm(false);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    const payload = {
      nome,
      tipo,
      valor: parseFloat(valor) || 0,
      dataInicio,
      rentabilidade: rentabilidade || null,
      corretora: corretora || null,
      observacoes: observacoes || null
    };

    if (editandoId) {
      await updateDoc(doc(db, 'investimentos', editandoId), { ...payload, atualizadoEm: new Date().toISOString() });
    } else {
      await addDoc(collection(db, 'investimentos'), { ...payload, criadoEm: new Date().toISOString() });
    }
    resetForm();
    recarregarInvestimentos();
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir este investimento?")) return;
    try { await deleteDoc(doc(db, 'investimentos', id)); recarregarInvestimentos(); } catch { alert("Erro ao excluir."); }
  };

  const handleEditar = (inv) => {
    setNome(inv.nome);
    setTipo(inv.tipo);
    setValor(inv.valor.toString());
    setDataInicio(inv.dataInicio || '');
    setRentabilidade(inv.rentabilidade || '');
    setCorretora(inv.corretora || '');
    setObservacoes(inv.observacoes || '');
    setEditandoId(inv.id);
    setExibirForm(true);
  };

  const totalInvestido = (investimentos || []).reduce((acc, i) => acc + Number(i.valor || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ backgroundColor: '#eff6ff', padding: '12px 20px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Total Investido </span>
          <strong style={{ fontSize: '20px', color: '#2563eb', marginLeft: '8px' }}>{formatarMoeda(totalInvestido)}</strong>
        </div>
        <button type="button" onClick={() => { resetForm(); setExibirForm(!exibirForm); }} style={{ padding: '10px 20px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18}/> Novo Investimento
        </button>
      </div>

      {exibirForm && (
        <form onSubmit={handleSalvar} style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Nome do Investimento</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Tesouro Selic, FII XPML11" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
              {tiposInvestimento.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Valor (R$)</label>
            <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Data Início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Rentabilidade</label>
            <input type="text" value={rentabilidade} onChange={e => setRentabilidade(e.target.value)} placeholder="Ex: CDI+2% a.a." style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Corretora / Banco</label>
            <input type="text" value={corretora} onChange={e => setCorretora(e.target.value)} placeholder="Ex: XP, Rico, Inter" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Observações</label>
            <input type="text" value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Detalhes adicionais..." style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <button type="button" onClick={resetForm} style={{ padding: '10px 20px', height: '40px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '10px 20px', height: '40px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{editandoId ? 'Atualizar' : 'Salvar'}</button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {(investimentos || []).map(inv => (
          <div key={inv.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eee', borderTop: '4px solid #2563eb', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative' }}>
            <div style={{ display: 'flex', gap: '4px', position: 'absolute', top: '15px', right: '15px' }}>
              <button type="button" onClick={() => handleEditar(inv)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3', padding: '2px' }}><Pencil size={14}/></button>
              <button type="button" onClick={() => handleExcluir(inv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '2px' }}><Trash2 size={14}/></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ padding: '10px', backgroundColor: '#eff6ff', borderRadius: '50%' }}><TrendingUp size={24} color="#2563eb" /></div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>{inv.nome}</h3>
                <span style={{ fontSize: '11px', color: '#888', padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '10px' }}>{inv.tipo}</span>
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>Valor Investido</span>
              <strong style={{ fontSize: '22px', color: '#2563eb' }}>{formatarMoeda(inv.valor || 0)}</strong>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: '#666' }}>
              {inv.dataInicio && <span>Início: {inv.dataInicio.split('-').reverse().join('/')}</span>}
              {inv.rentabilidade && <span>| Rent.: {inv.rentabilidade}</span>}
              {inv.corretora && <span>| {inv.corretora}</span>}
            </div>
            {inv.observacoes && (
              <div style={{ borderTop: '1px solid #eee', marginTop: '10px', paddingTop: '8px', fontSize: '12px', color: '#999' }}>
                {inv.observacoes}
              </div>
            )}
          </div>
        ))}
      </div>

      {(investimentos || []).length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <TrendingUp size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
          <p>Nenhum investimento cadastrado. Registre seus investimentos para acompanhar a carteira.</p>
        </div>
      )}
    </div>
  );
}
