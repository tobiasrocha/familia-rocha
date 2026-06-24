import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { useFinancas } from '../../hooks/useFinancas';
import { useUploadOcr } from '../../hooks/useUploadOcr';
import { API_BASE } from '../../config';
import { Wallet, Calendar, FileText, Bell } from 'lucide-react';

import DashboardFinanceiro from './DashboardFinanceiro';
import GerenciadorContas from './GerenciadorContas';
import FormularioLancamento from './FormularioLancamento';
import TabelaLancamentos from './TabelaLancamentos';
import RelatorioContabil from './RelatorioContabil';
import ConciliadorExtrato from './ConciliadorExtrato';

export default function PainelFinanceiro({ cores }) {
  const { dados: lancamentosGlobais, recarregar } = useFirestore('financas');
  const { dados: contasBancarias, recarregar: recarregarContas } = useFirestore('contas_bancarias');
  const { dados: perfis } = useFirestore('perfis');
  const { dados: patrimonio } = useFirestore('patrimonio');

  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [exibirForm, setExibirForm] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [executandoAlertas, setExecutandoAlertas] = useState(false);

  const [idEditando, setIdEditando] = useState(null);
  const [descricao, setDescricao] = useState(''); const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState('Despesa'); const [categoria, setCategoria] = useState('Moradia');
  const [dataVencimento, setDataVencimento] = useState(''); const [status, setStatus] = useState('Pago');
  const [codigoBarras, setCodigoBarras] = useState(''); const [multaJuros, setMultaJuros] = useState('');
  const [linkArquivo, setLinkArquivo] = useState(''); const [contaIdSelecionada, setContaIdSelecionada] = useState('');
  const [perfilTransacaoId, setPerfilTransacaoId] = useState('');

  const [isParcelado, setIsParcelado] = useState(false); const [qtdParcelas, setQtdParcelas] = useState('2');
  const [listaParcelas, setListaParcelas] = useState([]);

  const mesAtual = new Date().toISOString().slice(0, 7);
  const anoAtual = new Date().getFullYear().toString();
  const [mesFiltro, setMesFiltro] = useState(mesAtual);

  const [anoContabil, setAnoContabil] = useState(anoAtual);
  const [mesContabil, setMesContabil] = useState('Todos');
  const [perfilContabil, setPerfilContabil] = useState('Todos');

  const hoje = new Date().toISOString().slice(0, 10);
  const categoriesDespesa = ['Alimentação', 'Moradia', 'Transporte', 'Educação', 'Saúde', 'Lazer', 'Igreja/Célula', 'Impostos', 'Outros'];
  const categoriasReceita = ['Salário', 'Serviços', 'Investimentos', 'Presente', 'Outros'];

  const { extraindo: extraindoDados, erro: erroOcr, dadosExtraidos, extrairDados } = useUploadOcr();

  const {
    calcularSaldoConta, saldoGlobalConsolidado, dadosMesFiltro,
    totalReceitas, totalDespesasPagas, totalDespesasPendentes,
    recContabil, despContabil, resultadoExercicio,
    valorBensDireitos, totalAtivos, totalPassivos, patrimonioLiquido,
  } = useFinancas({ lancamentosGlobais, contasBancarias, patrimonio, mesFiltro, anoContabil, mesContabil, perfilContabil });

  useEffect(() => {
    if (contasBancarias.length > 0 && !contaIdSelecionada && abaAtiva === 'lancamentos' && !idEditando) setContaIdSelecionada(contasBancarias[0].id);
    if (perfis.length > 0 && !perfilTransacaoId && !idEditando) setPerfilTransacaoId(perfis[0].id);
  }, [contasBancarias, perfis, abaAtiva, contaIdSelecionada, perfilTransacaoId, idEditando]);

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

  const tipoAviso = erroOcr ? 'erro' : (dadosExtraidos?.aviso && !dadosExtraidos?.linkArquivo ? 'alerta' : null);
  const avisoUpload = erroOcr || (!dadosExtraidos?.linkArquivo && dadosExtraidos?.aviso) || '';

  const handleDispararAlertas = async () => {
    setExecutandoAlertas(true);
    try {
      const res = await fetch(`${API_BASE}/disparar-alertas`, { method: 'POST' });
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
    } catch (e) { alert("Falha na execução. Verifique se o backend está rodando."); } finally { setExecutandoAlertas(false); }
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
    setCodigoBarras(''); setMultaJuros(''); setLinkArquivo(''); setIsParcelado(false); setListaParcelas([]);
    setIdEditando(null); setExibirForm(false);
  };

  const handleSalvarRegistro = async (e) => {
    e.preventDefault(); setSalvando(true);
    try {
      if (isParcelado && listaParcelas.length > 0) {
        for (let p of listaParcelas) {
          await addDoc(collection(db, 'financas'), { descricao: `${descricao} (${p.numero}/${listaParcelas.length})`, valor: parseFloat(p.valor), tipo, categoria, dataVencimento: p.dataVencimento, status, codigoBarras, multaJuros, linkArquivo, contaId: contaIdSelecionada, perfilId: perfilTransacaoId, criadoEm: new Date().toISOString() });
        }
      } else {
        const payload = { descricao, valor: parseFloat(valor), tipo, categoria, dataVencimento, status, codigoBarras, multaJuros, linkArquivo, contaId: contaIdSelecionada, perfilId: perfilTransacaoId };
        if (idEditando) await updateDoc(doc(db, 'financas', idEditando), { ...payload, atualizadoEm: new Date().toISOString() });
        else await addDoc(collection(db, 'financas'), { ...payload, criadoEm: new Date().toISOString() });
      }
      resetarFormulario(); recarregar();
    } catch (err) { alert("Falha ao salvar."); } finally { setSalvando(false); }
  };

  const handleEditar = (item) => {
    setDescricao(item.descricao); setValor(item.valor); setTipo(item.tipo); setCategoria(item.categoria);
    setDataVencimento(item.dataVencimento); setStatus(item.status); setCodigoBarras(item.codigoBarras || '');
    setContaIdSelecionada(item.contaId || ''); setPerfilTransacaoId(item.perfilId || ''); setLinkArquivo(item.linkArquivo || '');
    setIdEditando(item.id); setIsParcelado(false); setListaParcelas([]); setExibirForm(true); setAbaAtiva('lancamentos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Deseja excluir este registro?")) return;
    try { await deleteDoc(doc(db, 'financas', id)); recarregar(); } catch (e) { alert("Erro ao deletar."); }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: cores?.texto, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Wallet size={28} color={cores?.dourado} /> BI & Fluxo de Caixa</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={handleDispararAlertas} disabled={executandoAlertas} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            <Bell size={18} /> {executandoAlertas ? 'Enviando...' : 'Testar Alertas'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: cores?.branco, padding: '5px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <button type="button" onClick={() => setAbaAtiva('dashboard')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'dashboard' ? cores?.dourado : 'transparent', color: abaAtiva === 'dashboard' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Métricas</button>
            <button type="button" onClick={() => setAbaAtiva('contas')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'contas' ? cores?.dourado : 'transparent', color: abaAtiva === 'contas' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Bancos</button>
            <button type="button" onClick={() => setAbaAtiva('lancamentos')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'lancamentos' ? cores?.dourado : 'transparent', color: abaAtiva === 'lancamentos' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Lançamentos</button>
            <button type="button" onClick={() => setAbaAtiva('relatorios')} style={{ padding: '8px 15px', border: 'none', background: abaAtiva === 'relatorios' ? cores?.primaria : 'transparent', color: abaAtiva === 'relatorios' ? '#fff' : '#6c757d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}><FileText size={16} style={{verticalAlign:'middle'}}/> Contábil</button>
          </div>

          {abaAtiva !== 'relatorios' && (
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: cores?.branco, padding: '8px 15px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
              <Calendar size={20} color={cores?.dourado} style={{ marginRight: '10px' }} />
              <input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '16px', color: cores?.texto, fontWeight: 'bold', backgroundColor: 'transparent' }} />
            </div>
          )}
        </div>
      </div>

      {abaAtiva === 'dashboard' && (
        <DashboardFinanceiro
          cores={cores}
          formatarMoeda={formatarMoeda}
          saldoGlobalConsolidado={saldoGlobalConsolidado}
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}><button type="button" onClick={() => { if (exibirForm) resetarFormulario(); else setExibirForm(true); }} style={{ padding: '10px 20px', backgroundColor: exibirForm ? '#6c757d' : cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{exibirForm ? 'Cancelar Edição' : '+ Nova Transação'}</button></div>
          {exibirForm && (
            <FormularioLancamento
              cores={cores}
              perfis={perfis}
              contasBancarias={contasBancarias}
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
            dadosMesFiltro={dadosMesFiltro}
            contasBancarias={contasBancarias}
            cores={cores}
            hoje={hoje}
            formatarMoeda={formatarMoeda}
            obterNomePerfil={obterNomePerfil}
            onEditar={handleEditar}
            onExcluir={handleExcluir}
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
          valorBensDireitos={valorBensDireitos}
          totalAtivos={totalAtivos}
          totalPassivos={totalPassivos}
          patrimonioLiquido={patrimonioLiquido}
        />
      )}
    </div>
  );
}
