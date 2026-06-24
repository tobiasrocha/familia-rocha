import { useState } from 'react';
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Plus, CreditCard, User, Trash2, AlertCircle } from 'lucide-react';

export default function GerenciadorCartoes({ cores, cartoes, perfis, lancamentosGlobais, formatarMoeda, obterNomePerfil, recarregarCartoes }) {
  const [exibirForm, setExibirForm] = useState(false);
  const [nome, setNome] = useState('');
  const [limite, setLimite] = useState('');
  const [fechamento, setFechamento] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [perfilId, setPerfilId] = useState('');

  const handleSalvar = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'cartoes'), {
      nome,
      limite: parseFloat(limite) || 0,
      fechamento: parseInt(fechamento) || 1,
      vencimento: parseInt(vencimento) || 10,
      perfilId: perfilId || null,
      criadoEm: new Date().toISOString()
    });
    setNome(''); setLimite(''); setFechamento(''); setVencimento(''); setPerfilId(''); setExibirForm(false);
    recarregarCartoes();
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir este cartão?")) return;
    try { await deleteDoc(doc(db, 'cartoes', id)); recarregarCartoes(); } catch { alert("Erro ao excluir."); }
  };

  const gastosCartao = (cartaoId) => {
    return lancamentosGlobais.filter(i => i.tipo === 'Despesa' && i.formaPagamento === 'Crédito' && i.contaId === cartaoId && i.status === 'Pendente')
      .reduce((a, b) => a + Number(b.valor), 0);
  };

  const gastosPagosCartao = (cartaoId) => {
    return lancamentosGlobais.filter(i => i.tipo === 'Despesa' && i.formaPagamento === 'Crédito' && i.contaId === cartaoId && i.status === 'Pago')
      .reduce((a, b) => a + Number(b.valor), 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => setExibirForm(!exibirForm)} style={{ padding: '10px 20px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18}/> Novo Cartão
        </button>
      </div>

      {exibirForm && (
        <form onSubmit={handleSalvar} style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Nome / Bandeira</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Nubank, Itaú Visa" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 130px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Limite (R$)</label>
            <input type="number" step="0.01" value={limite} onChange={e => setLimite(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Dia Fechamento</label>
            <input type="number" min="1" max="31" value={fechamento} onChange={e => setFechamento(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Dia Vencimento</label>
            <input type="number" min="1" max="31" value={vencimento} onChange={e => setVencimento(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}><User size={14} style={{verticalAlign: 'middle'}}/> Titular</label>
            <select value={perfilId} onChange={e => setPerfilId(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
              <option value="">Todos</option>
              {perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <button type="submit" style={{ padding: '10px 20px', height: '40px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Salvar Cartão</button>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {(cartoes || []).map(cartao => {
          const pendentes = gastosCartao(cartao.id);
          const pagos = gastosPagosCartao(cartao.id);
          const disponivel = (cartao.limite || 0) - pendentes - pagos;
          const pctUso = (cartao.limite || 0) > 0 ? ((pendentes + pagos) / cartao.limite) * 100 : 0;

          return (
            <div key={cartao.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eee', borderTop: `4px solid ${pctUso > 80 ? '#dc3545' : '#17a2b8'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative' }}>
              <button type="button" onClick={() => handleExcluir(cartao.id)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}><Trash2 size={16}/></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '50%' }}><CreditCard size={24} color="#17a2b8" /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>{cartao.nome}</h3>
                  {cartao.perfilId && <span style={{ fontSize: '11px', color: '#888' }}><User size={10}/> {obterNomePerfil(cartao.perfilId)}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>Limite</span>
                  <strong style={{ fontSize: '18px', color: '#333' }}>{formatarMoeda(cartao.limite || 0)}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>Disponível</span>
                  <strong style={{ fontSize: '18px', color: disponivel >= 0 ? '#155724' : '#dc3545' }}>{formatarMoeda(disponivel)}</strong>
                </div>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                  <span>Utilizado: {formatarMoeda(pendentes + pagos)}</span>
                  <span>{pctUso.toFixed(0)}%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: '#e9ecef', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(pctUso, 100)}%`, backgroundColor: pctUso > 80 ? '#dc3545' : '#28a745', borderRadius: '3px', transition: 'width 0.3s' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#888' }}>
                <span>Fecha dia <strong style={{color:'#333'}}>{cartao.fechamento}</strong></span>
                <span>Vence dia <strong style={{color:'#333'}}>{cartao.vencimento}</strong></span>
              </div>

              <div style={{ borderTop: '1px solid #eee', marginTop: '8px', paddingTop: '8px', display: 'flex', gap: '15px', fontSize: '11px', color: '#999' }}>
                <span>Pendente: <strong style={{color:'#dc3545'}}>{formatarMoeda(pendentes)}</strong></span>
                <span>Pago: <strong style={{color:'#28a745'}}>{formatarMoeda(pagos)}</strong></span>
              </div>

              {pctUso > 80 && (
                <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: '#fff3cd', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#856404' }}>
                  <AlertCircle size={14}/> Limite quase atingido
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(cartoes || []).length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <CreditCard size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
          <p>Nenhum cartão cadastrado. Adicione cartões para acompanhar limites e gastos.</p>
        </div>
      )}
    </div>
  );
}
