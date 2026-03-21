import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '../components/ui/Table';
import { Euro, Users, Package, Clock, AlertCircle, Plus, CheckCircle2, Search, Edit2, Eye, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BookingModal } from '../components/BookingModal';
import { ClientModal } from '../components/ClientModal';
import { ViewRentalModal } from '../components/ViewRentalModal';
import { useGlobalRentals, useGlobalProducts } from '../data/mockDatabase';
import { generateRentalContract } from '../lib/pdfGenerator';

export default function Dashboard() {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());

    const { rentals, loading: loadingRentals, updateRental, deleteRental, refreshRentals } = useGlobalRentals();
    const { products, loading: loadingProducts, refreshProducts } = useGlobalProducts();
    const isLoading = loadingRentals || loadingProducts;

    useEffect(() => {
        refreshRentals();
        refreshProducts();
    }, []);

    // Tabela State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'ontime' | 'late'>('all');

    // Booking Modal State
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [bookingRentalToEdit, setBookingRentalToEdit] = useState<any>(null);

    // Client Modal State
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);


    // View Modal State
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewRental, setViewRental] = useState<any>(null);

    const handleEditRental = (rental: any) => {
        setBookingRentalToEdit(rental);
        setIsBookingModalOpen(true);
    };

    const handleDeleteRental = (id: string) => {
        deleteRental(id);
    };

    // Grafico State
    const chartData = useMemo(() => {
        const currentMonthPrefix = new Date().toISOString().substring(0, 7);
        const currentMonthName = new Date().toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonthPrefix = lastMonthDate.toISOString().substring(0, 7);
        const lastMonthName = lastMonthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

        const lastRev = rentals.filter(r => r.pickup_date.startsWith(lastMonthPrefix)).reduce((acc, curr) => acc + (Number(curr.total_amount || 0) - Number(curr.deposit_value || 0) - Number(curr.transport_value || 0)), 0);
        const currRev = rentals.filter(r => r.pickup_date.startsWith(currentMonthPrefix)).reduce((acc, curr) => acc + (Number(curr.total_amount || 0) - Number(curr.deposit_value || 0) - Number(curr.transport_value || 0)), 0);

        return [
            { name: lastMonthName, Faturamento: lastRev },
            { name: currentMonthName, Faturamento: currRev }
        ];
    }, [rentals]);

    function isLate(returnDate: string) {
        const end = new Date(returnDate);
        end.setHours(23, 59, 59, 999);
        return end < new Date();
    }

    const activeRentals = rentals.filter(r => r.status === 'active');

    // Filtragens Dinâmicas da Tabela
    const displayRentals = activeRentals.filter(r => {
        const matchName = r.customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const late = isLate(r.return_date);
        let matchStatus = true;
        if (filterStatus === 'ontime') matchStatus = !late;
        if (filterStatus === 'late') matchStatus = late;

        return matchName && matchStatus;
    });

    // Ação: Finalizar Aluguel globalmente
    const finalizeRental = (id: string) => {
        updateRental(id, { status: 'completed' });
    };

    // Estatísticas Dinâmicas para os Cards
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    const monthlyRevenue = rentals.filter(r => r.pickup_date.startsWith(currentMonthPrefix)).reduce((acc, curr) => acc + (Number(curr.total_amount || 0) - Number(curr.deposit_value || 0) - Number(curr.transport_value || 0)), 0);

    const stats = {
        monthlyRevenue,
        activeCustomers: displayRentals.length,
        stockStatus: {
            total: products.filter(p => p.name.toLowerCase().includes('andaime')).reduce((acc, p) => acc + p.stock_total, 0),
            rented: activeRentals.reduce((acc, curr) => {
                const andaimesRented = curr.items?.filter((it: any) => it.name.toLowerCase().includes('andaime')).reduce((sum: number, it: any) => sum + it.quantity, 0) || 0;
                return acc + andaimesRented;
            }, 0)
        }
    };

    const now = new Date();
    const currentMonthStr = now.toLocaleDateString('pt-BR', { month: 'long' });
    const dynamicFaturamentoTitle = `Faturamento ${currentMonthStr.charAt(0).toUpperCase() + currentMonthStr.slice(1)}/${now.getFullYear()}`;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-50">Painel de Controlo</h1>
                    <p className="text-slate-400 mt-1">Bem-vindo(a) ao Tourozero</p>
                </div>

                <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg text-amber-500 font-medium whitespace-nowrap">
                    <Clock className="w-5 h-5 text-amber-500/70" />
                    {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    <span className="text-slate-300 mx-2">|</span>
                    {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {/* Faturamento */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-950">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">{dynamicFaturamentoTitle}</CardTitle>
                        <Euro className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-slate-500">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span className="text-sm">Carregando...</span>
                            </div>
                        ) : (
                            <>
                                <div className="text-3xl font-bold text-emerald-400">{stats.monthlyRevenue.toFixed(2)} €</div>
                                <p className="text-xs text-slate-500 mt-1">Soma dinâmica do mês</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Clientes Ativos</CardTitle>
                        <Users className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-slate-500">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span className="text-sm">Carregando...</span>
                            </div>
                        ) : (
                            <>
                                <div className="text-3xl font-bold text-slate-50 flex items-baseline gap-2">
                                    {stats.activeCustomers}
                                    <span className="text-sm font-normal text-slate-400">
                                        ({displayRentals.filter(r => !isLate(r.return_date)).length} em dia, {displayRentals.filter(r => isLate(r.return_date)).length} atrasados)
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Com contratos em curso</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Estoque */}
                <Card className={`${(!isLoading && stats.stockStatus.total > 0 && ((stats.stockStatus.total - stats.stockStatus.rented) / stats.stockStatus.total) < 0.1)
                    ? 'bg-gradient-to-br from-red-950/40 to-orange-900/30 border-red-500/50'
                    : ''
                    }`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Stock de Andaimes</CardTitle>
                        {(!isLoading && stats.stockStatus.total > 0 && ((stats.stockStatus.total - stats.stockStatus.rented) / stats.stockStatus.total) < 0.1) ? (
                            <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                        ) : (
                            <Package className="h-4 w-4 text-blue-400" />
                        )}
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-slate-500">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span className="text-sm">Carregando...</span>
                            </div>
                        ) : (
                            <>
                                <div className={`text-3xl font-bold ${(stats.stockStatus.total > 0 && ((stats.stockStatus.total - stats.stockStatus.rented) / stats.stockStatus.total) < 0.1) ? 'text-red-400' : 'text-slate-50'}`}>
                                    {stats.stockStatus.total - stats.stockStatus.rented}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Disponíveis de {stats.stockStatus.total} ({stats.stockStatus.rented} alugados)
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-8">
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-50">Evolução Receitas</h2>
                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-4 h-[220px]">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}€`} />
                                        <Tooltip
                                            cursor={{ fill: '#0f172a' }}
                                            contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                                            itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                                        />
                                        <Bar dataKey="Faturamento" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                            {chartData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#10b981' : '#334155'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-slate-500">Sem dados analíticos</div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-50">Ações Rápidas</h2>
                    <Card className="bg-slate-900 border-slate-800 h-[220px]">
                        <CardContent className="p-5 flex flex-col justify-center gap-4 h-full">
                            <Button className="w-full justify-start h-12" variant="default" onClick={() => {
                                setBookingRentalToEdit(null);
                                setIsBookingModalOpen(true);
                            }}>
                                <Plus className="mr-3 h-5 w-5" />
                                Novo Agendamento
                            </Button>
                            <Button className="w-full justify-start h-12 bg-slate-800 hover:bg-slate-700 text-slate-50" variant="secondary" onClick={() => setIsClientModalOpen(true)}>
                                <Users className="mr-3 h-5 w-5 text-amber-500" />
                                Nova Ficha de Cliente
                            </Button>
                            <Button className="w-full justify-start h-12 bg-slate-800 hover:bg-slate-700 text-slate-50" variant="secondary" onClick={() => navigate('/inventory')}>
                                <Package className="mr-3 h-5 w-5 text-blue-400" />
                                Cadastrar Produto
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="space-y-4">
                    {/* Controles de Tabela */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-xl font-semibold tracking-tight text-slate-50">Alugueres Ativos</h2>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1 justify-end">
                            <div className="relative w-full sm:max-w-xs xl:max-w-sm shrink-1">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="Buscar por cliente..."
                                    className="pl-9 h-10 w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex rounded-md shadow-sm border border-slate-700 p-0.5 bg-slate-900 shrink-0 h-10 items-center">
                                <button
                                    onClick={() => setFilterStatus('all')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${filterStatus === 'all' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setFilterStatus('ontime')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${filterStatus === 'ontime' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Em Dia
                                </button>
                                <button
                                    onClick={() => setFilterStatus('late')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${filterStatus === 'late' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Atrasados
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[30%] min-w-[200px]">Cliente</TableHead>
                                    <TableHead className="w-[15%] min-w-[120px]">Entrega</TableHead>
                                    <TableHead className="w-[20%] min-w-[130px]">Status</TableHead>
                                    <TableHead className="w-[15%] min-w-[120px]">Valor (€)</TableHead>
                                    <TableHead className="w-[10%] min-w-[100px]">Pagamento</TableHead>
                                    <TableHead className="w-[20%] text-right whitespace-nowrap min-w-[420px]">Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayRentals.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                                            {activeRentals.length > 0 ? 'Nenhum aluguel encontrado para o filtro.' : 'Nenhum aluguer em curso.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    displayRentals.map((rental) => {
                                        const late = isLate(rental.return_date);
                                        return (
                                            <TableRow key={rental.id}>
                                                <TableCell className="font-medium">{rental.customers?.full_name}</TableCell>
                                                <TableCell>{new Date(rental.pickup_date).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    {late ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20 whitespace-nowrap">
                                                            <AlertCircle className="w-3.5 h-3.5" /> Atrasado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
                                                            Em dia
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-semibold text-emerald-400">
                                                    {(Number(rental.total_amount || 0) - Number(rental.deposit_value || 0) - Number(rental.transport_value || 0)).toFixed(2)} €
                                                </TableCell>
                                                <TableCell>
                                                    {rental.payment_status === 'paid' ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                            Pago
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                                                            Pendente
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right flex items-center justify-end gap-2">
                                                    {rental.payment_status !== 'paid' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20"
                                                            onClick={async () => {
                                                                if (window.confirm('Confirmar pagamento deste aluguer?')) {
                                                                    await updateRental(rental.id, { payment_status: 'paid' });
                                                                }
                                                            }}
                                                        >
                                                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Pago
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20"
                                                        onClick={() => {
                                                            setViewRental({ ...rental });
                                                            setIsViewModalOpen(true);
                                                        }}
                                                    >
                                                        <Eye className="w-4 h-4 mr-1.5" /> Ver
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent hover:border-slate-700/50"
                                                        onClick={() => generateRentalContract(rental)}
                                                    >
                                                        <FileText className="w-4 h-4 mr-1.5" /> Contrato
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20"
                                                        onClick={() => {
                                                            setBookingRentalToEdit(rental);
                                                            setIsBookingModalOpen(true);
                                                        }}
                                                    >
                                                        <Edit2 className="w-4 h-4 mr-1.5" /> Editar
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20"
                                                        onClick={() => finalizeRental(rental.id)}
                                                    >
                                                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Finalizar
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="bg-slate-900 border-t border-slate-800">
                                    <TableCell colSpan={3} className="text-right font-medium text-slate-400">Total Filtrado:</TableCell>
                                    <TableCell className="font-bold text-emerald-400">
                                        {displayRentals.reduce((acc, r) => acc + (Number(r.total_amount || 0) - Number(r.deposit_value || 0) - Number(r.transport_value || 0)), 0).toFixed(2)} €
                                    </TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
            </div>

            {/* Modal Global de Novo / Edição Agendamento */}
            <BookingModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                rentalToEdit={bookingRentalToEdit}
            />

            {/* Modal Global de Novo Cliente */}
            <ClientModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
            />

            <ViewRentalModal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setViewRental(null);
                }}
                rental={viewRental}
                onEdit={handleEditRental}
                onDelete={handleDeleteRental}
            />
        </div>
    );
}
