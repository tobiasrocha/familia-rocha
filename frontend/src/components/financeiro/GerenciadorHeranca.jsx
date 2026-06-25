import { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { Plus, Trash2, Pencil, Gem, Calendar, ArrowUpCircle } from 'lucide-react';

export default function GerenciadorHeranca({ cores, formatarMoeda, perfis, obterNomePerfil, contasBancarias, onRegistrarReceita }) {
  const { dados: herancas, recarregar } = useFirestore('heranca');
  const [exibirForm, setExibirForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataRecebimento, setDataRecebimento] = useState('');
  const [perfilId, setPerfilId] = useState('');
  const [origem, setOrigem] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Registrar entrada
  const [regId, setRegId] = useState(null);
  const [regContaId, setRegContaId] = useState('');
  const [regData, setRegData] = useState(new Date().toISOString().slice(0,10));

  const resetForm = () => { setDescricao(''); setValor(''); setDataRecebimento(''); setPerfilId(''); setOrigem(''); setObservacoes(''); setEditandoId(null); setExibirForm(false); };

  const handleSalvar = async (e) => {
    e.preventDefault();
    const payload = { descricao, valor: parseFloat(valor) || 0, dataRecebimento, perfilId: perfilId || null, origem, observacoes };
    if (editandoId) await updateDoc(doc(db, 'heranca', editandoId), { ...payload, atualizadoEm: new Date().toISOString() });
    else await addDoc(collection(db, 'heranca'), { ...payload, criadoEm: new Date().toISOString() });
    resetForm(); recarregar();
  };

  const handleExcluir = async (id) => { if (!window.confirm("Excluir?")) return; try { await deleteDoc(doc(db, 'heranca', id)); recarregar(); } catch { /* erro */ } };
  const handleEditar = (h) => { setDescricao(h.descricao); setValor(h.valor?.toString()||''); setDataRecebimento(h.dataRecebimento||''); setPerfilId(h.perfilId||''); setOrigem(h.origem||''); setObservacoes(h.observacoes||''); setEditandoId(h.id); setExibirForm(true); };

  const handleRegistrarEntrada = async (h) => {
    if (!h.valor || h.valor <= 0) return;
    try {
      await addDoc(collection(db, 'financas'), {
        descricao: `Herança: ${h.descricao}`,
        valor: h.valor,
        tipo: 'Receita',
        categoria: 'Herança',
        dataVencimento: regData,
        status: 'Pago',
        contaId: regContaId || null,
        perfilId: h.perfilId || null,
        formaPagamento: regContaId ? 'PIX' : 'Dinheiro',
        criadoEm: new Date().toISOString(),
      });
      setRegId(null); setRegContaId('');
      if (onRegistrarReceita) onRegistrarReceita();
    } catch { alert('Erro ao registrar.'); }
  };

  const totalHeranca = (herancas || []).reduce((a, h) => a + (h.valor || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ backgroundColor: '#ede9fe', padding: '12px 20px', borderRadius: '8px', border: '1px solid #c4b5fd' }}>
          <span style={{ fontSize: '13px', color: '#5b21b6' }}>Total Herança</span>
          <strong style={{ fontSize: '20px', color: '#7c3aed', marginLeft: '8px' }}>{formatarMoeda(totalHeranca)}</strong>
        </div>
        <button type="button" onClick={() => { resetForm(); setExibirForm(!exibirForm); }} style={{ padding: '10px 20px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18}/> Nova Herança
        </button>
      </div>

      {exibirForm && (
        <form onSubmit={handleSalvar} style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize:'14px', fontWeight:'bold' }}>Descrição</label><input type="text" value={descricao} onChange={e=>setDescricao(e.target.value)} required style={{ padding:'10px', borderRadius:'6px', border:'1px solid #ccc' }} /></div>
          <div style={{ flex: '0 0 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize:'14px', fontWeight:'bold' }}>Valor (R$)</label><input type="number" step="0.01" value={valor} onChange={e=>setValor(e.target.value)} required style={{ padding:'10px', borderRadius:'6px', border:'1px solid #ccc' }} /></div>
          <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize:'14px', fontWeight:'bold' }}>Data</label><input type="date" value={dataRecebimento} onChange={e=>setDataRecebimento(e.target.value)} style={{ padding:'10px', borderRadius:'6px', border:'1px solid #ccc' }} /></div>
          <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize:'14px', fontWeight:'bold' }}>Origem</label><input type="text" value={origem} onChange={e=>setOrigem(e.target.value)} placeholder="Ex: Espólio, Doação" style={{ padding:'10px', borderRadius:'6px', border:'1px solid #ccc' }} /></div>
          <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize:'14px', fontWeight:'bold' }}>Beneficiário</label><select value={perfilId} onChange={e=>setPerfilId(e.target.value)} style={{ padding:'10px', borderRadius:'6px', border:'1px solid #ccc' }}><option value="">Selecione...</option>{perfis.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
          <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize:'14px', fontWeight:'bold' }}>Observações</label><input type="text" value={observacoes} onChange={e=>setObservacoes(e.target.value)} style={{ padding:'10px', borderRadius:'6px', border:'1px solid #ccc' }} /></div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}><button type="button" onClick={resetForm} style={{ padding:'10px 20px', height:'40px', border:'1px solid #ccc', borderRadius:'6px', background:'#fff', cursor:'pointer' }}>Cancelar</button><button type="submit" style={{ padding:'10px 20px', height:'40px', backgroundColor:'#28a745', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer' }}>{editandoId ? 'Atualizar' : 'Salvar'}</button></div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {(herancas || []).map(h => (
          <div key={h.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eee', borderTop: '4px solid #7c3aed', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative' }}>
            <div style={{ display: 'flex', gap: '4px', position: 'absolute', top: '15px', right: '15px' }}><button type="button" onClick={() => handleEditar(h)} style={{ background:'none', border:'none', cursor:'pointer', color:'#0056b3', padding:'2px' }}><Pencil size={14} /></button><button type="button" onClick={() => handleExcluir(h.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#dc3545', padding:'2px' }}><Trash2 size={14} /></button></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}><div style={{ padding: '10px', backgroundColor: '#ede9fe', borderRadius: '50%' }}><Gem size={24} color="#7c3aed" /></div><div><h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>{h.descricao}</h3></div></div>
            <div style={{ marginBottom: '8px' }}><span style={{ fontSize: '11px', color: '#888', display: 'block' }}>Valor</span><strong style={{ fontSize: '22px', color: '#7c3aed' }}>{formatarMoeda(h.valor || 0)}</strong></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: '#666', marginBottom: '8px' }}>{h.perfilId && <span>{obterNomePerfil(h.perfilId)}</span>}{h.origem && <span>| {h.origem}</span>}{h.dataRecebimento && <span>| <Calendar size={12} /> {h.dataRecebimento.split('-').reverse().join('/')}</span>}</div>
            {regId === h.id ? (
              <div style={{ padding: '8px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <select value={regContaId} onChange={e => setRegContaId(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px', flex: 1 }}><option value="">Dinheiro (avulso)</option>{(contasBancarias||[]).map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                  <input type="date" value={regData} onChange={e=>setRegData(e.target.value)} style={{ padding:'6px', borderRadius:'4px', border:'1px solid #ddd', fontSize:'12px' }} />
                  <button type="button" onClick={()=>handleRegistrarEntrada(h)} style={{ padding:'6px 10px', backgroundColor:'#16a34a', color:'#fff', border:'none', borderRadius:'4px', fontWeight:'bold', cursor:'pointer', fontSize:'12px' }}>Confirmar</button>
                  <button type="button" onClick={()=>setRegId(null)} style={{ padding:'6px 8px', border:'1px solid #ccc', borderRadius:'4px', background:'#fff', cursor:'pointer', fontSize:'12px' }}>✕</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={()=>{setRegId(h.id); setRegContaId(''); setRegData(new Date().toISOString().slice(0,10));}} style={{ width:'100%', padding:'7px', backgroundColor:'#dcfce7', color:'#166534', border:'1px solid #bbf7d0', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'bold' }}><ArrowUpCircle size={14} style={{verticalAlign:'middle',marginRight:4}}/> Registrar Entrada</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
