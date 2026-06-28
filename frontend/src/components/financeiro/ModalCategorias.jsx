import React, { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function ModalCategorias({ categoriasFinanceiras, setCategoriasFinanceiras, onClose }) {
  const [aba, setAba] = useState('despesa'); // despesa, receita, tags
  const [novaDespesa, setNovaDespesa] = useState('');
  const [novaReceita, setNovaReceita] = useState('');
  const [novaTag, setNovaTag] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [localData, setLocalData] = useState({
    despesa: [...(categoriasFinanceiras.despesa || [])],
    receita: [...(categoriasFinanceiras.receita || [])],
    tags: [...(categoriasFinanceiras.tags || [])]
  });

  const handleAdd = (tipo, valor, setValorFn) => {
    if (!valor.trim()) return;
    if (localData[tipo].includes(valor.trim())) {
      alert('Item já existe!');
      return;
    }
    setLocalData(prev => ({
      ...prev,
      [tipo]: [...prev[tipo], valor.trim()].sort()
    }));
    setValorFn('');
  };

  const handleRemove = (tipo, valor) => {
    setLocalData(prev => ({
      ...prev,
      [tipo]: prev[tipo].filter(i => i !== valor)
    }));
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await setDoc(doc(db, 'configuracoes', 'financeiro'), { categorias: localData }, { merge: true });
      setCategoriasFinanceiras(localData);
      onClose();
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
      <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Gestão de Categorias e Tags</h3>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} color="#666" /></button>
        </div>

        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <button type="button" onClick={() => setAba('despesa')} style={{ padding: '8px 12px', border: 'none', background: aba === 'despesa' ? '#dc3545' : '#eee', color: aba === 'despesa' ? '#fff' : '#333', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Despesas</button>
          <button type="button" onClick={() => setAba('receita')} style={{ padding: '8px 12px', border: 'none', background: aba === 'receita' ? '#28a745' : '#eee', color: aba === 'receita' ? '#fff' : '#333', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Receitas</button>
          <button type="button" onClick={() => setAba('tags')} style={{ padding: '8px 12px', border: 'none', background: aba === 'tags' ? '#17a2b8' : '#eee', color: aba === 'tags' ? '#fff' : '#333', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Tags</button>
        </div>

        {aba === 'despesa' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input type="text" value={novaDespesa} onChange={e => setNovaDespesa(e.target.value)} placeholder="Nova categoria de despesa" style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} onKeyDown={e => e.key === 'Enter' && handleAdd('despesa', novaDespesa, setNovaDespesa)} />
              <button type="button" onClick={() => handleAdd('despesa', novaDespesa, setNovaDespesa)} style={{ padding: '10px 15px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Plus size={20} /></button>
            </div>
            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {localData.despesa.map(cat => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>
                  <span>{cat}</span>
                  <button type="button" onClick={() => handleRemove('despesa', cat)} style={{ background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer' }}><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {aba === 'receita' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input type="text" value={novaReceita} onChange={e => setNovaReceita(e.target.value)} placeholder="Nova categoria de receita" style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} onKeyDown={e => e.key === 'Enter' && handleAdd('receita', novaReceita, setNovaReceita)} />
              <button type="button" onClick={() => handleAdd('receita', novaReceita, setNovaReceita)} style={{ padding: '10px 15px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Plus size={20} /></button>
            </div>
            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {localData.receita.map(cat => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>
                  <span>{cat}</span>
                  <button type="button" onClick={() => handleRemove('receita', cat)} style={{ background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer' }}><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {aba === 'tags' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input type="text" value={novaTag} onChange={e => setNovaTag(e.target.value)} placeholder="Nova tag (ex: viagem_cancun)" style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} onKeyDown={e => e.key === 'Enter' && handleAdd('tags', novaTag, setNovaTag)} />
              <button type="button" onClick={() => handleAdd('tags', novaTag, setNovaTag)} style={{ padding: '10px 15px', background: '#17a2b8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Plus size={20} /></button>
            </div>
            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {localData.tags.map(cat => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8f9fa', borderRadius: '6px' }}>
                  <span>{cat}</span>
                  <button type="button" onClick={() => handleRemove('tags', cat)} style={{ background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer' }}><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={handleSalvar} disabled={salvando} style={{ padding: '12px', background: '#0056b3', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px' }}>
          <Save size={18} /> {salvando ? 'Salvando...' : 'Salvar Alterações'}
        </button>

      </div>
    </div>
  );
}
