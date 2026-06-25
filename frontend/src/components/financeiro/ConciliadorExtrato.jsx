import { useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, FileSearch, X } from 'lucide-react';
import { apiFetch } from '../../config';

export default function ConciliadorExtrato({ cores, onBaixas, dadosMesFiltro }) {
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [baixando, setBaixando] = useState(false);
  const [selecionados, setSelecionados] = useState(new Set());
  const [telaClassificar, setTelaClassificar] = useState(false);
  const [itensClassificar, setItensClassificar] = useState([]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEnviando(true); setErro(''); setResultado(null); setSelecionados(new Set());
    const formData = new FormData(); formData.append('documento', file);
    try {
      const res = await apiFetch(`/conciliar-extrato`, { method: 'POST', body: formData });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.erro || 'Erro ao processar');
      setResultado(dados);

      // Prepara itens sem match para classificação manual
      if (dados.itensExtrato && dados.itensExtrato.length > 0) {
        const semMatch = dados.itensExtrato.filter(item => !item.matched).map(item => ({
          ...item,
          descricao: item.descricao || '',
          valor: item.valor || 0,
          data: item.data || '',
          status: 'Pendente',
          _novo: true,
        }));
        if (semMatch.length > 0) setItensClassificar(semMatch);
      }

      // Abre tela de classificação se houver itens
      if (dados.itensExtrato?.some(i => !i.matched)) setTelaClassificar(true);
    } catch (err) { setErro(err.message); }
    finally { setEnviando(false); }
  };

  const handleClassificarLancar = async () => {
    const paraLancar = itensClassificar.filter(i => i._selecionado && i._novo);
    if (paraLancar.length === 0) { alert('Selecione itens para lançar.'); return; }
    setBaixando(true);
    try {
      const res = await apiFetch(`/baixar-conciliados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: paraLancar.map(i => ({ descricao: i.descricao, valor: i.valor, data: i.data })) })
      });
      if (!res.ok) throw new Error('Erro');
      alert(`${paraLancar.length} item(ns) lançado(s) como Pago!`);
      setTelaClassificar(false); setItensClassificar([]);
      onBaixas();
    } catch { alert('Erro ao lançar.'); }
    finally { setBaixando(false); }
  };

  const toggleSelecionado = (id) => { const novo = new Set(selecionados); novo.has(id) ? novo.delete(id) : novo.add(id); setSelecionados(novo); };
  const selecionarTodos = () => {
    if (!resultado) return;
    if (selecionados.size === resultado.matches.length) setSelecionados(new Set());
    else setSelecionados(new Set(resultado.matches.map(m => m.idFirestore)));
  };

  const handleBaixar = async () => {
    if (selecionados.size === 0) return;
    setBaixando(true);
    try {
      const res = await apiFetch(`/baixar-conciliados`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selecionados] }) });
      const dados = await res.json();
      alert(dados.msg);
      onBaixas(); setResultado(null); setSelecionados(new Set());
    } catch { alert('Falha ao dar baixa.'); }
    finally { setBaixando(false); }
  };

  const formatarMoeda = (val) => Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const toggleClassificar = (idx) => {
    const nova = [...itensClassificar];
    nova[idx]._selecionado = !nova[idx]._selecionado;
    setItensClassificar(nova);
  };

  const atualizarItem = (idx, campo, valor) => {
    const nova = [...itensClassificar];
    nova[idx][campo] = valor;
    setItensClassificar(nova);
  };

  return (
    <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: '20px' }}>
      <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px', color: cores?.texto }}><FileSearch size={20} color={cores?.dourado} /> Conciliação de Extrato</h4>

      <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <UploadCloud size={28} color={cores?.dourado} />
        <div style={{ flex: 1 }}><span style={{ display: 'block', fontWeight: 'bold', fontSize: '14px' }}>Upload de Extrato Bancário (PDF)</span><span style={{ display: 'block', fontSize: '12px', color: '#666' }}>O sistema lê o extrato e cruza com contas pendentes.</span></div>
        <input type="file" accept=".pdf,image/*" onChange={handleUpload} disabled={enviando} style={{ display: 'none' }} id="fileExtrato" />
        <label htmlFor="fileExtrato" style={{ cursor: enviando ? 'wait' : 'pointer', padding: '8px 15px', backgroundColor: '#0056b3', color: '#fff', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>{enviando ? 'Processando...' : 'Selecionar Extrato'}</label>
      </div>

      {erro && <div style={{ marginTop: '15px', padding: '10px', borderRadius: '6px', backgroundColor: '#f8d7da', color: '#721c24', fontSize: '13px' }}><AlertCircle size={14} style={{verticalAlign:'middle'}}/> {erro}</div>}

      {resultado && resultado.matches.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: '#666' }}><strong>{resultado.matches.length}</strong> de <strong>{resultado.totalPendentes}</strong> contas pendentes encontradas</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={selecionarTodos} style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}>{selecionados.size === resultado.matches.length ? 'Desmarcar Todos' : 'Marcar Todos'}</button>
              <button type="button" onClick={handleBaixar} disabled={baixando || selecionados.size === 0} style={{ padding: '6px 15px', fontSize: '12px', backgroundColor: selecionados.size > 0 ? '#28a745' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}><CheckCircle size={14} /> {baixando ? 'Baixando...' : `Dar Baixa (${selecionados.size})`}</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}><table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}><thead><tr style={{ borderBottom:'2px solid #eee' }}><th style={{ padding:'8px', width:'30px' }}></th><th style={{ padding:'8px' }}>Descrição</th><th style={{ padding:'8px' }}>Valor</th><th style={{ padding:'8px' }}>Vencimento</th><th style={{ padding:'8px' }}>Extrato</th><th style={{ padding:'8px', textAlign:'center' }}>Confiança</th></tr></thead><tbody>{resultado.matches.map(m=>(<tr key={m.idFirestore} style={{ borderBottom:'1px solid #eee', backgroundColor: selecionados.has(m.idFirestore) ? '#e8f5e9' : 'transparent' }}><td style={{ padding:'8px' }}><input type="checkbox" checked={selecionados.has(m.idFirestore)} onChange={()=>toggleSelecionado(m.idFirestore)} /></td><td style={{ padding:'8px', fontWeight:'bold' }}>{m.descricao}</td><td style={{ padding:'8px' }}>{formatarMoeda(m.valor)}</td><td style={{ padding:'8px' }}>{m.dataVencimento?.split('-').reverse().join('/')}</td><td style={{ padding:'8px', color:'#666' }}>{m.descricaoExtrato}</td><td style={{ padding:'8px', textAlign:'center' }}><span style={{ fontSize:'11px', padding:'3px 8px', borderRadius:'10px', backgroundColor: m.confianca==='exata'?'#d4edda':'#fff3cd', color: m.confianca==='exata'?'#155724':'#856404' }}>{m.confianca}</span></td></tr>))}</tbody></table></div>
        </div>
      )}

      {/* Tela de classificação manual */}
      {telaClassificar && itensClassificar.length > 0 && (
        <div style={{ position: 'fixed', top:0,left:0,right:0,bottom:0, backgroundColor:'rgba(0,0,0,0.6)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:3000 }}>
          <div style={{ backgroundColor:'#fff', padding:'25px', borderRadius:'16px', width:'95%', maxWidth:'700px', maxHeight:'80vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px' }}>
              <h3 style={{ margin:0, fontSize:'18px', color:'#333' }}>📋 Classificar Itens do Extrato</h3>
              <button onClick={() => { setTelaClassificar(false); setItensClassificar([]); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#999' }}><X size={20}/></button>
            </div>
            <p style={{ fontSize:'12px', color:'#666', marginBottom:'15px' }}>Selecione os itens que ainda não foram lançados. Edite os campos se necessário. Itens já existentes no sistema aparecem com alerta.</p>
            {itensClassificar.map((item, idx) => {
              const jaExiste = (dadosMesFiltro || []).some(l => l.valor === item.valor && l.dataVencimento === item.data && l.status === 'Pendente');
              return (
                <div key={idx} style={{ display:'flex', gap:'6px', alignItems:'center', marginBottom:'8px', padding:'8px', backgroundColor: item._selecionado ? '#e8f5e9' : '#fafafa', borderRadius:'8px', border: jaExiste ? '1px solid #fecaca' : '1px solid #e5e7eb', flexWrap:'wrap' }}>
                  <input type="checkbox" checked={!!item._selecionado} onChange={() => toggleClassificar(idx)} />
                  <input type="text" value={item.descricao} onChange={e => atualizarItem(idx, 'descricao', e.target.value)} style={{ flex: 2, padding:'6px', borderRadius:'4px', border:'1px solid #ddd', fontSize:'12px', minWidth:'120px' }} />
                  <input type="date" value={item.data} onChange={e => atualizarItem(idx, 'data', e.target.value)} style={{ padding:'6px', borderRadius:'4px', border:'1px solid #ddd', fontSize:'12px', width:'130px' }} />
                  <input type="number" step="0.01" value={item.valor} onChange={e => atualizarItem(idx, 'valor', e.target.value)} style={{ padding:'6px', borderRadius:'4px', border:'1px solid #ddd', fontSize:'12px', width:'90px' }} />
                  {jaExiste && <span style={{ fontSize:'10px', color:'#dc2626', fontWeight:'bold' }}>⚠️ Já existe</span>}
                </div>
              );
            })}
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'15px', borderTop:'1px solid #eee', paddingTop:'15px' }}>
              <button onClick={() => { setTelaClassificar(false); setItensClassificar([]); }} style={{ padding:'10px 20px', border:'1px solid #ccc', borderRadius:'6px', background:'#fff', cursor:'pointer' }}>Cancelar</button>
              <button onClick={handleClassificarLancar} disabled={baixando || !itensClassificar.some(i => i._selecionado)} style={{ padding:'10px 20px', backgroundColor:'#28a745', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer', opacity: baixando ? 0.5 : 1 }}>
                {baixando ? 'Lançando...' : `Lançar como Pago (${itensClassificar.filter(i=>i._selecionado).length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
