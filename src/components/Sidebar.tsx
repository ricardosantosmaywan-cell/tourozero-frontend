import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, CalendarDays, Package, PieChart, LogOut, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useGlobalRentals, useGlobalProducts, useGlobalCustomers } from '../data/api';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { signOut } = useAuth();

    const { refreshRentals, loading: loadingRentals } = useGlobalRentals();
    const { refreshProducts, loading: loadingProducts } = useGlobalProducts();
    const { refreshCustomers, loading: loadingCustomers } = useGlobalCustomers();
    const isLoading = loadingRentals || loadingProducts || loadingCustomers;

    const handleRefresh = () => {
        refreshRentals();
        refreshProducts();
        refreshCustomers();
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            await signOut();
            localStorage.clear();
            navigate('/login');
        } catch (error) {
            console.error('Erro ao encerrar sessão:', error);
        }
    };

    const menuItems = [
        { icon: Home, label: 'Dashboard', path: '/' },
        { icon: Users, label: 'Clientes', path: '/customers' },
        { icon: CalendarDays, label: 'Agendamentos', path: '/rentals' },
        { icon: Package, label: 'Estoque', path: '/inventory' },
        { icon: PieChart, label: 'Contabilidade', path: '/accounting' },
    ];

    return (
        <aside className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-950 flex flex-col h-screen transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shadow-2xl md:shadow-none print:hidden",
            isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            <div className="h-16 hidden md:flex items-center px-6 border-b border-slate-800 shrink-0">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-amber-500">Touro</span>zero
                </h1>
            </div>

            <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto mt-4 md:mt-0">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-amber-500 text-slate-950"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-50"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-3 px-3 py-2 w-full text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors text-sm font-medium mb-2"
                >
                    <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
                    Atualizar Dados
                </button>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 w-full text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    Sair
                </button>
                <div className="mt-4 pt-3 border-t border-slate-800/50 text-center">
                    <p className="text-xs text-slate-400/60 tracking-wide">
                        &copy; 2026 Tourozero Engine | Powered by <span className="font-bold text-slate-300/80">Maywan</span>
                    </p>
                </div>
            </div>
        </aside>
    );
}
