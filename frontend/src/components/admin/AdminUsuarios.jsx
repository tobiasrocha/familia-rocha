import { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, Key, Mail, User, Settings, CheckSquare, Square, Pencil, PawPrint, Baby, Calendar, Droplet, AlertTriangle, Phone, Bell } from 'lucide-react'
import { apiFetch } from '../../config'
import { db } from '../../firebaseConfig'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const MODULOS = [
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'tarefas', label: 'Tarefas' },
  { key: 'saude', label: 'Saúde' },
  { key: 'estudos', label: 'Estudos' },
  { key: 'patrimonio', label: 'Patrimônio' },
  { key: 'viagens', label: 'Viagens' },
  { key: 'espiritual', label: 'Espiritual' },
]

export default function AdminUsuarios({ cores }) {
  const [membros, setMembros] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [exibirForm, setExibirForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState(null)

  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('Adulto')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [tipoSanguineo, setTipoSanguineo] = useState('')
  const [alergias, setAlergias] = useState('')
  const [telefone, setTelefone] = useState('')
  const [receberEmail, setReceberEmail] = useState(false)
  const [receberWhatsapp, setReceberWhatsapp] = useState(false)

  const [exibirModalConfigAlertas, setExibirModalConfigAlertas] = useState(false)
  const [configAlertas, setConfigAlertas] = useState({ semanalPendentes: true, diarioVencimento: true, diarioNovasContas: true, quinzenalVencidas: true })

  const [resetId, setResetId] = useState(null)
  const [novaSenha, setNovaSenha] = useState('')

  const [permId, setPermId] = useState(null)
  const [perm, setPerm] = useState({})

  const buscarMembros = async () => {
    setCarregando(true)
    setErro('')
    try {
      const res = await apiFetch('/admin/usuarios')
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erro ${res.status}: ${errorText}`);
      }
      const data = await res.json()
      setMembros(data.usuarios || [])
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      setCarregando(true);
      setErro('');
      try {
        const res = await apiFetch('/admin/usuarios');
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Erro ${res.status}: ${txt}`);
        }
        const data = await res.json();
        if (!ignore) setMembros(data.usuarios || []);
      } catch (err) {
        if (!ignore) setErro(err.message);
      } finally {
        if (!ignore) setCarregando(false);
      }
    }
    fetchData();
    return () => { ignore = true; };
  }, [])

  const resetarForm = () => {
    setNome(''); setTipo('Adulto'); setEmail(''); setSenha('')
    setDataNascimento(''); setTipoSanguineo(''); setAlergias(''); setTelefone('')
    setReceberEmail(false); setReceberWhatsapp(false)
    setEditandoId(null); setExibirForm(false)
  }

  const abrirFormCriar = () => {
    resetarForm()
    setExibirForm(true)
  }

  const abrirEditar = (m) => {
    setNome(m.nome || '')
    setTipo(m.tipo || 'Adulto')
    setEmail(m.email || '')
    setDataNascimento(m.dataNascimento || '')
    setTipoSanguineo(m.tipoSanguineo || '')
    setAlergias(m.alergias || '')
    setTelefone(m.telefone || '')
    setReceberEmail(!!m.receberEmail)
    setReceberWhatsapp(!!m.receberWhatsapp)
    setSenha('')
    setEditandoId(m.id)
    setExibirForm(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    if (!nome.trim()) return alert('Nome obrigatorio.')

    const isAuth = tipo !== 'Pet'
    if (isAuth && !editandoId && !email) {
      return alert('Email obrigatorio para usuario do sistema.')
    }
    if (isAuth && !editandoId && senha && senha.length < 6) {
      return alert('Senha deve ter no minimo 6 caracteres.')
    }

    setSalvando(true)
    try {
      const body = { nome, tipo, dataNascimento, tipoSanguineo, alergias, telefone, receberEmail, receberWhatsapp }
      if (tipo !== 'Pet') body.email = email
      if (!editandoId && senha) body.senha = senha

      const url = editandoId
        ? `/admin/usuarios/${editandoId}`
        : `/admin/usuarios`
      const method = editandoId ? 'PUT' : 'POST'

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro || 'Erro ao salvar')
      resetarForm()
      buscarMembros()
    } catch (err) {
      alert(err.message)
    } finally {
      setSalvando(false)
    }
  }

  const abrirModalConfigAlertas = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'configuracoes', 'alertas'));
      if (docSnap.exists()) setConfigAlertas(docSnap.data());
      setExibirModalConfigAlertas(true);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar configurações de alerta');
    }
  };

  const handleSalvarConfigAlertas = async () => {
    try {
      await setDoc(doc(db, 'configuracoes', 'alertas'), configAlertas);
      setExibirModalConfigAlertas(false);
      alert('Configurações salvas!');
    } catch (e) { alert('Erro ao salvar'); }
  };

  const handleExcluir = async (m) => {
    if (m.isSuperadmin) return
    const msg = m.temAuth ? `Excluir permanentemente ${m.nome} (${m.email})?` : `Excluir permanentemente ${m.nome}?`
    if (!window.confirm(msg)) return
    try {
      const res = await apiFetch(`/admin/usuarios/${m.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro || 'Erro ao excluir')
      buscarMembros()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleResetSenha = async (e) => {
    e.preventDefault()
    if (!novaSenha || novaSenha.length < 6) return alert('Minimo 6 caracteres')
    try {
      const res = await apiFetch(`/admin/usuarios/${resetId}/reset-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novaSenha }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro || 'Erro ao redefinir')
      alert('Senha redefinida!')
      setResetId(null); setNovaSenha('')
    } catch (err) {
      alert(err.message)
    }
  }

  const abrirPermissoes = (m) => {
    setPermId(m.id)
    setPerm({ ...(m.permissoes || {}) })
  }

  const togglePermissao = (key) => {
    setPerm(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSalvarPermissoes = async () => {
    try {
      const res = await apiFetch(`/admin/usuarios/${permId}/permissoes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissoes: perm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro || 'Erro ao salvar')
      alert('Permissoes atualizadas!')
      setPermId(null); setPerm({})
      buscarMembros()
    } catch (err) {
      alert(err.message)
    }
  }

  const renderIcone = (t, size = 20) => {
    if (t === 'Pet') return <PawPrint size={size} color={cores?.dourado} />
    if (t === 'Crianca') return <Baby size={size} color={cores?.dourado} />
    return <User size={size} color={cores?.dourado} />
  }

  const calcularIdade = (data) => {
    if (!data) return ''
    const hoje = new Date()
    const nasc = new Date(data)
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
    return idade
  }

  const authUsers = membros.filter(m => m.temAuth)
  const pets = membros.filter(m => !m.temAuth && m.tipo === 'Pet')

  return (
    <div style={{ padding: '30px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: cores?.texto, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={28} color={cores?.dourado} /> Membros da Família
        </h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={abrirModalConfigAlertas} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            <Bell size={18} /> Configurar Alertas
          </button>
          <button onClick={() => exibirForm ? resetarForm() : abrirFormCriar()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer', backgroundColor: exibirForm ? '#dc3545' : cores?.dourado, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            <Plus size={18} /> {exibirForm ? 'Cancelar' : 'Novo Membro'}
          </button>
        </div>
      </div>

      {exibirForm && (
        <form onSubmit={handleSalvar} style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap', borderTop: `4px solid ${editandoId ? '#17a2b8' : cores?.dourado}` }}>
          <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Nome</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Nome completo" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Tipo</label>
            <select value={tipo} onChange={e => { setTipo(e.target.value); if (e.target.value === 'Pet') { setEmail(''); setSenha(''); } }} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}>
              <option value="Adulto">Adulto</option>
              <option value="Crianca">Criança</option>
              <option value="Pet">Pet</option>
            </select>
          </div>

          {tipo !== 'Pet' && (
            <>
              <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required={!editandoId} placeholder="email@exemplo.com" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#555', marginTop: '4px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={receberEmail} onChange={e => setReceberEmail(e.target.checked)} /> Receber E-mails de Alerta
                </label>
              </div>
              {!editandoId && (
                <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Senha (opcional — use Google)</label>
                  <input type="password" value={senha} onChange={e => setSenha(e.target.value)} minLength={6} placeholder="Deixe em branco para login Google" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
              )}
            </>
          )}

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Nascimento</label>
            <input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Tipo Sanguíneo</label>
            <select value={tipoSanguineo} onChange={e => setTipoSanguineo(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' }}>
              <option value="">--</option>
              <option value="A+">A+</option><option value="A-">A-</option>
              <option value="B+">B+</option><option value="B-">B-</option>
              <option value="AB+">AB+</option><option value="AB-">AB-</option>
              <option value="O+">O+</option><option value="O-">O-</option>
            </select>
          </div>
          <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Telefone</label>
            <input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(84) 99999-9999" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            {tipo !== 'Pet' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#555', marginTop: '4px', cursor: 'pointer' }}>
                <input type="checkbox" checked={receberWhatsapp} onChange={e => setReceberWhatsapp(e.target.checked)} /> Receber WhatsApp de Alerta
              </label>
            )}
          </div>
          <div style={{ flex: '2 1 250px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Alergias / Restrições</label>
            <input type="text" value={alergias} onChange={e => setAlergias(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={resetarForm} style={{ padding: '12px 20px', border: '1px solid #ccc', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
            <button type="submit" disabled={salvando} style={{ padding: '12px 25px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              {salvando ? 'Salvando...' : editandoId ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      )}

      {resetId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setResetId(null)}>
          <form onSubmit={handleResetSenha} onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: 0, color: cores?.texto }}>Redefinir Senha</h3>
            <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required minLength={6} placeholder="Nova senha (min. 6)" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setResetId(null); setNovaSenha(''); }} style={{ padding: '10px 20px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Redefinir</button>
            </div>
          </form>
        </div>
      )}

      {permId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => { setPermId(null); setPerm({}); }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: 0, color: cores?.texto, display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={20} color={cores?.dourado} /> Permissões de Acesso</h3>
            {MODULOS.map(m => (
              <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                <span onClick={() => togglePermissao(m.key)} style={{ display: 'flex', alignItems: 'center', color: perm[m.key] ? '#28a745' : '#ccc', cursor: 'pointer' }}>
                  {perm[m.key] ? <CheckSquare size={20} /> : <Square size={20} />}
                </span>
                {m.label}
              </label>
            ))}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setPermId(null); setPerm({}); }} style={{ padding: '10px 20px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSalvarPermissoes} style={{ padding: '10px 20px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {exibirModalConfigAlertas && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', maxWidth: '500px', width: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={24} color={cores?.dourado} /> Configurações de Alertas
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={configAlertas.semanalPendentes} onChange={e => setConfigAlertas(c => ({...c, semanalPendentes: e.target.checked}))} style={{ marginTop: '4px' }} />
                <div><strong style={{ display: 'block', color: '#2c3e50' }}>Semanal - Pendentes (Segundas)</strong><span style={{ fontSize: '12px', color: '#666' }}>Dispara toda segunda-feira listando as contas que vencem nos próximos 7 dias.</span></div>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={configAlertas.diarioVencimento} onChange={e => setConfigAlertas(c => ({...c, diarioVencimento: e.target.checked}))} style={{ marginTop: '4px' }} />
                <div><strong style={{ display: 'block', color: '#2c3e50' }}>Diário - Vencem Hoje</strong><span style={{ fontSize: '12px', color: '#666' }}>Dispara todos os dias listando apenas as contas que vencem no exato dia atual.</span></div>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={configAlertas.diarioNovasContas} onChange={e => setConfigAlertas(c => ({...c, diarioNovasContas: e.target.checked}))} style={{ marginTop: '4px' }} />
                <div><strong style={{ display: 'block', color: '#2c3e50' }}>Diário - Contas Lançadas Recentemente</strong><span style={{ fontSize: '12px', color: '#666' }}>Dispara se uma nova conta foi lançada nas últimas 24h e vai vencer nos próximos 7 dias.</span></div>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={configAlertas.quinzenalVencidas} onChange={e => setConfigAlertas(c => ({...c, quinzenalVencidas: e.target.checked}))} style={{ marginTop: '4px' }} />
                <div><strong style={{ display: 'block', color: '#2c3e50' }}>Quinzenal - Atrasadas (Segundas-feiras)</strong><span style={{ fontSize: '12px', color: '#666' }}>Dispara de 15 em 15 dias listando todas as contas atrasadas nos últimos 15 dias (com juros se aplicável).</span></div>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '30px' }}>
              <button onClick={() => setExibirModalConfigAlertas(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ccc', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
              <button onClick={handleSalvarConfigAlertas} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: cores?.dourado, color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Salvar Configurações</button>
            </div>
          </div>
        </div>
      )}

      {carregando ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>Carregando...</div>
      ) : erro ? (
        <div style={{ padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px' }}>{erro}</div>
      ) : (
        <>
          {authUsers.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ color: cores?.texto, marginBottom: '15px', fontSize: '16px' }}>Usuários do Sistema</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '15px' }}>
                {authUsers.map(m => (
                  <div key={m.id} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', borderTop: `4px solid ${m.isSuperadmin ? '#28a745' : cores?.dourado}`, position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '50%' }}>{renderIcone(m.tipo, 24)}</div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '16px', color: '#333', display: 'block' }}>{m.nome}</strong>
                        <span style={{ fontSize: '11px', color: '#888', padding: '2px 6px', backgroundColor: m.isSuperadmin ? '#d4edda' : '#e9ecef', borderRadius: '8px' }}>{m.isSuperadmin ? 'superadmin' : 'usuario'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <button onClick={() => abrirEditar(m)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#28a745', padding: '4px' }}><Pencil size={16} /></button>
                        {!m.isSuperadmin && (
                          <>
                            <button onClick={() => abrirPermissoes(m)} title="Permissões" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a73e8', padding: '4px' }}><Settings size={16} /></button>
                            <button onClick={() => { setResetId(m.id); setNovaSenha(''); }} title="Senha" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#856404', padding: '4px' }}><Key size={16} /></button>
                            <button onClick={() => handleExcluir(m)} title="Excluir" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '4px' }}><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#495057' }}>
                      {m.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} color="#6c757d" />{m.email} {m.receberEmail && <Bell size={12} color="#28a745" title="Recebe Alertas por E-mail" />}</div>}
                      {m.telefone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} color="#6c757d" />{m.telefone} {m.receberWhatsapp && <Bell size={12} color="#28a745" title="Recebe Alertas no WhatsApp" />}</div>}
                      {m.dataNascimento && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} color="#6c757d" />{m.dataNascimento.split('-').reverse().join('/')} ({calcularIdade(m.dataNascimento)} anos)</div>}
                      {m.tipoSanguineo && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Droplet size={14} color="#dc3545" />Sangue: {m.tipoSanguineo}</div>}
                      {m.alergias && <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', backgroundColor: '#fff3cd', padding: '6px 8px', borderRadius: '6px', color: '#856404' }}><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />{m.alergias}</div>}
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                        {MODULOS.filter(mod => m.permissoes && m.permissoes[mod.key]).length > 0
                          ? `Módulos: ${MODULOS.filter(mod => m.permissoes[mod.key]).map(mo => mo.label).join(', ')}`
                          : 'Nenhum módulo liberado'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pets.length > 0 && (
            <div>
              <h3 style={{ color: cores?.texto, marginBottom: '15px', fontSize: '16px' }}>Pets</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                {pets.map(m => (
                  <div key={m.id} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '18px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', borderTop: `4px solid ${cores?.dourado}`, position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                      <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '50%' }}>{renderIcone('Pet', 24)}</div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '16px', color: '#333', display: 'block' }}>{m.nome}</strong>
                        <span style={{ fontSize: '11px', color: '#888' }}>Pet</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => abrirEditar(m)} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#28a745', padding: '4px' }}><Pencil size={16} /></button>
                        <button onClick={() => handleExcluir(m)} title="Excluir" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '4px' }}><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#495057' }}>
                      {m.dataNascimento && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} color="#6c757d" />{m.dataNascimento.split('-').reverse().join('/')}</div>}
                      {m.alergias && <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', backgroundColor: '#fff3cd', padding: '6px 8px', borderRadius: '6px', color: '#856404' }}><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />{m.alergias}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {authUsers.length === 0 && pets.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Nenhum membro cadastrado.</div>
          )}
        </>
      )}
    </div>
  )
}
