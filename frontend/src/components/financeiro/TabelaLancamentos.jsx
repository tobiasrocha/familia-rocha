import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Pencil, Trash2, User, Landmark, Link, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TabelaLancamentos({ dadosMesFiltro, contasBancarias, cartoes, cores, hoje, formatarMoeda, obterNomePerfil, onEditar, onExcluir }) {
  const [vinculandoId, setVinculandoId] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 10;

  const handleVincularBanco = async (itemId, contaId) => {
    if (!contaId) return;
    try {
      await updateDoc(doc(db, 'financas', itemId), { contaId, atualizadoEm: new Date().toISOString() });
      setVinculandoId(null);
    } catch { /* vinculação falhou */ }
  };

  const rotuloFormaPagamento = (fp) => {
    const mapa = { 'PIX': 'PIX', 'Débito': 'Débito', 'Crédito': 'Crédito', 'Dinheiro': 'Dinheiro' };
    return mapa[fp] || '';
  };

  const corFormaPagamento = (fp) => {
    const mapa = { 'PIX': '#17a2b8', 'Débito': '#28a745', 'Crédito': '#e74c3c', 'Dinheiro': '#6c757d' };
    return mapa[fp] || '#999';
  };

  const ordenados = [...dadosMesFiltro].sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento));

  const filtrados = ordenados.filter(item => {
    if (busca && !item.descricao?.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroTipo !== 'Todos' && item.tipo !== filtroTipo) return false;
    if (filtroStatus !== 'Todos' && item.status !== filtroStatus) return false;
    return true;
  });

  const totalPaginas = Math.ceil(filtrados.length / ITENS_POR_PAGINA) || 1;
  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  const paginados = filtrados.slice(inicio, inicio + ITENS_POR_PAGINA);

  const contasAPagar = ordenados.filter(i => i.tipo === 'Despesa' && i.status === 'Pendente').sort((a,b) => new Date(a.dataVencimento) - new Date(b.dataVencimento));

  return (
    <div>
      {/* Contas a Pagar em destaque */}
      {contasAPagar.length > 0 && (
        <div style={{ backgroundColor: '#fef2f2', padding: '12px 16px', borderRadius: '10px', border: '1px solid #fecaca', marginBottom: '15px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#991b1b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⚠️ Contas a Pagar ({contasAPagar.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {contasAPagar.slice(0, 8).map(c => {
              const vencido = c.dataVencimento < hoje;
              return (
                <div key={c.id} style={{ padding: '6px 10px', backgroundColor: vencido ? '#fee2e2' : '#fff', borderRadius: '6px', border: `1px solid ${vencido ? '#fca5a5' : '#e5e7eb'}`, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 'bold', color: vencido ? '#dc2626' : '#333' }}>{c.descricao}</span>
                  <span style={{ color: vencido ? '#dc2626' : '#d97706', fontWeight: 'bold' }}>{formatarMoeda(c.valor)}</span>
                  <span style={{ fontSize: '10px', color: '#888' }}>{c.dataVencimento?.split('-').reverse().join('/')}</span>
                  {vencido && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', backgroundColor: '#dc2626', color: '#fff' }}>VENCIDO</span>}
                </div>
              );
            })}
            {contasAPagar.length > 8 && <span style={{ fontSize: '11px', color: '#888' }}>+{contasAPagar.length - 8} mais</span>}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#999' }} />
          <input type="text" value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} placeholder="Buscar por descrição..." style={{ padding: '8px 8px 8px 32px', borderRadius: '8px', border: '1px solid #ddd', width: '100%' }} />
          {busca && <button onClick={() => setBusca('')} style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={14} /></button>}
        </div>
        <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>
          <option value="Todos">Tipo: Todos</option><option value="Despesa">Despesa</option><option value="Receita">Receita</option>
        </select>
        <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(1); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>
          <option value="Todos">Status: Todos</option><option value="Pendente">Pendente</option><option value="Pago">Pago</option>
        </select>
        <span style={{ fontSize: '12px', color: '#999', marginLeft: 'auto' }}>{filtrados.length} registro(s)</span>
      </div>

      <div style={{ backgroundColor: cores?.branco, borderRadius: '12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
            <tr>
              <th style={{ padding: '15px' }}>Data</th>
              <th style={{ padding: '15px' }}>Descrição</th>
              <th style={{ padding: '15px' }}>Responsável/Banco</th>
              <th style={{ padding: '15px' }}>Valor</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Pagamento</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginados.map(item => {
              const nomeBanco = contasBancarias.find(c => c.id === item.contaId)?.nome || (cartoes || []).find(c => c.id === item.contaId)?.nome || 'Sem Banco';
              const isVencido = item.tipo === 'Despesa' && item.status === 'Pendente' && item.dataVencimento < hoje;
              const fp = rotuloFormaPagamento(item.formaPagamento);
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #e9ecef', backgroundColor: isVencido ? '#ffebee' : 'transparent' }}>
                  <td style={{ padding: '15px' }}>{item.dataVencimento?.split('-').reverse().join('/')}</td>
                  <td style={{ padding: '15px', fontWeight: 'bold' }}>
                    {item.descricao} <br /><span style={{ fontSize: '11px', color: '#888' }}>{item.categoria}</span>
                    {item.linkArquivo && <a href={item.linkArquivo} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '11px', color: '#0056b3', marginTop: '4px' }}>📄 Anexo Drive</a>}
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2c3e50' }}><User size={12} /> {obterNomePerfil(item.perfilId)}</div>
                    <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Landmark size={12} />
                      {vinculandoId === item.id ? (
                        <select defaultValue={item.contaId || ''} onChange={e => handleVincularBanco(item.id, e.target.value)} onBlur={() => setVinculandoId(null)} autoFocus style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #C5A059' }}>
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
                  <td style={{ padding: '15px', fontWeight: 'bold', color: item.tipo === 'Receita' ? '#155724' : '#495057' }}>
                    {formatarMoeda(item.valor)}
                    {(item.multa > 0 || item.juros > 0) && (
                      <div style={{ fontSize: '10px', color: '#dc3545', marginTop: '2px' }}>
                        {item.multa > 0 && <>Multa: {formatarMoeda(item.multa)}</>}
                        {item.multa > 0 && item.juros > 0 && ' | '}
                        {item.juros > 0 && <>Juros: {formatarMoeda(item.juros)}</>}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {fp && <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: `${corFormaPagamento(item.formaPagamento)}20`, color: corFormaPagamento(item.formaPagamento) }}>{fp}</span>}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <span style={{ padding: '6px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: item.status === 'Pago' ? '#d4edda' : (isVencido ? '#f8d7da' : '#fff3cd'), color: item.status === 'Pago' ? '#155724' : (isVencido ? '#721c24' : '#856404') }}>{isVencido ? 'ATRASADA' : item.status}</span>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {item._carteira ? (
                      <span style={{ fontSize: '10px', color: '#7c3aed', backgroundColor: '#ede9fe', padding: '2px 6px', borderRadius: '8px' }}>CARTEIRA</span>
                    ) : (
                      <>
                        <button type="button" onClick={() => onEditar(item)} style={{ background: 'none', border: 'none', color: '#0056b3', cursor: 'pointer', padding: '5px' }}><Pencil size={18} /></button>
                        <button type="button" onClick={() => onExcluir(item.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '5px' }}><Trash2 size={18} /></button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {paginados.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>Nenhum lançamento encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
          <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', cursor: pagina === 1 ? 'not-allowed' : 'pointer', opacity: pagina === 1 ? 0.5 : 1 }}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#555' }}>{pagina} / {totalPaginas}</span>
          <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer', opacity: pagina === totalPaginas ? 0.5 : 1 }}><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
