import { useState, useEffect, useMemo } from 'react';
import { useGlobalRentals, useGlobalProducts } from '../data/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { 
    Euro, 
    TrendingUp, 
    Printer, 
    Truck, 
    LayoutDashboard, 
    Wallet, 
    Banknote, 
    CheckCircle2, 
    Clock
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { usePeriod } from '../contexts/PeriodContext';

export default function Accounting() {
    // Basic Data
    const { rentals } = useGlobalRentals();
    const { products } = useGlobalProducts();
    const { startDate: globalStartDate, endDate: globalEndDate } = usePeriod();
 
    // Filters
    const [startDate, setStartDate] = useState(globalStartDate);
    const [endDate, setEndDate] = useState(globalEndDate);
    const [view, setView] = useState<'partnership' | 'cash'>('partnership'); // 'partnership' (current) or 'cash' (new detailed)
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending'>('all');
    const [responsibleFilter, setResponsibleFilter] = useState<'all' | 'Ricardo' | 'Gabriel'>('all');

    // Filtered Data
    const filteredRentals = useMemo(() => {
        if (!rentals) return [];
        let data = rentals;

        if (startDate) {
            data = data.filter(r => new Date(r.pickup_date) >= new Date(startDate));
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            data = data.filter(r => new Date(r.pickup_date) <= end);
        }

        // NOVO: Se estiver na visão de CAIXA, forçamos mostrar apenas os PAGOS
        if (view === 'cash') {
            data = data.filter(r => r.payment_status === 'paid');
        } else if (paymentFilter !== 'all') {
            data = data.filter(r => r.payment_status === paymentFilter);
        }

        // NOVO: Filtro de Responsável
        if (responsibleFilter !== 'all') {
            data = data.filter(r => r.received_by === responsibleFilter);
        }
        
        return data;
    }, [rentals, startDate, endDate, paymentFilter, view, responsibleFilter]);

    // Financial calculations
    const totals = useMemo(() => {
        // Filtrar apenas os pagos para os cálculos de faturamento real
        const paidRentals = filteredRentals.filter(r => r.payment_status === 'paid');
        
        return {
            materialsTotal: paidRentals.reduce((acc, r) => acc + (r.materials_value || 0), 0),
            transportTotal: paidRentals.reduce((acc, r) => acc + (Number(r.transport_value) || 0), 0),
            ivaTotal: paidRentals.reduce((acc, r) => acc + (Number(r.iva_materials) || 0) + (Number(r.iva_transport) || 0), 0),
            depositsTotal: paidRentals.reduce((acc, r) => acc + (Number(r.deposit_value) || 0), 0),
            totalGross: paidRentals.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0),
            realRevenue: paidRentals.reduce((acc, r) => acc + (r.materials_value || 0) + (Number(r.transport_value) || 0) + (Number(r.iva_materials) || 0) + (Number(r.iva_transport) || 0), 0),
            receivedGabriel: paidRentals.filter(r => r.received_by === 'Gabriel').reduce((acc, r) => acc + (r.materials_value || 0) + (Number(r.transport_value) || 0), 0),
            receivedRicardo: paidRentals.filter(r => r.received_by === 'Ricardo').reduce((acc, r) => acc + (r.materials_value || 0) + (Number(r.transport_value) || 0), 0)
        };
    }, [filteredRentals]);

    // Top Products
    const rankedProducts = useMemo(() => {
        const stats: Record<string, number> = {};
        let totalQty = 0;
        
        filteredRentals.forEach(r => {
            if (r.items) {
                r.items.forEach(it => {
                    stats[it.product_id] = (stats[it.product_id] || 0) + it.quantity;
                    totalQty += it.quantity;
                });
            }
        });

        return products
            .map(p => ({
                name: p.name,
                rented_quantity: stats[p.id] || 0,
                percentage: totalQty > 0 ? ((stats[p.id] || 0) / totalQty) * 100 : 0
            }))
            .filter(p => p.rented_quantity > 0)
            .sort((a, b) => b.rented_quantity - a.rented_quantity)
            .slice(0, 5);
    }, [filteredRentals, products]);

    // No-op for now as rentals comes from global state
    // Sincronizar com período global de forma não-síncrona para evitar erro de hook
    useEffect(() => {
        Promise.resolve().then(() => {
            setStartDate(globalStartDate);
            setEndDate(globalEndDate);
        });
    }, [globalStartDate, globalEndDate]);

    useEffect(() => {
    }, [rentals]);

    return (
        <div className="space-y-6">
            <style>{`
                @media print {
                    tbody tr:nth-child(even) {
                        background-color: #f9f9f9 !important;
                    }
                    th, td {
                        padding: 8px !important;
                    }
                }
            `}</style>
            {/* Header / Printing */}
            <div className="hidden print:block mb-8 text-black">
                <h1 className="text-3xl font-bold mb-2">Relatório Tourozero - {view === 'partnership' ? 'Parceria' : 'Caixa'}</h1>
                <p className="text-sm">Período: {startDate} até {endDate}</p>
                <p className="text-sm italic">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
            </div>

            <div className="flex items-center justify-between print:hidden">
                <h1 className="text-2xl font-bold tracking-tight text-slate-50">Contabilidade e Fluxo</h1>
                <Button onClick={() => window.print()} className="bg-amber-500 hover:bg-amber-600 text-slate-900 border-none">
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir Relatório
                </Button>
            </div>

            {/* Main Filters Container */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl print:hidden">
                <div className="flex items-end gap-3">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1">De:</label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-950 border-slate-800 h-10 w-40" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1">Até:</label>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-950 border-slate-800 h-10 w-40" />
                    </div>
                </div>
                <div className="hidden lg:block h-8 w-px bg-slate-800 mx-2" />
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Filtros de data controlam todo o relatório.</p>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-slate-800 print:hidden overflow-x-auto no-scrollbar gap-2">
                <button 
                    onClick={() => setView('partnership')}
                    className={`px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-2.5 transition-all border-b-2 ${view === 'partnership' ? 'border-amber-500 text-amber-500 bg-amber-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    Extrato de Parceria
                </button>
                <button 
                    onClick={() => setView('cash')}
                    className={`px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-2.5 transition-all border-b-2 ${view === 'cash' ? 'border-blue-500 text-blue-500 bg-blue-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    <Wallet className="w-4 h-4" />
                    Relatório de Caixa Detalhado
                </button>
            </div>

            {/* Summary Grid (Conditional Based on View) */}
            <div className="grid gap-6 md:grid-cols-3 print:hidden">
                {view === 'partnership' ? (
                    <>
                        <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-emerald-500/10 hover:border-emerald-500/30 transition-all shadow-xl shadow-emerald-500/10">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-bold text-slate-400">Total Alugueres (Líquido)</CardTitle>
                                <Euro className="h-5 w-5 text-emerald-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-black text-emerald-400">{totals.materialsTotal.toFixed(2)} €</div>
                                <p className="text-[10px] text-slate-500 mt-2 font-medium">Base para comissão (Exclui caução e transp.)</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-emerald-500">
                             <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-bold text-slate-400">Parte Proprietário (80%)</CardTitle>
                                <LayoutDashboard className="h-5 w-5 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-emerald-500">{(totals.materialsTotal * 0.8).toFixed(2)} €</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-blue-500">
                             <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-bold text-slate-400">Comissão Maywan (20%)</CardTitle>
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-blue-500">{(totals.materialsTotal * 0.2).toFixed(2)} €</div>
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <>
                        <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-emerald-500/10 shadow-xl shadow-emerald-500/10 hover:border-emerald-500/30 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Faturação Real</CardTitle>
                                <Banknote className="h-5 w-5 text-emerald-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-black text-emerald-400">{totals.realRevenue.toFixed(2)} €</div>
                                <p className="text-[10px] text-slate-500 mt-2 font-medium">Soma de Materiais + Transporte + IVA</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900 border-slate-800 border-b-4 border-b-blue-500">
                             <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cauções em Mão</CardTitle>
                                <Wallet className="h-5 w-5 text-blue-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-black text-blue-400">{totals.depositsTotal.toFixed(2)} €</div>
                                <p className="text-[10px] text-slate-500 mt-2 font-medium">Custódia de garantias (a devolver)</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-950 border-amber-500/20 shadow-xl shadow-amber-500/5">
                             <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest">Saldo Geral (Total)</CardTitle>
                                <Euro className="h-5 w-5 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-black text-slate-50">{totals.totalGross.toFixed(2)} €</div>
                                <p className="text-[10px] text-slate-500 mt-2 font-medium">Bruto movimentado com cauções</p>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {/* Analytical Bottom Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 print:hidden">
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold text-slate-400">Serviços de Transporte</CardTitle>
                        <Truck className="h-5 w-5 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-500">{totals.transportTotal.toFixed(2)} €</div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 col-span-1 md:col-span-1 lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-bold text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-amber-500" /> Top 5 Produtos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 pt-1">
                            {rankedProducts.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">Sem dados registrados.</p>
                            ) : (
                                rankedProducts.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-4">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                                                <span className="text-slate-300">{p.name}</span>
                                                <span className="text-amber-500">{p.rented_quantity} un.</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500/80" style={{ width: `${p.percentage}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table Section */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl print:border-none print:shadow-none bg-slate-900/60 print:bg-white print:text-black">
                <div className="p-4 border-b border-slate-800 print:hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-950/50">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-3">
                        {view === 'partnership' ? <LayoutDashboard className="w-4 h-4 text-emerald-500" /> : <Wallet className="w-4 h-4 text-blue-500" />}
                        {view === 'partnership' ? 'Extrato de Faturamento' : 'Relatório Detalhado de Caixa'}
                    </h2>
                    
                    {view === 'partnership' ? (
                        <div className="flex flex-wrap gap-3">
                            {/* Filtro Status */}
                            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                                <button 
                                    onClick={() => setPaymentFilter('all')}
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${paymentFilter === 'all' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Todos Status
                                </button>
                                <button 
                                    onClick={() => setPaymentFilter('paid')}
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all flex items-center gap-1.5 ${paymentFilter === 'paid' ? 'bg-emerald-500 text-slate-900 shadow-lg' : 'text-slate-500 hover:text-emerald-500'}`}
                                >
                                    <CheckCircle2 className="w-3 h-3" /> Pagos
                                </button>
                                <button 
                                    onClick={() => setPaymentFilter('pending')}
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all flex items-center gap-1.5 ${paymentFilter === 'pending' ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-500 hover:text-amber-500'}`}
                                >
                                    <Clock className="w-3 h-3" /> Pendentes
                                </button>
                            </div>
                            
                            {/* Filtro Responsável */}
                            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                                <button 
                                    onClick={() => setResponsibleFilter('all')}
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${responsibleFilter === 'all' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Todos
                                </button>
                                <button 
                                    onClick={() => setResponsibleFilter('Ricardo')}
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${responsibleFilter === 'Ricardo' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-blue-400'}`}
                                >
                                    Ricardo
                                </button>
                                <button 
                                    onClick={() => setResponsibleFilter('Gabriel')}
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${responsibleFilter === 'Gabriel' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-purple-400'}`}
                                >
                                    Gabriel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-500 text-[9px] font-black uppercase tracking-widest">
                                <CheckCircle2 className="w-3 h-3" /> 
                                Apenas Recebidos
                            </div>
                            
                            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                                <button 
                                    onClick={() => setResponsibleFilter('all')}
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${responsibleFilter === 'all' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Todos Caixas
                                </button>
                                <button 
                                    onClick={() => setResponsibleFilter('Ricardo')}
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${responsibleFilter === 'Ricardo' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-blue-400'}`}
                                >
                                    Ricardo
                                </button>
                                <button 
                                    onClick={() => setResponsibleFilter('Gabriel')}
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${responsibleFilter === 'Gabriel' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-purple-400'}`}
                                >
                                    Gabriel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        {view === 'partnership' ? (
                            <>
                                <TableHeader>
                                    <TableRow className="bg-slate-950 border-slate-800 print:border-black hover:bg-transparent">
                                        <TableHead className="text-slate-300 font-bold uppercase text-[10px] tracking-widest print:text-black">Data</TableHead>
                                        <TableHead className="text-slate-300 font-bold uppercase text-[10px] tracking-widest print:text-black">Cliente</TableHead>
                                        <TableHead className="text-slate-300 font-bold uppercase text-[10px] tracking-widest print:text-black">Recebido por</TableHead>
                                        <TableHead className="text-slate-300 font-bold uppercase text-[10px] tracking-widest print:hidden">Produtos</TableHead>
                                        <TableHead className="text-right text-slate-300 font-bold uppercase text-[10px] tracking-widest print:text-black print:text-right">Base (€)</TableHead>
                                        <TableHead className="text-right text-amber-500 font-bold uppercase text-[10px] tracking-widest print:text-black print:text-right">Transp (€)</TableHead>
                                        <TableHead className="text-right text-emerald-500 font-bold uppercase text-[10px] tracking-widest print:hidden">Prop (80%)</TableHead>
                                        <TableHead className="text-right text-blue-400 font-bold uppercase text-[10px] tracking-widest print:hidden">Comis (20%)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRentals.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-500 italic">Sem resultados.</TableCell></TableRow>
                                    ) : (
                                        filteredRentals.map(r => (
                                            <TableRow key={r.id} className={`border-slate-800/50 hover:bg-slate-800/40 transition-all ${r.payment_status === 'pending' ? 'opacity-40 grayscale-[0.3]' : ''}`}>
                                                <TableCell className="text-xs text-slate-500 print:text-black">{new Date(r.pickup_date).toLocaleDateString('pt-BR')}</TableCell>
                                                <TableCell className="font-bold text-slate-100 print:text-black">
                                                    <div className="flex flex-col">
                                                        <span>{r.customers?.full_name}</span>
                                                        {r.payment_status === 'pending' && (
                                                            <span className="text-[8px] text-amber-500 uppercase font-black tracking-tighter flex items-center gap-1 mt-0.5 print:text-black">
                                                                <Clock className="w-2 h-2 print:hidden" /> Não contabilizado (Pendente)
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-bold text-slate-400 print:text-black print:font-medium">
                                                    {r.received_by || 'ND'}
                                                </TableCell>
                                                <TableCell className="print:hidden">
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {r.items?.map((it: any, i: number) => (
                                                            <span key={i} className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                                                {it.quantity}x {it.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-black text-emerald-400 print:text-black print:text-right">{(r.materials_value || 0).toFixed(2)} €</TableCell>
                                                <TableCell className="text-right font-bold text-amber-500 print:text-black print:text-right">{(Number(r.transport_value || 0)).toFixed(2)} €</TableCell>
                                                <TableCell className="text-right text-emerald-500/80 font-medium print:hidden">{((r.materials_value || 0) * 0.8).toFixed(2)} €</TableCell>
                                                <TableCell className="text-right text-blue-500 font-bold print:hidden">{((r.materials_value || 0) * 0.2).toFixed(2)} €</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    <TableRow className="bg-slate-950 font-black border-t-2 border-slate-800 hover:bg-slate-950">
                                        <TableCell colSpan={4} className="py-5 text-right uppercase tracking-widest text-[10px] text-slate-500 print:hidden">Totais do Período:</TableCell>
                                        <TableCell colSpan={3} className="py-5 text-right uppercase tracking-widest text-[10px] text-slate-500 hidden print:table-cell print:text-black">Totais do Período:</TableCell>
                                        <TableCell className="text-right text-emerald-400 text-lg print:text-black print:text-right">{totals.materialsTotal.toFixed(2)} €</TableCell>
                                        <TableCell className="text-right text-amber-500 text-lg print:text-black print:text-right">{totals.transportTotal.toFixed(2)} €</TableCell>
                                        <TableCell className="text-right text-emerald-500 text-lg print:hidden">{(totals.materialsTotal * 0.8).toFixed(2)} €</TableCell>
                                        <TableCell className="text-right text-blue-500 text-lg print:hidden">{(totals.materialsTotal * 0.2).toFixed(2)} €</TableCell>
                                    </TableRow>
                                </TableBody>
                            </>
                        ) : (
                            <>
                                <TableHeader>
                                    <TableRow className="bg-slate-950 border-slate-800 hover:bg-transparent">
                                        <TableHead className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">Data</TableHead>
                                        <TableHead className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">Cliente</TableHead>
                                        <TableHead className="text-right text-emerald-500 font-bold uppercase text-[10px] tracking-widest">Aluguer (€)</TableHead>
                                        <TableHead className="text-right text-amber-500 font-bold uppercase text-[10px] tracking-widest">Transp (€)</TableHead>
                                        <TableHead className="text-right text-slate-400 font-bold uppercase text-[10px] tracking-widest">IVA (€)</TableHead>
                                        <TableHead className="text-right text-blue-400 font-black uppercase text-[10px] tracking-widest bg-blue-500/5">Caução (€)</TableHead>
                                        <TableHead className="text-right text-slate-50 font-black uppercase text-[10px] tracking-widest bg-emerald-500/10 px-4">TOTAL (€)</TableHead>
                                        <TableHead className="text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Responsável</TableHead>
                                        <TableHead className="text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">S.</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRentals.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-500 italic">Sem resultados.</TableCell></TableRow>
                                    ) : (
                                        filteredRentals.map(r => (
                                            <TableRow key={r.id} className="border-slate-800/50 hover:bg-slate-800/40 transition-all group">
                                                <TableCell className="text-xs text-slate-500">{new Date(r.pickup_date).toLocaleDateString('pt-BR')}</TableCell>
                                                <TableCell className="font-bold text-slate-100">{r.customers?.full_name}</TableCell>
                                                <TableCell className="text-right text-emerald-400/90 font-medium">{(r.materials_value || 0).toFixed(2)} €</TableCell>
                                                <TableCell className="text-right text-amber-500/90">{(Number(r.transport_value || 0)).toFixed(2)} €</TableCell>
                                                <TableCell className="text-right text-slate-400">{( Number(r.iva_materials || 0) + Number(r.iva_transport || 0) ).toFixed(2)} €</TableCell>
                                                <TableCell className="text-right bg-blue-500/5 group-hover:bg-blue-500/10 transition-all">
                                                    <span className="font-black text-blue-400">{(r.deposit_value || 0).toFixed(2)} €</span>
                                                </TableCell>
                                                <TableCell className="text-right bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-all px-4">
                                                    <span className="font-black text-emerald-400 text-base">{(r.total_amount || 0).toFixed(2)} €</span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                     <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${r.received_by === 'Ricardo' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                                        {r.received_by || 'ND'}
                                                     </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {r.payment_status === 'paid' ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                                                    ) : (
                                                        <Clock className="w-4 h-4 text-amber-500 mx-auto opacity-40" />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    <TableRow className="bg-slate-950 font-black border-t-2 border-slate-800 hover:bg-slate-950">
                                        <TableCell colSpan={2} className="py-5 text-right uppercase tracking-widest text-[10px] text-slate-500">Acumulado do Filtro (Pagos):</TableCell>
                                        <TableCell className="text-right text-emerald-400">{totals.materialsTotal.toFixed(2)} €</TableCell>
                                        <TableCell className="text-right text-amber-500/80">{totals.transportTotal.toFixed(2)} €</TableCell>
                                        <TableCell className="text-right text-slate-500">{totals.ivaTotal.toFixed(2)} €</TableCell>
                                        <TableCell className="text-right text-blue-400 bg-blue-500/5">{totals.depositsTotal.toFixed(2)} €</TableCell>
                                        <TableCell className="text-right text-emerald-400 text-xl bg-emerald-500/10 px-4">{totals.totalGross.toFixed(2)} €</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableBody>
                            </>
                        )}
                    </Table>
                </div>
                
                {/* Print Only Summary for Partnership */}
                {view === 'partnership' && (() => {
                    const totalGabriel = (totals.materialsTotal * 0.8) + (totals.transportTotal / 2);
                    const totalRicardo = (totals.materialsTotal * 0.2) + (totals.transportTotal / 2);
                    const diffGabriel = totalGabriel - totals.receivedGabriel;
                    const isRicardoToGabriel = diffGabriel >= 0;
                    const transferAmount = Math.abs(diffGabriel).toFixed(2);

                    return (
                        <div className="hidden print:block mt-8 p-4 border-2 border-slate-200 bg-[#f9f9f9] rounded-xl text-black break-inside-avoid">
                            <h3 className="text-lg font-black uppercase tracking-widest mb-4 border-b border-slate-300 pb-2">Resumo de Partilha</h3>
                            
                            <div className="grid grid-cols-2 gap-8 mb-6">
                                {/* Coluna Gabriel */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-emerald-700 uppercase tracking-widest text-sm border-b border-emerald-200 pb-1">Parte Gabriel</h4>
                                    <div className="flex justify-between text-sm">
                                        <span>Base (80%)</span>
                                        <span className="font-medium">{(totals.materialsTotal * 0.8).toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Transporte (50%)</span>
                                        <span className="font-medium">{(totals.transportTotal / 2).toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between text-base pt-2 mt-2 border-t border-slate-300 font-black text-emerald-800">
                                        <span>Total a Receber</span>
                                        <span>{totalGabriel.toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-1 text-slate-600">
                                        <span>Já recebido em mão</span>
                                        <span className="font-bold">- {totals.receivedGabriel.toFixed(2)} €</span>
                                    </div>
                                </div>
                                
                                {/* Coluna Ricardo */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-blue-700 uppercase tracking-widest text-sm border-b border-blue-200 pb-1">Parte Ricardo</h4>
                                    <div className="flex justify-between text-sm">
                                        <span>Base (20%)</span>
                                        <span className="font-medium">{(totals.materialsTotal * 0.2).toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Transporte (50%)</span>
                                        <span className="font-medium">{(totals.transportTotal / 2).toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between text-base pt-2 mt-2 border-t border-slate-300 font-black text-blue-800">
                                        <span>Total a Receber</span>
                                        <span>{totalRicardo.toFixed(2)} €</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-1 text-slate-600">
                                        <span>Já recebido em mão</span>
                                        <span className="font-bold">- {totals.receivedRicardo.toFixed(2)} €</span>
                                    </div>
                                </div>
                            </div>

                            {/* Acerto Final */}
                            <div className={`p-4 rounded-lg border-2 text-center shadow-sm ${isRicardoToGabriel ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-emerald-100 border-emerald-300 text-emerald-900'}`}>
                                <h4 className="text-xs uppercase tracking-widest font-bold opacity-80 mb-1">Acerto de Contas</h4>
                                <div className="text-xl font-black">
                                    {isRicardoToGabriel 
                                        ? `Valor a transferir de Ricardo para Gabriel: ${transferAmount} €`
                                        : `Valor a transferir de Gabriel para Ricardo: ${transferAmount} €`
                                    }
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
