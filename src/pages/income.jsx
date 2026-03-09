import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Trash2, X, Pencil } from 'lucide-react'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function fmt(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export default function Income() {
  const { user } = useAuth()
  const [incomes, setIncomes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth())
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [form, setForm] = useState({
    description: '',
    amount: '',
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  })

  async function load() {
    const { data } = await supabase
      .from('income')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
    setIncomes(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  function openAdd() {
    setEditing(null)
    setForm({ description: '', amount: '', month: filterMonth, year: filterYear })
    setFormError('')
    setShowForm(true)
  }

  function openEdit(b) {
    setEditing(b)
    setForm({ description: b.description, amount: b.amount, month: b.month, year: b.year })
    setFormError('')
    setShowForm(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setFormError('')
    if (!form.description.trim()) return setFormError('Please enter a description.')
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      return setFormError('Please enter a valid amount.')

    setSaving(true)
    const payload = {
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      month: parseInt(form.month),
      year: parseInt(form.year),
    }
    const { error } = editing
      ? await supabase.from('income').update(payload).eq('id', editing.id)
      : await supabase.from('income').insert({ ...payload, user_id: user.id })

    setSaving(false)
    if (error) { return setFormError(error.message) }
    setShowForm(false)
    load()
  }

  async function handleDelete(id) {
    setDeleting(id)
    await supabase.from('income').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  const filtered = incomes.filter(b => b.month === filterMonth && b.year === filterYear)
  const total = filtered.reduce((s, b) => s + b.amount, 0)

  const years = [...new Set(incomes.map(b => b.year))].sort((a, b) => b - a)
  if (!years.includes(new Date().getFullYear())) years.unshift(new Date().getFullYear())

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-white">Income</h1>
          <p className="text-slate-500 text-sm mt-1">Track your monthly income sources</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add income
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4 flex items-center gap-4 flex-wrap">
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="input max-w-[160px]">
          {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="input max-w-[100px]">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="ml-auto text-right">
          <p className="text-xs text-slate-500">{filtered.length} {filtered.length === 1 ? 'source' : 'sources'}</p>
          <p className="text-white font-semibold">{fmt(total)}</p>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-navy-800 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold text-lg">{editing ? 'Edit income' : 'Add income'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label">Description</label>
                <input className="input" placeholder="e.g. Monthly salary" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">Amount ($)</label>
                <input type="number" step="0.01" min="0.01" className="input" placeholder="0.00"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Month</label>
                  <select className="input" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))}>
                    {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Year</label>
                  <input type="number" min="2020" max="2099" className="input"
                    value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
                </div>
              </div>
              {formError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl">{formError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-slate-600 text-sm">No income recorded for this month.</p>
            <button onClick={openAdd} className="text-gold-400 text-sm hover:text-gold-300 transition-colors mt-2 inline-block">
              Add your first income source →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(b => (
              <div key={b.id} className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white/3 hover:bg-white/5 transition-colors group">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-green-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{b.description}</p>
                  <p className="text-xs mt-0.5 text-slate-500">{MONTH_NAMES[b.month]} {b.year}</p>
                </div>
                <p className="text-green-400 text-sm font-semibold">{fmt(b.amount)}</p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-slate-500 hover:text-gold-400 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(b.id)} disabled={deleting === b.id}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                    {deleting === b.id
                      ? <div className="w-3.5 h-3.5 border border-red-400/50 border-t-red-400 rounded-full animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
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