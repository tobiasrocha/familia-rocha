import React, { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';

export default function GerenciadorChecklist({ viagemId, cores }) {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [novoItem, setNovoItem] = useState('');
  const [salvando, setSalvando] = useState(false);

  const buscarItens = async () => {
    if (!viagemId) return;
    setCarregando(true);
    try {
      const snapshot = await getDocs(collection(db, `viagens/${viagemId}/checklists`));
      const lista = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.concluido === b.concluido ? 0 : a.concluido ? 1 : -1));
      setItens(lista);
    } catch (err) {
      console.error("Erro ao buscar checklist:", err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarItens();
  }, [viagemId]);

  const handleAdicionarItem = async (e) => {
    e.preventDefault();
    if (!novoItem.trim()) {
      alert('Digite um item');
      return;
    }

    setSalvando(true);
    try {
      await addDoc(collection(db, `viagens/${viagemId}/checklists`), {
        item: novoItem,
        concluido: false,
        criado: new Date().toISOString()
      });
      setNovoItem('');
      buscarItens();
    } catch (err) {
      console.error("Erro ao adicionar item:", err);
      alert('Erro ao adicionar item');
    } finally {
      setSalvando(false);
    }
  };

  const handleAlternarConclusao = async (id, concluido) => {
    try {
      await updateDoc(doc(db, `viagens/${viagemId}/checklists`, id), {
        concluido: !concluido
      });
      buscarItens();
    } catch (err) {
      console.error("Erro ao atualizar:", err);
    }
  };

  const handleExcluir = async (id) => {
    if (!window.confirm('Remover este item?')) return;
    try {
      await deleteDoc(doc(db, `viagens/${viagemId}/checklists`, id));
      buscarItens();
    } catch (err) {
      alert('Erro ao remover');
    }
  };

  const concluidosCount = itens.filter(i => i.concluido).length;
  const totalCount = itens.length;
  const percentualConcluido = totalCount > 0 ? Math.round((concluidosCount / totalCount) * 100) : 0;

  return (
    <div style={{ backgroundColor: cores?.branco, borderRadius: '12px', padding: '25px', marginBottom: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px', color: cores?.texto }}>
          <CheckCircle2 size={20} color={cores?.dourado} /> Checklist / Itens de Bagagem e Preparativos
        </h3>
        {totalCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#6c757d' }}>
            <div style={{ flex: 1, backgroundColor: '#e9ecef', borderRadius: '8px', height: '6px', overflow: 'hidden' }}>
              <div
                style={{
                  backgroundColor: cores?.dourado,
                  height: '100%',
                  width: `${percentualConcluido}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <span>{concluidosCount} de {totalCount} ({percentualConcluido}%)</span>
          </div>
        )}
      </div>

      <form onSubmit={handleAdicionarItem} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Ex: Confirmar hotel, Fazer as malas, Revisar documentos..."
          value={novoItem}
          onChange={e => setNovoItem(e.target.value)}
          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${cores?.borda}`, boxSizing: 'border-box' }}
        />
        <button
          type="submit"
          disabled={salvando}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
        >
          <Plus size={16} /> {salvando ? 'Adicionando...' : 'Adicionar'}
        </button>
      </form>

      {carregando ? (
        <p style={{ color: '#6c757d' }}>Carregando checklist...</p>
      ) : itens.length === 0 ? (
        <p style={{ color: '#6c757d', fontStyle: 'italic' }}>Nenhum item no checklist ainda</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {itens.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                backgroundColor: item.concluido ? '#f8f9fa' : '#fff',
                borderRadius: '8px',
                border: `1px solid ${item.concluido ? '#e9ecef' : cores?.borda}`,
                opacity: item.concluido ? 0.7 : 1
              }}
            >
              <button
                onClick={() => handleAlternarConclusao(item.id, item.concluido)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: item.concluido ? cores?.dourado : '#d0d0d0', display: 'flex', alignItems: 'center' }}
              >
                {item.concluido ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              </button>
              <span
                style={{
                  flex: 1,
                  fontSize: '14px',
                  color: item.concluido ? '#999' : cores?.texto,
                  textDecoration: item.concluido ? 'line-through' : 'none'
                }}
              >
                {item.item}
              </span>
              <button
                onClick={() => handleExcluir(item.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '4px' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
