import { useState, useEffect } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Plus, TrendingUp, Trash2, Pencil, Check, X, DollarSign, BarChart3 } from 'lucide-react';

const tiposInvestimento = ['Renda Fixa', 'Renda Variável', 'Fundos', 'Imóveis', 'Criptomoedas', 'Previdência', 'Ações', 'Outros'];

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
  const [ticker, setTicker] = useState('');
  const [quantidade, setQuantidade] = useState('');

  const [editandoSaldoId, setEditandoSaldoId] = useState(null);
  const [novoSaldo, setNovoSaldo] = useState('');

  const [cotacoes, setCotacoes] = useState({ usd: null, eur: null });
  const [carregandoCotacoes, setCarregandoCotacoes] = useState(true);

  useEffect(() => {
    fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL')
      .then(r => r.json())
      .then(data => {
        setCotacoes({
          usd: parseFloat(data.USDBRL?.bid || 0),
          eur: parseFloat(data.EURBRL?.bid || 0),
        });
        setCarregandoCotacoes(false);
      })
      .catch(() => setCarregandoCotacoes(false));
  }, []);

  const resetForm = () => {
    setNome(''); setTipo('Renda Fixa'); setValor(''); setDataInicio('');
    setRentabilidade(''); setCorretora(''); setObservacoes(''); setTicker(''); setQuantidade('');
    setEditandoId(null); setExibirForm(false);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    const payload = {
      nome, tipo,
      valor: parseFloat(valor) || 0,
      dataInicio,
      rentabilidade: rentabilidade || null,
      corretora: corretora || null,
      observacoes: observacoes || null,
      ticker: ticker || null,
      quantidade: quantidade ? parseInt(quantidade) : null,
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
    setNome(inv.nome); setTipo(inv.tipo); setValor(inv.valor.toString());
    setDataInicio(inv.dataInicio || ''); setRentabilidade(inv.rentabilidade || '');
    setCorretora(inv.corretora || ''); setObservacoes(inv.observacoes || '');
    setTicker(inv.ticker || ''); setQuantidade(inv.quantidade?.toString() || '');
    setEditandoId(inv.id); setExibirForm(true);
  };

  const handleSalvarSaldo = async (inv) => {
    if (!novoSaldo || isNaN(parseFloat(novoSaldo))) return;
    try {
      await updateDoc(doc(db, 'investimentos', inv.id), { valor: parseFloat(novoSaldo), atualizadoEm: new Date().toISOString() });
      setEditandoSaldoId(null); setNovoSaldo('');
      recarregarInvestimentos();
    } catch { alert("Erro ao atualizar saldo."); }
  };

  const iniciarEdicaoSaldo = (inv) => {
    setEditandoSaldoId(inv.id);
    setNovoSaldo(inv.valor?.toString() || '0');
  };

  const totalInvestido = (investimentos || []).reduce((acc, i) => acc + Number(i.valor || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* COTAÇÕES */}
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', backgroundColor: '#eff6ff', padding: '12px 18px', borderRadius: '10px', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <DollarSign size={22} color="#2563eb" />
          <div>
            <span style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Dólar (USD)</span>
            <strong style={{ fontSize: '16px', color: '#2563eb' }}>
              {carregandoCotacoes ? '...' : cotacoes.usd ? `R$ ${cotacoes.usd.toFixed(2)}` : 'Indisponível'}
            </strong>
          </div>
        </div>
        <div style={{ flex: '1 1 200px', backgroundColor: '#fef3c7', padding: '12px 18px', borderRadius: '10px', border: '1px solid #fcd34d', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <DollarSign size={22} color="#d97706" />
          <div>
            <span style={{ fontSize: '11px', color: '#92400e', display: 'block' }}>Euro (EUR)</span>
            <strong style={{ fontSize: '16px', color: '#d97706' }}>
              {carregandoCotacoes ? '...' : cotacoes.eur ? `R$ ${cotacoes.eur.toFixed(2)}` : 'Indisponível'}
            </strong>
          </div>
        </div>
        <div style={{ flex: '1 1 180px', backgroundColor: '#ecfdf5', padding: '12px 18px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
          <span style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Total Investido</span>
          <strong style={{ fontSize: '18px', color: '#059669' }}>{formatarMoeda(totalInvestido)}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
          <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
              {tiposInvestimento.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Valor (R$)</label>
            <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          {tipo === 'Ações' && (
            <>
              <div style={{ flex: '0 0 100px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Ticker</label>
                <input type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="PETR4" maxLength={10} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', textTransform: 'uppercase' }} />
              </div>
              <div style={{ flex: '0 0 90px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Qtd</label>
                <input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="100" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
            </>
          )}
          <div style={{ flex: '1 1 130px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Data Início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Rentabilidade</label>
            <input type="text" value={rentabilidade} onChange={e => setRentabilidade(e.target.value)} placeholder="Ex: CDI+2% a.a." style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {(investimentos || []).map(inv => (
          <div key={inv.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eee', borderTop: `4px solid ${inv.tipo === 'Ações' ? '#8b5cf6' : '#2563eb'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative' }}>
            <div style={{ display: 'flex', gap: '4px', position: 'absolute', top: '15px', right: '15px' }}>
              <button type="button" onClick={() => handleEditar(inv)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3', padding: '2px' }}><Pencil size={14}/></button>
              <button type="button" onClick={() => handleExcluir(inv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '2px' }}><Trash2 size={14}/></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ padding: '10px', backgroundColor: inv.tipo === 'Ações' ? '#ede9fe' : '#eff6ff', borderRadius: '50%' }}>
                {inv.tipo === 'Ações' ? <BarChart3 size={24} color="#8b5cf6" /> : <TrendingUp size={24} color="#2563eb" />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>{inv.nome}</h3>
                <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                  <span style={{ fontSize: '11px', color: '#888', padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '10px' }}>{inv.tipo}</span>
                  {inv.ticker && <span style={{ fontSize: '11px', color: '#8b5cf6', padding: '2px 8px', backgroundColor: '#ede9fe', borderRadius: '10px', fontWeight: 'bold' }}>{inv.ticker}</span>}
                </div>
              </div>
            </div>

            {/* SALDO EDITÁVEL */}
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>Valor Investido</span>
              {editandoSaldoId === inv.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563eb' }}>R$</span>
                  <input type="number" step="0.01" value={novoSaldo} onChange={e => setNovoSaldo(e.target.value)} autoFocus style={{ width: '140px', padding: '6px 10px', fontSize: '18px', fontWeight: 'bold', borderRadius: '6px', border: '2px solid #2563eb' }} />
                  <button type="button" onClick={() => handleSalvarSaldo(inv)} style={{ background: '#28a745', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer' }}><Check size={16} color="#fff" /></button>
                  <button type="button" onClick={() => setEditandoSaldoId(null)} style={{ background: '#dc3545', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer' }}><X size={16} color="#fff" /></button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '22px', color: '#2563eb', cursor: 'pointer' }} onClick={() => iniciarEdicaoSaldo(inv)} title="Clique para editar saldo">
                    {formatarMoeda(inv.valor || 0)}
                  </strong>
                  <span style={{ fontSize: '10px', color: '#888' }}>(clique para editar)</span>
                </div>
              )}
            </div>

            {inv.quantidade && inv.valor > 0 && (
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                {inv.quantidade} un. &times; {formatarMoeda(inv.valor / inv.quantidade)} /un.
              </div>
            )}

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
          <p>Nenhum investimento cadastrado.</p>
        </div>
      )}
    </div>
  );
}
