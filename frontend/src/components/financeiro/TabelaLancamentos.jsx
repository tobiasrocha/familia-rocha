import React from 'react';
import { Pencil, Trash2, User, Landmark } from 'lucide-react';

export default function TabelaLancamentos({ dadosMesFiltro, contasBancarias, cores, hoje, formatarMoeda, obterNomePerfil, onEditar, onExcluir }) {
  return (
    <div style={{ backgroundColor: cores?.branco, borderRadius: '12px', overflowX: 'auto' }}>
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '800px' }}>
        <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}><tr><th style={{padding:'15px'}}>Data</th><th style={{padding:'15px'}}>Descricao</th><th style={{padding:'15px'}}>Responsavel/Banco</th><th style={{padding:'15px'}}>Valor</th><th style={{padding:'15px', textAlign:'center'}}>Status</th><th style={{padding:'15px', textAlign:'center'}}>Acoes</th></tr></thead>
        <tbody>
          {dadosMesFiltro.sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento)).map(item => {
            const nomeBanco = contasBancarias.find(c => c.id === item.contaId)?.nome || 'Sem Banco';
            const isVencido = item.tipo === 'Despesa' && item.status === 'Pendente' && item.dataVencimento < hoje;
            return (
              <tr key={item.id} style={{ borderBottom: '1px solid #e9ecef', backgroundColor: isVencido ? '#ffebee' : 'transparent' }}>
                <td style={{ padding: '15px' }}>{item.dataVencimento?.split('-').reverse().join('/')}</td>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>
                  {item.descricao} <br/><span style={{fontSize: '11px', color: '#888'}}>{item.categoria}</span>
                  {item.linkArquivo && <a href={item.linkArquivo} target="_blank" rel="noopener noreferrer" style={{display:'block', fontSize:'11px', color:'#0056b3', marginTop:'4px'}}>📄 Anexo Drive</a>}
                </td>
                <td style={{ padding: '15px' }}><div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2c3e50' }}><User size={12}/> {obterNomePerfil(item.perfilId)}</div><div style={{ fontSize: '12px', color: '#666' }}><Landmark size={12}/> {nomeBanco}</div></td>
                <td style={{ padding: '15px', fontWeight: 'bold', color: item.tipo === 'Receita' ? '#155724' : '#495057' }}>{formatarMoeda(item.valor)}</td>
                <td style={{ padding: '15px', textAlign: 'center' }}><span style={{ padding: '6px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: item.status === 'Pago' ? '#d4edda' : (isVencido ? '#f8d7da' : '#fff3cd'), color: item.status === 'Pago' ? '#155724' : (isVencido ? '#721c24' : '#856404') }}>{isVencido ? 'ATRASADA' : item.status}</span></td>
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  <button type="button" onClick={() => onEditar(item)} style={{ background: 'none', border: 'none', color: '#0056b3', cursor: 'pointer', padding: '5px' }}><Pencil size={18} /></button>
                  <button type="button" onClick={() => onExcluir(item.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '5px' }}><Trash2 size={18} /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
