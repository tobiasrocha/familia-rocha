import { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { Plus, DollarSign, Trash2, Pencil, Calendar, Landmark, User, TrendingDown } from 'lucide-react';

const naturezas = ['Pessoal', 'Consignado', 'Financiamento', 'Cheque Especial', 'Cartão de Crédito', 'Imobiliário', 'Veículo', 'Outros'];

export default function GerenciadorEmprestimos({ cores, formatarMoeda, obterNomePerfil, perfis, contasBancarias }) {
  const { dados: emprestimos, recarregar } = useFirestore('emprestimos');
  const [exibirForm, setExibirForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [natureza, setNatureza] = useState('Pessoal');
  const [credor, setCredor] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [valorParcela, setValorParcela] = useState('');
  const [numParcelas, setNumParcelas] = useState('');
  const [parcelasPagas, setParcelasPagas] = useState('0');
  const [juros, setJuros] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [perfilId, setPerfilId] = useState('');
  const [contaId, setContaId] = useState('');

  const resetForm = () => {
    setNome(''); setNatureza('Pessoal'); setCredor(''); setValorTotal(''); setValorParcela('');
    setNumParcelas(''); setParcelasPagas('0'); setJuros('');
    setDataInicio(''); setDataFim(''); setPerfilId(''); setContaId('');
    setEditandoId(null); setExibirForm(false);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    const total = parseFloat(valorTotal) || 0;
    const parcela = parseFloat(valorParcela) || 0;
    const nParcelas = parseInt(numParcelas) || 0;
    const pPagas = parseInt(parcelasPagas) || 0;
    const saldoDevedor = total - (parcela * pPagas);

    const payload = {
      nome, natureza, credor,
      valorTotal: total,
      valorParcela: parcela,
      numParcelas: nParcelas,
      parcelasPagas: pPagas,
      saldoDevedor: Math.max(0, saldoDevedor),
      juros: juros || null,
      dataInicio, dataFim: dataFim || null,
      perfilId: perfilId || null,
      contaId: contaId || null,
    };

    if (editandoId) {
      await updateDoc(doc(db, 'emprestimos', editandoId), { ...payload, atualizadoEm: new Date().toISOString() });
    } else {
      await addDoc(collection(db, 'emprestimos'), { ...payload, criadoEm: new Date().toISOString() });
    }
    resetForm();
    recarregar();
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir este empréstimo?")) return;
    try { await deleteDoc(doc(db, 'emprestimos', id)); recarregar(); } catch { alert("Erro ao excluir."); }
  };

  const handleEditar = (emp) => {
    setNome(emp.nome); setNatureza(emp.natureza); setCredor(emp.credor || '');
    setValorTotal(emp.valorTotal?.toString() || ''); setValorParcela(emp.valorParcela?.toString() || '');
    setNumParcelas(emp.numParcelas?.toString() || ''); setParcelasPagas(emp.parcelasPagas?.toString() || '0');
    setJuros(emp.juros || ''); setDataInicio(emp.dataInicio || ''); setDataFim(emp.dataFim || '');
    setPerfilId(emp.perfilId || ''); setContaId(emp.contaId || '');
    setEditandoId(emp.id); setExibirForm(true);
  };

  const handlePagarParcela = async (emp) => {
    const novasPagas = (emp.parcelasPagas || 0) + 1;
    if (novasPagas > (emp.numParcelas || 0)) return;
    const novoSaldo = Math.max(0, (emp.valorTotal || 0) - ((emp.valorParcela || 0) * novasPagas));
    try {
      await updateDoc(doc(db, 'emprestimos', emp.id), {
        parcelasPagas: novasPagas,
        saldoDevedor: novoSaldo,
        atualizadoEm: new Date().toISOString(),
      });
      recarregar();
    } catch { alert("Erro ao pagar parcela."); }
  };

  const totalDevido = (emprestimos || []).reduce((acc, e) => acc + (e.saldoDevedor || 0), 0);

  const progresso = (emp) => {
    if (!emp.numParcelas || emp.numParcelas === 0) return 0;
    return Math.round(((emp.parcelasPagas || 0) / emp.numParcelas) * 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ backgroundColor: '#fef2f2', padding: '12px 20px', borderRadius: '8px', border: '1px solid #fecaca' }}>
          <span style={{ fontSize: '13px', color: '#991b1b' }}>Total Devido </span>
          <strong style={{ fontSize: '20px', color: '#dc2626', marginLeft: '8px' }}>{formatarMoeda(totalDevido)}</strong>
        </div>
        <button type="button" onClick={() => { resetForm(); setExibirForm(!exibirForm); }} style={{ padding: '10px 20px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18}/> Novo Empréstimo
        </button>
      </div>

      {exibirForm && (
        <form onSubmit={handleSalvar} style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Descrição</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Empréstimo Pessoal Itaú" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Natureza</label>
            <select value={natureza} onChange={e => setNatureza(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
              {naturezas.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Credor</label>
            <input type="text" value={credor} onChange={e => setCredor(e.target.value)} placeholder="Banco ou pessoa" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 130px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Valor Total (R$)</label>
            <input type="number" step="0.01" value={valorTotal} onChange={e => setValorTotal(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Valor Parcela</label>
            <input type="number" step="0.01" value={valorParcela} onChange={e => setValorParcela(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '0 0 100px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Nº Parcelas</label>
            <input type="number" min="1" value={numParcelas} onChange={e => setNumParcelas(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '0 0 110px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Parcelas Pagas</label>
            <input type="number" min="0" value={parcelasPagas} onChange={e => setParcelasPagas(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Juros</label>
            <input type="text" value={juros} onChange={e => setJuros(e.target.value)} placeholder="Ex: 2,5% a.m." style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 130px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Data Início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 130px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Data Fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Responsável</label>
            <select value={perfilId} onChange={e => setPerfilId(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}><option value="">Selecione...</option>{perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          </div>
const naturezasBancarias = ['Consignado', 'Financiamento', 'Cheque Especial', 'Imobiliário', 'Veículo'];

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Conta Vinculada</label>
            <select value={contaId} onChange={e => setContaId(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
              <option value="">Nenhuma</option>
              {naturezasBancarias.includes(natureza) && contasBancarias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <button type="button" onClick={resetForm} style={{ padding: '10px 20px', height: '40px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '10px 20px', height: '40px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{editandoId ? 'Atualizar' : 'Salvar'}</button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {(emprestimos || []).sort((a, b) => (a.saldoDevedor || 0) - (b.saldoDevedor || 0)).reverse().map(emp => {
          const pct = progresso(emp);
          const quitado = emp.saldoDevedor === 0;
          return (
            <div key={emp.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eee', borderTop: `4px solid ${quitado ? '#16a34a' : '#dc2626'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', opacity: quitado ? 0.75 : 1, position: 'relative' }}>
              <div style={{ display: 'flex', gap: '4px', position: 'absolute', top: '15px', right: '15px' }}>
                <button type="button" onClick={() => handleEditar(emp)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3', padding: '2px' }}><Pencil size={14}/></button>
                <button type="button" onClick={() => handleExcluir(emp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '2px' }}><Trash2 size={14}/></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '10px', backgroundColor: quitado ? '#dcfce7' : '#fef2f2', borderRadius: '50%' }}>
                  <TrendingDown size={24} color={quitado ? '#16a34a' : '#dc2626'} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>{emp.nome}</h3>
                  <span style={{ fontSize: '11px', color: '#888', padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '10px' }}>{emp.natureza}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>Total</span>
                  <strong style={{ fontSize: '18px', color: '#333' }}>{formatarMoeda(emp.valorTotal || 0)}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>{quitado ? 'Quitado' : 'Saldo Devedor'}</span>
                  <strong style={{ fontSize: '18px', color: quitado ? '#16a34a' : '#dc2626' }}>{formatarMoeda(emp.saldoDevedor || 0)}</strong>
                </div>
              </div>

              {/* Barra de progresso */}
              {emp.numParcelas > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                    <span>{emp.parcelasPagas || 0}/{emp.numParcelas} parcelas</span>
                    <span>{pct}%</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: quitado ? '#16a34a' : '#dc2626', borderRadius: '4px', transition: 'width .3s' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                {emp.credor && <span><Landmark size={12} /> {emp.credor}</span>}
                {emp.perfilId && <span><User size={12} /> {obterNomePerfil(emp.perfilId)}</span>}
                {emp.valorParcela > 0 && <span>Parcela: {formatarMoeda(emp.valorParcela)}</span>}
                {emp.juros && <span>| Juros: {emp.juros}</span>}
                {emp.dataInicio && <span>| <Calendar size={12} /> {emp.dataInicio.split('-').reverse().join('/')}</span>}
              </div>

              {!quitado && (
                <button type="button" onClick={() => handlePagarParcela(emp)} style={{ width: '100%', padding: '8px', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                  + Pagar Parcela
                </button>
              )}
            </div>
          );
        })}
      </div>

      {(emprestimos || []).length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <TrendingDown size={48} style={{ opacity: 0.3, marginBottom: '10px' }} />
          <p>Nenhum empréstimo cadastrado.</p>
        </div>
      )}
    </div>
  );
}
