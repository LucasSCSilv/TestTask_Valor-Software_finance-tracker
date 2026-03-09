import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Trash2, X, Pencil } from 'lucide-react'

const PRESET_COLORS = [
  '#e8c04a','#60a5fa','#34d399','#f472b6','#a78bfa',
  '#94a3b8','#fb923c','#f87171','#4ade80','#22d3ee'
]

const EMPTY_FORM = { name: '', color: '#e8c04a' }

export default function Categories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [formError, setFormError] = useState('')

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').eq('user_id', user.id).order('name')
    setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => { loadCategories() }, [user])

  function openAdd() {
    setEditingCat(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(cat) {
    setEditingCat(cat)
    setForm({ name: cat.name, color: cat.color })
    setFormError('')
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim()) return setFormError('Please enter a category name.')
    const duplicate = categories.find(c => c.name.toLowerCase() === form.name.trim().toLowerCase() && c.id !== editingCat?.id)
    if (duplicate) return setFormError('A category with this name already exists.')

    setSaving(true)
    const payload = { name: form.name.trim(), color: form.color }
    const { error } = editingCat
      ? await supabase.from('categories').update(payload).eq('id', editingCat.id)
      : await supabase.from('categories').insert({ ...payload, user_id: user.id })

    setSaving(false)
    if (error) return setFormError(error.message)
    setShowForm(false)
    loadCategories()
  }

  async function handleDelete(id) {
    setDeleting(id)
    await supabase.from('categories').delete().eq('id', id)
    setDeleting(null)
    loadCategories()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-white">Categories</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your spending categories</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />New category
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-navy-800 border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold text-lg">{editingCat ? 'Edit category' : 'New category'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input className="input" placeholder="e.g. Gym, Subscriptions..." value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-8 h-8 rounded-lg transition-all duration-150 flex items-center justify-center"
                      style={{ background: c, outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}>
                      {form.color === c && <div className="w-2 h-2 rounded-full bg-white/80" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3">
                <div className="w-3 h-3 rounded-full" style={{ background: form.color }} />
                <span className="text-white text-sm">{form.name || 'Preview'}</span>
              </div>
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl">{formError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
                  {saving ? <div className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-slate-600 text-sm">No custom categories yet.</p>
            <button onClick={openAdd} className="text-gold-400 text-sm hover:text-gold-300 transition-colors mt-2 inline-block">
              Create your first →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white/3 hover:bg-white/5 transition-colors group">
                <div className="w-4 h-4 rounded-lg flex-shrink-0" style={{ background: cat.color }} />
                <p className="text-white text-sm font-medium flex-1">{cat.name}</p>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(cat)} className="text-slate-500 hover:text-gold-400 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(cat.id)} disabled={deleting === cat.id} className="text-slate-500 hover:text-red-400 transition-colors">
                    {deleting === cat.id
                      ? <div className="w-4 h-4 border border-red-400/50 border-t-red-400 rounded-full animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}