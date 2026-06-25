import { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { Plus, Trash2, Pencil, Wallet, Gift, GraduationCap, Trophy, Calendar } from 'lucide-react';

const tiposSalario = [
  { key: 'Salario', label: 'Salário Fixo', icon: <Wallet size={18} />, cor: '#2563eb', bg: '#eff6ff' },
  { key: 'AjudaCusto', label: 'Ajuda de Custo', icon: <Gift size={18} />, cor: '#059669', bg: '#ecfdf5' },
  { key: 'AuxilioEducacao', label: 'Auxílio Educação', icon: <GraduationCap size={18} />, cor: '#7c3aed', bg: '#ede9fe' },
  { key: 'Premiacao', label: 'Premiação', icon: <Trophy size={18} />, cor: '#d97706', bg: '#fef3c7' },
];

export default function GerenciadorSalarios({ cores, formatarMoeda, perfis, obterNomePerfil }) {
  const { dados: salarios, recarregar } = useFirestore('salarios');
  const [exibirForm, setExibirForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [tipo, setTipo] = useState('Salario');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [perfilId, setPerfilId] = useState('');
  const [diaPagamento, setDiaPagamento] = useState('1');

  const resetForm = () => {
    setTipo('Salario'); setDescricao(''); setValor(''); setPerfilId(''); setDiaPagamento('1');
    setEditandoId(null); setExibirForm(false);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    const payload = {
      tipo, descricao,
      valor: parseFloat(valor) || 0,
      perfilId: perfilId || null,
      diaPagamento: parseInt(diaPagamento) || 1,
    };
    if (editandoId) {
      await updateDoc(doc(db, 'salarios', editandoId), { ...payload, atualizadoEm: new Date().toISOString() });
    } else {
      await addDoc(collection(db, 'salarios'), { ...payload, criadoEm: new Date().toISOString() });
    }
    resetForm(); recarregar();
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir este salário?")) return;
    try { await deleteDoc(doc(db, 'salarios', id)); recarregar(); } catch { alert("Erro ao excluir."); }
  };

  const handleEditar = (s) => {
    setTipo(s.tipo); setDescricao(s.descricao); setValor(s.valor?.toString() || '');
    setPerfilId(s.perfilId || ''); setDiaPagamento(s.diaPagamento?.toString() || '1');
    setEditandoId(s.id); setExibirForm(true);
  };

  const infoTipo = (t) => tiposSalario.find(x => x.key === t) || {};

  // Projeção dos próximos 3 meses por tipo
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const hoje = new Date();
  const projecao = [];
  for (let m = 0; m < 3; m++) {
    const mesRef = new Date(hoje.getFullYear(), hoje.getMonth() + m, 1);
    const nomeMes = meses[mesRef.getMonth()];
    let total = 0;
    (salarios || []).forEach(s => {
      if (s.tipo === 'Premiacao') {
        total += (s.valor || 0) * 2; // quinzenal
      } else {
        total += (s.valor || 0);
      }
    });
    projecao.push({ mes: nomeMes, total });
  }

  const totalMensal = (salarios || []).reduce((acc, s) => {
    return acc + (s.valor || 0) * (s.tipo === 'Premiacao' ? 2 : 1);
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Resumo */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {tiposSalario.map(t => {
          const total = (salarios || []).filter(s => s.tipo === t.key).reduce((acc, s) => acc + (s.valor || 0), 0);
          return (
            <div key={t.key} style={{ flex: '1 1 180px', backgroundColor: t.bg, padding: '14px 16px', borderRadius: '10px', border: `1px solid ${t.cor}30`, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ color: t.cor }}>{t.icon}</div>
              <div>
                <span style={{ fontSize: '11px', color: '#666', display: 'block' }}>{t.label}</span>
                <strong style={{ fontSize: '16px', color: t.cor }}>{formatarMoeda(total)}</strong>
              </div>
            </div>
          );
        })}
        <div style={{ flex: '1 1 160px', backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '11px', color: '#666', display: 'block' }}>Total Mensal</span>
          <strong style={{ fontSize: '18px', color: '#1e40af' }}>{formatarMoeda(totalMensal)}</strong>
        </div>
      </div>

      {/* Projeção 3 meses */}
      <div style={{ backgroundColor: '#fff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e5e7eb', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Projeção:</span>
        {projecao.map((p, i) => (
          <span key={i} style={{ fontSize: '13px', color: '#333' }}>
            <strong>{p.mes}</strong> {formatarMoeda(p.total)}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => { resetForm(); setExibirForm(!exibirForm); }} style={{ padding: '10px 20px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18}/> Novo Salário
        </button>
      </div>

      {exibirForm && (
        <form onSubmit={handleSalvar} style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
              {tiposSalario.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Origem / Empresa</label>
            <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} required placeholder="Ex: Empresa X, Governo, Freelance" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Valor (R$)</label>
            <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Responsável</label>
            <select value={perfilId} onChange={e => setPerfilId(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}><option value="">Selecione...</option>{perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          </div>
          <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Dia Pagamento</label>
            <select value={diaPagamento} onChange={e => setDiaPagamento(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
              {tipo === 'Premiacao' ? (
                <><option value="15">Dia 15</option><option value="30">Dia 30</option></>
              ) : (
                Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>Dia {d}</option>)
              )}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <button type="button" onClick={resetForm} style={{ padding: '10px 20px', height: '40px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '10px 20px', height: '40px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{editandoId ? 'Atualizar' : 'Salvar'}</button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {(salarios || []).sort((a, b) => (a.diaPagamento || 1) - (b.diaPagamento || 1)).map(s => {
          const info = infoTipo(s.tipo);
          return (
            <div key={s.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eee', borderTop: `4px solid ${info.cor || '#2563eb'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative' }}>
              <div style={{ display: 'flex', gap: '4px', position: 'absolute', top: '15px', right: '15px' }}>
                <button type="button" onClick={() => handleEditar(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3', padding: '2px' }}><Pencil size={14} /></button>
                <button type="button" onClick={() => handleExcluir(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '2px' }}><Trash2 size={14} /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '10px', backgroundColor: info.bg || '#eff6ff', borderRadius: '50%' }}>{info.icon}</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>{s.descricao}</h3>
                  <span style={{ fontSize: '11px', color: '#888', padding: '2px 8px', backgroundColor: '#f1f5f9', borderRadius: '10px' }}>{info.label || s.tipo}</span>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#888', display: 'block' }}>Valor</span>
                <strong style={{ fontSize: '22px', color: info.cor || '#2563eb' }}>{formatarMoeda(s.valor || 0)}</strong>
                {s.tipo === 'Premiacao' && <span style={{ fontSize: '11px', color: '#d97706', marginLeft: 6 }}>× 2/mês = {formatarMoeda((s.valor || 0) * 2)}</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: '#666' }}>
                {s.perfilId && <span><Wallet size={12} /> {obterNomePerfil(s.perfilId)}</span>}
                <span><Calendar size={12} /> Dia {s.diaPagamento}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
