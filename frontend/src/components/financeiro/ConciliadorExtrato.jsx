import { useState } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, FileSearch } from 'lucide-react';

export default function ConciliadorExtrato({ cores, onBaixas }) {
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [baixando, setBaixando] = useState(false);
  const [selecionados, setSelecionados] = useState(new Set());

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEnviando(true);
    setErro('');
    setResultado(null);
    setSelecionados(new Set());

    const formData = new FormData();
    formData.append('documento', file);

    try {
      const res = await fetch('/api/conciliar-extrato', { method: 'POST', body: formData });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const texto = await res.text();
        throw new Error(texto.includes('<!doctype') || texto.includes('<html')
          ? 'Servidor indisponivel. Verifique se o backend esta rodando na porta 3000.'
          : `Resposta inesperada: ${texto.substring(0, 100)}`);
      }
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.erro || 'Erro ao processar');
      setResultado(dados);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const toggleSelecionado = (id) => {
    const novo = new Set(selecionados);
    if (novo.has(id)) novo.delete(id); else novo.add(id);
    setSelecionados(novo);
  };

  const selecionarTodos = () => {
    if (!resultado) return;
    if (selecionados.size === resultado.matches.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(resultado.matches.map(m => m.idFirestore)));
    }
  };

  const handleBaixar = async () => {
    if (selecionados.size === 0) return;
    setBaixando(true);
    try {
      const res = await fetch('/api/baixar-conciliados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selecionados] })
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const texto = await res.text();
        throw new Error(texto.includes('<!doctype')
          ? 'Servidor indisponivel.'
          : `Resposta inesperada: ${texto.substring(0, 100)}`);
      }
      const dados = await res.json();
      alert(dados.msg);
      onBaixas();
      setResultado(null);
      setSelecionados(new Set());
    } catch {
      alert('Falha ao dar baixa.');
    } finally {
      setBaixando(false);
    }
  };

  const formatarMoeda = (val) => Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: '20px' }}>
      <h4 style={{ margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px', color: cores?.texto }}>
        <FileSearch size={20} color={cores?.dourado} /> Conciliação de Extrato
      </h4>

      <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <UploadCloud size={28} color={cores?.dourado} />
        <div style={{ flex: 1 }}>
          <span style={{ display: 'block', fontWeight: 'bold', fontSize: '14px' }}>Upload de Extrato Bancário (PDF)</span>
          <span style={{ display: 'block', fontSize: '12px', color: '#666' }}>O sistema vai ler o extrato e encontrar contas pendentes com o mesmo valor.</span>
        </div>
        <input type="file" accept=".pdf,image/*" onChange={handleUpload} disabled={enviando} style={{ display: 'none' }} id="fileExtrato" />
        <label htmlFor="fileExtrato" style={{ cursor: enviando ? 'wait' : 'pointer', padding: '8px 15px', backgroundColor: '#0056b3', color: '#fff', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
          {enviando ? 'Processando...' : 'Selecionar Extrato'}
        </label>
      </div>

      {erro && <div style={{ marginTop: '15px', padding: '10px', borderRadius: '6px', backgroundColor: '#f8d7da', color: '#721c24', fontSize: '13px' }}><AlertCircle size={14} style={{verticalAlign:'middle'}}/> {erro}</div>}

      {resultado && (
        <div style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: '#666' }}>
              <strong>{resultado.matches.length}</strong> de <strong>{resultado.totalPendentes}</strong> contas pendentes encontradas no extrato
            </span>
            {resultado.matches.length > 0 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={selecionarTodos} style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}>
                  {selecionados.size === resultado.matches.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                </button>
                <button type="button" onClick={handleBaixar} disabled={baixando || selecionados.size === 0} style={{ padding: '6px 15px', fontSize: '12px', backgroundColor: selecionados.size > 0 ? '#28a745' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: selecionados.size > 0 ? 'pointer' : 'default', fontWeight: 'bold' }}>
                  <CheckCircle size={14} style={{verticalAlign:'middle'}}/> {baixando ? 'Baixando...' : `Dar Baixa (${selecionados.size})`}
                </button>
              </div>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                  <th style={{ padding: '8px', width: '30px' }}><input type="checkbox" onChange={selecionarTodos} checked={selecionados.size === resultado.matches.length && resultado.matches.length > 0} /></th>
                  <th style={{ padding: '8px' }}>Descrição no Sistema</th>
                  <th style={{ padding: '8px' }}>Valor</th>
                  <th style={{ padding: '8px' }}>Vencimento</th>
                  <th style={{ padding: '8px' }}>Descrição no Extrato</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Confiança</th>
                </tr>
              </thead>
              <tbody>
                {resultado.matches.map(m => (
                  <tr key={m.idFirestore} style={{ borderBottom: '1px solid #eee', backgroundColor: selecionados.has(m.idFirestore) ? '#e8f5e9' : 'transparent' }}>
                    <td style={{ padding: '8px' }}><input type="checkbox" checked={selecionados.has(m.idFirestore)} onChange={() => toggleSelecionado(m.idFirestore)} /></td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{m.descricao}</td>
                    <td style={{ padding: '8px' }}>{formatarMoeda(m.valor)}</td>
                    <td style={{ padding: '8px' }}>{m.dataVencimento?.split('-').reverse().join('/')}</td>
                    <td style={{ padding: '8px', color: '#666' }}>{m.descricaoExtrato}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '10px', backgroundColor: m.confianca === 'exata' ? '#d4edda' : '#fff3cd', color: m.confianca === 'exata' ? '#155724' : '#856404' }}>{m.confianca}</span></td>
                  </tr>
                ))}
                {resultado.matches.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Nenhuma correspondência encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
