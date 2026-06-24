import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Pencil, Trash2, User, Landmark, Link } from 'lucide-react';

export default function TabelaLancamentos({ dadosMesFiltro, contasBancarias, cartoes, cores, hoje, formatarMoeda, obterNomePerfil, onEditar, onExcluir, onRecarregar }) {
  const [vinculandoId, setVinculandoId] = useState(null);

  const handleVincularBanco = async (itemId, contaId) => {
    if (!contaId) return;
    try {
      await updateDoc(doc(db, 'financas', itemId), { contaId, atualizadoEm: new Date().toISOString() });
      setVinculandoId(null);
      if (onRecarregar) onRecarregar();
    } catch { alert('Falha ao vincular banco.'); }
  };

  const rotuloFormaPagamento = (fp) => {
    const mapa = { 'PIX': 'PIX', 'Débito': 'Débito', 'Crédito': 'Crédito', 'Dinheiro': 'Dinheiro' };
    return mapa[fp] || '';
  };

  const corFormaPagamento = (fp) => {
    const mapa = { 'PIX': '#17a2b8', 'Débito': '#28a745', 'Crédito': '#e74c3c', 'Dinheiro': '#6c757d' };
    return mapa[fp] || '#999';
  };

  return (
    <div style={{ backgroundColor: cores?.branco, borderRadius: '12px', overflowX: 'auto' }}>
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '900px' }}>
        <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}><tr><th style={{padding:'15px'}}>Data</th><th style={{padding:'15px'}}>Descrição</th><th style={{padding:'15px'}}>Responsável/Banco</th><th style={{padding:'15px'}}>Valor</th><th style={{padding:'15px', textAlign:'center'}}>Pagamento</th><th style={{padding:'15px', textAlign:'center'}}>Status</th><th style={{padding:'15px', textAlign:'center'}}>Ações</th></tr></thead>
        <tbody>
          {dadosMesFiltro.sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento)).map(item => {
            const nomeBanco = contasBancarias.find(c => c.id === item.contaId)?.nome || (cartoes || []).find(c => c.id === item.contaId)?.nome || 'Sem Banco';
            const isVencido = item.tipo === 'Despesa' && item.status === 'Pendente' && item.dataVencimento < hoje;
            const fp = rotuloFormaPagamento(item.formaPagamento);
            return (
              <tr key={item.id} style={{ borderBottom: '1px solid #e9ecef', backgroundColor: isVencido ? '#ffebee' : 'transparent' }}>
                <td style={{ padding: '15px' }}>{item.dataVencimento?.split('-').reverse().join('/')}</td>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>
                  {item.descricao} <br/><span style={{fontSize: '11px', color: '#888'}}>{item.categoria}</span>
                  {item.linkArquivo && <a href={item.linkArquivo} target="_blank" rel="noopener noreferrer" style={{display:'block', fontSize:'11px', color:'#0056b3', marginTop:'4px'}}>📄 Anexo Drive</a>}
                </td>
                <td style={{ padding: '15px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2c3e50' }}><User size={12}/> {obterNomePerfil(item.perfilId)}</div>
                  <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Landmark size={12}/> 
                    {vinculandoId === item.id ? (
                      <select
                        defaultValue={item.contaId || ''}
                        onChange={e => handleVincularBanco(item.id, e.target.value)}
                        onBlur={() => setVinculandoId(null)}
                        autoFocus
                        style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #C5A059' }}
                      >
                        <option value="">Sem Banco</option>
                        <optgroup label="Bancos">{(contasBancarias || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</optgroup>
                        <optgroup label="Cartões">{(cartoes || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</optgroup>
                      </select>
                    ) : (
                      <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }} onClick={() => setVinculandoId(item.id)} title="Clique para vincular banco">
                        {nomeBanco}
                        {!item.contaId && <Link size={10} color="#C5A059" />}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '15px', fontWeight: 'bold', color: item.tipo === 'Receita' ? '#155724' : '#495057' }}>{formatarMoeda(item.valor)}</td>
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  {fp && <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: `${corFormaPagamento(item.formaPagamento)}20`, color: corFormaPagamento(item.formaPagamento) }}>{fp}</span>}
                </td>
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
