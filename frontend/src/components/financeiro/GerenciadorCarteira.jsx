import { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { Plus, Trash2, Pencil, CreditCard, Banknote, Landmark, TrendingUp, QrCode, Vault, Coffee, ShoppingCart, Car, Heart, Home, Smartphone, Wrench, Tag, ScanLine } from 'lucide-react';
import { useUploadOcr } from '../../hooks/useUploadOcr';
import SelectDigitavel from '../SelectDigitavel';

const categoriasRapidas = [
  { key: 'Alimentacao', label: 'Alimentação', icon: <Coffee size={14} /> },
  { key: 'Transporte', label: 'Transporte', icon: <Car size={14} /> },
  { key: 'Compras', label: 'Compras', icon: <ShoppingCart size={14} /> },
  { key: 'Saude', label: 'Saúde', icon: <Heart size={14} /> },
  { key: 'Moradia', label: 'Moradia', icon: <Home size={14} /> },
  { key: 'Assinaturas', label: 'Assinaturas', icon: <Smartphone size={14} /> },
  { key: 'Prestadores', label: 'Prestadores', icon: <Wrench size={14} /> },
  { key: 'Outros', label: 'Outros', icon: <Tag size={14} /> },
];

const formasPagamento = [
  { key: 'Dinheiro', label: 'Dinheiro', icon: <Banknote size={14} />, cor: '#059669', bg: '#ecfdf5' },
  { key: 'Pix', label: 'Pix', icon: <QrCode size={14} />, cor: '#0891b2', bg: '#ecfeff' },
  { key: 'Debito', label: 'Débito', icon: <Landmark size={14} />, cor: '#2563eb', bg: '#eff6ff' },
  { key: 'Credito', label: 'Crédito', icon: <CreditCard size={14} />, cor: '#dc2626', bg: '#fef2f2' },
  { key: 'Investimento', label: 'Invest.', icon: <TrendingUp size={14} />, cor: '#7c3aed', bg: '#ede9fe' },
  { key: 'Cofre', label: 'Cofre', icon: <Vault size={14} />, cor: '#d97706', bg: '#fef3c7' },
];

export default function GerenciadorCarteira({ cores, formatarMoeda, contasBancarias, cartoes, investimentos, cofre }) {
  const { dados: gastos, recarregar } = useFirestore('carteira');
  const { extraindo: extraindoOcr, extrairDados } = useUploadOcr();
  const [editandoId, setEditandoId] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('Alimentacao');
  const [forma, setForma] = useState('Dinheiro');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [vinculoId, setVinculoId] = useState('');

  const handleScanOcr = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dados = await extrairDados(file);
    if (dados) {
      if (dados.descricao) setDescricao(dados.descricao);
      if (dados.valor) setValor(dados.valor);
    }
  };

  const resetForm = () => {
    setDescricao(''); setValor(''); setCategoria('Alimentacao'); setForma('Dinheiro');
    setData(new Date().toISOString().slice(0, 10)); setVinculoId('');
    setEditandoId(null);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    const valorNum = parseFloat(valor) || 0;
    const payload = {
      descricao, valor: valorNum, categoria, forma, data,
      vinculoId: (forma !== 'Dinheiro') ? (vinculoId || null) : null,
    };
    if (editandoId) {
      await updateDoc(doc(db, 'carteira', editandoId), { ...payload, atualizadoEm: new Date().toISOString() });
    } else {
      await addDoc(collection(db, 'carteira'), { ...payload, criadoEm: new Date().toISOString() });
    }
    // Se for Cofre vinculado, debita do saldo e lança no financeiro
    if (forma === 'Cofre' && vinculoId && valorNum > 0) {
      const item = cofre?.find(i => i.id === vinculoId);
      if (item) {
        await updateDoc(doc(db, 'cofre', vinculoId), {
          saldo: Math.max(0, (item.saldo || 0) - valorNum),
          atualizadoEm: new Date().toISOString(),
        });
        // Cria lançamento para interligar o movimento
        await addDoc(collection(db, 'financas'), {
          descricao: `Retirada Cofre: ${item.nome} — ${descricao}`,
          valor: valorNum,
          tipo: 'Despesa',
          categoria: 'Reserva Familiar',
          dataVencimento: data,
          status: 'Pago',
          formaPagamento: 'Dinheiro',
          criadoEm: new Date().toISOString(),
        });
      }
    }
    // Se for Investimento vinculado, debita do saldo e lança no financeiro
    if (forma === 'Investimento' && vinculoId && valorNum > 0) {
      const inv = investimentos?.find(i => i.id === vinculoId);
      if (inv) {
        await updateDoc(doc(db, 'investimentos', vinculoId), {
          valor: Math.max(0, (inv.valor || 0) - valorNum),
          atualizadoEm: new Date().toISOString(),
        });
        await addDoc(collection(db, 'financas'), {
          descricao: `Retirada Investimento: ${inv.nome} — ${descricao}`,
          valor: valorNum,
          tipo: 'Despesa',
          categoria: 'Investimentos',
          dataVencimento: data,
          status: 'Pago',
          formaPagamento: 'Dinheiro',
          criadoEm: new Date().toISOString(),
        });
      }
    }
    resetForm(); recarregar();
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir este gasto?")) return;
    try { await deleteDoc(doc(db, 'carteira', id)); recarregar(); } catch { /* erro ao excluir */ }
  };

  const handleEditar = (g) => {
    setDescricao(g.descricao); setValor(g.valor?.toString() || ''); setCategoria(g.categoria);
    setForma(g.forma); setData(g.data || ''); setVinculoId(g.vinculoId || '');
    setEditandoId(g.id);
  };

  const hoje = new Date().toISOString().slice(0, 10);
  const gastosHoje = (gastos || []).filter(g => g.data === hoje);
  const totalHoje = gastosHoje.reduce((a, g) => a + (g.valor || 0), 0);

  const infoCat = (k) => categoriasRapidas.find(c => c.key === k) || {};
  const infoForma = (k) => formasPagamento.find(f => f.key === k) || {};

  const totalDinheiro = gastosHoje.filter(g => g.forma === 'Dinheiro').reduce((a, g) => a + (g.valor || 0), 0);
  const totalPix = gastosHoje.filter(g => g.forma === 'Pix').reduce((a, g) => a + (g.valor || 0), 0);
  const totalDebito = gastosHoje.filter(g => g.forma === 'Debito').reduce((a, g) => a + (g.valor || 0), 0);
  const totalCredito = gastosHoje.filter(g => g.forma === 'Credito').reduce((a, g) => a + (g.valor || 0), 0);
  const totalInvest = gastosHoje.filter(g => g.forma === 'Investimento').reduce((a, g) => a + (g.valor || 0), 0);
  const totalCofre = gastosHoje.filter(g => g.forma === 'Cofre').reduce((a, g) => a + (g.valor || 0), 0);

  const nomeVinculo = (g) => {
    if (!g.vinculoId) return null;
    if (g.forma === 'Debito' || g.forma === 'Pix') return contasBancarias?.find(c => c.id === g.vinculoId)?.nome;
    if (g.forma === 'Credito') return cartoes?.find(c => c.id === g.vinculoId)?.nome;
    if (g.forma === 'Investimento') return investimentos?.find(c => c.id === g.vinculoId)?.nome;
    if (g.forma === 'Cofre') return cofre?.find(c => c.id === g.vinculoId)?.nome;
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {formasPagamento.map(f => {
          const total = f.key === 'Dinheiro' ? totalDinheiro : f.key === 'Pix' ? totalPix : f.key === 'Debito' ? totalDebito : f.key === 'Credito' ? totalCredito : f.key === 'Investimento' ? totalInvest : totalCofre;
          return (
            <div key={f.key} style={{ flex: '1 1 130px', backgroundColor: f.bg, padding: '12px', borderRadius: '10px', border: `1px solid ${f.cor}30` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ color: f.cor }}>{f.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: f.cor }}>{f.label}</span>
              </div>
              <strong style={{ fontSize: '18px', color: f.cor }}>{formatarMoeda(total)}</strong>
            </div>
          );
        })}
        <div style={{ flex: '1 1 100px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '10px', color: '#666', display: 'block' }}>Total Hoje</span>
          <strong style={{ fontSize: '17px', color: totalHoje > 0 ? '#dc2626' : '#16a34a' }}>{formatarMoeda(totalHoje)}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap', backgroundColor: cores?.branco, padding: '15px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <div style={{ flex: '0 0 auto' }}>
          <input type="file" accept="image/*,application/pdf" onChange={handleScanOcr} style={{ display: 'none' }} id="ocrCarteira" />
          <label htmlFor="ocrCarteira" style={{ cursor: 'pointer', padding: '10px 12px', backgroundColor: extraindoOcr ? '#94a3b8' : '#0056b3', color: '#fff', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <ScanLine size={16} /> {extraindoOcr ? 'Lendo...' : 'Scan'}
          </label>
        </div>
        <div style={{ flex: '2 1 180px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Descrição</label>
          <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="O que gastou?" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
        </div>
        <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>R$</label>
          <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
        </div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {formasPagamento.map(f => (
            <button key={f.key} type="button" onClick={() => { setForma(f.key); setVinculoId(''); }} style={{ padding: '10px 12px', borderRadius: '8px', border: forma === f.key ? `2px solid ${f.cor}` : '1px solid #ddd', backgroundColor: forma === f.key ? f.bg : '#fff', cursor: 'pointer', fontWeight: forma === f.key ? 'bold' : 'normal', color: f.cor, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', whiteSpace: 'nowrap' }}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>
        {!['Dinheiro'].includes(forma) && (
          <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>{forma === 'Debito' || forma === 'Pix' ? 'Conta' : forma === 'Credito' ? 'Cartão' : forma === 'Investimento' ? 'Investimento' : 'Cofre'}</label>
            <select value={vinculoId} onChange={e => setVinculoId(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <option value="">Não vincular</option>
              {(forma === 'Debito' || forma === 'Pix') && (contasBancarias || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              {forma === 'Credito' && (cartoes || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              {forma === 'Investimento' && (investimentos || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              {forma === 'Cofre' && (cofre || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        )}
        <button type="button" onClick={(e) => { e.preventDefault(); if (!descricao || !valor) { alert('Preencha descrição e valor.'); return; } handleSalvar(e); }} style={{ padding: '10px 20px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
          <Plus size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Registrar
        </button>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {categoriasRapidas.map(c => (
          <button key={c.key} type="button" onClick={() => setCategoria(c.key)} style={{ padding: '6px 12px', borderRadius: '16px', border: categoria === c.key ? '2px solid #C5A059' : '1px solid #ddd', backgroundColor: categoria === c.key ? '#fef3c7' : '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: categoria === c.key ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {c.icon} {c.label}
          </button>
        ))}
        <div style={{ flex: '1 1 130px', minWidth: '120px' }}>
          <SelectDigitavel
            value={categoria}
            onChange={setCategoria}
            opcoes={categoriasRapidas.map(c => c.label)}
            placeholder="Ou digite..."
            style={{ padding: '6px 10px', borderRadius: '16px', border: '1px solid #ddd', fontSize: '12px', width: '100%' }}
          />
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', fontSize: '14px' }}>Gastos de Hoje</div>
        {gastosHoje.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>Nenhum gasto hoje.</div>
        ) : (
          gastosHoje.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || '')).map(g => {
            const cat = infoCat(g.categoria);
            const fp = infoForma(g.forma);
            const vinculo = nomeVinculo(g);
            return (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: fp.bg || '#f0f0f0', color: fp.cor }}>{fp.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{g.descricao}</div>
                  <div style={{ fontSize: '11px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {cat.icon} {cat.label || g.categoria}
                    {vinculo && <span style={{ color: '#C5A059' }}>| {vinculo}</span>}
                  </div>
                </div>
                <strong style={{ fontSize: '14px', color: '#dc2626' }}>{formatarMoeda(g.valor || 0)}</strong>
                <button type="button" onClick={() => handleEditar(g)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3' }}><Pencil size={14} /></button>
                <button type="button" onClick={() => handleExcluir(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}><Trash2 size={14} /></button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
