import { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { Plus, Landmark, User, Calendar, Trash2, TrendingDown, Pencil } from 'lucide-react';

export default function GerenciadorContas({ cores, contasBancarias, perfis, calcularSaldoConta, formatarMoeda, obterNomePerfil, recarregarContas }) {
  const [exibirFormConta, setExibirFormConta] = useState(false);
  const [nomeConta, setNomeConta] = useState('');
  const [saldoInicialConta, setSaldoInicialConta] = useState('');
  const [perfilContaId, setPerfilContaId] = useState('');
  const [dataSaldoConta, setDataSaldoConta] = useState(new Date().toISOString().slice(0, 10));

  const [contaSaldoId, setContaSaldoId] = useState(null);
  const [exibirFormSaldo, setExibirFormSaldo] = useState(false);
  const [valorSaldoManual, setValorSaldoManual] = useState('');
  const [dataSaldoManual, setDataSaldoManual] = useState(new Date().toISOString().slice(0, 10));
  const [editandoSaldoId, setEditandoSaldoId] = useState(null);

  const { dados: saldosBancarios, recarregar: recarregarSaldos } = useFirestore('saldos_bancarios');

  const handleSalvarConta = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'contas_bancarias'), {
      nome: nomeConta,
      saldoInicial: parseFloat(saldoInicialConta) || 0,
      perfilId: perfilContaId,
      dataSaldo: dataSaldoConta,
      criadoEm: new Date().toISOString()
    });
    setNomeConta(''); setSaldoInicialConta(''); setDataSaldoConta(new Date().toISOString().slice(0, 10)); setExibirFormConta(false); recarregarContas();
  };

  const handleExcluirConta = async (id) => {
    if (!window.confirm("Excluir esta conta bancária?")) return;
    try { await deleteDoc(doc(db, 'contas_bancarias', id)); recarregarContas(); } catch { alert("Erro ao excluir."); }
  };

  const handleSalvarSaldoManual = async (e) => {
    e.preventDefault();
    if (editandoSaldoId) {
      await updateDoc(doc(db, 'saldos_bancarios', editandoSaldoId), {
        valor: parseFloat(valorSaldoManual) || 0,
        data: dataSaldoManual,
        atualizadoEm: new Date().toISOString()
      });
    } else {
      await addDoc(collection(db, 'saldos_bancarios'), {
        contaId: contaSaldoId,
        valor: parseFloat(valorSaldoManual) || 0,
        data: dataSaldoManual,
        criadoEm: new Date().toISOString()
      });
    }
    setValorSaldoManual(''); setDataSaldoManual(new Date().toISOString().slice(0, 10)); setExibirFormSaldo(false); setContaSaldoId(null); setEditandoSaldoId(null); recarregarSaldos();
  };

  const historicoSaldos = (contaId) => {
    return (saldosBancarios || [])
      .filter(s => s.contaId === contaId)
      .sort((a, b) => new Date(b.data) - new Date(a.data));
  };

  const ultimoSaldoManual = (contaId) => {
    return historicoSaldos(contaId)[0];
  };

  const handleExcluirSaldo = async (id) => {
    if (!window.confirm("Excluir este registro de saldo?")) return;
    try { await deleteDoc(doc(db, 'saldos_bancarios', id)); recarregarSaldos(); } catch { alert("Erro ao excluir saldo."); }
  };

  const handleEditarSaldo = (saldo) => {
    setContaSaldoId(saldo.contaId);
    setValorSaldoManual(saldo.valor.toString());
    setDataSaldoManual(saldo.data);
    setEditandoSaldoId(saldo.id);
    setExibirFormSaldo(true);
  };

  const handleAbrirNovoSaldo = (contaId) => {
    setContaSaldoId(contaId);
    setValorSaldoManual('');
    setDataSaldoManual(new Date().toISOString().slice(0, 10));
    setEditandoSaldoId(null);
    setExibirFormSaldo(true);
  };

  const calcularDiferenca = (contaId, saldoIni) => {
    const ultimo = ultimoSaldoManual(contaId);
    const calculado = calcularSaldoConta(contaId, saldoIni);
    if (!ultimo) return { valor: 0, tem: false };
    return { valor: calculado - ultimo.valor, tem: true };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" onClick={() => setExibirFormConta(!exibirFormConta)} style={{ padding: '10px 20px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={18}/> Nova Conta / Carteira</button></div>
      {exibirFormConta && (
        <form onSubmit={handleSalvarConta} style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}><User size={14} style={{verticalAlign: 'middle'}}/> Titular da Conta</label><select value={perfilContaId} onChange={e => setPerfilContaId(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}><option value="" disabled>Selecione...</option>{perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
          <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>Nome do Banco</label><input type="text" value={nomeConta} onChange={e => setNomeConta(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}><Calendar size={14} style={{verticalAlign:'middle'}}/> Data do Saldo</label><input type="date" value={dataSaldoConta} onChange={e => setDataSaldoConta(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>Saldo Inicial (R$)</label><input type="number" step="0.01" value={saldoInicialConta} onChange={e => setSaldoInicialConta(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
          <button type="submit" style={{ padding: '10px 20px', height: '40px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Salvar Conta</button>
        </form>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {contasBancarias.map(conta => {
          const saldoAtual = calcularSaldoConta(conta.id, conta.saldoInicial);
          const diff = calcularDiferenca(conta.id, conta.saldoInicial);
          const historico = historicoSaldos(conta.id);

          return (
            <div key={conta.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eee', borderTop: `4px solid ${cores?.dourado}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative' }}>
              <button type="button" onClick={() => handleExcluirConta(conta.id)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}><Trash2 size={16}/></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}><div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '50%' }}><Landmark size={24} color="#2c3e50" /></div><h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>{conta.nome}</h3></div>
              <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}><User size={12}/> Titular: <strong>{obterNomePerfil(conta.perfilId)}</strong></div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>Saldo Calculado</span>
                  <h2 style={{ margin: 0, fontSize: '20px', color: saldoAtual >= 0 ? '#155724' : '#dc3545' }}>{formatarMoeda(saldoAtual)}</h2>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>Saldo Manual</span>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#6c757d' }}>
                    {ultimoSaldoManual(conta.id) ? formatarMoeda(ultimoSaldoManual(conta.id).valor) : '--'}
                  </h2>
                </div>
              </div>

              {diff.tem && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '6px', backgroundColor: diff.valor === 0 ? '#d4edda' : '#fff3cd', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>
                  {diff.valor === 0 ? <span style={{color:'#155724'}}>✓ Conciliado</span> : <><TrendingDown size={14} color='#856404'/> Diferença: {formatarMoeda(diff.valor)}</>}
                </div>
              )}

              <button type="button" onClick={() => handleAbrirNovoSaldo(conta.id)} style={{ width: '100%', padding: '8px', backgroundColor: '#e9ecef', color: cores?.texto, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>
                + Registrar Saldo Manual
              </button>

              {historico.length > 0 && (
                <div style={{ borderTop: '1px solid #eee', paddingTop: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#999', fontWeight: 'bold' }}>Histórico de saldos:</span>
                  {historico.slice(0, 5).map((s) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#666', padding: '2px 0' }}>
                      <span>{s.data.split('-').reverse().join('/')}</span>
                      <span style={{ fontWeight: 'bold' }}>{formatarMoeda(s.valor)}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button type="button" onClick={() => handleEditarSaldo(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3', padding: '0 2px' }}><Pencil size={12}/></button>
                        <button type="button" onClick={() => handleExcluirSaldo(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '0 2px' }}><Trash2 size={12}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {exibirFormSaldo && (
        <div style={{ position: 'fixed', top:0,left:0,right:0,bottom:0, backgroundColor:'rgba(0,0,0,0.4)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 }} onClick={() => { setExibirFormSaldo(false); setContaSaldoId(null); setEditandoSaldoId(null); }}>
          <form onSubmit={handleSalvarSaldoManual} onClick={e => e.stopPropagation()} style={{ backgroundColor:'#fff', padding:'25px', borderRadius:'12px', width:'90%', maxWidth:'400px', display:'flex', flexDirection:'column', gap:'15px', boxShadow:'0 10px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin:0, color:cores?.texto }}>{editandoSaldoId ? 'Editar Saldo Manual' : 'Registrar Saldo Manual'}</h3>
            <p style={{ margin:0, fontSize:'13px', color:'#666' }}>Conta: <strong>{contasBancarias.find(c=>c.id===contaSaldoId)?.nome}</strong></p>
            <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
              <label style={{ fontSize:'14px', fontWeight:'bold' }}>Data do Saldo</label>
              <input type="date" value={dataSaldoManual} onChange={e => setDataSaldoManual(e.target.value)} required style={{ padding:'10px', borderRadius:'6px', border:'1px solid #ccc' }} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
              <label style={{ fontSize:'14px', fontWeight:'bold' }}>Saldo Conferido (R$)</label>
              <input type="number" step="0.01" value={valorSaldoManual} onChange={e => setValorSaldoManual(e.target.value)} required placeholder="Ex: 1523,45" style={{ padding:'10px', borderRadius:'6px', border:'1px solid #ccc' }} />
            </div>
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button type="button" onClick={() => { setExibirFormSaldo(false); setContaSaldoId(null); setEditandoSaldoId(null); }} style={{ padding:'10px 20px', border:'1px solid #ccc', borderRadius:'6px', background:'#fff', cursor:'pointer' }}>Cancelar</button>
              <button type="submit" style={{ padding:'10px 20px', backgroundColor:cores?.dourado, color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' }}>Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
