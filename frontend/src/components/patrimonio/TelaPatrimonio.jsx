// frontend/src/components/patrimonio/TelaPatrimonio.jsx
import React, { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { Package, Plus, Trash2, Pencil, MapPin, Car, Home } from 'lucide-react';

export default function TelaPatrimonio({ cores }) {
  const { dados: patrimonio, carregando, recarregar } = useFirestore('patrimonio');
  const [exibirForm, setExibirForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [idEditando, setIdEditando] = useState(null);

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('Veículo');
  const [valor, setValor] = useState('');
  const [estadoConservacao, setEstadoConservacao] = useState('Excelente');
  
  // Campos Restaurados: Veículos
  const [placa, setPlaca] = useState('');
  const [ano, setAno] = useState('');
  const [quilometragem, setQuilometragem] = useState('');
  const [dataProximaManutencao, setDataProximaManutencao] = useState('');

  // Campos Novos: Imóveis
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [finalidade, setFinalidade] = useState('Residência Atual');

  const buscarCep = async () => {
    if (cep.length < 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`);
      const dados = await res.json();
      if (!dados.erro) {
        setLogradouro(dados.logradouro); setBairro(dados.bairro);
        setCidade(dados.localidade); setUf(dados.uf);
      }
    } catch (e) { console.error(e); }
  };

  const resetarFormulario = () => {
    setNome(''); setValor(''); setPlaca(''); setAno(''); setQuilometragem(''); setDataProximaManutencao('');
    setCep(''); setLogradouro(''); setNumero(''); setBairro(''); setCidade(''); setUf('');
    setIdEditando(null); setExibirForm(false);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const dadosBens = { 
        nome, categoria, valor: parseFloat(valor), estadoConservacao,
        ...(categoria === 'Veículo' && { placa, ano, quilometragem, dataProximaManutencao }),
        ...(categoria === 'Imóvel' && { cep, logradouro, numero, bairro, cidade, uf, finalidade }),
        criadoEm: new Date().toISOString() 
      };

      if (idEditando) await updateDoc(doc(db, 'patrimonio', idEditando), dadosBens);
      else await addDoc(collection(db, 'patrimonio'), dadosBens);
      
      resetarFormulario(); recarregar();
    } catch (err) { alert("Erro ao salvar."); } finally { setSalvando(false); }
  };

  const handleEditar = (bem) => {
    setNome(bem.nome); setCategoria(bem.categoria); setValor(bem.valor); setEstadoConservacao(bem.estadoConservacao || 'Excelente');
    if(bem.categoria === 'Veículo') { setPlaca(bem.placa||''); setAno(bem.ano||''); setQuilometragem(bem.quilometragem||''); setDataProximaManutencao(bem.dataProximaManutencao||''); }
    if(bem.categoria === 'Imóvel') { setCep(bem.cep||''); setLogradouro(bem.logradouro||''); setNumero(bem.numero||''); setBairro(bem.bairro||''); setCidade(bem.cidade||''); setUf(bem.uf||''); setFinalidade(bem.finalidade||'Residência Atual'); }
    setIdEditando(bem.id); setExibirForm(true);
  };

  const abrirMaps = (p) => {
    const endereco = `${p.logradouro}, ${p.numero}, ${p.bairro}, ${p.cidade} - ${p.uf}, ${p.cep}`;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`, '_blank');
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <h2 style={{ color: cores?.texto, margin: 0 }}><Package size={28} color={cores?.dourado} style={{verticalAlign:'middle'}}/> Gestão de Patrimônio</h2>
        <button onClick={() => { if(exibirForm) resetarFormulario(); else setExibirForm(true); }} style={{ padding: '10px 20px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          {exibirForm ? 'Cancelar' : '+ Cadastrar Bem'}
        </button>
      </div>

      {exibirForm && (
        <form onSubmit={handleSalvar} style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 200px' }}><label style={{fontWeight:'bold', fontSize:'14px'}}>Nome / Descrição</label><input required value={nome} onChange={e=>setNome(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}/></div>
          <div style={{ flex: '1 1 150px' }}><label style={{fontWeight:'bold', fontSize:'14px'}}>Categoria</label><select value={categoria} onChange={e=>setCategoria(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}><option value="Veículo">Veículo</option><option value="Imóvel">Imóvel</option><option value="Equipamento">Equipamento / Oficina</option></select></div>
          <div style={{ flex: '1 1 150px' }}><label style={{fontWeight:'bold', fontSize:'14px'}}>Valor Est. (R$)</label><input required type="number" step="0.01" value={valor} onChange={e=>setValor(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}/></div>
          <div style={{ flex: '1 1 150px' }}><label style={{fontWeight:'bold', fontSize:'14px'}}>Estado Conserv.</label><select value={estadoConservacao} onChange={e=>setEstadoConservacao(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}><option value="Excelente">Excelente</option><option value="Bom">Bom</option><option value="Requer Manutenção">Requer Manutenção</option></select></div>

          {categoria === 'Veículo' && (
            <div style={{ width: '100%', backgroundColor: '#fcfcfc', padding: '15px', borderRadius: '8px', display: 'flex', gap: '15px', flexWrap: 'wrap', border: '1px solid #e9ecef' }}>
              <div style={{ flex: '1 1 120px' }}><label style={{fontSize:'13px'}}>Placa</label><input value={placa} onChange={e=>setPlaca(e.target.value.toUpperCase())} style={{width:'100%', padding:'8px'}} placeholder="ABC-1234"/></div>
              <div style={{ flex: '1 1 100px' }}><label style={{fontSize:'13px'}}>Ano</label><input type="number" value={ano} onChange={e=>setAno(e.target.value)} style={{width:'100%', padding:'8px'}}/></div>
              <div style={{ flex: '1 1 150px' }}><label style={{fontSize:'13px'}}>Quilometragem (Km)</label><input type="number" value={quilometragem} onChange={e=>setQuilometragem(e.target.value)} style={{width:'100%', padding:'8px'}}/></div>
              <div style={{ flex: '1 1 150px' }}><label style={{fontSize:'13px'}}>Próx. Manutenção / Óleo</label><input type="date" value={dataProximaManutencao} onChange={e=>setDataProximaManutencao(e.target.value)} style={{width:'100%', padding:'8px'}}/></div>
            </div>
          )}

          {categoria === 'Imóvel' && (
            <div style={{ width: '100%', backgroundColor: '#f0f8ff', padding: '15px', borderRadius: '8px', display: 'flex', gap: '15px', flexWrap: 'wrap', border: '1px solid #cce5ff' }}>
              <div style={{ flex: '1 1 120px' }}><label style={{fontSize:'13px'}}>CEP</label><input value={cep} onBlur={buscarCep} onChange={e=>setCep(e.target.value)} style={{width:'100%', padding:'8px'}} placeholder="Ex: 59000-000"/></div>
              <div style={{ flex: '2 1 200px' }}><label style={{fontSize:'13px'}}>Logradouro / Rua</label><input value={logradouro} onChange={e=>setLogradouro(e.target.value)} style={{width:'100%', padding:'8px'}}/></div>
              <div style={{ flex: '1 1 80px' }}><label style={{fontSize:'13px'}}>Número</label><input value={numero} onChange={e=>setNumero(e.target.value)} style={{width:'100%', padding:'8px'}}/></div>
              <div style={{ flex: '1 1 150px' }}><label style={{fontSize:'13px'}}>Bairro</label><input value={bairro} onChange={e=>setBairro(e.target.value)} style={{width:'100%', padding:'8px'}}/></div>
              <div style={{ flex: '1 1 150px' }}><label style={{fontSize:'13px'}}>Finalidade</label><select value={finalidade} onChange={e=>setFinalidade(e.target.value)} style={{width:'100%', padding:'8px'}}><option value="Residência Atual">Residência Atual</option><option value="Endereço Postal">Endereço Postal</option><option value="Propriedade/Terreno">Terreno/Outro</option></select></div>
            </div>
          )}

          <div style={{ width: '100%', textAlign: 'right', marginTop:'10px' }}>
            <button type="submit" disabled={salvando} style={{ padding: '12px 25px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'bold' }}>{salvando ? 'Salvando...' : 'Gravar Patrimônio'}</button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {patrimonio.map(p => (
          <div key={p.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', borderTop: `4px solid ${p.categoria === 'Veículo' ? '#17a2b8' : (p.categoria === 'Imóvel' ? '#6f42c1' : cores?.dourado)}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', fontSize:'18px', color:cores?.texto }}>{p.categoria === 'Veículo' ? <Car size={18} style={{verticalAlign:'middle'}}/> : <Home size={18} style={{verticalAlign:'middle'}}/>} {p.nome}</h3>
                <span style={{ fontSize:'12px', color:'#666', fontWeight:'bold', padding:'3px 8px', backgroundColor:'#eee', borderRadius:'10px' }}>{p.estadoConservacao}</span>
              </div>
              <div style={{display:'flex', gap:'10px'}}>
                <button onClick={() => handleEditar(p)} style={{ background:'none', border:'none', color:'#0056b3', cursor:'pointer' }}><Pencil size={16}/></button>
                <button onClick={() => {if(window.confirm("Remover este bem?")) deleteDoc(doc(db, 'patrimonio', p.id)); recarregar();}} style={{ background:'none', border:'none', color:'#dc3545', cursor:'pointer' }}><Trash2 size={16}/></button>
              </div>
            </div>
            
            <div style={{ marginTop:'15px', fontSize:'20px', fontWeight:'bold', color: '#2c3e50' }}>
              {Number(p.valor).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
            </div>

            {p.categoria === 'Veículo' && (
              <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#fcfcfc', borderRadius: '8px', border:'1px solid #eee', fontSize:'13px', display:'flex', flexDirection:'column', gap:'5px' }}>
                <div style={{display:'flex', justifyContent:'space-between'}}><span>Placa:</span> <strong>{p.placa || '-'}</strong></div>
                <div style={{display:'flex', justifyContent:'space-between'}}><span>Ano:</span> <strong>{p.ano || '-'}</strong></div>
                <div style={{display:'flex', justifyContent:'space-between'}}><span>Km Atual:</span> <strong>{p.quilometragem ? `${p.quilometragem} km` : '-'}</strong></div>
                {p.dataProximaManutencao && <div style={{display:'flex', justifyContent:'space-between', color:'#dc3545'}}><span>Vencimento Manutenção:</span> <strong>{p.dataProximaManutencao.split('-').reverse().join('/')}</strong></div>}
              </div>
            )}
            
            {p.categoria === 'Imóvel' && p.cep && (
              <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#f0f8ff', borderRadius: '8px', border:'1px solid #cce5ff' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056b3', textTransform: 'uppercase' }}>{p.finalidade}</span>
                <p style={{ margin: '5px 0', fontSize: '13px', color:'#333' }}>{p.logradouro}, {p.numero} - {p.bairro}<br/>{p.cidade}/{p.uf}</p>
                <button onClick={() => abrirMaps(p)} style={{ marginTop: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', border: 'none', background: 'transparent', color: '#dc3545', cursor: 'pointer', fontWeight: 'bold' }}>
                  <MapPin size={14}/> Abrir no Google Maps
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}