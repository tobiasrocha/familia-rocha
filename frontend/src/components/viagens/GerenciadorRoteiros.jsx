import { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, getDocs, updateDoc, query } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Plus, Trash2, Pencil, MapPin, Navigation, Search, Check, AlertCircle } from 'lucide-react';

export default function GerenciadorRoteiros({ viagemId, cores }) {
  const [roteiros, setRoteiros] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [exibirForm, setExibirForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCoordenadas, setBuscandoCoordenadas] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');

  const [endereço, setEndereço] = useState('');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const buscarRoteiros = async () => {
    if (!viagemId) return;
    setCarregando(true);
    try {
      const q = query(collection(db, `viagens/${viagemId}/roteiros`));
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRoteiros(lista);
    } catch (err) {
      console.error("Erro ao buscar roteiros:", err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (!viagemId) return;

    let ignore = false;
    async function fetchData() {
      setCarregando(true);
      try {
        const q = query(collection(db, `viagens/${viagemId}/roteiros`));
        const snapshot = await getDocs(q);
        if (!ignore) {
          const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setRoteiros(lista);
        }
      } catch (err) {
        if (!ignore) console.error("Erro ao buscar roteiros:", err);
      } finally {
        if (!ignore) setCarregando(false);
      }
    }
    fetchData();
    return () => { ignore = true; };
  }, [viagemId]);

  const resetarForm = () => {
    setEndereço('');
    setNome('');
    setDescricao('');
    setLatitude('');
    setLongitude('');
    setMensagemErro('');
    setEditandoId(null);
    setExibirForm(false);
  };

  const buscarCoordenadas = async () => {
    if (!endereço.trim()) {
      setMensagemErro('Digite um endereço');
      return;
    }

    setBuscandoCoordenadas(true);
    setMensagemErro('');
    try {
      const resposta = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereço)}`
      );
      const dados = await resposta.json();

      if (dados.length === 0) {
        setMensagemErro('Endereço não encontrado. Tente novamente com mais detalhes.');
        setBuscandoCoordenadas(false);
        return;
      }

      const primeiro = dados[0];
      setLatitude(primeiro.lat);
      setLongitude(primeiro.lon);
      if (!nome) {
        setNome(primeiro.display_name.split(',')[0] || 'Local');
      }
      setMensagemErro('');
    } catch (err) {
      console.error("Erro ao buscar coordenadas:", err);
      setMensagemErro('Erro ao buscar endereço. Tente novamente.');
    } finally {
      setBuscandoCoordenadas(false);
    }
  };

  const handlePressEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarCoordenadas();
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert('Preencha o nome do local');
      return;
    }
    if (!latitude || !longitude) {
      alert('Preencha latitude e longitude');
      return;
    }

    setSalvando(true);
    try {
      const dados = { endereço, nome, descricao, latitude: parseFloat(latitude), longitude: parseFloat(longitude), atualizado: new Date().toISOString() };

      if (editandoId) {
        await updateDoc(doc(db, `viagens/${viagemId}/roteiros`, editandoId), dados);
      } else {
        await addDoc(collection(db, `viagens/${viagemId}/roteiros`), { ...dados, criado: new Date().toISOString() });
      }

      resetarForm();
      buscarRoteiros();
    } catch (err) {
      console.error("Erro ao salvar roteiro:", err);
      alert('Erro ao salvar roteiro');
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = (roteiro) => {
    setEndereço(roteiro.endereço || '');
    setNome(roteiro.nome);
    setDescricao(roteiro.descricao || '');
    setLatitude(roteiro.latitude.toString());
    setLongitude(roteiro.longitude.toString());
    setEditandoId(roteiro.id);
    setExibirForm(true);
  };

  const handleExcluir = async (id) => {
    if (!window.confirm('Remover este local?')) return;
    try {
      await deleteDoc(doc(db, `viagens/${viagemId}/roteiros`, id));
      buscarRoteiros();
    } catch {
      alert('Erro ao remover');
    }
  };

  const abrirMapa = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <div style={{ backgroundColor: cores?.branco, borderRadius: '12px', padding: '25px', marginBottom: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: cores?.texto }}>
          <MapPin size={20} color={cores?.dourado} /> Roteiro / Locais para Visitar
        </h3>
        <button
          onClick={() => (exibirForm ? resetarForm() : setExibirForm(true))}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: exibirForm ? '#6c757d' : cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
        >
          {exibirForm ? 'Cancelar' : <><Plus size={16} /> Adicionar Local</>}
        </button>
      </div>

      {exibirForm && (
        <form onSubmit={handleSalvar} style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${cores?.borda}` }}>
          
          {/* BUSCA DE ENDEREÇO */}
          <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${cores?.borda}` }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
              Buscar por Endereço 🔍
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Ex: Praia de Pipa, Natal, Brazil ou Av. Paulista, São Paulo"
                value={endereço}
                onChange={e => { setEndereço(e.target.value); setMensagemErro(''); }}
                onKeyPress={handlePressEnter}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={buscarCoordenadas}
                disabled={buscandoCoordenadas}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', backgroundColor: cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap' }}
              >
                <Search size={16} /> {buscandoCoordenadas ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {mensagemErro && (
              <small style={{ display: 'block', marginTop: '6px', color: '#dc3545', fontWeight: 'bold' }}>
                ⚠️ {mensagemErro}
              </small>
            )}
            {latitude && longitude && (
              <small style={{ display: 'block', marginTop: '6px', color: '#28a745', fontWeight: 'bold' }}>
                ✓ Coordenadas encontradas: {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}
              </small>
            )}
          </div>

          {/* DADOS DO LOCAL */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Nome do Local *</label>
              <input
                type="text"
                placeholder="Ex: Praia do Amor"
                value={nome}
                onChange={e => setNome(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Descrição</label>
              <input
                type="text"
                placeholder="Ex: Passeio ao pôr do sol"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* PREVIEW DO MAPA */}
          {latitude && longitude && (
            <div style={{ marginBottom: '15px', borderRadius: '8px', overflow: 'hidden', border: `2px solid ${cores?.dourado}`, backgroundColor: '#f0f0f0' }}>
              <iframe
                width="100%"
                height="300"
                style={{ border: 'none' }}
                loading="lazy"
                allowFullScreen=""
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${latitude},${longitude}`}
                title="Mapa do Local"
              />
              <div style={{ padding: '12px', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#28a745', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} /> Localização confirmada
                  </div>
                  <small style={{ color: '#6c757d' }}>
                    {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => abrirMapa(latitude, longitude)}
                  style={{ padding: '6px 12px', backgroundColor: cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Navigation size={14} /> Abrir em Maps
                </button>
              </div>
            </div>
          )}

          {/* ALERTA SE NÃO ENCONTROU ENDEREÇO */}
          {endereço && !latitude && !buscandoCoordenadas && !mensagemErro && (
            <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7', display: 'flex', alignItems: 'center', gap: '8px', color: '#856404' }}>
              <AlertCircle size={16} />
              <small style={{ fontWeight: 'bold' }}>Clique em "Buscar" para encontrar a localização exata do endereço</small>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <small style={{ color: '#6c757d', alignSelf: 'center', flex: 1 }}>
              💡 Digite o endereço, busque e visualize no mapa antes de salvar
            </small>
            <button
              type="submit"
              disabled={salvando || !latitude || !longitude}
              style={{ padding: '10px 20px', backgroundColor: (latitude && longitude) ? cores?.dourado : '#ccc', color: cores?.branco, border: 'none', borderRadius: '6px', cursor: (latitude && longitude) ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
            >
              {salvando ? 'Guardando...' : editandoId ? 'Atualizar Local' : 'Adicionar Local'}
            </button>
          </div>
        </form>
      )}

      {carregando ? (
        <p style={{ color: '#6c757d' }}>Carregando roteiros...</p>
      ) : roteiros.length === 0 ? (
        <p style={{ color: '#6c757d', fontStyle: 'italic' }}>Nenhum local adicionado ainda</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
          {roteiros.map(roteiro => (
            <div key={roteiro.id} style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '15px', borderLeft: `4px solid ${cores?.dourado}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px 0', color: cores?.texto, fontSize: '14px', fontWeight: 'bold' }}>{roteiro.nome}</h4>
                  {roteiro.descricao && <p style={{ margin: 0, fontSize: '12px', color: '#6c757d' }}>{roteiro.descricao}</p>}
                  {roteiro.endereço && <small style={{ display: 'block', marginTop: '4px', color: '#6c757d', fontStyle: 'italic' }}>📮 {roteiro.endereço}</small>}
                  <small style={{ display: 'block', marginTop: '6px', color: '#6c757d' }}>
                    📍 {roteiro.latitude.toFixed(4)}, {roteiro.longitude.toFixed(4)}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => abrirMapa(roteiro.latitude, roteiro.longitude)}
                    title="Abrir no Google Maps"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: cores?.dourado, padding: '4px' }}
                  >
                    <Navigation size={16} />
                  </button>
                  <button
                    onClick={() => handleEditar(roteiro)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3', padding: '4px' }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleExcluir(roteiro.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '4px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
