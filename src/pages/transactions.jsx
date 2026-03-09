import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Trash2, Filter, X, AlertTriangle, Pencil } from 'lucide-react'

const CATEGORIES = ['Food', 'Transport', 'Health', 'Entertainment', 'Housing', 'Others']
const CATEGORY_COLORS = {
  Food: '#e8c04a', Transport: '#60a5fa', Health: '#34d399',
  Entertainment: '#f472b6', Housing: '#a78bfa', Others: '#94a3b8',
}

function fmt(v) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [incomes, setIncomes] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth())
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [deleting, setDeleting] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState('')

  const [form, setForm] = useState({
    description: '', amount: '', category: 'Food',
    date: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [budgetWarning, setBudgetWarning] = useState('')

  async function load() {
    const [{ data: tx }, { data: inc }, { data: cats }] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('income').select('*').eq('user_id', user.id),  // ← tabela income
      supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
    ])
    setTransactions(tx || [])
    setIncomes(inc || [])
    setCategories(cats || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  function getCategoryColor(name) {
    const cat = categories.find(c => c.name === name)
    return cat?.color || CATEGORY_COLORS[name] || '#94a3b8'
  }

  function checkBudget(amount, date) {
    if (!amount || !date) return setBudgetWarning('')
    const d = new Date(date)
    const m = d.getMonth()
    const y = d.getFullYear()
    const monthIncome = incomes
      .filter(b => b.month === m && b.year === y)
      .reduce((s, b) => s + b.amount, 0)
    if (monthIncome === 0) return setBudgetWarning('')
    const monthExpenses = transactions
      .filter(t => { const td = new Date(t.date); return td.getMonth() === m && td.getFullYear() === y })
      .reduce((s, t) => s + t.amount, 0)
    const newTotal = monthExpenses + parseFloat(amount || 0)
    if (newTotal > monthIncome) {
      setBudgetWarning(`This will exceed your ${MONTH_NAMES[m]} income by ${fmt(newTotal - monthIncome)}!`)
    } else {
      setBudgetWarning('')
    }
  }

  function openAdd() {
    setEditingTx(null)
    setForm({ description: '', amount: '', category: categories[0]?.name || 'Food', date: new Date().toISOString().split('T')[0] })
    setFormError('')
    setBudgetWarning('')
    setShowForm(true)
  }

  function openEdit(tx) {
    setEditingTx(tx)
    setForm({ description: tx.description, amount: String(tx.amount), category: tx.category, date: tx.date })
    setFormError('')
    setBudgetWarning('')
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!form.description.trim()) return setFormError('Please enter a description.')
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      return setFormError('Please enter a valid amount.')

    setSaving(true)
    const payload = {
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      category: form.category,
      date: form.date,
    }
    const { error } = editingTx
      ? await supabase.from('transactions').update(payload).eq('id', editingTx.id)
      : await supabase.from('transactions').insert({ ...payload, user_id: user.id })

    setSaving(false)
    if (error) return setFormError(error.message)
    setShowForm(false)
    setEditingTx(null)
    setBudgetWarning('')
    showToast(editingTx ? 'Transaction updated!' : 'Transaction added!')
    load()
  }

  async function handleDelete(id) {
    setDeleting(id)
    await supabase.from('transactions').delete().eq('id', id)
    setDeleting(null)
    setConfirmDelete(null)
    showToast('Transaction deleted.')
    load()
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const years = [...new Set([...transactions.map(t => new Date(t.date).getFullYear()), new Date().getFullYear()])].sort((a, b) => b - a)
  const allCategories = [...new Set([...categories.map(c => c.name), ...CATEGORIES])]

  const filtered = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear &&
      (filterCategory ? t.category === filterCategory : true)
  })

  const total = filtered.reduce((s, t) => s + t.amount, 0)
  const monthIncome = incomes
    .filter(b => b.month === filterMonth && b.year === filterYear)
    .reduce((s, b) => s + b.amount, 0)
  const allMonthExpenses = transactions
    .filter(t => { const d = new Date(t.date); return d.getMonth() === filterMonth && d.getFullYear() === filterYear })
    .reduce((s, t) => s + t.amount, 0)
  const balance = monthIncome - allMonthExpenses
  const isOverBudget = monthIncome > 0 && balance < 0

  return (
    <div className="max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl"
          style={{ background: '#1a2235', border: '1px solid rgba(232,192,74,0.3)', color: '#e8c04a' }}>
          {toast}
        </div>
      )}

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-white">Transactions</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your expenses</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New transaction
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Filter className="w-4 h-4 text-slate-500" />
          <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="input max-w-[160px]">
            {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="input max-w-[100px]">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input max-w-[160px]">
            <option value="">All categories</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {filterCategory && (
            <button onClick={() => setFilterCategory('')} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-500">{filtered.length} transactions · {fmt(total)}</p>
            {monthIncome > 0 && (
              <p className={`text-xs font-semibold mt-0.5 ${isOverBudget ? 'text-red-400' : 'text-green-400'}`}>
                {isOverBudget
                  ? `⚠️ Over income by ${fmt(Math.abs(balance))}`
                  : `${fmt(balance)} remaining from income`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-navy-800 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold text-lg">{editingTx ? 'Edit transaction' : 'New transaction'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Description</label>
                <input className="input" placeholder="e.g. Lunch at restaurant" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount ($)</label>
                  <input type="number" step="0.01" min="0.01" className="input" placeholder="0.00"
                    value={form.amount}
                    onChange={e => { setForm(f => ({ ...f, amount: e.target.value })); checkBudget(e.target.value, form.date) }} />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={form.date}
                    onChange={e => { setForm(f => ({ ...f, date: e.target.value })); checkBudget(form.amount, e.target.value) }} />
                </div>
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {budgetWarning && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-yellow-500/8 border border-yellow-500/20">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-400 text-xs">{budgetWarning}</p>
                </div>
              )}
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl">{formError}</div>
              )}
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

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-navy-800 border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-white font-semibold text-lg mb-2">Delete transaction?</h2>
            <p className="text-slate-400 text-sm mb-6">
              "<span className="text-white">{confirmDelete.description}</span>" — {fmt(confirmDelete.amount)}<br />
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} disabled={deleting === confirmDelete.id}
                className="flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-red-500 hover:bg-red-400 text-white transition-all">
                {deleting === confirmDelete.id
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : 'Delete'}
              </button>
            </div>
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
            <p className="text-slate-600 text-sm">No transactions found.</p>
            <button onClick={openAdd} className="text-gold-400 text-sm hover:text-gold-300 transition-colors mt-2 inline-block">
              Add one now →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(t => (
              <div key={t.id} className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white/3 hover:bg-white/5 transition-colors group">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: getCategoryColor(t.category) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{t.description}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full inline-block mt-0.5"
                    style={{ background: `${getCategoryColor(t.category)}15`, color: getCategoryColor(t.category) }}>
                    {t.category}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-semibold">{fmt(t.amount)}</p>
                  <p className="text-slate-500 text-xs">{new Date(t.date + 'T12:00:00').toLocaleDateString('en-US')}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                  <button onClick={() => openEdit(t)} className="text-slate-500 hover:text-gold-400 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setConfirmDelete(t)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
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