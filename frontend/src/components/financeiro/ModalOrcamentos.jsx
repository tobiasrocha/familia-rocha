import React, { useState } from 'react';
import { X, Save, TrendingDown } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function ModalOrcamentos({ categoriasFinanceiras, orcamentos, setOrcamentos, onClose }) {
  const [salvando, setSalvando] = useState(false);
  const [localOrcamentos, setLocalOrcamentos] = useState({ ...orcamentos });

  const handleMudancaValor = (categoria, valor) => {
    setLocalOrcamentos(prev => ({
      ...prev,
      [categoria]: valor
    }));
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await setDoc(doc(db, 'configuracoes', 'financeiro'), { orcamentos: localOrcamentos }, { merge: true });
      setOrcamentos(localOrcamentos);
      onClose();
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const despesas = categoriasFinanceiras?.despesa || [];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
      <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
            <TrendingDown size={24} color="#fd7e14" /> Gestão de Orçamentos
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} color="#666" /></button>
        </div>

        <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
          Defina limites de gastos mensais para as suas categorias de despesa. Deixe em branco caso não queira monitorar alguma.
        </p>

        <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '5px' }}>
          {despesas.length === 0 && <span style={{ color: '#999', fontSize: '14px' }}>Nenhuma categoria de despesa cadastrada.</span>}
          {despesas.map(cat => (
            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#fdfcfe', border: '1px solid #eee', borderRadius: '8px' }}>
              <span style={{ fontWeight: '500', color: '#444' }}>{cat}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>R$</span>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  placeholder="Sem limite"
                  value={localOrcamentos[cat] || ''} 
                  onChange={e => handleMudancaValor(cat, e.target.value ? parseFloat(e.target.value) : null)}
                  style={{ width: '100px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                />
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={handleSalvar} disabled={salvando} style={{ padding: '12px', background: '#fd7e14', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px' }}>
          <Save size={18} /> {salvando ? 'Salvando...' : 'Salvar Orçamentos'}
        </button>

      </div>
    </div>
  );
}
