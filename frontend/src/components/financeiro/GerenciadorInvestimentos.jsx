import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Plus, TrendingUp, Trash2, Pencil, Check, X, DollarSign, BarChart3, Globe } from 'lucide-react';

const tiposInvestimento = ['Renda Fixa', 'Renda Variável', 'Fundos', 'Imóveis', 'Criptomoedas', 'Previdência', 'Ações', 'Moeda Estrangeira', 'Outros'];

const MOEDAS = [
  { sigla: 'USD', nome: 'Dólar', cor: '#2563eb', bg: '#eff6ff' },
  { sigla: 'EUR', nome: 'Euro', cor: '#d97706', bg: '#fef3c7' },
  { sigla: 'GBP', nome: 'Libra', cor: '#7c3aed', bg: '#ede9fe' },
  { sigla: 'BTC', nome: 'Bitcoin', cor: '#f59e0b', bg: '#fffbeb' },
  { sigla: 'ARS', nome: 'Peso AR', cor: '#059669', bg: '#ecfdf5' },
];

function MiniGrafico({ dados, cor, altura = 40 }) {
  if (!dados || dados.length < 2) return <div style={{ height: altura, background: '#f5f5f5', borderRadius: 6 }} />;
  const vals = dados.map(d => d.valor);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 100;
  const h = altura;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  const ptsArea = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg width="100%" height={h} style={{ display: 'block' }}>
      <polygon points={ptsArea} fill={`${cor}15`} />
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="1.5" />
    </svg>
  );
}

export default function GerenciadorInvestimentos({ cores, investimentos, contas, formatarMoeda, recarregarInvestimentos, recarregarFinancas }) {
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
  const [moeda, setMoeda] = useState('USD');
  const [cotacaoCompra, setCotacaoCompra] = useState('');
  const [contaOrigemId, setContaOrigemId] = useState('');

  const [editandoSaldoId, setEditandoSaldoId] = useState(null);
  const [novoSaldo, setNovoSaldo] = useState('');
  const [modalSaldoConfig, setModalSaldoConfig] = useState(null);

  const [cotacoes, setCotacoes] = useState({});
  const [historicoDolar, setHistoricoDolar] = useState([]);
  const [indiceB3, setIndiceB3] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregarDados = useCallback(async () => {
    try {
      // Moedas
      const moedasRes = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,BTC-BRL,ARS-BRL');
      const moedasData = await moedasRes.json();
      const mapa = {};
      if (moedasData.USDBRL) mapa.USD = { bid: parseFloat(moedasData.USDBRL.bid), var: parseFloat(moedasData.USDBRL.pctChange || 0) };
      if (moedasData.EURBRL) mapa.EUR = { bid: parseFloat(moedasData.EURBRL.bid), var: parseFloat(moedasData.EURBRL.pctChange || 0) };
      if (moedasData.GBPBRL) mapa.GBP = { bid: parseFloat(moedasData.GBPBRL.bid), var: parseFloat(moedasData.GBPBRL.pctChange || 0) };
      if (moedasData.BTCBRL) mapa.BTC = { bid: parseFloat(moedasData.BTCBRL.bid), var: parseFloat(moedasData.BTCBRL.pctChange || 0) };
      if (moedasData.ARSBRL) mapa.ARS = { bid: parseFloat(moedasData.ARSBRL.bid), var: parseFloat(moedasData.ARSBRL.pctChange || 0) };
      setCotacoes(mapa);
    } catch { console.debug('[Invest] Moedas offline'); }

    try {
      // Historico 7 dias USD
      const histRes = await fetch('https://economia.awesomeapi.com.br/json/daily/USD-BRL/7');
      const histData = await histRes.json();
      const serie = (histData || []).reverse().map(d => ({ valor: parseFloat(d.bid) }));
      setHistoricoDolar(serie);
    } catch { console.debug('[Invest] Historico offline'); }

    try {
      // IBOVESPA via brapi
      const b3Res = await fetch('https://brapi.dev/api/quote/%5EBVSP?range=1d&interval=1d');
      const b3Data = await b3Res.json();
      if (b3Data?.results?.[0]) {
        const r = b3Data.results[0];
        setIndiceB3({ valor: r.regularMarketPrice, var: r.regularMarketChangePercent || 0 });
      }
    } catch {
      try {
        // fallback: Alpha Vantage free
        const avRes = await fetch('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBOV&apikey=demo');
        const avData = await avRes.json();
        const q = avData?.['Global Quote'];
        if (q?.['05. price']) {
          setIndiceB3({ valor: parseFloat(q['05. price']), var: parseFloat(q['10. change percent']?.replace('%', '') || 0) });
        }
      } catch { /* offline */ }
    } finally {
      setCarregando(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregarDados(); const id = setInterval(carregarDados, 60000); return () => clearInterval(id); }, [carregarDados]);

  const resetForm = () => {
    setNome(''); setTipo('Renda Fixa'); setValor(''); setDataInicio('');
    setRentabilidade(''); setCorretora(''); setObservacoes(''); setTicker(''); setQuantidade('');
    setMoeda('USD'); setCotacaoCompra(''); setContaOrigemId('');
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
      moeda: tipo === 'Moeda Estrangeira' ? moeda : null,
      cotacaoCompra: tipo === 'Moeda Estrangeira' && cotacaoCompra ? parseFloat(cotacaoCompra) : null,
    };

    if (editandoId) {
      await updateDoc(doc(db, 'investimentos', editandoId), { ...payload, atualizadoEm: new Date().toISOString() });
    } else {
      const docRef = await addDoc(collection(db, 'investimentos'), { ...payload, criadoEm: new Date().toISOString() });
      if (contaOrigemId && payload.valor > 0) {
        await addDoc(collection(db, 'financas'), {
          descricao: `Aporte Inicial - ${nome}`,
          valor: payload.valor,
          tipo: 'Despesa',
          categoria: 'Investimentos',
          contaId: contaOrigemId,
          status: 'Pago',
          formaPagamento: 'Débito',
          isAporteInvestimento: true,
          investimentoId: docRef.id,
          criadoEm: new Date().toISOString()
        });
        if (recarregarFinancas) recarregarFinancas();
      }
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
    setMoeda(inv.moeda || 'USD'); setCotacaoCompra(inv.cotacaoCompra?.toString() || '');
    setEditandoId(inv.id); setExibirForm(true);
  };

  const handleSalvarSaldo = (inv) => {
    if (!novoSaldo || isNaN(parseFloat(novoSaldo))) return;
    const ns = parseFloat(novoSaldo);
    if (ns === inv.valor) {
      setEditandoSaldoId(null);
      return;
    }
    setModalSaldoConfig({ inv, novoSaldo: ns, dif: ns - inv.valor, contaId: '' });
  };

  const confirmarAlteracaoSaldo = async (tipoAjuste) => {
    if (!modalSaldoConfig) return;
    const { inv, novoSaldo, dif, contaId } = modalSaldoConfig;

    try {
      await updateDoc(doc(db, 'investimentos', inv.id), { valor: novoSaldo, atualizadoEm: new Date().toISOString() });

      if (tipoAjuste === 'aporte' && contaId) {
        const isResgate = dif < 0;
        await addDoc(collection(db, 'financas'), {
          descricao: isResgate ? `Resgate - ${inv.nome}` : `Aporte - ${inv.nome}`,
          valor: Math.abs(dif),
          tipo: isResgate ? 'Receita' : 'Despesa',
          categoria: 'Investimentos',
          contaId: contaId,
          status: 'Pago',
          formaPagamento: 'Débito',
          [isResgate ? 'isResgateInvestimento' : 'isAporteInvestimento']: true,
          investimentoId: inv.id,
          criadoEm: new Date().toISOString()
        });
        if (recarregarFinancas) recarregarFinancas();
      }

      setEditandoSaldoId(null);
      setNovoSaldo('');
      setModalSaldoConfig(null);
      recarregarInvestimentos();
    } catch { alert("Erro ao atualizar saldo."); }
  };

  const iniciarEdicaoSaldo = (inv) => {
    setEditandoSaldoId(inv.id);
    setNovoSaldo(inv.valor?.toString() || '0');
  };

  const totalInvestido = (investimentos || []).reduce((acc, i) => acc + Number(i.valor || 0), 0);

  const infoMoeda = (sigla) => MOEDAS.find(m => m.sigla === sigla) || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* LINHA 1: COTAÇÕES DE MOEDAS */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {MOEDAS.map(m => {
          const c = cotacoes[m.sigla];
          return (
            <div key={m.sigla} style={{ flex: '1 1 150px', backgroundColor: m.bg, padding: '12px 14px', borderRadius: '10px', border: `1px solid ${m.cor}30`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={20} color={m.cor} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '10px', color: '#666', display: 'block' }}>{m.nome}</span>
                <strong style={{ fontSize: '14px', color: m.cor }}>
                  {carregando ? '...' : c ? `R$ ${m.sigla === 'BTC' ? c.bid.toLocaleString('pt-BR') : c.bid.toFixed(2)}` : '—'}
                </strong>
                {c && c.var !== 0 && (
                  <span style={{ fontSize: '10px', color: c.var >= 0 ? '#059669' : '#dc2626' }}>
                    {c.var > 0 ? '+' : ''}{c.var.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* LINHA 2: IBOVESPA + GRÁFICO DÓLAR + TOTAL */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {indiceB3 && (
          <div style={{ flex: '1 1 200px', backgroundColor: '#f0fdf4', padding: '12px 14px', borderRadius: '10px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={22} color="#16a34a" />
            <div>
              <span style={{ fontSize: '10px', color: '#666', display: 'block' }}>IBOVESPA</span>
              <strong style={{ fontSize: '15px', color: '#16a34a' }}>{indiceB3.valor.toLocaleString('pt-BR')} pts</strong>
              {indiceB3.var !== 0 && (
                <span style={{ fontSize: '10px', color: indiceB3.var >= 0 ? '#059669' : '#dc2626', marginLeft: 4 }}>
                  {indiceB3.var > 0 ? '+' : ''}{indiceB3.var.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        )}
        <div style={{ flex: '2 1 280px', backgroundColor: '#fff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: '10px', color: '#666', display: 'block', marginBottom: 4 }}>Dólar — 7 dias</span>
          <MiniGrafico dados={historicoDolar} cor="#2563eb" altura={40} />
        </div>
        <div style={{ flex: '1 1 160px', backgroundColor: '#ecfdf5', padding: '12px 14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
          <span style={{ fontSize: '10px', color: '#6b7280', display: 'block' }}>Total Investido</span>
          <strong style={{ fontSize: '17px', color: '#059669' }}>{formatarMoeda(totalInvestido)}</strong>
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
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Tesouro Selic, Compra USD" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
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

          {tipo === 'Moeda Estrangeira' && (
            <>
              <div style={{ flex: '0 0 100px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Moeda</label>
                <select value={moeda} onChange={e => setMoeda(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  {MOEDAS.filter(m => m.sigla !== 'BTC').map(m => <option key={m.sigla} value={m.sigla}>{m.sigla}</option>)}
                </select>
              </div>
              <div style={{ flex: '0 0 90px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold' }}>Cotação</label>
                <input type="number" step="0.0001" value={cotacaoCompra} onChange={e => setCotacaoCompra(e.target.value)} placeholder={cotacoes[moeda]?.bid?.toFixed(2)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
            </>
          )}

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
          <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Valor Atual (R$)</label>
            <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          {!editandoId && (
            <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Conta de Origem (Opcional)</label>
              <select value={contaOrigemId} onChange={e => setContaOrigemId(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                <option value="">Não descontar do saldo bancário</option>
                {(contas || []).map(c => <option key={c.id} value={c.id}>{c.nome} {c.agencia ? `- ${c.agencia}/${c.numeroConta}` : ''}</option>)}
              </select>
            </div>
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

      {/* CARDS DE INVESTIMENTOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {(investimentos || []).map(inv => {
          const info = inv.moeda ? infoMoeda(inv.moeda) : {};
          const borderColor = inv.tipo === 'Moeda Estrangeira' ? (info.cor || '#2563eb')
            : inv.tipo === 'Ações' ? '#8b5cf6' : '#2563eb';
          const bgIcon = inv.tipo === 'Moeda Estrangeira' ? (info.bg || '#eff6ff')
            : inv.tipo === 'Ações' ? '#ede9fe' : '#eff6ff';
          return (
          <div key={inv.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eee', borderTop: `4px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative' }}>
            <div style={{ display: 'flex', gap: '4px', position: 'absolute', top: '15px', right: '15px' }}>
              <button type="button" onClick={() => handleEditar(inv)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3', padding: '2px' }}><Pencil size={14}/></button>
              <button type="button" onClick={() => handleExcluir(inv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '2px' }}><Trash2 size={14}/></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ padding: '10px', backgroundColor: bgIcon, borderRadius: '50%' }}>
                {inv.tipo === 'Moeda Estrangeira' ? <Globe size={24} color={info.cor || '#2563eb'} />
                  : inv.tipo === 'Ações' ? <BarChart3 size={24} color="#8b5cf6" />
                  : <TrendingUp size={24} color="#2563eb" />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>{inv.nome}</h3>
                <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: '#888', padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '10px' }}>{inv.tipo}</span>
                  {inv.ticker && <span style={{ fontSize: '11px', color: '#8b5cf6', padding: '2px 8px', backgroundColor: '#ede9fe', borderRadius: '10px', fontWeight: 'bold' }}>{inv.ticker}</span>}
                  {inv.moeda && <span style={{ fontSize: '11px', color: info.cor || '#2563eb', padding: '2px 8px', backgroundColor: info.bg || '#eff6ff', borderRadius: '10px', fontWeight: 'bold' }}>{inv.moeda}</span>}
                </div>
              </div>
            </div>

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

            {inv.moeda && inv.cotacaoCompra && inv.valor > 0 && (
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                Comprado a R$ {inv.cotacaoCompra.toFixed(2)} → {cotacoes[inv.moeda] ? <>Cotação atual: R$ {cotacoes[inv.moeda].bid.toFixed(2)}</> : ''}
              </div>
            )}

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
              <div style={{ borderTop: '1px solid #eee', marginTop: '10px', paddingTop: '8px', fontSize: '12px', color: '#999' }}>{inv.observacoes}</div>
            )}
          </div>
        )})}
      </div>

      {(investimentos || []).length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <TrendingUp size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
          <p>Nenhum investimento cadastrado.</p>
        </div>
      )}

      {modalSaldoConfig && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>Confirmar Alteração de Saldo</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#555' }}>
              O saldo mudou de <strong>{formatarMoeda(modalSaldoConfig.inv.valor)}</strong> para <strong>{formatarMoeda(modalSaldoConfig.novoSaldo)}</strong>.
              <br/><br/>
              A diferença de <strong>{formatarMoeda(Math.abs(modalSaldoConfig.dif))}</strong> se deve a:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Rendimento (Lucro/Prejuízo)</h4>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#777' }}>Apenas atualiza o valor do investimento, sem afetar o caixa do banco.</p>
                <button onClick={() => confirmarAlteracaoSaldo('rendimento')} style={{ width: '100%', padding: '10px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                  É Apenas Rendimento
                </button>
              </div>

              <div style={{ padding: '15px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>{modalSaldoConfig.dif > 0 ? 'Novo Aporte' : 'Resgate'}</h4>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#777' }}>Afeta o saldo bancário ({modalSaldoConfig.dif > 0 ? 'sai' : 'entra'} na conta).</p>
                <select 
                  value={modalSaldoConfig.contaId} 
                  onChange={e => setModalSaldoConfig({...modalSaldoConfig, contaId: e.target.value})} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '10px' }}
                >
                  <option value="">Selecione a conta bancária...</option>
                  {(contas || []).map(c => <option key={c.id} value={c.id}>{c.nome} {c.agencia ? `- ${c.agencia}/${c.numeroConta}` : ''}</option>)}
                </select>
                <button 
                  onClick={() => confirmarAlteracaoSaldo('aporte')} 
                  disabled={!modalSaldoConfig.contaId}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: modalSaldoConfig.contaId ? 'pointer' : 'not-allowed', opacity: modalSaldoConfig.contaId ? 1 : 0.5 }}
                >
                  Confirmar {modalSaldoConfig.dif > 0 ? 'Aporte' : 'Resgate'}
                </button>
              </div>
            </div>

            <button onClick={() => setModalSaldoConfig(null)} style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#64748b', border: 'none', marginTop: '10px', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
