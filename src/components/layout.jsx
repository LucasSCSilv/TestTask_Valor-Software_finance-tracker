import { NavLink } from 'react-router-dom'
import { TrendingUp, LayoutDashboard, List, LogOut, Tag, BarChart2, PiggyBank, ArrowDownCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: List },
  { to: '/income', label: 'Income', icon: ArrowDownCircle },
  { to: '/reports', label: 'Reports', icon: BarChart2 },
  { to: '/budget', label: 'Budget', icon: PiggyBank },
  { to: '/categories', label: 'Categories', icon: Tag },
]

export default function Layout({ children }) {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-navy-950 flex">
      <aside className="w-60 bg-navy-900 border-r border-white/5 flex flex-col fixed h-full z-20">
        <div className="px-6 py-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gold-400/10 border border-gold-400/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-gold-400" />
            </div>
            <span className="font-display text-white text-xl">FinTrack</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-gold-400/10 text-gold-400 border border-gold-400/15'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }>
              <Icon className="w-4 h-4" />{label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3">
            <div className="w-8 h-8 rounded-lg bg-gold-400/20 flex items-center justify-center text-gold-400 text-xs font-bold">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.email}</p>
            </div>
            <button onClick={signOut} className="text-slate-500 hover:text-red-400 transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-60 p-8 min-h-screen">
        {children}
      </main>
    </div>
  )
}