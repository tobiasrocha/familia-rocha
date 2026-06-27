import { useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, FileSearch, X, Loader } from 'lucide-react';
import { apiFetch } from '../../config';

export default function ConciliadorExtrato({ cores, onBaixas, dadosMesFiltro, contasBancarias }) {
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [sucesso, setSucesso] = useState('');
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [baixando, setBaixando] = useState(false);
  const [selecionados, setSelecionados] = useState(new Set());
  const [telaClassificar, setTelaClassificar] = useState(false);
  const [itensClassificar, setItensClassificar] = useState([]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEnviando(true); setErro(''); setSucesso(''); setResultado(null); setSelecionados(new Set()); setProgresso(0);

    const intervalo = setInterval(() => setProgresso(p => Math.min(p + 10, 80)), 500);
    const formData = new FormData(); formData.append('documento', file);

    try {
      const res = await apiFetch(`/conciliar-extrato`, { method: 'POST', body: formData });
      setProgresso(100);
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.erro || 'Erro ao processar');
      setResultado(dados);
      setSucesso(`Extrato processado! ${dados.totalPendentes || 0} contas pendentes, ${dados.matches?.length || 0} correspondências.`);

      // Junta todos os itens (matches + unmatched) para classificação
      const todos = [];
      if (dados.itensExtrato) {
        dados.itensExtrato.forEach(item => {
          const match = dados.matches?.find(m => m.descricaoExtrato === item.descricao || m.valor === item.valor);
          todos.push({
            descricao: item.descricao || '',
            valor: item.valor || 0,
            data: item.data || '',
            natureza: item.tipo || 'Despesa',
            contaId: '',
            _matched: !!match,
            _matchId: match?.idFirestore || null,
            _selecionado: !!match,
          });
        });
      }
      if (todos.length > 0 || dados.matches?.length > 0) {
        setItensClassificar(todos.length > 0 ? todos : (dados.matches || []).map(m => ({
          descricao: m.descricao || '',
          valor: m.valor || 0,
          data: m.dataVencimento || '',
          natureza: 'Despesa',
          contaId: '',
          _matched: true,
          _matchId: m.idFirestore || null,
          _selecionado: true,
        })));
        setTelaClassificar(true);
      } else {
        // Sempre abre popup, mesmo sem itens — permite adicionar manualmente
        setItensClassificar([{ descricao: '', valor: 0, data: new Date().toISOString().slice(0,10), natureza: 'Despesa', contaId: '', _matched: false, _matchId: null, _selecionado: false }]);
        setTelaClassificar(true);
      }
    } catch (err) { setErro(err.message || 'Falha ao processar'); }
    finally { clearInterval(intervalo); setEnviando(false); }
  };

  const handleClassificarLancar = async () => {
    const selecionadas = itensClassificar.filter(i => i._selecionado);
    if (selecionadas.length === 0) { alert('Selecione ao menos um item.'); return; }
    setBaixando(true);
    try {
      const matchIds = selecionadas.filter(i => i._matchId).map(i => i._matchId);
      const novos = selecionadas.filter(i => !i._matchId).map(i => ({ descricao: i.descricao, valor: i.valor, data: i.data, tipo: i.natureza, contaId: i.contaId, categoria: 'Outros' }));
      const body = {};
      if (matchIds.length > 0) body.ids = matchIds;
      if (novos.length > 0) body.itens = novos;

      const res = await apiFetch(`/baixar-conciliados`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Erro ao lançar');
      const dados = await res.json();
      setSucesso(dados.msg || `${selecionadas.length} itens processados!`);
      setTelaClassificar(false); setItensClassificar([]);
      onBaixas();
    } catch { alert('Erro ao processar.'); }
    finally { setBaixando(false); }
  };

  const toggleSelecionado = (id) => { const novo = new Set(selecionados); novo.has(id) ? novo.delete(id) : novo.add(id); setSelecionados(novo); };
  const selecionarTodos = () => {
    if (!resultado?.matches?.length) return;
    if (selecionados.size === resultado.matches.length) setSelecionados(new Set());
    else setSelecionados(new Set(resultado.matches.map(m => m.idFirestore)));
  };

  const handleBaixar = async () => {
    if (selecionados.size === 0) return;
    setBaixando(true);
    try {
      const res = await apiFetch(`/baixar-conciliados`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selecionados] }) });
      const dados = await res.json();
      setSucesso(dados.msg);
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

  const selecionarTodosClassificar = () => {
    const todos = itensClassificar.every(i => i._selecionado);
    setItensClassificar(itensClassificar.map(i => ({ ...i, _selecionado: !todos })));
  };

  const atualizarItem = (idx, campo, valor) => {
    const nova = [...itensClassificar];
    nova[idx][campo] = campo === 'valor' ? (parseFloat(valor) || 0) : valor;
    setItensClassificar(nova);
  };

  return (
    <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: '20px' }}>
      <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px', color: cores?.texto }}><FileSearch size={20} color={cores?.dourado} /> Conciliação de Extrato</h4>

      <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <UploadCloud size={28} color={cores?.dourado} />
        <div style={{ flex: 1 }}><span style={{ display: 'block', fontWeight: 'bold', fontSize: '14px' }}>Upload de Extrato Bancário (PDF, OFX, OFC, TXT ou Imagem)</span><span style={{ display: 'block', fontSize: '12px', color: '#666' }}>O sistema processa o extrato e cruza com contas pendentes.</span></div>
        <input type="file" accept=".pdf,image/*,.txt,.ofc,.ofx" onChange={handleUpload} disabled={enviando} style={{ display: 'none' }} id="fileExtrato" />
        <label htmlFor="fileExtrato" style={{ cursor: enviando ? 'wait' : 'pointer', padding: '8px 15px', backgroundColor: '#0056b3', color: '#fff', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
          {enviando ? `Processando... ${progresso}%` : 'Selecionar Extrato'}
        </label>
      </div>

      {enviando && (
        <div style={{ marginTop: '10px', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progresso}%`, backgroundColor: '#0056b3', borderRadius: '3px', transition: 'width 0.3s' }} />
        </div>
      )}

      {sucesso && <div style={{ marginTop: '12px', padding: '10px', borderRadius: '6px', backgroundColor: '#d4edda', color: '#155724', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} /> {sucesso}</div>}
      {erro && <div style={{ marginTop: '12px', padding: '10px', borderRadius: '6px', backgroundColor: '#f8d7da', color: '#721c24', fontSize: '13px' }}><AlertCircle size={14} style={{verticalAlign:'middle'}}/> {erro}</div>}

      {resultado && resultado.matches?.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: '#666' }}><strong>{resultado.matches.length}</strong> correspondências encontradas</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={selecionarTodos} style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}>{selecionados.size === resultado.matches.length ? 'Desmarcar Todos' : 'Marcar Todos'}</button>
              <button onClick={handleBaixar} disabled={baixando || selecionados.size === 0} style={{ padding: '6px 15px', fontSize: '12px', backgroundColor: selecionados.size > 0 ? '#28a745' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}><CheckCircle size={14} /> {baixando ? 'Baixando...' : `Dar Baixa (${selecionados.size})`}</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}><table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}><thead><tr style={{ borderBottom:'2px solid #eee' }}><th style={{ padding:'8px', width:'30px' }}></th><th style={{ padding:'8px' }}>Descrição</th><th style={{ padding:'8px' }}>Valor</th><th style={{ padding:'8px' }}>Vencimento</th><th style={{ padding:'8px' }}>Extrato</th></tr></thead><tbody>{resultado.matches.map(m=>(<tr key={m.idFirestore} style={{ borderBottom:'1px solid #eee', backgroundColor: selecionados.has(m.idFirestore) ? '#e8f5e9' : 'transparent' }}><td style={{ padding:'8px' }}><input type="checkbox" checked={selecionados.has(m.idFirestore)} onChange={()=>toggleSelecionado(m.idFirestore)} /></td><td style={{ padding:'8px', fontWeight:'bold' }}>{m.descricao}</td><td style={{ padding:'8px' }}>{formatarMoeda(m.valor)}</td><td style={{ padding:'8px' }}>{m.dataVencimento?.split('-').reverse().join('/')}</td><td style={{ padding:'8px', color:'#666' }}>{m.descricaoExtrato}</td></tr>))}</tbody></table></div>
        </div>
      )}

      {/* Tela de classificação completa */}
      {telaClassificar && itensClassificar.length > 0 && (
        <div style={{ position: 'fixed', top:0,left:0,right:0,bottom:0, backgroundColor:'rgba(0,0,0,0.6)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:3000 }}>
          <div style={{ backgroundColor:'#fff', padding:'25px', borderRadius:'16px', width:'95%', maxWidth:'800px', maxHeight:'85vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px' }}>
              <h3 style={{ margin:0, fontSize:'18px', color:'#333' }}>📋 Classificar Itens do Extrato</h3>
              <button onClick={() => { setTelaClassificar(false); setItensClassificar([]); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#999' }}><X size={20}/></button>
            </div>
            <p style={{ fontSize:'12px', color:'#666', marginBottom:'15px' }}>
              Itens com ✅ já estão conciliados. Edite e classifique manualmente. Selecione os que deseja lançar como pagos.
            </p>
            <div style={{ marginBottom:'10px' }}>
              <button onClick={selecionarTodosClassificar} style={{ padding:'6px 12px', fontSize:'11px', border:'1px solid #ccc', borderRadius:'4px', background:'#fff', cursor:'pointer' }}>
                {itensClassificar.every(i => i._selecionado) ? 'Desmarcar Todos' : 'Marcar Todos'}
              </button>
            </div>
            {itensClassificar.map((item, idx) => {
              const jaExiste = (dadosMesFiltro || []).some(l => l.valor === item.valor && l.dataVencimento === item.data && l.status === 'Pendente');
              return (
                <div key={idx} style={{ display:'flex', gap:'6px', alignItems:'center', marginBottom:'6px', padding:'8px', backgroundColor: item._matched ? '#e8f5e9' : item._selecionado ? '#fff3cd' : '#fafafa', borderRadius:'8px', border: jaExiste && !item._matched ? '1px solid #fecaca' : '1px solid #e5e7eb', flexWrap:'wrap' }}>
                  <input type="checkbox" checked={!!item._selecionado} onChange={() => toggleClassificar(idx)} />
                  {item._matched && <span style={{ fontSize:'11px', color:'#16a34a', fontWeight:'bold' }}>✅</span>}
                  <input type="text" value={item.descricao} onChange={e => atualizarItem(idx, 'descricao', e.target.value)} style={{ flex: 2, padding:'6px', borderRadius:'4px', border:'1px solid #ddd', fontSize:'12px', minWidth:'120px' }} />
                  <select value={item.natureza} onChange={e => atualizarItem(idx, 'natureza', e.target.value)} style={{ padding:'6px', borderRadius:'4px', border:'1px solid #ddd', fontSize:'12px', width:'100px' }}>
                    <option value="Despesa">Débito</option><option value="Receita">Crédito</option>
                  </select>
                  <select value={item.contaId} onChange={e => atualizarItem(idx, 'contaId', e.target.value)} style={{ padding:'6px', borderRadius:'4px', border:'1px solid #ddd', fontSize:'11px', width:'110px' }}>
                    <option value="">Conta destino</option>
                    {(contasBancarias || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  <input type="date" value={item.data} onChange={e => atualizarItem(idx, 'data', e.target.value)} style={{ padding:'6px', borderRadius:'4px', border:'1px solid #ddd', fontSize:'12px', width:'130px' }} />
                  <input type="number" step="0.01" value={item.valor} onChange={e => atualizarItem(idx, 'valor', e.target.value)} style={{ padding:'6px', borderRadius:'4px', border:'1px solid #ddd', fontSize:'12px', width:'90px' }} />
                  {jaExiste && !item._matched && <span style={{ fontSize:'10px', color:'#dc2626', fontWeight:'bold' }}>⚠️ Já existe</span>}
                </div>
              );
            })}
            <button onClick={() => setItensClassificar(i => [...i, { descricao: '', valor: 0, data: new Date().toISOString().slice(0,10), natureza: 'Despesa', contaId: '', _matched: false, _matchId: null, _selecionado: false }])} style={{ marginTop:'8px', padding:'6px 12px', border:'1px dashed #C5A059', borderRadius:'6px', background:'#fff', cursor:'pointer', fontSize:'12px', color:'#C5A059', fontWeight:'bold' }}>+ Adicionar Linha</button>
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'15px', borderTop:'1px solid #eee', paddingTop:'15px' }}>
              <button onClick={() => { setTelaClassificar(false); setItensClassificar([]); }} style={{ padding:'10px 20px', border:'1px solid #ccc', borderRadius:'6px', background:'#fff', cursor:'pointer' }}>Cancelar</button>
              <button onClick={handleClassificarLancar} disabled={baixando || !itensClassificar.some(i => i._selecionado)} style={{ padding:'10px 20px', backgroundColor:'#28a745', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer', opacity: baixando ? 0.5 : 1 }}>
                {baixando ? <Loader size={16} style={{animation:'spin 1s linear infinite'}} /> : `Lançar (${itensClassificar.filter(i=>i._selecionado).length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
