import { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, Key, Mail, User, Settings, CheckSquare, Square } from 'lucide-react'
import { API_BASE } from '../../config'

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
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [exibirForm, setExibirForm] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const [resetUid, setResetUid] = useState(null)
  const [novaSenha, setNovaSenha] = useState('')

  const [editPermUid, setEditPermUid] = useState(null)
  const [editPerm, setEditPerm] = useState({})

  const buscarUsuarios = async () => {
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch(`${API_BASE}/admin/usuarios`)
      if (!res.ok) throw new Error('Erro ao buscar')
      const data = await res.json()
      setUsuarios(data.usuarios || [])
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
        const res = await fetch(`${API_BASE}/admin/usuarios`);
        if (!res.ok) throw new Error('Erro ao buscar');
        const data = await res.json();
        if (!ignore) setUsuarios(data.usuarios || []);
      } catch (err) {
        if (!ignore) setErro(err.message);
      } finally {
        if (!ignore) setCarregando(false);
      }
    }
    fetchData();
    return () => { ignore = true; };
  }, [])

  const handleCriar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      const res = await fetch(`${API_BASE}/admin/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro || 'Erro ao criar')
      setNome(''); setEmail(''); setSenha(''); setExibirForm(false)
      buscarUsuarios()
    } catch (err) {
      alert(err.message)
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (uid, emailUser) => {
    if (!window.confirm(`Excluir permanentemente o usuario ${emailUser}?`)) return
    try {
      const res = await fetch(`${API_BASE}/admin/usuarios/${uid}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro || 'Erro ao excluir')
      buscarUsuarios()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleResetSenha = async (e) => {
    e.preventDefault()
    if (!novaSenha || novaSenha.length < 6) return alert('Minimo 6 caracteres')
    try {
      const res = await fetch(`${API_BASE}/admin/usuarios/${resetUid}/reset-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novaSenha }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro || 'Erro ao redefinir')
      alert('Senha redefinida com sucesso!')
      setResetUid(null); setNovaSenha('')
    } catch (err) {
      alert(err.message)
    }
  }

  const abrirEditarPermissoes = (u) => {
    setEditPermUid(u.uid)
    setEditPerm({ ...(u.permissoes || {}) })
  }

  const togglePermissao = (key) => {
    setEditPerm(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSalvarPermissoes = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/usuarios/${editPermUid}/permissoes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissoes: editPerm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro || 'Erro ao salvar')
      alert('Permissoes atualizadas!')
      setEditPermUid(null); setEditPerm({})
      buscarUsuarios()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: cores?.texto, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={28} color={cores?.dourado} /> Administração de Usuários
        </h2>
        <button
          onClick={() => setExibirForm(!exibirForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer', backgroundColor: exibirForm ? '#6c757d' : cores?.dourado, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}
        >
          <Plus size={18} /> {exibirForm ? 'Cancelar' : 'Novo Usuário'}
        </button>
      </div>

      {exibirForm && (
        <form onSubmit={handleCriar} style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap', borderTop: `4px solid ${cores?.dourado}` }}>
          <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Nome Completo</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Ex: Tobias Rocha" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="exemplo@gmail.com" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Senha (min. 6)</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required minLength={6} placeholder="******" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" disabled={salvando} style={{ padding: '11px 25px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {salvando ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>
          <div style={{ width: '100%', fontSize: '12px', color: '#888', marginTop: '4px' }}>
            Após criar, edite as permissões do usuário nos botões <Settings size={12} style={{verticalAlign:'middle'}}/> abaixo.
          </div>
        </form>
      )}

      {resetUid && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setResetUid(null)}>
          <form onSubmit={handleResetSenha} onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: 0, color: cores?.texto }}>Redefinir Senha</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Nova Senha (min. 6 caracteres)</label>
              <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required minLength={6} placeholder="******" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setResetUid(null); setNovaSenha(''); }} style={{ padding: '10px 20px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Redefinir</button>
            </div>
          </form>
        </div>
      )}

      {editPermUid && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => { setEditPermUid(null); setEditPerm({}); }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', width: '90%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: 0, color: cores?.texto, display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={20} color={cores?.dourado} /> Permissões de Acesso</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
              Marque os módulos que este usuário pode acessar:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {MODULOS.map(m => (
                <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                  <span onClick={() => togglePermissao(m.key)} style={{ display: 'flex', alignItems: 'center', color: editPerm[m.key] ? '#28a745' : '#ccc', cursor: 'pointer' }}>
                    {editPerm[m.key] ? <CheckSquare size={20} /> : <Square size={20} />}
                  </span>
                  {m.label}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setEditPermUid(null); setEditPerm({}); }} style={{ padding: '10px 20px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSalvarPermissoes} style={{ padding: '10px 20px', backgroundColor: cores?.dourado, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar Permissões</button>
            </div>
          </div>
        </div>
      )}

      {carregando ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>Carregando usuários...</div>
      ) : erro ? (
        <div style={{ padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px' }}>{erro}</div>
      ) : (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
              <tr>
                <th style={{ padding: '15px', textAlign: 'left', color: '#495057' }}>Nome</th>
                <th style={{ padding: '15px', textAlign: 'left', color: '#495057' }}>Email</th>
                <th style={{ padding: '15px', textAlign: 'center', color: '#495057' }}>Módulos</th>
                <th style={{ padding: '15px', textAlign: 'center', color: '#495057' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>Nenhum usuário cadastrado.</td></tr>
              ) : (
                usuarios.map(u => (
                  <tr key={u.uid} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <td style={{ padding: '12px 15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '50%' }}><User size={18} color="#495057" /></div>
                      <div>
                        <strong style={{ color: '#333', display: 'block' }}>{u.nome}</strong>
                        <span style={{ fontSize: '11px', color: '#888', padding: '2px 6px', backgroundColor: u.isSuperadmin ? '#d4edda' : '#e9ecef', borderRadius: '8px' }}>{u.isSuperadmin ? 'superadmin' : 'usuario'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 15px', color: '#555' }}>
                      <Mail size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />{u.email}
                    </td>
                    <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                      {u.isSuperadmin ? (
                        <span style={{ fontSize: '11px', color: '#28a745', fontWeight: 'bold' }}>Todos</span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#888' }}>
                          {MODULOS.filter(m => u.permissoes && u.permissoes[m.key]).length} de {MODULOS.length}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {!u.isSuperadmin && (
                          <button onClick={() => abrirEditarPermissoes(u)} title="Permissões" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', backgroundColor: '#e8f0fe', border: '1px solid #c4d7f2', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#1a73e8' }}>
                            <Settings size={14} />
                          </button>
                        )}
                        <button onClick={() => { setResetUid(u.uid); setNovaSenha(''); }} title="Redefinir senha" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#856404' }}>
                          <Key size={14} />
                        </button>
                        {!u.isSuperadmin && (
                          <button onClick={() => handleExcluir(u.uid, u.email)} title="Excluir usuário" style={{ padding: '6px 10px', backgroundColor: '#fff', border: '1px solid #f5c6cb', borderRadius: '6px', cursor: 'pointer', color: '#dc3545' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
