import React from 'react';
import { UploadCloud, User, ArrowRightLeft } from 'lucide-react';

export default function FormularioLancamento({
  cores, perfis, contasBancarias, obterNomePerfil,
  idEditando, descricao, setDescricao, valor, setValor,
  tipo, setTipo, categoria, setCategoria,
  dataVencimento, setDataVencimento, status, setStatus,
  contaIdSelecionada, setContaIdSelecionada,
  perfilTransacaoId, setPerfilTransacaoId,
  isParcelado, setIsParcelado, qtdParcelas, setQtdParcelas,
  listaParcelas,
  linkArquivo, extraindoDados, avisoUpload, tipoAviso,
  salvando, onSalvar, onUploadDocumento,
  categoriesDespesa, categoriasReceita,
  handleGerarCronogramaParcelas, handleAtualizarParcela,
}) {
  return (
    <form onSubmit={onSalvar} style={{ backgroundColor: cores?.branco, padding: '25px', borderRadius: '12px', borderTop: `4px solid ${idEditando ? '#17a2b8' : cores?.dourado}`, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>

      <div style={{ flex: '1 1 100%', backgroundColor: '#f0f8ff', padding: '15px', borderRadius: '8px', border: '1px dashed #0056b3', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
        <UploadCloud size={28} color="#0056b3" />
        <div style={{ flex: 1 }}>
          <span style={{ display: 'block', fontWeight: 'bold', color: '#0056b3', fontSize: '14px' }}>Leitura Inteligente (GCP) & Drive</span>
          <span style={{ display: 'block', fontSize: '12px', color: '#666' }}>Faça upload do boleto/recibo. A IA preencherá os dados e guardará o arquivo na nuvem.</span>
        </div>
        <div>
          <input type="file" onChange={onUploadDocumento} style={{ display: 'none' }} id="fileUploadOcr" />
          <label htmlFor="fileUploadOcr" style={{ cursor: 'pointer', padding: '8px 15px', backgroundColor: '#0056b3', color: '#fff', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
            {extraindoDados ? 'Extraindo dados...' : 'Selecionar Arquivo'}
          </label>
        </div>
      </div>
      {avisoUpload && (
        <div style={{ width: '100%', padding: '12px 15px', marginBottom: '15px', borderRadius: '10px', backgroundColor: tipoAviso === 'erro' ? '#f8d7da' : '#fff3cd', border: tipoAviso === 'erro' ? '1px solid #f5c6cb' : '1px solid #ffeeba', color: tipoAviso === 'erro' ? '#721c24' : '#856404' }}>
          <strong>{tipoAviso === 'erro' ? 'Erro:' : 'Aviso:'}</strong> {avisoUpload}
        </div>
      )}

      <div style={{ flex: '1 1 100%', display: 'flex', gap: '15px', flexWrap: 'wrap', paddingBottom: '15px', borderBottom: '1px solid #eee', marginBottom: '10px' }}>
        <div style={{ flex: '1 1 250px' }}><h4 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}><User size={18}/> Responsável</h4><select value={perfilTransacaoId} onChange={e => setPerfilTransacaoId(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '2px solid #C5A059', width: '100%', fontWeight: 'bold' }}><option value="" disabled>--- Quem pagou/recebeu? ---</option>{perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
        <div style={{ flex: '1 1 250px' }}><h4 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}><ArrowRightLeft size={18}/> Conta Banco</h4><select value={contaIdSelecionada} onChange={e => setContaIdSelecionada(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '2px solid #2c3e50', width: '100%', fontWeight: 'bold' }}><option value="" disabled>--- Selecione o Banco ---</option>{contasBancarias.map(c => <option key={c.id} value={c.id}>{c.nome} ({obterNomePerfil(c.perfilId)})</option>)}</select></div>
      </div>
      <div style={{ flex: '1 1 150px' }}><label>Vencimento</label><input type="date" value={dataVencimento} onChange={e=>setDataVencimento(e.target.value)} required style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc' }} /></div>
      <div style={{ flex: '1 1 150px' }}><label>Tipo</label><select value={tipo} onChange={e=>{setTipo(e.target.value); setCategoria(e.target.value==='Despesa'?'Moradia':'Salario');}} style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc' }}><option value="Despesa">Despesa</option><option value="Receita">Receita</option></select></div>
      <div style={{ flex: '1 1 150px' }}><label>Categoria</label><select value={categoria} onChange={e=>setCategoria(e.target.value)} style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc' }}>{(tipo==='Despesa'?categoriesDespesa:categoriasReceita).map(c=><option key={c} value={c}>{c}</option>)}</select></div>
      <div style={{ flex: '2 1 200px' }}><label>Descrição</label><input type="text" value={descricao} onChange={e=>setDescricao(e.target.value)} required style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc' }} /></div>
      <div style={{ flex: '1 1 150px' }}><label>Valor Total (R$)</label><input type="number" step="0.01" value={valor} onChange={e=>setValor(e.target.value)} required style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc' }} /></div>

      {tipo === 'Despesa' && !idEditando && (
        <div style={{ width: '100%', padding: '15px', backgroundColor: '#fdfcfe', border: '1px solid #e1d8eb', borderRadius: '8px' }}>
          <input type="checkbox" id="chkParcelado" checked={isParcelado} onChange={e => setIsParcelado(e.target.checked)} />
          <label htmlFor="chkParcelado" style={{ fontWeight: 'bold', color: '#5b2d86', marginLeft: '8px', cursor: 'pointer' }}>Compra Parcelada</label>

          {isParcelado && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop:'15px' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '13px' }}>N de Parcelas:</label>
                  <input type="number" min="2" value={qtdParcelas} onChange={e => setQtdParcelas(e.target.value)} style={{ padding: '8px', width: '90px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
                <button type="button" onClick={handleGerarCronogramaParcelas} style={{ marginTop: '22px', padding: '8px 15px', backgroundColor: '#5b2d86', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Gerar Previsão</button>
              </div>

              {listaParcelas.length > 0 && (
                <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', marginTop: '5px' }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#5b2d86' }}>Edite os Vencimentos e Valores:</h5>
                  {listaParcelas.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', width: '30px', color: '#555' }}>{p.numero}</span>
                      <input type="date" value={p.dataVencimento} onChange={(e) => handleAtualizarParcela(idx, 'dataVencimento', e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', flex: 1 }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '14px', color: '#666' }}>R$</span>
                        <input type="number" step="0.01" value={p.valor} onChange={(e) => handleAtualizarParcela(idx, 'valor', e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: '120px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ width: '100%' }}><label>Status</label><select value={status} onChange={e=>setStatus(e.target.value)} style={{ width:'100%', padding:'10px', borderRadius:'6px', border:`2px solid ${status==='Pago'?'#28a745':'#dc3545'}` }}><option value="Pendente">Pendente</option><option value="Pago">Pago</option></select></div>
      {linkArquivo && (
        <div style={{ width: '100%', fontSize: '13px', margin:'5px 0' }}>
          <a href={linkArquivo} target="_blank" rel="noopener noreferrer" style={{ color: '#0056b3', fontWeight: 'bold' }}>📄 Visualizar Documento Anexado no Drive</a>
        </div>
      )}
      <div style={{ width: '100%', textAlign: 'right' }}><button type="submit" disabled={salvando || extraindoDados} style={{ padding: '12px 25px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{salvando ? 'Salvando...' : 'Registrar Transação'}</button></div>
    </form>
  );
}
