import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, CreditCard, Landmark, Vault, X } from 'lucide-react';

const coresGrafico = ['#C5A059', '#2c3e50', '#e74c3c', '#17a2b8', '#28a745', '#6f42c1', '#fd7e14', '#6c757d'];

export default function DashboardFinanceiro({ cores, formatarMoeda, saldoGlobalConsolidado, saldoBancario, saldoInvestimentos, saldoCofre, debitoCartoes, totalReceitas, totalDespesasPagas, totalDespesasPendentes, mesFiltro, despesasPorCategoria }) {
  const [exibirPopupSaldo, setExibirPopupSaldo] = useState(false);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div onClick={() => setExibirPopupSaldo(true)} style={{ backgroundColor: '#2c3e50', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', color: '#fff', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}><span style={{ fontSize: '14px', color: '#adb5bd', fontWeight: 'bold' }}>Saldo Global (Real)</span><h3 style={{ margin: '5px 0 0 0', fontSize: '22px' }}>{formatarMoeda(saldoGlobalConsolidado)}</h3></div>
        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderLeft: '4px solid #155724' }}><span style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'bold' }}>Receitas ({mesFiltro})</span><h3 style={{ margin: '5px 0 0 0', color: '#155724', fontSize: '20px' }}>{formatarMoeda(totalReceitas)}</h3></div>
        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderLeft: '4px solid #721c24' }}><span style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'bold' }}>Desp. Pagas ({mesFiltro})</span><h3 style={{ margin: '5px 0 0 0', color: '#721c24', fontSize: '20px' }}>{formatarMoeda(totalDespesasPagas)}</h3></div>
        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderLeft: '4px solid #dc3545' }}><span style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'bold' }}>A Pagar ({mesFiltro})</span><h3 style={{ margin: '5px 0 0 0', color: '#dc3545', fontSize: '20px' }}>{formatarMoeda(totalDespesasPendentes)}</h3></div>
      </div>

      {exibirPopupSaldo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }} onClick={() => setExibirPopupSaldo(false)}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#2c3e50' }}>Saldo Global</h3>
              <button type="button" onClick={() => setExibirPopupSaldo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Landmark size={18} color="#16a34a" /><span style={{ fontWeight: 'bold', color: '#333' }}>Caixa e Bancos</span></div>
                <strong style={{ color: '#16a34a', fontSize: '16px' }}>{formatarMoeda(saldoBancario || 0)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={18} color="#2563eb" /><span style={{ fontWeight: 'bold', color: '#333' }}>Investimentos</span></div>
                <strong style={{ color: '#2563eb', fontSize: '16px' }}>{formatarMoeda(saldoInvestimentos || 0)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Vault size={18} color="#d97706" /><span style={{ fontWeight: 'bold', color: '#333' }}>Cofre (Reserva)</span></div>
                <strong style={{ color: '#d97706', fontSize: '16px' }}>{formatarMoeda(saldoCofre || 0)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CreditCard size={18} color="#dc2626" /><span style={{ fontWeight: 'bold', color: '#333' }}>Cartões de Crédito</span></div>
                <strong style={{ color: '#dc2626', fontSize: '16px' }}>-{formatarMoeda(debitoCartoes || 0)}</strong>
              </div>

              <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#2c3e50' }}>Total</span>
                <strong style={{ fontSize: '22px', color: saldoGlobalConsolidado >= 0 ? '#16a34a' : '#dc2626' }}>{formatarMoeda(saldoGlobalConsolidado)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}><h3 style={{ marginTop: 0, marginBottom: '20px', color: cores?.texto, fontSize: '16px' }}>Movimentação no Mês</h3><ResponsiveContainer width="100%" height={250}><BarChart data={[{ name: 'Receitas', valor: totalReceitas, fill: '#155724' }, { name: 'Desp. Pagas', valor: totalDespesasPagas, fill: '#721c24' }, { name: 'A Pagar', valor: totalDespesasPendentes, fill: '#dc3545' }]}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /> <YAxis tickFormatter={(val) => `R$ ${val}`} /><Tooltip formatter={(value) => formatarMoeda(value)} cursor={{fill: 'transparent'}} /><Bar dataKey="valor" radius={[4, 4, 0, 0]} barSize={50} /></BarChart></ResponsiveContainer></div>
        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}><h3 style={{ marginTop: 0, marginBottom: '20px', color: cores?.texto, fontSize: '16px' }}>Despesas</h3>{despesasPorCategoria.length === 0 ? <p style={{ textAlign: 'center', color: '#999' }}>Sem dados.</p> : (<ResponsiveContainer width="100%" height={250}><PieChart><Pie data={despesasPorCategoria} cx="50%" cy="45%" innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="valor">{despesasPorCategoria.map((entry, index) => <Cell key={`cell-${index}`} fill={coresGrafico[index % coresGrafico.length]} />)}</Pie><Tooltip formatter={(value) => formatarMoeda(value)} /><Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} /></PieChart></ResponsiveContainer>)}</div>
      </div>
    </>
  );
}
