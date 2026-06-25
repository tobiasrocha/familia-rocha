import { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { useFinancas } from '../../hooks/useFinancas';
import { useUploadOcr } from '../../hooks/useUploadOcr';
import { apiFetch } from '../../config';
import { Wallet, Calendar, FileText, Bell, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';

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

export default function PainelFinanceiro({ cores }) {
  const { dados: lancamentosGlobais, recarregar } = useFirestore('financas');
  const { dados: contasBancarias, recarregar: recarregarContas } = useFirestore('contas_bancarias');
  const { dados: perfis } = useFirestore('perfis');
  const { dados: patrimonio } = useFirestore('patrimonio');
  const { dados: cartoes, recarregar: recarregarCartoes } = useFirestore('cartoes');
  const { dados: investimentos, recarregar: recarregarInvestimentos } = useFirestore('investimentos');
  const { dados: carteira } = useFirestore('carteira');

  const [abaAtiva, setAbaAtiva] = useState('dashboard');
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

  const { extraindo: extraindoDados, erro: erroOcr, dadosExtraidos, extrairDados } = useUploadOcr();

  const {
    calcularSaldoConta, saldoGlobalConsolidado, saldoBancario, saldoInvestimentos, debitoCartoes, dadosMesFiltro,
    totalReceitas, totalDespesasPagas, totalDespesasPendentes,
    recContabil, despContabil, resultadoExercicio,
    valorBensDireitos, totalAtivos, totalPassivos, patrimonioLiquido,
  } = useFinancas({ lancamentosGlobais, contasBancarias, patrimonio, cartoes, investimentos, mesFiltro, anoContabil, mesContabil, perfilContabil });

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

      {/* Linha 2: Tabs + Botão Alertas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={handleDispararAlertas} disabled={executandoAlertas} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            <Bell size={18} /> {executandoAlertas ? 'Enviando...' : 'Testar Alertas'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: cores?.branco, padding: '5px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflowX: 'auto', maxWidth: '100%', flexShrink: 1 }}>
            <button type="button" onClick={() => setAbaAtiva('dashboard')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'dashboard' ? cores?.dourado : 'transparent', color: abaAtiva === 'dashboard' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Métricas</button>
            <button type="button" onClick={() => setAbaAtiva('contas')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'contas' ? cores?.dourado : 'transparent', color: abaAtiva === 'contas' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Bancos</button>
            <button type="button" onClick={() => setAbaAtiva('carteira')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'carteira' ? cores?.dourado : 'transparent', color: abaAtiva === 'carteira' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}><Wallet size={14}/> Carteira</button>
            <button type="button" onClick={() => setAbaAtiva('lancamentos')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'lancamentos' ? cores?.dourado : 'transparent', color: abaAtiva === 'lancamentos' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Lançamentos</button>
            <button type="button" onClick={() => setAbaAtiva('cartoes')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'cartoes' ? cores?.dourado : 'transparent', color: abaAtiva === 'cartoes' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><CreditCard size={14}/> Cartões</button>
            <button type="button" onClick={() => setAbaAtiva('investimentos')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'investimentos' ? cores?.dourado : 'transparent', color: abaAtiva === 'investimentos' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingUp size={14}/> Investir</button>
            <button type="button" onClick={() => setAbaAtiva('emprestimos')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'emprestimos' ? cores?.dourado : 'transparent', color: abaAtiva === 'emprestimos' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}><TrendingDown size={14}/> Empréstimos</button>
            <button type="button" onClick={() => setAbaAtiva('salarios')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'salarios' ? cores?.dourado : 'transparent', color: abaAtiva === 'salarios' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}><Wallet size={14}/> Salário</button>
            <button type="button" onClick={() => setAbaAtiva('relatorios')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'relatorios' ? cores?.primaria : 'transparent', color: abaAtiva === 'relatorios' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}><FileText size={16} style={{verticalAlign:'middle'}}/> Contábil</button>
          </div>
        </div>
      </div>

      {abaAtiva === 'dashboard' && (
        <DashboardFinanceiro
          cores={cores}
          formatarMoeda={formatarMoeda}
          saldoGlobalConsolidado={saldoGlobalConsolidado}
          saldoBancario={saldoBancario}
          saldoInvestimentos={saldoInvestimentos}
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
          <ConciliadorExtrato cores={cores} onBaixas={recarregar} />
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
        />
      )}

      {abaAtiva === 'carteira' && (
        <GerenciadorCarteira
          cores={cores}
          formatarMoeda={formatarMoeda}
          contasBancarias={contasBancarias}
          cartoes={cartoes}
          investimentos={investimentos}
        />
      )}
    </div>
  );
}
