import { useMemo } from 'react';

export function useFinancas({ lancamentosGlobais, contasBancarias, patrimonio, cartoes, investimentos, cofre, mesFiltro, anoContabil, mesContabil, perfilContabil }) {

  const calcularSaldoConta = (contaId, saldoIni) => {
    const historico = lancamentosGlobais.filter(i => i.contaId === contaId && i.status === 'Pago');
    const ent = historico.filter(i => i.tipo === 'Receita').reduce((a, b) => a + Number(b.valor), 0);
    const sai = historico.filter(i => i.tipo === 'Despesa').reduce((a, b) => a + Number(b.valor), 0);
    return Number(saldoIni) + ent - sai;
  };

  const saldoBancario = contasBancarias.reduce((acc, c) => acc + calcularSaldoConta(c.id, c.saldoInicial), 0);

  const saldoInvestimentos = useMemo(() =>
    (investimentos || []).reduce((acc, i) => acc + Number(i.valor || 0), 0),
    [investimentos]
  );

  const debitoCartoes = useMemo(() =>
    (cartoes || []).reduce((acc, c) => {
      const pendentes = lancamentosGlobais
        .filter(i => i.tipo === 'Despesa' && i.formaPagamento === 'Crédito' && i.status === 'Pendente' && i.contaId === c.id)
        .reduce((a, b) => a + Number(b.valor), 0);
      return acc + pendentes;
    }, 0),
    [cartoes, lancamentosGlobais]
  );

  const saldoCofre = useMemo(() =>
    (cofre || []).reduce((acc, c) => acc + Number(c.saldo || 0), 0),
    [cofre]
  );

  const saldoGlobalConsolidado = saldoBancario + saldoInvestimentos + saldoCofre - debitoCartoes;

  const dadosMesFiltro = useMemo(() =>
    lancamentosGlobais.filter(i => i.dataVencimento && i.dataVencimento.startsWith(mesFiltro)),
    [lancamentosGlobais, mesFiltro]
  );

  const totalReceitas = useMemo(() =>
    dadosMesFiltro.filter(i => i.tipo === 'Receita' && i.status === 'Pago').reduce((a, b) => a + Number(b.valor), 0),
    [dadosMesFiltro]
  );

  const totalDespesasPagas = useMemo(() =>
    dadosMesFiltro.filter(i => i.tipo === 'Despesa' && i.status === 'Pago').reduce((a, b) => a + Number(b.valor), 0),
    [dadosMesFiltro]
  );

  const totalDespesasPendentes = useMemo(() =>
    dadosMesFiltro.filter(i => i.tipo === 'Despesa' && i.status === 'Pendente').reduce((a, b) => a + Number(b.valor), 0),
    [dadosMesFiltro]
  );

  let dadosContabeis = lancamentosGlobais;
  if (anoContabil !== 'Todos') dadosContabeis = dadosContabeis.filter(i => i.dataVencimento && i.dataVencimento.startsWith(anoContabil));
  if (mesContabil !== 'Todos') dadosContabeis = dadosContabeis.filter(i => i.dataVencimento && i.dataVencimento.startsWith(mesContabil));
  if (perfilContabil !== 'Todos') dadosContabeis = dadosContabeis.filter(i => i.perfilId === perfilContabil);

  const recContabil = useMemo(() =>
    dadosContabeis.filter(i => i.tipo === 'Receita' && i.status === 'Pago').reduce((a, b) => a + Number(b.valor), 0),
    [dadosContabeis]
  );

  const despContabil = useMemo(() =>
    dadosContabeis.filter(i => i.tipo === 'Despesa' && i.status === 'Pago').reduce((a, b) => a + Number(b.valor), 0),
    [dadosContabeis]
  );

  const resultadoExercicio = recContabil - despContabil;

  const valorBensDireitos = useMemo(() =>
    (patrimonio || []).reduce((a, b) => a + Number(b.valor || 0), 0),
    [patrimonio]
  );

  const totalAtivos = saldoGlobalConsolidado + valorBensDireitos;

  const totalPassivos = useMemo(() =>
    lancamentosGlobais.filter(i => i.tipo === 'Despesa' && i.status === 'Pendente').reduce((a, b) => a + Number(b.valor), 0),
    [lancamentosGlobais]
  );

  const patrimonioLiquido = totalAtivos - totalPassivos;

  return {
    calcularSaldoConta,
    saldoBancario,
    saldoInvestimentos,
    saldoCofre,
    debitoCartoes,
    saldoGlobalConsolidado,
    dadosMesFiltro,
    totalReceitas,
    totalDespesasPagas,
    totalDespesasPendentes,
    dadosContabeis,
    recContabil,
    despContabil,
    resultadoExercicio,
    valorBensDireitos,
    totalAtivos,
    totalPassivos,
    patrimonioLiquido,
  };
}
