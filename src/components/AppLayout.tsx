import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Car, ParkingCircle, Shuffle, Menu, X, LogOut, ClipboardCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';

const navItems = [
  { to: '/', label: 'Painel', icon: Home },
  { to: '/unidades', label: 'Unidades', icon: Car },
  { to: '/vagas', label: 'Vagas', icon: ParkingCircle },
  { to: '/sorteio', label: 'Sorteio', icon: Shuffle },
  { to: '/portaria', label: 'Portaria', icon: ClipboardCheck },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="gradient-navy text-zinc-50 px-4 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-40 rounded-lg flex items-center justify-center p-2 bg-white">
            <img src={logo} alt="" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base leading-tight">Grand Club</h1>
            <p className="text-xs opacity-70">Gestão local de vagas e sorteio</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1">
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-white/15 text-primary-foreground'
                      : 'text-primary-foreground/60 hover:text-primary-foreground hover:bg-white/20'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={signOut}
            className="ml-4 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary-foreground/60 hover:text-primary-foreground hover:bg-white/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            {user?.email ?? 'Sair'}
          </button>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-white/10"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden gradient-navy overflow-hidden"
          >
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-6 py-3 text-sm font-medium ${
                    active ? 'text-primary-foreground bg-white/10' : 'text-primary-foreground/60'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={() => {
                signOut();
                setMobileOpen(false);
              }}
              className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-primary-foreground/60 w-full"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </motion.nav>
        )}
      </AnimatePresence>

      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
