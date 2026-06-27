import { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { Plus, Trash2, Pencil, Vault, Check, X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export default function GerenciadorCofre({ cores, formatarMoeda, contasBancarias, lancamentosGlobais, onEditarLancamento, onExcluirLancamento }) {
  const { dados: cofres, recarregar } = useFirestore('cofre');
  const [exibirForm, setExibirForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [meta, setMeta] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Movimentação (depósito/retirada)
  const [movId, setMovId] = useState(null);
  const [movValor, setMovValor] = useState('');
  const [movTipo, setMovTipo] = useState('deposito');
  const [movData, setMovData] = useState(new Date().toISOString().slice(0, 10));
  const [movContaId, setMovContaId] = useState('');
  const [movDestino, setMovDestino] = useState('banco');

  // Editar saldo inline
  const [editandoSaldoId, setEditandoSaldoId] = useState(null);
  const [novoSaldo, setNovoSaldo] = useState('');

  const resetForm = () => {
    setNome(''); setMeta(''); setObservacoes('');
    setEditandoId(null); setExibirForm(false);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    const payload = { nome, meta: parseFloat(meta) || 0, observacoes, saldo: 0 };
    if (editandoId) {
      await updateDoc(doc(db, 'cofre', editandoId), { ...payload, atualizadoEm: new Date().toISOString() });
    } else {
      await addDoc(collection(db, 'cofre'), { ...payload, criadoEm: new Date().toISOString() });
    }
    resetForm(); recarregar();
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir esta reserva?")) return;
    try { await deleteDoc(doc(db, 'cofre', id)); recarregar(); } catch { /* erro */ }
  };

  const handleEditar = (c) => {
    setNome(c.nome); setMeta(c.meta?.toString() || ''); setObservacoes(c.observacoes || '');
    setEditandoId(c.id); setExibirForm(true);
  };

  const handleSalvarSaldo = async (cofre) => {
    if (!novoSaldo || isNaN(parseFloat(novoSaldo))) return;
    try {
      await updateDoc(doc(db, 'cofre', cofre.id), { saldo: parseFloat(novoSaldo), atualizadoEm: new Date().toISOString() });
      setEditandoSaldoId(null); setNovoSaldo('');
      recarregar();
    } catch { alert("Erro ao atualizar saldo."); }
  };

  const handleMovimentar = async (cofre) => {
    const valorNum = parseFloat(movValor) || 0;
    if (!valorNum || valorNum <= 0) return alert('Valor inválido.');
    const novoSaldo = movTipo === 'deposito'
      ? (cofre.saldo || 0) + valorNum
      : Math.max(0, (cofre.saldo || 0) - valorNum);

    try {
      // Atualiza saldo do cofre
      await updateDoc(doc(db, 'cofre', cofre.id), { saldo: novoSaldo, atualizadoEm: new Date().toISOString() });

      // Lança no financeiro para impacto contábil (depósito = sai do banco, retirada = volta ao banco)
      const desc = movTipo === 'deposito' ? `Depósito Cofre: ${cofre.nome}` : `Retirada Cofre: ${cofre.nome}`;
      await addDoc(collection(db, 'financas'), {
        descricao: desc,
        valor: valorNum,
        tipo: movTipo === 'deposito' ? 'Despesa' : 'Receita',
        categoria: 'Reserva Familiar',
        dataVencimento: movData,
        status: 'Pago',
        contaId: movContaId || null,
        formaPagamento: 'Débito',
        isTransferenciaCofre: true,
        criadoEm: new Date().toISOString(),
      });

      // Se retirada para carteira, cria entrada lá também
      if (movTipo === 'retirada' && movDestino === 'carteira') {
        await addDoc(collection(db, 'carteira'), {
          descricao: `Retirada Cofre: ${cofre.nome}`,
          valor: valorNum,
          categoria: 'Reserva Familiar',
          forma: 'Cofre',
          data: movData,
          vinculoId: cofre.id,
          criadoEm: new Date().toISOString(),
        });
      }

      setMovId(null); setMovValor(''); setMovData(new Date().toISOString().slice(0,10)); setMovContaId(''); setMovDestino('banco');
      recarregar();
    } catch { alert("Erro ao movimentar."); }
  };

  const totalReservado = (cofres || []).reduce((acc, c) => acc + (c.saldo || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ backgroundColor: '#fef3c7', padding: '12px 20px', borderRadius: '8px', border: '1px solid #fcd34d' }}>
          <span style={{ fontSize: '13px', color: '#92400e' }}>Total Reservado </span>
          <strong style={{ fontSize: '20px', color: '#d97706', marginLeft: '8px' }}>{formatarMoeda(totalReservado)}</strong>
        </div>
        <button type="button" onClick={() => { resetForm(); setExibirForm(!exibirForm); }} style={{ padding: '10px 20px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18}/> Nova Reserva
        </button>
      </div>

      {exibirForm && (
        <form onSubmit={handleSalvar} style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 250px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Nome da Reserva</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Fundo Emergência, Viagem Férias" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Meta (R$)</label>
            <input type="number" step="0.01" value={meta} onChange={e => setMeta(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Observações</label>
            <input type="text" value={observacoes} onChange={e => setObservacoes(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <button type="button" onClick={resetForm} style={{ padding: '10px 20px', height: '40px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '10px 20px', height: '40px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{editandoId ? 'Atualizar' : 'Salvar'}</button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {(cofres || []).map(c => {
          const pct = c.meta > 0 ? Math.min(100, ((c.saldo || 0) / c.meta) * 100) : 0;
          return (
            <div key={c.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eee', borderTop: '4px solid #d97706', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative' }}>
              <div style={{ display: 'flex', gap: '4px', position: 'absolute', top: '15px', right: '15px' }}>
                <button type="button" onClick={() => handleEditar(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3', padding: '2px' }}><Pencil size={14} /></button>
                <button type="button" onClick={() => handleExcluir(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '2px' }}><Trash2 size={14} /></button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '10px', backgroundColor: '#fef3c7', borderRadius: '50%' }}><Vault size={24} color="#d97706" /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>{c.nome}</h3>
                  {c.meta > 0 && <span style={{ fontSize: '11px', color: '#888' }}>Meta: {formatarMoeda(c.meta)}</span>}
                </div>
              </div>

              {/* Saldo editável */}
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>Saldo Atual</span>
                {editandoSaldoId === c.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#d97706' }}>R$</span>
                    <input type="number" step="0.01" value={novoSaldo} onChange={e => setNovoSaldo(e.target.value)} autoFocus style={{ width: '140px', padding: '6px 10px', fontSize: '18px', fontWeight: 'bold', borderRadius: '6px', border: '2px solid #d97706' }} />
                    <button type="button" onClick={() => handleSalvarSaldo(c)} style={{ background: '#28a745', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer' }}><Check size={16} color="#fff" /></button>
                    <button type="button" onClick={() => setEditandoSaldoId(null)} style={{ background: '#dc3545', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer' }}><X size={16} color="#fff" /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '22px', color: '#d97706', cursor: 'pointer' }} onClick={() => { setEditandoSaldoId(c.id); setNovoSaldo(c.saldo?.toString() || '0'); }} title="Clique para editar saldo">{formatarMoeda(c.saldo || 0)}</strong>
                    <span style={{ fontSize: '10px', color: '#888' }}>(clique para editar)</span>
                  </div>
                )}
              </div>

              {/* Barra de progresso da meta */}
              {c.meta > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                    <span>{pct.toFixed(0)}% da meta</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct >= 100 ? '#16a34a' : '#d97706', borderRadius: '4px', transition: 'width .3s' }} />
                  </div>
                </div>
              )}

              {/* Movimentação */}
              <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
                {movId === c.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" onClick={() => setMovTipo('deposito')} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: movTipo === 'deposito' ? '2px solid #16a34a' : '1px solid #ddd', backgroundColor: movTipo === 'deposito' ? '#dcfce7' : '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>
                        <ArrowUpCircle size={14} style={{ verticalAlign: 'middle' }} /> Depósito
                      </button>
                      <button type="button" onClick={() => setMovTipo('retirada')} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: movTipo === 'retirada' ? '2px solid #dc2626' : '1px solid #ddd', backgroundColor: movTipo === 'retirada' ? '#fef2f2' : '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#dc2626' }}>
                        <ArrowDownCircle size={14} style={{ verticalAlign: 'middle' }} /> Retirada
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="number" step="0.01" value={movValor} onChange={e => setMovValor(e.target.value)} placeholder="R$" style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }} />
                      <input type="date" value={movData} onChange={e => setMovData(e.target.value)} style={{ width: '130px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px' }} />
                    </div>
                    <select value={movContaId} onChange={e => setMovContaId(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px' }}>
                      <option value="">Conta (opcional)</option>
                      {(contasBancarias || []).map(ct => <option key={ct.id} value={ct.id}>{ct.nome}</option>)}
                    </select>
                    {movTipo === 'retirada' && (
                      <select value={movDestino} onChange={e => setMovDestino(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px' }}>
                        <option value="banco">Destino: Banco</option>
                        <option value="carteira">Destino: Carteira</option>
                      </select>
                    )}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" onClick={() => handleMovimentar(c)} style={{ flex: 1, padding: '8px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Confirmar</button>
                      <button type="button" onClick={() => setMovId(null)} style={{ padding: '8px 15px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setMovId(c.id); setMovValor(''); setMovTipo('deposito'); setMovData(new Date().toISOString().slice(0,10)); setMovContaId(''); setMovDestino('banco'); }} style={{ width: '100%', padding: '8px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                    + Depósito / Retirada
                  </button>
                )}
              </div>

              {/* Histórico de movimentações */}
              {(() => {
                const movs = (lancamentosGlobais || []).filter(l => l.categoria === 'Reserva Familiar' && ((l.descricao?.includes(c.nome)) || (l.descricao?.includes('Cofre')))).sort((a,b) => new Date(b.dataVencimento) - new Date(a.dataVencimento)).slice(0, 8);
                if (movs.length === 0) return null;
                return (
                  <div style={{ borderTop: '1px solid #eee', marginTop: '8px', paddingTop: '8px', maxHeight: '130px', overflowY: 'auto' }}>
                    <span style={{ fontSize: '10px', color: '#999', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Movimentações ({movs.length}):</span>
                    {movs.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#666', padding: '1px 0', borderBottom: '1px solid #f5f5f5' }}>
                        <span style={{ flex: 1, fontWeight: 'bold' }}>{m.descricao}</span>
                        <span style={{ fontWeight: 'bold', color: m.tipo === 'Receita' ? '#16a34a' : '#dc2626', minWidth: '50px', textAlign: 'right' }}>{m.tipo === 'Receita' ? '+' : '-'}{formatarMoeda(m.valor)}</span>
                        <span style={{ fontSize: '9px', color: '#999' }}>{m.dataVencimento?.split('-').reverse().join('/')}</span>
                        <button type="button" onClick={() => onEditarLancamento && onEditarLancamento(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3' }}><Pencil size={11}/></button>
                        <button type="button" onClick={() => onExcluirLancamento && onExcluirLancamento(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}><Trash2 size={11}/></button>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {c.observacoes && (
                <div style={{ borderTop: '1px solid #eee', marginTop: '10px', paddingTop: '8px', fontSize: '12px', color: '#999' }}>{c.observacoes}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
