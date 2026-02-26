import { Link, useLocation } from 'react-router-dom';
import { Home, Users, CalendarDays, Package, PieChart, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Sidebar() {
    const location = useLocation();

    const menuItems = [
        { icon: Home, label: 'Dashboard', path: '/' },
        { icon: Users, label: 'Clientes', path: '/customers' },
        { icon: CalendarDays, label: 'Agendamentos', path: '/rentals' },
        { icon: Package, label: 'Estoque', path: '/inventory' },
        { icon: PieChart, label: 'Contabilidade', path: '/accounting' },
    ];

    return (
        <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col h-screen">
            <div className="h-16 flex items-center px-6 border-b border-slate-800">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-amber-500">Touro</span>zero
                </h1>
            </div>

            <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
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
                    className="flex items-center gap-3 px-3 py-2 w-full text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    Sair
                </button>
            </div>
        </aside>
    );
}
