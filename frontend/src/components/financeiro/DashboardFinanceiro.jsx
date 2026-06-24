import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const coresGrafico = ['#C5A059', '#2c3e50', '#e74c3c', '#17a2b8', '#28a745', '#6f42c1', '#fd7e14', '#6c757d'];

export default function DashboardFinanceiro({ cores, formatarMoeda, saldoGlobalConsolidado, totalReceitas, totalDespesasPagas, totalDespesasPendentes, mesFiltro, despesasPorCategoria }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: '#2c3e50', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', color: '#fff' }}><span style={{ fontSize: '14px', color: '#adb5bd', fontWeight: 'bold' }}>Saldo Global (Real)</span><h3 style={{ margin: '5px 0 0 0', fontSize: '22px' }}>{formatarMoeda(saldoGlobalConsolidado)}</h3></div>
        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderLeft: '4px solid #155724' }}><span style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'bold' }}>Receitas ({mesFiltro})</span><h3 style={{ margin: '5px 0 0 0', color: '#155724', fontSize: '20px' }}>{formatarMoeda(totalReceitas)}</h3></div>
        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderLeft: '4px solid #721c24' }}><span style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'bold' }}>Desp. Pagas ({mesFiltro})</span><h3 style={{ margin: '5px 0 0 0', color: '#721c24', fontSize: '20px' }}>{formatarMoeda(totalDespesasPagas)}</h3></div>
        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderLeft: '4px solid #dc3545' }}><span style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'bold' }}>A Pagar ({mesFiltro})</span><h3 style={{ margin: '5px 0 0 0', color: '#dc3545', fontSize: '20px' }}>{formatarMoeda(totalDespesasPendentes)}</h3></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}><h3 style={{ marginTop: 0, marginBottom: '20px', color: cores?.texto, fontSize: '16px' }}>Movimentacao no Mes</h3><ResponsiveContainer width="100%" height={250}><BarChart data={[{ name: 'Receitas', valor: totalReceitas, fill: '#155724' }, { name: 'Desp. Pagas', valor: totalDespesasPagas, fill: '#721c24' }, { name: 'A Pagar', valor: totalDespesasPendentes, fill: '#dc3545' }]}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /> <YAxis tickFormatter={(val) => `R$ ${val}`} /><Tooltip formatter={(value) => formatarMoeda(value)} cursor={{fill: 'transparent'}} /><Bar dataKey="valor" radius={[4, 4, 0, 0]} barSize={50} /></BarChart></ResponsiveContainer></div>
        <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}><h3 style={{ marginTop: 0, marginBottom: '20px', color: cores?.texto, fontSize: '16px' }}>Despesas</h3>{despesasPorCategoria.length === 0 ? <p style={{ textAlign: 'center', color: '#999' }}>Sem dados.</p> : (<ResponsiveContainer width="100%" height={250}><PieChart><Pie data={despesasPorCategoria} cx="50%" cy="45%" innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="valor">{despesasPorCategoria.map((entry, index) => <Cell key={`cell-${index}`} fill={coresGrafico[index % coresGrafico.length]} />)}</Pie><Tooltip formatter={(value) => formatarMoeda(value)} /><Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} /></PieChart></ResponsiveContainer>)}</div>
      </div>
    </>
  );
}
