import { TrendingUp, Scale } from 'lucide-react';

export default function RelatorioContabil({
  cores, formatarMoeda, perfis,
  anoContabil, setAnoContabil,
  mesContabil, setMesContabil,
  perfilContabil, setPerfilContabil,
  recContabil, despContabil, resultadoExercicio,
  saldoBancario, saldoInvestimentos, debitoCartoes, valorBensDireitos, totalAtivos, totalPassivos, patrimonioLiquido
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', display: 'flex', gap: '20px', flexWrap: 'wrap', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderLeft: `4px solid ${cores?.primaria}` }}>
        <div style={{ flex: '1 1 150px' }}><label style={{fontSize:'12px', fontWeight:'bold', color:'#666'}}>Ano de Referência</label><br/><select value={anoContabil} onChange={e=>setAnoContabil(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}><option value="Todos">Histórico Completo</option><option value="2027">2027</option><option value="2026">2026</option><option value="2025">2025</option></select></div>
        <div style={{ flex: '1 1 150px' }}><label style={{fontSize:'12px', fontWeight:'bold', color:'#666'}}>Mês Referência</label><br/><select value={mesContabil} onChange={e=>setMesContabil(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}><option value="Todos">Anual Completo</option><option value="2026-06">Junho/26</option><option value="2026-07">Julho/26</option><option value="2026-08">Agosto/26</option></select></div>
        <div style={{ flex: '1 1 150px' }}><label style={{fontSize:'12px', fontWeight:'bold', color:'#666'}}>Responsável</label><br/><select value={perfilContabil} onChange={e=>setPerfilContabil(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}><option value="Todos">Família (Consolidado)</option>{perfis.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px' }}>
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', borderTop: '4px solid #17a2b8', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '8px', color:'#17a2b8' }}><TrendingUp size={24}/> DRE Familiar (Resultado)</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}><span style={{fontSize:'15px'}}>(+) Receitas Operacionais</span><strong style={{color:'#155724', fontSize:'16px'}}>{formatarMoeda(recContabil)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}><span style={{fontSize:'15px'}}>(-) Despesas e Custos Pagos</span><strong style={{color:'#721c24', fontSize:'16px'}}>{formatarMoeda(despContabil)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', marginTop: '15px', backgroundColor: resultadoExercicio >= 0 ? '#d4edda' : '#f8d7da', borderRadius: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize:'16px' }}>Resultado do Exercício</span>
            <strong style={{ fontSize: '20px', color: resultadoExercicio >= 0 ? '#155724' : '#721c24' }}>{formatarMoeda(resultadoExercicio)}</strong>
          </div>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', borderTop: '4px solid #6f42c1', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '8px', color:'#6f42c1' }}><Scale size={24}/> Balanço Patrimonial (Global)</h3>
          <h4 style={{ margin: '10px 0 10px 0', color: '#6f42c1', fontSize: '14px' }}>ATIVOS (Bens e Dinheiro)</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span style={{fontSize:'14px'}}>Caixa e Bancos</span><strong>{formatarMoeda(saldoBancario || 0)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span style={{fontSize:'14px'}}>Investimentos</span><strong>{formatarMoeda(saldoInvestimentos || 0)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span style={{fontSize:'14px'}}>Imobilizado (Imóveis, Veículos)</span><strong>{formatarMoeda(valorBensDireitos)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: '#dc3545' }}><span style={{fontSize:'14px'}}>(-) Cartões de Crédito (Pendentes)</span><strong>-{formatarMoeda(debitoCartoes || 0)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid #eee', fontWeight: 'bold' }}><span style={{fontSize:'14px'}}>Total de Ativos</span><strong style={{color:'#155724'}}>{formatarMoeda(totalAtivos)}</strong></div>
          <h4 style={{ margin: '20px 0 10px 0', color: '#dc3545', fontSize: '14px' }}>PASSIVOS (Obrigações Futuras)</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span style={{fontSize:'14px'}}>Contas Pendentes (Lançadas)</span><strong>{formatarMoeda(totalPassivos)}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', marginTop: '20px', backgroundColor: '#e2d9f3', borderRadius: '8px', fontWeight: 'bold' }}>
            <span>PATRIMÔNIO LÍQUIDO</span>
            <strong style={{ fontSize: '22px', color: '#5b2d86' }}>{formatarMoeda(patrimonioLiquido)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
