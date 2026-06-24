// frontend/src/components/Dashboard.jsx
import React from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { 
  LayoutDashboard, Wallet, ClipboardList, HeartPulse, 
  AlertTriangle, CheckCircle, Clock, Calendar, ArrowRight, Package
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard({ cores }) {
  // Sincronização em tempo real com todos os módulos do ERP
  const { dados: financas, carregando: carregandoFin } = useFirestore('financas');
  const { dados: tarefas, carregando: carregandoTar } = useFirestore('tarefas');
  const { dados: saude, carregando: carregandoSau } = useFirestore('saude');
  const { dados: patrimonio, carregando: carregandoPat } = useFirestore('patrimonio');
  const { dados: estudos, carregando: carregandoEst } = useFirestore('estudos');

  if (carregandoFin || carregandoTar || carregandoSau || carregandoPat || carregandoEst) {
    return <div style={{ padding: '40px', textAlign: 'center', color: cores?.dourado, fontWeight: 'bold' }}>A calibrar a Torre de Controle...</div>;
  }

  const hojeStr = new Date().toISOString().slice(0, 10);
  const mesAtual = hojeStr.slice(0, 7);

  // --- PROCESSAMENTO: FINANCEIRO ---
  const finMes = financas.filter(f => f.dataVencimento && f.dataVencimento.startsWith(mesAtual));
  const receitasMes = finMes.filter(f => f.tipo === 'Receita' && f.status === 'Pago').reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  const despesasPagas = finMes.filter(f => f.tipo === 'Despesa' && f.status === 'Pago').reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  const despesasPendentes = finMes.filter(f => f.tipo === 'Despesa' && f.status === 'Pendente').reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
  const saldoPrevisto = receitasMes - (despesasPagas + despesasPendentes);
  
  const contasAtrasadas = financas.filter(f => f.tipo === 'Despesa' && f.status === 'Pendente' && f.dataVencimento < hojeStr);
  const contasProximas = financas.filter(f => f.tipo === 'Despesa' && f.status === 'Pendente' && f.dataVencimento >= hojeStr).sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento)).slice(0, 3);

  // --- PROCESSAMENTO: TAREFAS ---
  const tarefasAbertas = tarefas.filter(t => t.status !== 'Concluído');
  const tarefasAtrasadas = tarefasAbertas.filter(t => t.dataLimite && t.dataLimite < hojeStr);

  // --- PROCESSAMENTO: SAÚDE ---
  const agendamentosSaude = saude.filter(s => s.dataEvento >= hojeStr).sort((a, b) => new Date(a.dataEvento) - new Date(b.dataEvento)).slice(0, 3);

  // --- PROCESSAMENTO: PATRIMÓNIO (MANUTENÇÃO) ---
  const manutencoesPendentes = patrimonio.filter(p => 
    p.estadoConservacao === 'Requer Manutenção' || p.estadoConservacao === 'Avariado' || (p.dataProximaManutencao && p.dataProximaManutencao < hojeStr)
  );

  // --- PROCESSAMENTO: ESTUDOS ---
  const horasTotaisEstudadas = (estudos.reduce((acc, curr) => acc + Number(curr.tempoMinutos || 0), 0) / 60).toFixed(1);

  // Utilitários Visuais
  const formatarMoeda = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarData = (dataBase) => dataBase ? dataBase.split('-').reverse().join('/') : '';

  const dadosGraficoFluxo = [
    { name: 'Receitas', valor: receitasMes, cor: '#28a745' },
    { name: 'Despesas', valor: despesasPagas + despesasPendentes, cor: '#dc3545' },
    { name: 'Saldo Previsto', valor: saldoPrevisto, cor: saldoPrevisto >= 0 ? cores?.dourado : '#ffc107' }
  ];

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* BOAS VINDAS E RESUMO RÁPIDO */}
      <div style={{ marginBottom: '30px', borderBottom: `2px solid ${cores?.dourado}`, paddingBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ color: cores?.texto, margin: '0 0 5px 0', fontSize: '26px' }}>Visão Geral do Ecossistema</h2>
          <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Aqui está o panorama atual da Família Rocha para {mesAtual.split('-').reverse().join('/')}.</p>
        </div>
        {contasAtrasadas.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8d7da', color: '#721c24', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px' }}>
            <AlertTriangle size={16} /> Você possui {contasAtrasadas.length} contas em atraso!
          </div>
        )}
      </div>

      {/* LINHA 1: KPIs GLOBAIS (CARDS SUPERIORES) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', borderLeft: `4px solid ${cores?.dourado}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Saldo do Mês</span>
            <Wallet size={20} color={cores?.dourado} />
          </div>
          <h3 style={{ margin: 0, color: cores?.texto, fontSize: '22px' }}>{formatarMoeda(saldoPrevisto)}</h3>
        </div>

        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', borderLeft: '4px solid #17a2b8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Tarefas em Andamento</span>
            <ClipboardList size={20} color="#17a2b8" />
          </div>
          <h3 style={{ margin: 0, color: cores?.texto, fontSize: '22px' }}>{tarefasAbertas.length} pendentes</h3>
          {tarefasAtrasadas.length > 0 && <span style={{ fontSize: '11px', color: '#dc3545', fontWeight: 'bold' }}>{tarefasAtrasadas.length} atrasadas</span>}
        </div>

        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', borderLeft: '4px solid #dc3545' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Manutenções de Ativos</span>
            <Package size={20} color="#dc3545" />
          </div>
          <h3 style={{ margin: 0, color: cores?.texto, fontSize: '22px' }}>{manutencoesPendentes.length} alertas</h3>
        </div>

        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', borderLeft: '4px solid #6f42c1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Horas de Estudo (Total)</span>
            <Clock size={20} color="#6f42c1" />
          </div>
          <h3 style={{ margin: 0, color: cores?.texto, fontSize: '22px' }}>{horasTotaisEstudadas}h</h3>
        </div>

      </div>

      {/* LINHA 2: COLUNAS DE DETALHAMENTO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px', alignItems: 'start' }}>
        
        {/* COLUNA ESQUERDA: GRÁFICO E SAÚDE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* Gráfico Financeiro */}
          <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: cores?.texto }}>Fluxo Previsto (Mês)</h3>
              <Link to="/financeiro" style={{ fontSize: '12px', color: cores?.dourado, textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>Ver Finanças <ArrowRight size={14}/></Link>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dadosGraficoFluxo}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis hide />
                <Tooltip formatter={(value) => formatarMoeda(value)} cursor={{fill: '#f8f9fa'}} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]} barSize={40}>
                  {dadosGraficoFluxo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Widget de Saúde */}
          <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: cores?.texto, display: 'flex', alignItems: 'center', gap: '8px' }}><HeartPulse size={18} color="#28a745" /> Agenda de Saúde</h3>
              <Link to="/saude" style={{ fontSize: '12px', color: '#888', textDecoration: 'none' }}>Ver tudo</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {agendamentosSaude.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>Nenhum compromisso médico próximo.</p>
              ) : (
                agendamentosSaude.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: '3px solid #28a745' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: cores?.texto, display: 'block' }}>{item.titulo}</strong>
                      <span style={{ fontSize: '11px', color: '#666' }}>{item.tipo}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#495057' }}>{formatarData(item.dataEvento)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA: ALERTAS FINANCEIROS E TAREFAS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* Widget de Contas a Pagar */}
          <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: cores?.texto, display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={18} color="#dc3545" /> Próximos Vencimentos</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {contasProximas.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#999', margin: 0 }}><CheckCircle size={14} color="#28a745" style={{verticalAlign: 'middle'}}/> Tudo em dia.</p>
              ) : (
                contasProximas.map(conta => {
                  const hoje = new Date(hojeStr);
                  const venc = new Date(conta.dataVencimento);
                  const diffDias = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
                  let corAlerta = diffDias <= 1 ? '#dc3545' : (diffDias <= 5 ? '#ffc107' : '#17a2b8');

                  return (
                    <div key={conta.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#fcfbfe', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                      <div>
                        <strong style={{ fontSize: '13px', color: cores?.texto, display: 'block' }}>{conta.descricao}</strong>
                        <span style={{ fontSize: '11px', color: '#888' }}>Vence em: {formatarData(conta.dataVencimento)}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '14px', color: '#333', display: 'block' }}>{formatarMoeda(conta.valor)}</strong>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: corAlerta, backgroundColor: `${corAlerta}20`, padding: '2px 6px', borderRadius: '8px' }}>
                          {diffDias === 0 ? 'Vence HOJE' : `Em ${diffDias} dias`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Widget de Manutenções Patrimoniais */}
          {manutencoesPendentes.length > 0 && (
            <div style={{ backgroundColor: '#fff3cd', padding: '20px', borderRadius: '12px', border: '1px solid #ffeeba' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#856404', display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={18} /> Manutenção Exigida</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {manutencoesPendentes.map(item => (
                  <div key={item.id} style={{ fontSize: '13px', color: '#666', borderBottom: '1px solid #ffeeba', paddingBottom: '6px' }}>
                    <strong style={{color: '#856404'}}>{item.nome}</strong>: {item.estadoConservacao}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}