import { useState, useEffect } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { useFinancas } from '../../hooks/useFinancas';
import { useUploadOcr } from '../../hooks/useUploadOcr';
import { apiFetch } from '../../config';
import { Wallet, Calendar, FileText, Bell, CreditCard, TrendingUp, TrendingDown, Calculator } from 'lucide-react';

import DashboardFinanceiro from './DashboardFinanceiro';
import GerenciadorContas from './GerenciadorContas';
import FormularioLancamento from './FormularioLancamento';
import TabelaLancamentos from './TabelaLancamentos';
import RelatorioContabil from './RelatorioContabil';
import ConciliadorExtrato from './ConciliadorExtrato';
import GerenciadorCartoes from './GerenciadorCartoes';
import GerenciadorInvestimentos from './GerenciadorInvestimentos';
import GerenciadorEmprestimos from './GerenciadorEmprestimos';
import GerenciadorSalarios from './GerenciadorSalarios';
import GerenciadorCarteira from './GerenciadorCarteira';
import GerenciadorCofre from './GerenciadorCofre';
import GerenciadorHeranca from './GerenciadorHeranca';
import { Vault, Gem } from 'lucide-react';

export default function PainelFinanceiro({ cores }) {
  const { dados: lancamentosGlobais, recarregar } = useFirestore('financas');
  const { dados: contasBancarias, recarregar: recarregarContas } = useFirestore('contas_bancarias');
  const { dados: perfis } = useFirestore('perfis');
  const { dados: patrimonio } = useFirestore('patrimonio');
  const { dados: cartoes, recarregar: recarregarCartoes } = useFirestore('cartoes');
  const { dados: investimentos, recarregar: recarregarInvestimentos } = useFirestore('investimentos');
  const { dados: carteira } = useFirestore('carteira');
  const { dados: cofre } = useFirestore('cofre');
  const { dados: emprestimos } = useFirestore('emprestimos');

  const [abaAtiva, setAbaAtiva] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('aba') === 'carteira' ? 'carteira' : 'dashboard';
  });
  const [calcAberto, setCalcAberto] = useState(false);
  const [calcVisor, setCalcVisor] = useState('0');
  const [calcExpressao, setCalcExpressao] = useState('');
  const [calcMemoria, setCalcMemoria] = useState(null);
  const [calcOp, setCalcOp] = useState(null);
  const [calcNovoNumero, setCalcNovoNumero] = useState(false);
  const [calcHistorico, setCalcHistorico] = useState([]);
  const calcDigito = (d) => {
    setCalcVisor(v => (v === '0' || calcNovoNumero) ? String(d) : v + d);
    setCalcNovoNumero(false);
  };
  const calcOperacao = (op) => {
    if (calcMemoria !== null) calcResultado();
    const val = parseFloat(calcVisor) || 0;
    setCalcMemoria(val);
    setCalcOp(op);
    setCalcExpressao(e => e + ' ' + val + ' ' + op);
    setCalcNovoNumero(true);
  };
  const calcResultado = () => {
    const a = calcMemoria || 0; const b = parseFloat(calcVisor) || 0;
    const r = calcOp === '+' ? a + b : calcOp === '-' ? a - b : calcOp === '×' ? a * b : calcOp === '÷' ? (b !== 0 ? a / b : 0) : b;
    const rr = Math.round(r * 100) / 100;
    const expr = calcExpressao + ' ' + b + ' = ' + rr;
    setCalcVisor(String(rr));
    setCalcExpressao('');
    setCalcMemoria(null);
    setCalcOp(null);
    setCalcNovoNumero(true);
    setCalcHistorico(h => [expr, ...h].slice(0, 10));
  };
  const calcLimpar = () => {
    setCalcVisor('0'); setCalcExpressao(''); setCalcMemoria(null); setCalcOp(null); setCalcNovoNumero(false); setCalcHistorico([]);
  };

  // Teclado da calculadora
  useEffect(() => {
    if (!calcAberto) return;
    const handler = (e) => {
      if (e.key >= '0' && e.key <= '9' || e.key === '.') calcDigito(e.key);
      else if (e.key === '+') calcOperacao('+');
      else if (e.key === '-') calcOperacao('-');
      else if (e.key === '*') calcOperacao('×');
      else if (e.key === '/') { e.preventDefault(); calcOperacao('÷'); }
      else if (e.key === 'Enter' || e.key === '=') calcResultado();
      else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') calcLimpar();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [calcAberto, calcNovoNumero, calcVisor, calcMemoria, calcOp, calcExpressao]);
  const [exibirForm, setExibirForm] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [executandoAlertas, setExecutandoAlertas] = useState(false);

  const [idEditando, setIdEditando] = useState(null);
  const [descricao, setDescricao] = useState(''); const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState('Despesa'); const [categoria, setCategoria] = useState('Moradia');
  const [dataVencimento, setDataVencimento] = useState(''); const [status, setStatus] = useState('Pago');
  const [codigoBarras, setCodigoBarras] = useState(''); const [multa, setMulta] = useState(''); const [juros, setJuros] = useState('');
  const [linkArquivo, setLinkArquivo] = useState(''); const [contaIdSelecionada, setContaIdSelecionada] = useState('');
  const [perfilTransacaoId, setPerfilTransacaoId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');

  const [isParcelado, setIsParcelado] = useState(false); const [qtdParcelas, setQtdParcelas] = useState('2');
  const [listaParcelas, setListaParcelas] = useState([]);

  const anoAtual = new Date().getFullYear();
  const mesNumAtual = new Date().getMonth() + 1;
  const [anoFiltro, setAnoFiltro] = useState(anoAtual);
  const [mesNumFiltro, setMesNumFiltro] = useState(mesNumAtual);
  const mesFiltro = `${anoFiltro}-${String(mesNumFiltro).padStart(2, '0')}`;

  const [anoContabil, setAnoContabil] = useState(anoAtual.toString());
  const [mesContabil, setMesContabil] = useState('Todos');
  const [perfilContabil, setPerfilContabil] = useState('Todos');

  const hoje = new Date().toISOString().slice(0, 10);
  const categoriesDespesa = ['Alimentação', 'Cartão de Crédito', 'Educação', 'Igreja/Célula', 'Impostos', 'Lazer', 'Moradia', 'Prestadores de Serviço', 'Saúde', 'Transporte', 'Outros'];
  const categoriasReceita = ['Salário', 'Serviços', 'Investimentos', 'Presente', 'Outros'];

  // Merge carteira nos lançamentos para exibição
  const carteiraComoLancamento = (carteira || []).map(c => ({
    id: `cart-${c.id}`,
    descricao: c.descricao,
    valor: c.valor || 0,
    tipo: 'Despesa',
    categoria: c.categoria || 'Outros',
    dataVencimento: c.data,
    status: 'Pago',
    formaPagamento: c.forma,
    contaId: c.forma === 'Debito' ? c.vinculoId : (c.forma === 'Credito' ? c.vinculoId : null),
    perfilId: null,
    _carteira: true,
  }));

  const todosLancamentos = [...(lancamentosGlobais || []), ...carteiraComoLancamento];

  // Filtro mês/ano considerando também a carteira
  const dadosMesFiltroCompleto = todosLancamentos.filter(item => {
    if (!item.dataVencimento) return false;
    const [ano, mes] = item.dataVencimento.split('-').map(Number);
    return ano === anoFiltro && mes === mesNumFiltro;
  });

  const { extraindo: extraindoDados, erro: erroOcr, progresso: progressoUpload, dadosExtraidos, extrairDados } = useUploadOcr();

  const {
    calcularSaldoConta, saldoGlobalConsolidado, saldoBancario, saldoInvestimentos, debitoCartoes, saldoCofre, dadosMesFiltro,
    totalReceitas, totalDespesasPagas, totalDespesasPendentes,
    recContabil, despContabil, resultadoExercicio,
    valorBensDireitos, totalAtivos, totalPassivos, totalEmprestimos, patrimonioLiquido,
  } = useFinancas({ lancamentosGlobais, contasBancarias, patrimonio, cartoes, investimentos, cofre, emprestimos, mesFiltro, anoContabil, mesContabil, perfilContabil });

  const formatarMoeda = (val) => Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const obterNomePerfil = (id) => perfis.find(p => p.id === id)?.nome?.split(' ')[0] || 'Geral';

  const despesasPorCategoria = categoriesDespesa.map(cat => ({
    name: cat,
    valor: dadosMesFiltro.filter(i => i.tipo === 'Despesa' && i.categoria === cat).reduce((a, b) => a + Number(b.valor), 0)
  })).filter(i => i.valor > 0);

  const handleUploadDocumento = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dados = await extrairDados(file);
    if (dados) {
      if (dados.descricao) setDescricao(dados.descricao);
      if (dados.valor) setValor(dados.valor);
      if (dados.dataVencimento) setDataVencimento(dados.dataVencimento);
      if (dados.codigoBarras) setCodigoBarras(dados.codigoBarras);
      if (dados.linkArquivo) setLinkArquivo(dados.linkArquivo);
    }
  };

  const tipoAviso = erroOcr ? 'erro' : (dadosExtraidos?.aviso ? 'alerta' : null);
  const avisoUpload = erroOcr || dadosExtraidos?.aviso || '';

  const handleDispararAlertas = async () => {
    setExecutandoAlertas(true);
    try {
      const res = await apiFetch('/disparar-alertas', { method: 'POST' });
      const dados = await res.json();
      if (dados.ok) {
        alert(`📬 Alertas enviados!\n\n` +
          `📊 Contas escaneadas: ${dados.contasEscaneadas}\n` +
          `⏰ Contas no prazo: ${dados.contasNoPrazo}\n` +
          `📧 Emails: ${dados.emailsEnviados} enviados, ${dados.emailsFalhas} falhas\n` +
          `📱 WhatsApp: ${dados.whatsappsEnviados} enviados, ${dados.whatsappsFalhas} falhas\n\n` +
          `${dados.resumo}`
        );
      } else {
        alert("Erro: " + (dados.erro || 'Falha desconhecida'));
      }
    } catch { alert("Falha na execução. Verifique se o backend está rodando."); } finally { setExecutandoAlertas(false); }
  };

  const handleGerarCronogramaParcelas = () => {
    let parcelasGeradas = []; let dataBase = dataVencimento ? new Date(dataVencimento + 'T00:00:00') : new Date();
    for (let i = 1; i <= (parseInt(qtdParcelas) || 1); i++) {
      let dataParcela = new Date(dataBase); dataParcela.setMonth(dataBase.getMonth() + (i - 1));
      parcelasGeradas.push({ numero: i, valor: parseFloat((parseFloat(valor) / (parseInt(qtdParcelas) || 1)).toFixed(2)), dataVencimento: dataParcela.toISOString().slice(0, 10) });
    }
    setListaParcelas(parcelasGeradas);
  };

  const handleAtualizarParcela = (index, campo, novoValor) => {
    const novasParcelas = [...listaParcelas];
    novasParcelas[index][campo] = novoValor;
    setListaParcelas(novasParcelas);
  };

  const resetarFormulario = () => {
    setDescricao(''); setValor(''); setTipo('Despesa'); setCategoria('Moradia'); setDataVencimento(''); setStatus('Pago');
    setCodigoBarras(''); setMulta(''); setJuros(''); setLinkArquivo(''); setIsParcelado(false); setListaParcelas([]);
    setContaIdSelecionada(''); setFormaPagamento('');
    setIdEditando(null); setExibirForm(false);
  };

  const handleSalvarRegistro = async (e) => {
    e.preventDefault(); setSalvando(true);
    try {
      if (isParcelado && listaParcelas.length > 0) {
        for (let p of listaParcelas) {
          await addDoc(collection(db, 'financas'), { descricao: `${descricao} (${p.numero}/${listaParcelas.length})`, valor: parseFloat(p.valor), tipo, categoria, dataVencimento: p.dataVencimento, status, codigoBarras, multa: parseFloat(multa) || 0, juros: parseFloat(juros) || 0, linkArquivo, contaId: contaIdSelecionada || null, perfilId: perfilTransacaoId, formaPagamento, criadoEm: new Date().toISOString() });
        }
      } else {
        const payload = { descricao, valor: parseFloat(valor), tipo, categoria, dataVencimento, status, codigoBarras, multa: parseFloat(multa) || 0, juros: parseFloat(juros) || 0, linkArquivo, contaId: contaIdSelecionada || null, perfilId: perfilTransacaoId, formaPagamento };
        if (idEditando) await updateDoc(doc(db, 'financas', idEditando), { ...payload, atualizadoEm: new Date().toISOString() });
        else await addDoc(collection(db, 'financas'), { ...payload, criadoEm: new Date().toISOString() });
      }
      resetarFormulario(); recarregar();
    } catch { alert("Falha ao salvar."); } finally { setSalvando(false); }
  };

  const handleEditar = (item) => {
    setDescricao(item.descricao); setValor(item.valor); setTipo(item.tipo); setCategoria(item.categoria);
    setDataVencimento(item.dataVencimento); setStatus(item.status); setCodigoBarras(item.codigoBarras || '');
    setMulta(item.multa?.toString() || ''); setJuros(item.juros?.toString() || '');
    setContaIdSelecionada(item.contaId || ''); setPerfilTransacaoId(item.perfilId || ''); setLinkArquivo(item.linkArquivo || '');
    setFormaPagamento(item.formaPagamento || '');
    setIdEditando(item.id); setIsParcelado(false); setListaParcelas([]); setExibirForm(true); setAbaAtiva('lancamentos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Deseja excluir este registro?")) return;
    try { await deleteDoc(doc(db, 'financas', id)); recarregar(); } catch { alert("Erro ao deletar."); }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Linha 1: Título + Seletor Mês/Ano alinhados */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ color: cores?.texto, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Wallet size={28} color={cores?.dourado} /> BI & Fluxo de Caixa</h2>

        {abaAtiva !== 'relatorios' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: cores?.branco, padding: '6px 12px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <Calendar size={18} color={cores?.dourado} />
            <select value={anoFiltro} onChange={(e) => setAnoFiltro(parseInt(e.target.value))} style={{ border: 'none', outline: 'none', fontSize: '14px', fontWeight: 'bold', color: cores?.texto, backgroundColor: 'transparent', cursor: 'pointer' }}>
              {[anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={mesNumFiltro} onChange={(e) => setMesNumFiltro(parseInt(e.target.value))} style={{ border: 'none', outline: 'none', fontSize: '14px', fontWeight: 'bold', color: cores?.texto, backgroundColor: 'transparent', cursor: 'pointer' }}>
              <option value={1}>Janeiro</option><option value={2}>Fevereiro</option><option value={3}>Março</option>
              <option value={4}>Abril</option><option value={5}>Maio</option><option value={6}>Junho</option>
              <option value={7}>Julho</option><option value={8}>Agosto</option><option value={9}>Setembro</option>
              <option value={10}>Outubro</option><option value={11}>Novembro</option><option value={12}>Dezembro</option>
            </select>
          </div>
        )}
      </div>

      {/* Linha 2: Botões destacados + Alertas à direita */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button type="button" onClick={() => setAbaAtiva('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 22px', backgroundColor: abaAtiva === 'dashboard' ? cores?.dourado : cores?.branco, color: abaAtiva === 'dashboard' ? '#fff' : cores?.texto, border: `2px solid ${cores?.dourado}`, borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
            <Wallet size={20} /> Métricas
          </button>
          <button type="button" onClick={() => setAbaAtiva('lancamentos')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 22px', backgroundColor: abaAtiva === 'lancamentos' ? cores?.dourado : cores?.branco, color: abaAtiva === 'lancamentos' ? '#fff' : cores?.texto, border: `2px solid ${cores?.dourado}`, borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
            <FileText size={20} /> Lançamentos
          </button>
          <button type="button" onClick={() => setCalcAberto(true)} title="Calculadora" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 15px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
            <Calculator size={20} />
          </button>
        </div>
        <button type="button" onClick={handleDispararAlertas} disabled={executandoAlertas} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
          <Bell size={20} /> {executandoAlertas ? 'Enviando...' : 'Testar Alertas'}
        </button>
      </div>

      {/* Linha 3: Tabs secundárias */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: cores?.branco, padding: '5px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '25px', flexShrink: 0 }}>
        <button type="button" onClick={() => setAbaAtiva('contas')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'contas' ? cores?.dourado : 'transparent', color: abaAtiva === 'contas' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>Bancos</button>
        <button type="button" onClick={() => setAbaAtiva('carteira')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'carteira' ? cores?.dourado : 'transparent', color: abaAtiva === 'carteira' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}><Wallet size={14}/> Carteira</button>
        <button type="button" onClick={() => setAbaAtiva('cofre')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'cofre' ? cores?.dourado : 'transparent', color: abaAtiva === 'cofre' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}><Vault size={14}/> Cofre</button>
        <button type="button" onClick={() => setAbaAtiva('heranca')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'heranca' ? cores?.dourado : 'transparent', color: abaAtiva === 'heranca' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}><Gem size={14}/> Herança</button>
        <button type="button" onClick={() => setAbaAtiva('cartoes')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'cartoes' ? cores?.dourado : 'transparent', color: abaAtiva === 'cartoes' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}><CreditCard size={14}/> Cartões</button>
        <button type="button" onClick={() => setAbaAtiva('investimentos')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'investimentos' ? cores?.dourado : 'transparent', color: abaAtiva === 'investimentos' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingUp size={14}/> Investir</button>
        <button type="button" onClick={() => setAbaAtiva('emprestimos')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'emprestimos' ? cores?.dourado : 'transparent', color: abaAtiva === 'emprestimos' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingDown size={14}/> Empréstimos</button>
        <button type="button" onClick={() => setAbaAtiva('salarios')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'salarios' ? cores?.dourado : 'transparent', color: abaAtiva === 'salarios' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}><Wallet size={14}/> Salário</button>
        <button type="button" onClick={() => setAbaAtiva('relatorios')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'relatorios' ? cores?.primaria : 'transparent', color: abaAtiva === 'relatorios' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}><FileText size={16} style={{verticalAlign:'middle'}}/> Contábil</button>
      </div>

      {abaAtiva === 'dashboard' && (
        <DashboardFinanceiro
          cores={cores}
          formatarMoeda={formatarMoeda}
          saldoGlobalConsolidado={saldoGlobalConsolidado}
          saldoBancario={saldoBancario}
          saldoInvestimentos={saldoInvestimentos}
          saldoCofre={saldoCofre}
          debitoCartoes={debitoCartoes}
          totalReceitas={totalReceitas}
          totalDespesasPagas={totalDespesasPagas}
          totalDespesasPendentes={totalDespesasPendentes}
          mesFiltro={mesFiltro}
          despesasPorCategoria={despesasPorCategoria}
        />
      )}

      {abaAtiva === 'contas' && (
        <GerenciadorContas
          cores={cores}
          contasBancarias={contasBancarias}
          perfis={perfis}
          calcularSaldoConta={calcularSaldoConta}
          formatarMoeda={formatarMoeda}
          obterNomePerfil={obterNomePerfil}
          recarregarContas={recarregarContas}
          onRegistrarDeposito={recarregar}
          lancamentosGlobais={lancamentosGlobais}
          onEditarLancamento={handleEditar}
          onExcluirLancamento={handleExcluir}
        />
      )}

      {abaAtiva === 'lancamentos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}><button type="button" onClick={() => { if (exibirForm) resetarFormulario(); else { setExibirForm(true); if (perfis.length > 0 && !perfilTransacaoId) setPerfilTransacaoId(perfis[0].id); } }} style={{ padding: '10px 20px', backgroundColor: exibirForm ? '#6c757d' : cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{exibirForm ? 'Cancelar Edição' : '+ Nova Transação'}</button></div>
          {exibirForm && (
            <FormularioLancamento
              cores={cores}
              perfis={perfis}
              contasBancarias={contasBancarias}
              cartoes={cartoes}
              obterNomePerfil={obterNomePerfil}
              idEditando={idEditando}
              descricao={descricao} setDescricao={setDescricao}
              valor={valor} setValor={setValor}
              tipo={tipo} setTipo={setTipo}
              categoria={categoria} setCategoria={setCategoria}
              dataVencimento={dataVencimento} setDataVencimento={setDataVencimento}
              status={status} setStatus={setStatus}
              contaIdSelecionada={contaIdSelecionada} setContaIdSelecionada={setContaIdSelecionada}
              perfilTransacaoId={perfilTransacaoId} setPerfilTransacaoId={setPerfilTransacaoId}
              formaPagamento={formaPagamento} setFormaPagamento={setFormaPagamento}
              multa={multa} setMulta={setMulta}
              juros={juros} setJuros={setJuros}
              isParcelado={isParcelado} setIsParcelado={setIsParcelado}
              qtdParcelas={qtdParcelas} setQtdParcelas={setQtdParcelas}
              listaParcelas={listaParcelas} setListaParcelas={setListaParcelas}
              linkArquivo={linkArquivo}
              extraindoDados={extraindoDados}
              progressoUpload={progressoUpload}
              avisoUpload={avisoUpload}
              tipoAviso={tipoAviso}
              salvando={salvando}
              onSalvar={handleSalvarRegistro}
              onUploadDocumento={handleUploadDocumento}
              categoriesDespesa={categoriesDespesa}
              categoriasReceita={categoriasReceita}
              handleGerarCronogramaParcelas={handleGerarCronogramaParcelas}
              handleAtualizarParcela={handleAtualizarParcela}
            />
          )}
          <ConciliadorExtrato cores={cores} onBaixas={recarregar} dadosMesFiltro={dadosMesFiltroCompleto} contasBancarias={contasBancarias} />
          <TabelaLancamentos
            dadosMesFiltro={dadosMesFiltroCompleto}
            contasBancarias={contasBancarias}
            cartoes={cartoes}
            cores={cores}
            hoje={hoje}
            formatarMoeda={formatarMoeda}
            obterNomePerfil={obterNomePerfil}
            onEditar={handleEditar}
            onExcluir={handleExcluir}
            onRecarregar={recarregar}
          />
        </>
      )}

      {abaAtiva === 'relatorios' && (
        <RelatorioContabil
          cores={cores}
          formatarMoeda={formatarMoeda}
          perfis={perfis}
          anoContabil={anoContabil} setAnoContabil={setAnoContabil}
          mesContabil={mesContabil} setMesContabil={setMesContabil}
          perfilContabil={perfilContabil} setPerfilContabil={setPerfilContabil}
          recContabil={recContabil}
          despContabil={despContabil}
          resultadoExercicio={resultadoExercicio}
          saldoGlobalConsolidado={saldoGlobalConsolidado}
          saldoBancario={saldoBancario}
          saldoInvestimentos={saldoInvestimentos}
          debitoCartoes={debitoCartoes}
          valorBensDireitos={valorBensDireitos}
          saldoCofre={saldoCofre}
          totalEmprestimos={totalEmprestimos}
          totalAtivos={totalAtivos}
          totalPassivos={totalPassivos}
          patrimonioLiquido={patrimonioLiquido}
        />
      )}

      {abaAtiva === 'cartoes' && (
        <GerenciadorCartoes
          cores={cores}
          cartoes={cartoes}
          perfis={perfis}
          lancamentosGlobais={lancamentosGlobais}
          formatarMoeda={formatarMoeda}
          obterNomePerfil={obterNomePerfil}
          recarregarCartoes={recarregarCartoes}
        />
      )}

      {abaAtiva === 'investimentos' && (
        <GerenciadorInvestimentos
          cores={cores}
          investimentos={investimentos}
          formatarMoeda={formatarMoeda}
          recarregarInvestimentos={recarregarInvestimentos}
        />
      )}

      {abaAtiva === 'emprestimos' && (
        <GerenciadorEmprestimos
          cores={cores}
          formatarMoeda={formatarMoeda}
          obterNomePerfil={obterNomePerfil}
          perfis={perfis}
          contasBancarias={contasBancarias}
        />
      )}

      {abaAtiva === 'salarios' && (
        <GerenciadorSalarios
          cores={cores}
          formatarMoeda={formatarMoeda}
          perfis={perfis}
          obterNomePerfil={obterNomePerfil}
          contasBancarias={contasBancarias}
          onRegistrarRecebimento={recarregar}
          lancamentosGlobais={todosLancamentos}
          onExcluirLancamento={handleExcluir}
        />
      )}

      {abaAtiva === 'carteira' && (
        <GerenciadorCarteira
          cores={cores}
          formatarMoeda={formatarMoeda}
          contasBancarias={contasBancarias}
          cartoes={cartoes}
          investimentos={investimentos}
          cofre={cofre}
        />
      )}

      {abaAtiva === 'cofre' && (
        <GerenciadorCofre
          cores={cores}
          formatarMoeda={formatarMoeda}
          contasBancarias={contasBancarias}
          lancamentosGlobais={todosLancamentos}
          onEditarLancamento={handleEditar}
          onExcluirLancamento={handleExcluir}
        />
      )}

      {abaAtiva === 'heranca' && (
        <GerenciadorHeranca
          cores={cores}
          formatarMoeda={formatarMoeda}
          perfis={perfis}
          obterNomePerfil={obterNomePerfil}
          contasBancarias={contasBancarias}
          onRegistrarReceita={recarregar}
        />
      )}

      {/* Calculadora Popup */}
      {calcAberto && (
        <div style={{ position: 'fixed', top:0,left:0,right:0,bottom:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:3000 }} onClick={() => setCalcAberto(false)}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor:'#fff', padding:'20px', borderRadius:'16px', width:'280px', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
              <h3 style={{ margin:0, fontSize:'16px' }}>Calculadora</h3>
              <button onClick={() => setCalcAberto(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#999', fontSize:'18px' }}>✕</button>
            </div>
            <div style={{ backgroundColor:'#f8fafc', padding:'10px', borderRadius:'8px', marginBottom:'8px', minHeight:'24px' }}>
              <div style={{ fontSize:'12px', color:'#999', textAlign:'right', minHeight:'16px' }}>{calcExpressao || '\u00A0'}</div>
              <div style={{ fontSize:'26px', fontWeight:'bold', textAlign:'right', wordBreak:'break-all' }}>{calcVisor}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', marginBottom:'8px' }}>
              {[7,8,9,'÷',4,5,6,'×',1,2,3,'-',0,'.','=','+'].map(b => (
                <button key={b} onClick={() => { if (typeof b === 'number' || b === '.') calcDigito(b); else if (b === '=') calcResultado(); else calcOperacao(b); }} style={{ padding:'12px', borderRadius:'8px', border:'1px solid #ddd', background: b === '=' ? '#d97706' : typeof b === 'string' ? '#f5f5f5' : '#fff', color: b === '=' ? '#fff' : '#333', fontSize:'16px', fontWeight:'bold', cursor:'pointer' }}>{b}</button>
              ))}
            </div>
            <button onClick={calcLimpar} style={{ width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #ddd', background:'#fee2e2', color:'#dc2626', fontSize:'13px', fontWeight:'bold', cursor:'pointer', marginBottom:'8px' }}>C — Limpar</button>
            {calcHistorico.length > 0 && (
              <div style={{ borderTop:'1px solid #eee', paddingTop:'8px', maxHeight:'120px', overflowY:'auto' }}>
                <span style={{ fontSize:'10px', color:'#999', fontWeight:'bold' }}>Histórico:</span>
                {calcHistorico.map((h, i) => (
                  <div key={i} onClick={() => { setCalcVisor(String(h.split('= ')[1])); setCalcExpressao(''); setCalcMemoria(null); setCalcOp(null); }} style={{ fontSize:'11px', color:'#666', padding:'2px 0', cursor:'pointer', borderBottom:'1px solid #f5f5f5' }}>{h}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
