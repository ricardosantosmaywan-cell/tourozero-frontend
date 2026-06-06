import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, CalendarDays, Package, LogOut, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useGlobalRentals, useGlobalProducts, useGlobalCustomers } from '../data/api';
import { usePeriod } from '../contexts/PeriodContext';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const { selectedMonth, selectedYear, selectedDay, setPeriod } = usePeriod();

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const { rentals, refreshRentals, loading: loadingRentals } = useGlobalRentals();
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
    ];

    return (
        <aside className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-950 flex flex-col h-screen transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shadow-2xl md:shadow-none print:hidden",
            isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            <div className="h-16 hidden md:flex items-center px-6 border-b border-slate-800 shrink-0">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-amber-500">Enredo</span> Janota
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

                {/* Calendário Mensal Interativo */}
                <div className="mt-6 px-2">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Agenda</span>
                        </div>
                        {selectedDay && (
                            <button 
                                onClick={() => setPeriod(selectedMonth, selectedYear, null)}
                                className="text-[9px] font-bold text-amber-500 hover:text-amber-400 uppercase tracking-tighter"
                            >
                                Ver Mês Todo
                            </button>
                        )}
                    </div>
                    
                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3 shadow-inner">
                        {/* Header do Calendário */}
                        <div className="flex items-center justify-between mb-4">
                            <button 
                                onClick={() => {
                                    if (selectedMonth === 0) setPeriod(11, selectedYear - 1);
                                    else setPeriod(selectedMonth - 1, selectedYear);
                                }}
                                className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-amber-500"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            
                            <div className="text-[11px] font-black text-slate-200 uppercase tracking-wider">
                                {months[selectedMonth]} <span className="text-slate-500 ml-0.5">{selectedYear}</span>
                            </div>

                            <button 
                                onClick={() => {
                                    if (selectedMonth === 11) setPeriod(0, selectedYear + 1);
                                    else setPeriod(selectedMonth + 1, selectedYear);
                                }}
                                className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-amber-500"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Grade de Dias */}
                        <div className="grid grid-cols-7 gap-y-1 text-center">
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                                <div key={i} className="text-[9px] font-bold text-slate-600 mb-1">{d}</div>
                            ))}
                            
                            {(() => {
                                const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
                                const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                                const days = [];
                                
                                // Dias vazios do início
                                for (let i = 0; i < firstDay; i++) {
                                    days.push(<div key={`empty-${i}`} />);
                                }
                                
                                // Dias do mês
                                for (let d = 1; d <= daysInMonth; d++) {
                                    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                    
                                    // Verificar atividade (Recolha ou Entrega)
                                    const hasActivity = rentals?.some(r => 
                                        r.pickup_date.startsWith(dateStr) || r.return_date.startsWith(dateStr)
                                    );

                                    const isSelected = selectedDay === d;
                                    const isToday = new Date().toISOString().startsWith(dateStr);

                                    days.push(
                                        <button
                                            key={d}
                                            onClick={() => setPeriod(selectedMonth, selectedYear, isSelected ? null : d)}
                                            className={cn(
                                                "relative h-7 w-full flex items-center justify-center text-[10px] font-bold rounded-lg transition-all group",
                                                isSelected 
                                                    ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" 
                                                    : isToday 
                                                        ? "text-amber-500 border border-amber-500/30" 
                                                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                                            )}
                                        >
                                            {d}
                                            {hasActivity && !isSelected && (
                                                <span className={cn(
                                                    "absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                                                    isToday ? "bg-amber-500" : "bg-emerald-500"
                                                )} />
                                            )}
                                        </button>
                                    );
                                }
                                return days;
                            })()}
                        </div>
                    </div>
                </div>
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
                        &copy; 2026 Enredo Janota Unp Lda | Powered by <span className="font-bold text-slate-300/80">Maywan</span>
                    </p>
                </div>
            </div>
        </aside>
    );
}
