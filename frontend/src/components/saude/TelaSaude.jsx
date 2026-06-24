import { useState } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useFirestore } from '../../hooks/useFirestore';
import { useUploadSaude } from '../../hooks/useUploadSaude';
import { HeartPulse, Plus, Calendar, Activity, Syringe, Pill, Stethoscope, FileText, Trash2, Pencil, AlertCircle, UploadCloud, CheckCircle, Bell } from 'lucide-react';
import { API_BASE } from '../../config';

export default function TelaSaude({ cores }) {
  const { dados: registros, carregando: carregandoRegistros, recarregar: recarregarRegistros } = useFirestore('saude');
  const { dados: perfis, carregando: carregandoPerfis } = useFirestore('perfis');

  const [exibirForm, setExibirForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [idEditando, setIdEditando] = useState(null);

  const [perfilId, setPerfilId] = useState('');
  const [tipo, setTipo] = useState('Consulta'); 
  const [titulo, setTitulo] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [localProfissional, setLocalProfissional] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [linkAnexo, setLinkAnexo] = useState('');

  const [disparandoAlertas, setDisparandoAlertas] = useState(false);

  const handleDispararAlertas = async () => {
    setDisparandoAlertas(true);
    try {
      const res = await fetch(`${API_BASE}/disparar-alertas-saude`, { method: 'POST' });
      const dados = await res.json();
      if (dados.ok) {
        alert(`📬 Alertas de Saúde enviados!\n\n` +
          `📊 Eventos escaneados: ${dados.eventosEscaneados}\n` +
          `⏰ Eventos no prazo: ${dados.eventosNoPrazo}\n` +
          `📧 Emails: ${dados.emailsEnviados} enviados, ${dados.emailsFalhas} falhas\n` +
          `📱 WhatsApp: ${dados.whatsappsEnviados} enviados, ${dados.whatsappsFalhas} falhas\n\n` +
          `${dados.resumo}`
        );
      } else {
        alert("Erro: " + (dados.erro || 'Falha desconhecida'));
      }
    } catch { alert("Falha ao conectar com o servidor."); } finally { setDisparandoAlertas(false); }
  };

  const { enviando: enviandoAnexo, enviarArquivo } = useUploadSaude();

  const resetarFormulario = () => {
    setPerfilId(''); setTipo('Consulta'); setTitulo(''); setDataEvento('');
    setLocalProfissional(''); setObservacoes(''); setLinkAnexo('');
    setIdEditando(null); setExibirForm(false);
  };

  const handleUploadArquivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dados = await enviarArquivo(file);
    if (dados?.linkArquivo) {
      setLinkAnexo(dados.linkArquivo);
    }
  };

  const handleSalvarRegistro = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const novoRegistro = {
        perfilId, tipo, titulo, dataEvento, localProfissional, observacoes, linkAnexo,
        criadoEm: new Date().toISOString()
      };
      if (idEditando) await updateDoc(doc(db, 'saude', idEditando), { ...novoRegistro, atualizadoEm: new Date().toISOString() });
      else await addDoc(collection(db, 'saude'), novoRegistro);
      
      resetarFormulario(); recarregarRegistros();
    } catch {
      alert("Falha ao gravar no banco de dados.");
    } finally {
      setSalvando(false);
    }
  };

  const handleEditar = (item) => {
    setPerfilId(item.perfilId); setTipo(item.tipo); setTitulo(item.titulo);
    setDataEvento(item.dataEvento); setLocalProfissional(item.localProfissional || '');
    setObservacoes(item.observacoes || ''); setLinkAnexo(item.linkAnexo || '');
    setIdEditando(item.id); setExibirForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Remover este registro do histórico?")) return;
    try { await deleteDoc(doc(db, 'saude', id)); recarregarRegistros(); } 
    catch { alert("Erro ao excluir."); }
  };

  const obterNomePerfil = (id) => {
    const perfil = perfis.find(p => p.id === id);
    return perfil ? perfil.nome : 'Perfil Removido';
  };

  const renderIconeTipo = (tipoRegistro) => {
    switch (tipoRegistro) {
      case 'Consulta': return <Stethoscope size={20} color="#17a2b8" />;
      case 'Exame': return <Activity size={20} color="#6f42c1" />;
      case 'Vacina': return <Syringe size={20} color="#28a745" />;
      case 'Medicação': return <Pill size={20} color="#fd7e14" />;
      default: return <HeartPulse size={20} color={cores?.dourado} />;
    }
  };

  if (carregandoRegistros || carregandoPerfis) return <div style={{ padding: '40px', textAlign: 'center', color: cores?.dourado }}>Sincronizando Prontuários...</div>;

  const hoje = new Date().toISOString().slice(0, 10);
  const proximosEventos = registros.filter(r => r.dataEvento >= hoje).sort((a, b) => new Date(a.dataEvento) - new Date(b.dataEvento));
  const historico = registros.filter(r => r.dataEvento < hoje).sort((a, b) => new Date(b.dataEvento) - new Date(a.dataEvento));

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: cores?.texto, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HeartPulse size={28} color={cores?.dourado} /> Hub de Saúde e Bem-Estar
        </h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => { if (exibirForm) resetarFormulario(); else setExibirForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer', backgroundColor: exibirForm ? '#6c757d' : cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            {exibirForm ? 'Cancelar' : <><Plus size={18} /> Novo Registro</>}
          </button>
          <button type="button" onClick={handleDispararAlertas} disabled={disparandoAlertas} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            <Bell size={18} /> {disparandoAlertas ? 'Enviando...' : 'Alertas'}
          </button>
        </div>
      </div>

      {exibirForm && (
        <form onSubmit={handleSalvarRegistro} style={{ backgroundColor: cores?.branco, padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap', borderTop: `4px solid ${idEditando ? '#17a2b8' : cores?.dourado}` }}>
          
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>Paciente / Perfil</label><select value={perfilId} onChange={e => setPerfilId(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}><option value="">Selecione...</option>{perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>Categoria</label><select value={tipo} onChange={e => setTipo(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}><option value="Consulta">Consulta Médica/Vet</option><option value="Exame">Exame (Sangue, Imagem...)</option><option value="Vacina">Vacina / Imunização</option><option value="Medicação">Medicação Contínua</option></select></div>
          <div style={{ flex: '2 1 250px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>Descrição (Ex: Vacina V10, Cardiologista...)</label><input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>Data</label><input type="date" value={dataEvento} onChange={e => setDataEvento(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
          <div style={{ flex: '2 1 250px', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>Profissional ou Clínica</label><input type="text" placeholder="Nome do médico ou laboratório" value={localProfissional} onChange={e => setLocalProfissional(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
          <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '5px' }}><label style={{ fontSize: '14px', fontWeight: 'bold' }}>Anotações / Posologia</label><textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', minHeight: '60px' }} /></div>

          {/* NOVO CAMPO DE UPLOAD REAL */}
          <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '8px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px dashed #ccc' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UploadCloud size={18} color={cores?.dourado} /> Anexar Exame / Receita (Google Drive)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <input type="file" accept="image/*,application/pdf" onChange={handleUploadArquivo} disabled={enviandoAnexo} style={{ padding: '8px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #ddd', flex: '1 1 250px' }} />
              
              {enviandoAnexo && <span style={{ color: '#0056b3', fontSize: '14px', fontWeight: 'bold' }}>Enviando...</span>}
              
              {linkAnexo && !enviandoAnexo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#28a745', fontWeight: 'bold', fontSize: '14px' }}>
                  <CheckCircle size={18} /> Documento Anexado com Sucesso!
                </div>
              )}
            </div>
            {/* Mantido invisível o input original do link para compatibilidade de edição */}
            {linkAnexo && <input type="hidden" value={linkAnexo} />}
          </div>

          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" disabled={salvando || enviandoAnexo} style={{ padding: '12px 25px', backgroundColor: cores?.dourado, color: cores?.branco, border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: (salvando || enviandoAnexo) ? 'not-allowed' : 'pointer' }}>
              {salvando ? 'Salvando...' : 'Salvar Prontuário'}
            </button>
          </div>
        </form>
      )}

      {/* DASHBOARD DIVIDIDO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
        <div>
          <h3 style={{ color: cores?.texto, borderBottom: `2px solid ${cores?.dourado}`, paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={20} color="#dc3545" /> Próximos Compromissos</h3>
          {proximosEventos.length === 0 ? <div style={{ backgroundColor: cores?.branco, padding: '20px', borderRadius: '12px', textAlign: 'center', color: '#999', border: '1px dashed #ccc' }}>Nenhum evento futuro.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {proximosEventos.map(item => (
                <div key={item.id} style={{ backgroundColor: cores?.branco, padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', gap: '15px', borderLeft: `4px solid ${cores?.dourado}` }}>
                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{renderIconeTipo(item.tipo)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong style={{ fontSize: '15px', color: cores?.texto }}>{item.titulo}</strong><span style={{ fontSize: '12px', fontWeight: 'bold', color: '#dc3545' }}>{item.dataEvento.split('-').reverse().join('/')}</span></div>
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Paciente: <strong>{obterNomePerfil(item.perfilId)}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                      {item.linkAnexo ? <a href={item.linkAnexo} target="_blank" rel="noreferrer" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#0056b3', textDecoration: 'none', fontWeight: 'bold' }}><FileText size={14} /> Ver Anexo</a> : <span></span>}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => handleEditar(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3' }}><Pencil size={14}/></button>
                        <button onClick={() => handleExcluir(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}><Trash2 size={14}/></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 style={{ color: cores?.texto, borderBottom: `2px solid #ccc`, paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={20} color="#666" /> Histórico Médico</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {historico.length === 0 ? <p style={{ color: '#999', fontSize: '14px', textAlign: 'center' }}>Histórico vazio.</p> : (
              historico.map(item => (
                <div key={item.id} style={{ backgroundColor: '#fdfdfd', padding: '15px', borderRadius: '12px', border: '1px solid #eaeaea', display: 'flex', gap: '15px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f1f3f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{renderIconeTipo(item.tipo)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong style={{ fontSize: '14px', color: '#555' }}>{item.titulo}</strong><span style={{ fontSize: '12px', color: '#888' }}>{item.dataEvento.split('-').reverse().join('/')}</span></div>
                    <div style={{ fontSize: '12px', color: '#777', marginTop: '2px' }}>Paciente: {obterNomePerfil(item.perfilId)}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                      {item.linkAnexo ? <a href={item.linkAnexo} target="_blank" rel="noreferrer" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#0056b3', textDecoration: 'none', fontWeight: 'bold' }}><FileText size={14} /> Ver Anexo</a> : <span></span>}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => handleEditar(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0056b3' }}><Pencil size={14}/></button>
                        <button onClick={() => handleExcluir(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}><Trash2 size={14}/></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}