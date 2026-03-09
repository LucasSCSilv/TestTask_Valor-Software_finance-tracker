import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { TrendingDown, TrendingUp, Wallet, Tag, ArrowUp, ArrowDown, Minus, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const CATEGORY_COLORS = {
  Food: '#e8c04a', Transport: '#60a5fa', Health: '#34d399',
  Entertainment: '#f472b6', Housing: '#a78bfa', Others: '#94a3b8',
}

function fmt(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export default function Dashboard() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [incomes, setIncomes] = useState([])
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    async function load() {
      const [{ data: tx }, { data: inc }, { data: bg }, { data: cats }] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('income').select('*').eq('user_id', user.id),
        supabase.from('budgets').select('*').eq('user_id', user.id),
        supabase.from('categories').select('*').eq('user_id', user.id),
      ])
      setTransactions(tx || [])
      setIncomes(inc || [])
      setBudgets(bg || [])
      setCategories(cats || [])
      setLoading(false)
    }
    load()
  }, [user])

  function getCategoryColor(name) {
    const cat = categories.find(c => c.name === name)
    return cat?.color || CATEGORY_COLORS[name] || '#94a3b8'
  }

  const monthTx = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
  })

  const monthIncome = incomes
    .filter(b => b.month === selectedMonth && b.year === selectedYear)
    .reduce((s, b) => s + b.amount, 0)

  const monthExpenses = monthTx.reduce((s, t) => s + t.amount, 0)
  const balance = monthIncome - monthExpenses
  const savingsRate = monthIncome > 0 ? ((balance / monthIncome) * 100) : null

  const totalByCategory = monthTx.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount
    return acc
  }, {})
  const pieData = Object.entries(totalByCategory).map(([name, value]) => ({ name, value }))

  const now = new Date()
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const m = d.getMonth(), y = d.getFullYear()
    const expenses = transactions
      .filter(t => { const td = new Date(t.date); return td.getMonth() === m && td.getFullYear() === y })
      .reduce((s, t) => s + t.amount, 0)
    const income = incomes
      .filter(b => b.month === m && b.year === y)
      .reduce((s, b) => s + b.amount, 0)
    return { month: MONTH_NAMES[m], expenses, income, savings: income - expenses }
  })

  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear
  const prevExpenses = transactions
    .filter(t => { const d = new Date(t.date); return d.getMonth() === prevMonth && d.getFullYear() === prevYear })
    .reduce((s, t) => s + t.amount, 0)
  const expenseDiff = prevExpenses > 0 ? ((monthExpenses - prevExpenses) / prevExpenses * 100) : null

  const years = [...new Set([
    ...transactions.map(t => new Date(t.date).getFullYear()),
    ...incomes.map(b => b.year),
    now.getFullYear()
  ])].sort((a, b) => b - a)

  // Budget alerts
  const budgetAlerts = budgets
    .filter(b => b.month === selectedMonth && b.year === selectedYear)
    .filter(b => {
      const spent = totalByCategory[b.category] || 0
      return spent >= b.amount * 0.8
    })
    .map(b => {
      const spent = totalByCategory[b.category] || 0
      const pct = (spent / b.amount) * 100
      return { ...b, spent, pct, over: spent > b.amount }
    })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#e8c04a', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">{MONTH_NAMES_FULL[selectedMonth]} {selectedYear}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="input max-w-[140px]">
            {MONTH_NAMES_FULL.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="input max-w-[90px]">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Budget alerts */}
      {budgetAlerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {budgetAlerts.map(b => (
            <div key={b.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
              b.over ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
            }`}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {b.over
                ? <span><strong>{b.category}</strong> is over budget — spent {fmt(b.spent)} of {fmt(b.amount)}</span>
                : <span><strong>{b.category}</strong> is at {b.pct.toFixed(0)}% of budget — {fmt(b.amount - b.spent)} remaining</span>
              }
              <Link to="/budget" className="ml-auto text-xs underline opacity-70 hover:opacity-100">View</Link>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-400/10">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xs text-slate-500">Income</span>
          </div>
          <p className="text-2xl font-semibold text-white">{fmt(monthIncome)}</p>
          <p className="text-xs text-slate-500 mt-1">Total received</p>
        </div>

        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-400/10">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Expenses</span>
              {expenseDiff !== null && (
                <div className={`flex items-center gap-0.5 text-xs mt-0.5 justify-end ${expenseDiff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {expenseDiff > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {Math.abs(expenseDiff).toFixed(0)}% vs last month
                </div>
              )}
            </div>
          </div>
          <p className="text-2xl font-semibold text-white">{fmt(monthExpenses)}</p>
          <p className="text-xs text-slate-500 mt-1">{monthTx.length} transactions</p>
        </div>

        <div className="card" style={{
          background: balance >= 0 ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)',
          borderColor: balance >= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)'
        }}>
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: balance >= 0 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)' }}>
              <Wallet className="w-5 h-5" style={{ color: balance >= 0 ? '#34d399' : '#f87171' }} />
            </div>
            <span className="text-xs text-slate-500">Balance</span>
          </div>
          <p className={`text-2xl font-semibold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(balance)}</p>
          {balance < 0
            ? <p className="text-xs text-red-400 mt-1 font-medium">⚠️ Over budget!</p>
            : <p className="text-xs text-slate-500 mt-1">Remaining budget</p>}
        </div>

        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gold-400/10">
              <Tag className="w-5 h-5 text-gold-400" />
            </div>
            <span className="text-xs text-slate-500">Savings rate</span>
          </div>
          <p className="text-2xl font-semibold text-white">
            {savingsRate !== null ? `${savingsRate.toFixed(0)}%` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {savingsRate === null ? 'No income recorded' : savingsRate >= 0 ? 'Of income saved' : 'Over budget'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6 lg:mb-8">
        <div className="card lg:col-span-3">
          <h2 className="text-white font-semibold mb-6">Income vs Expenses — Last 6 months</h2>
          {transactions.length === 0 && incomes.length === 0 ? (
            <div className="h-52 flex items-center justify-center">
              <p className="text-slate-600 text-sm">No data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={last6} barSize={16} barGap={4}>
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={60}
                  tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, color: '#fff' }}
                  formatter={(v, name) => [fmt(v), name.charAt(0).toUpperCase() + name.slice(1)]}
                />
                <Bar dataKey="income" fill="#34d399" radius={[4, 4, 0, 0]} fillOpacity={0.8} name="income" />
                <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} fillOpacity={0.8} name="expenses" />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-400" /><span className="text-xs text-slate-500">Income</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /><span className="text-xs text-slate-500">Expenses</span></div>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="text-white font-semibold mb-4">By category</h2>
          {pieData.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-slate-600 text-sm">No expenses this month</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {pieData.map(entry => <Cell key={entry.name} fill={getCategoryColor(entry.name)} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, color: '#fff' }}
                    formatter={v => [fmt(v)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.sort((a, b) => b.value - a.value).slice(0, 4).map(entry => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: getCategoryColor(entry.name) }} />
                      <span className="text-xs text-slate-400">{entry.name}</span>
                    </div>
                    <span className="text-xs text-white font-medium">{fmt(entry.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Monthly savings overview */}
      <div className="card mb-8">
        <h2 className="text-white font-semibold mb-5">Monthly savings overview</h2>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {last6.map((m, i) => {
            const isPositive = m.savings >= 0
            const hasData = m.income > 0 || m.expenses > 0
            return (
              <div key={i} className="rounded-xl p-4 text-center bg-white/3">
                <p className="text-xs text-slate-500 mb-2">{m.month}</p>
                {!hasData ? (
                  <Minus className="w-4 h-4 mx-auto text-slate-700" />
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {isPositive ? <ArrowUp className="w-3 h-3 text-green-400" /> : <ArrowDown className="w-3 h-3 text-red-400" />}
                      <p className={`text-xs font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {fmt(Math.abs(m.savings))}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600">
                      {m.income > 0 ? `${((m.savings / m.income) * 100).toFixed(0)}%` : '—'}
                    </p>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">Recent transactions</h2>
          <Link to="/transactions" className="text-xs text-gold-400 hover:text-gold-300 transition-colors">View all →</Link>
        </div>
        {transactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-slate-600 text-sm">No transactions yet.</p>
            <Link to="/transactions" className="text-gold-400 text-sm hover:text-gold-300 transition-colors mt-2 inline-block">
              Add your first transaction →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getCategoryColor(t.category) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{t.description}</p>
                  <p className="text-slate-500 text-xs">{t.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-semibold">{fmt(t.amount)}</p>
                  <p className="text-slate-500 text-xs">{new Date(t.date + 'T12:00:00').toLocaleDateString('en-US')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}