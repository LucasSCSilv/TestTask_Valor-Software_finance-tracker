import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, X, AlertTriangle, CheckCircle } from 'lucide-react'

const DEFAULT_COLORS = {
  'Food': '#e8c04a', 'Transport': '#60a5fa', 'Health': '#34d399',
  'Entertainment': '#f472b6', 'Housing': '#a78bfa', 'Others': '#94a3b8',
}

function fmt(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

export default function Budget() {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category: '', amount: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [selectedMonth] = useState(new Date().getMonth())
  const [selectedYear] = useState(new Date().getFullYear())

  async function loadData() {
    const [{ data: budgetData }, { data: catData }, { data: txData }] = await Promise.all([
      supabase.from('budgets').select('*').eq('user_id', user.id)
        .eq('month', selectedMonth).eq('year', selectedYear),
      supabase.from('categories').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('*').eq('user_id', user.id),
    ])
    setBudgets(budgetData || [])
    setCategories(catData || [])
    setTransactions(txData || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [user])

  function getCategoryColor(name) {
    const cat = categories.find(c => c.name === name)
    return cat?.color || DEFAULT_COLORS[name] || '#94a3b8'
  }

  function getSpentForCategory(categoryName) {
    return transactions
      .filter(t => {
        const d = new Date(t.date)
        return t.category === categoryName && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
      })
      .reduce((s, t) => s + t.amount, 0)
  }

  const allCategories = [...new Set([
    ...categories.map(c => c.name),
    ...Object.keys(DEFAULT_COLORS)
  ])].filter(c => !budgets.find(b => b.category === c))

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!form.category) return setFormError('Please select a category.')
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      return setFormError('Please enter a valid amount.')

    setSaving(true)
    const { error } = await supabase.from('budgets').insert({
      user_id: user.id,
      category: form.category,
      amount: parseFloat(form.amount),
      month: selectedMonth,
      year: selectedYear,
    })
    setSaving(false)
    if (error) return setFormError(error.message)
    setShowForm(false)
    setForm({ category: '', amount: '' })
    loadData()
  }

  async function handleDelete(id) {
    await supabase.from('budgets').delete().eq('id', id)
    loadData()
  }

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent = budgets.reduce((s, b) => s + getSpentForCategory(b.category), 0)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-white">Budget</h1>
          <p className="text-slate-500 text-sm mt-1">{MONTH_NAMES[selectedMonth]} {selectedYear}</p>
        </div>
        {allCategories.length > 0 && (
          <button onClick={() => { setShowForm(true); setForm({ category: allCategories[0], amount: '' }); setFormError('') }}
            className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />Set budget
          </button>
        )}
      </div>

      {/* Summary */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card">
            <p className="text-xs text-slate-500 mb-1">Total budget</p>
            <p className="text-2xl font-semibold text-white">{fmt(totalBudget)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-slate-500 mb-1">Total spent</p>
            <p className={`text-2xl font-semibold ${totalSpent > totalBudget ? 'text-red-400' : 'text-white'}`}>
              {fmt(totalSpent)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{fmt(Math.max(0, totalBudget - totalSpent))} remaining</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-navy-800 border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold text-lg">Set monthly budget</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Monthly limit ($)</label>
                <input type="number" step="0.01" min="1" className="input" placeholder="0.00"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
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

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : budgets.length === 0 ? (
          <div className="card text-center py-14">
            <p className="text-slate-600 text-sm">No budgets set for this month.</p>
            {allCategories.length > 0 && (
              <button onClick={() => { setShowForm(true); setForm({ category: allCategories[0], amount: '' }) }}
                className="text-gold-400 text-sm hover:text-gold-300 transition-colors mt-2 inline-block">
                Set your first budget →
              </button>
            )}
          </div>
        ) : (
          budgets.map(b => {
            const spent = getSpentForCategory(b.category)
            const pct = Math.min((spent / b.amount) * 100, 100)
            const over = spent > b.amount
            const warning = pct >= 80 && !over
            const color = getCategoryColor(b.category)

            return (
              <div key={b.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                    <span className="text-white font-medium text-sm">{b.category}</span>
                    {over && <AlertTriangle className="w-4 h-4 text-red-400" />}
                    {!over && pct >= 80 && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                    {!over && pct < 80 && <CheckCircle className="w-4 h-4 text-green-400/50" />}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${over ? 'text-red-400' : 'text-white'}`}>
                      {fmt(spent)} <span className="text-slate-500 font-normal">/ {fmt(b.amount)}</span>
                    </span>
                    <button onClick={() => handleDelete(b.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: over ? '#f87171' : warning ? '#fbbf24' : color
                    }}
                  />
                </div>

                <div className="flex justify-between mt-2">
                  <span className="text-xs text-slate-600">{pct.toFixed(0)}% used</span>
                  {over
                    ? <span className="text-xs text-red-400">{fmt(spent - b.amount)} over budget</span>
                    : <span className="text-xs text-slate-500">{fmt(b.amount - spent)} left</span>
                  }
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}