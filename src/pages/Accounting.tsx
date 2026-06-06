import React, { useState, useEffect, useMemo } from 'react';
import { useGlobalRentals } from '../data/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { 
    Euro, 
    TrendingUp,
    Printer, 
    LayoutDashboard, 
    Wallet, 
    Banknote, 
    CheckCircle2, 
    Clock,
    ChevronDown,
    Pencil,
    Trash2,
    Save,
    X as XIcon,
    Plus
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { usePeriod } from '../contexts/PeriodContext';

export default function Accounting() {
    // Basic Data
    const { rentals, updateRentalPartial } = useGlobalRentals();
    const { startDate: globalStartDate, endDate: globalEndDate } = usePeriod();
 
    // Filters
    const [startDate, setStartDate] = useState(globalStartDate);
    const [endDate, setEndDate] = useState(globalEndDate);
    const [view, setView] = useState<'partnership' | 'cash'>('partnership'); // 'partnership' (current) or 'cash' (new detailed)
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending'>('all');
    const [responsibleFilter, setResponsibleFilter] = useState<'all' | 'Ricardo' | 'Gabriel'>('all');
    // Estado de expansão dos prolongamentos (rental_id -> boolean)
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    // Estado do modal de edição de prolongamento
    const [editingExt, setEditingExt] = useState<{ rental: any; extIndex: number } | null>(null);
    const [editValue, setEditValue] = useState(0);
    const [editStartDate, setEditStartDate] = useState('');
    const [editReturnDate, setEditReturnDate] = useState('');
    const [editReceivedBy, setEditReceivedBy] = useState('Ricardo');
    const [editNote, setEditNote] = useState('');
    const [isSavingExt, setIsSavingExt] = useState(false);

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

    // Helpers de prolongamento
    const getExtensions = (r: any): any[] => Array.isArray(r.extensions_history) ? r.extensions_history : [];
    const hasActiveExtension = (r: any): boolean => {
        const exts = getExtensions(r);
        if (exts.length === 0) return false;
        const today = new Date(); today.setHours(0,0,0,0);
        const last = exts[exts.length - 1];
        const newEnd = new Date(last.new_return_date); newEnd.setHours(0,0,0,0);
        const extStart = new Date(last.old_return_date); extStart.setHours(0,0,0,0);
        return today >= extStart && today <= newEnd;
    };
    const toggleRow = (id: string) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    const isExpanded = (r: any): boolean => {
        if (expandedRows[r.id] !== undefined) return expandedRows[r.id];
        return hasActiveExtension(r);
    };

    // Calcula o valor base (materiais) de cada entrada de extensão.
    // Registos novos gravam em extra_materials; registos antigos apenas new_value/old_value.
    const getExtValue = (ext: any): number => {
        // 1. Campo extra_materials preenchido (registo novo com valor correto)
        if (Number(ext.extra_materials) > 0) return Number(ext.extra_materials);
        // 2. Fallback extra_value (compatibilidade com versões anteriores)
        if (Number(ext.extra_value) > 0) return Number(ext.extra_value);
        // 3. Registos antigos: diferença de totais (apenas positiva = houve cobrança adicional)
        const diff = Number(ext.new_value || 0) - Number(ext.old_value || 0);
        return diff > 0 ? diff : 0;
    };

    // Recalcula os campos do aluguer após editar/excluir um prolongamento
    const recalcRentalAfterExtChange = (rental: any, newExts: any[]) => {
        const allExts = getExtensions(rental);
        // Valor base original (antes de qualquer prolongamento)
        const baseValue    = allExts.length > 0 ? Number(allExts[0].old_value   || 0) : Number(rental.total_amount   || 0);
        const baseDeposit  = allExts.length > 0 ? Number(allExts[0].old_deposit  || 0) : Number(rental.deposit_value  || 0);
        const baseTransp   = allExts.length > 0 ? Number(allExts[0].old_transport|| 0) : Number(rental.transport_value|| 0);
        const baseReturn   = allExts.length > 0 ? allExts[0].old_return_date         : rental.return_date;

        if (newExts.length === 0) {
            return {
                extensions_history: [],
                return_date:      baseReturn,
                total_amount:     Number(baseValue.toFixed(2)),
                deposit_value:    Number(baseDeposit.toFixed(2)),
                transport_value:  Number(baseTransp.toFixed(2)),
            };
        }
        const extSum  = newExts.reduce((s: number, e: any) => s + getExtValue(e), 0);
        const lastExt = newExts[newExts.length - 1];
        return {
            extensions_history: newExts,
            return_date:     lastExt.new_return_date,
            total_amount:    Number((baseValue + extSum).toFixed(2)),
            deposit_value:   Number(lastExt.new_deposit   ?? baseDeposit),
            transport_value: Number(lastExt.new_transport ?? baseTransp),
        };
    };

    // Abre o modal de criação de prolongamento
    const handleOpenAddExt = (rental: any) => {
        const exts = getExtensions(rental);
        let startD = rental.return_date;
        if (exts.length > 0) {
            startD = exts[exts.length - 1].new_return_date;
        }
        
        const formatDateForInput = (d: string) => d ? d.split('T')[0] : '';
        const startFormatted = formatDateForInput(startD);
        
        let endFormatted = '';
        if (startFormatted) {
            const dateObj = new Date(startFormatted);
            dateObj.setDate(dateObj.getDate() + 7);
            endFormatted = dateObj.toISOString().split('T')[0];
        }
        
        setEditingExt({ rental, extIndex: -1 });
        setEditValue(0);
        setEditStartDate(startFormatted);
        setEditReturnDate(endFormatted);
        setEditReceivedBy(rental.received_by || 'Ricardo');
        setEditNote('');
    };

    // Abre o modal de edição de prolongamento
    const handleOpenEditExt = (rental: any, extIndex: number, ext: any) => {
        setEditingExt({ rental, extIndex });
        setEditValue(getExtValue(ext));
        // formatDateForInput garante YYYY-MM-DD
        const formatDateForInput = (d: string) => d ? d.split('T')[0] : '';
        setEditStartDate(formatDateForInput(ext.old_return_date));
        setEditReturnDate(formatDateForInput(ext.new_return_date || ''));
        setEditReceivedBy(ext.received_by || rental.received_by || 'Ricardo');
        setEditNote(ext.note || '');
    };

    // Exclui um prolongamento e recalcula o aluguer
    const handleDeleteExt = async (rental: any, extIndex: number) => {
        if (!window.confirm('Eliminar este prolongamento? A data e valores do aluguer serão revertidos.')) return;
        const exts    = getExtensions(rental);
        const newExts = exts.filter((_: any, i: number) => i !== extIndex);
        const update  = recalcRentalAfterExtChange(rental, newExts);
        await updateRentalPartial(rental.id, update);
    };

    // Guarda a criação ou edição de um prolongamento
    const handleSaveExt = async () => {
        if (!editingExt) return;
        setIsSavingExt(true);
        try {
            const { rental, extIndex } = editingExt;
            const exts = [...getExtensions(rental)];
            
            if (extIndex >= 0) {
                // Edição de existente
                const orig = exts[extIndex];
                exts[extIndex] = {
                    ...orig,
                    extra_materials: editValue,
                    extra_value:     editValue,   // manter compatibilidade com campo antigo
                    new_value:       Number((Number(orig.old_value || 0) + editValue).toFixed(2)),
                    old_return_date: editStartDate,
                    new_return_date: editReturnDate,
                    received_by:     editReceivedBy,
                    note:            editNote,
                };
            } else {
                // Criação de novo prolongamento
                const currentTotal = Number(rental.total_amount || 0);
                const currentDeposit = Number(rental.deposit_value || 0);
                const currentTransport = Number(rental.transport_value || 0);
                
                // Calcular dias adicionados
                const startD = new Date(editStartDate);
                const endD = new Date(editReturnDate);
                const diffTime = endD.getTime() - startD.getTime();
                const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
                
                const newExt = {
                    date: new Date().toISOString(),
                    type: "prolongamento",
                    note: editNote,
                    days_added: diffDays,
                    added_items: [],
                    extra_value: editValue,
                    extra_materials: editValue,
                    old_value: currentTotal,
                    new_value: Number((currentTotal + editValue).toFixed(2)),
                    old_deposit: currentDeposit,
                    new_deposit: currentDeposit,
                    old_transport: currentTransport,
                    new_transport: currentTransport,
                    old_return_date: editStartDate,
                    new_return_date: editReturnDate,
                    received_by: editReceivedBy
                };
                exts.push(newExt);
            }
            
            const update = recalcRentalAfterExtChange(rental, exts);
            await updateRentalPartial(rental.id, update);
            setEditingExt(null);
        } finally {
            setIsSavingExt(false);
        }
    };

    // Financial calculations (inclui prolongamentos nos totais)
    const totals = useMemo(() => {
        const paidRentals = filteredRentals.filter(r => r.payment_status === 'paid');
        
        // Soma os valores de base dos prolongamentos usando getExtValue (compatível com todos os formatos)
        const extMaterials = paidRentals.reduce((acc, r) => {
            return acc + getExtensions(r).reduce((s: number, e: any) => s + getExtValue(e), 0);
        }, 0);

        // O materials_value do Supabase já é o faturamento líquido acumulado total (inclui prolongamentos).
        // Para obtermos o valor base inicial sem dupla contagem nos totais decompostos:
        const baseMaterials = paidRentals.reduce((acc, r) => {
            const extSum = getExtensions(r).reduce((s: number, e: any) => s + getExtValue(e), 0);
            return acc + Math.max(0, (r.materials_value || 0) - extSum);
        }, 0);
        
        // Transporte: apenas da linha principal, nunca dos prolongamentos
        const transportTotal = paidRentals.reduce((acc, r) => acc + (Number(r.transport_value) || 0), 0);
        const materialsTotal = baseMaterials + extMaterials;

        return {
            materialsTotal,
            transportTotal,
            ivaTotal: paidRentals.reduce((acc, r) => acc + (Number(r.iva_materials) || 0) + (Number(r.iva_transport) || 0), 0),
            depositsTotal: paidRentals.reduce((acc, r) => acc + (Number(r.deposit_value) || 0), 0),
            totalGross: paidRentals.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0),
            realRevenue: materialsTotal + transportTotal + paidRentals.reduce((acc, r) => acc + (Number(r.iva_materials) || 0) + (Number(r.iva_transport) || 0), 0),
            receivedGabriel: paidRentals.filter(r => r.received_by === 'Gabriel').reduce((acc, r) => acc + (r.materials_value || 0) + (Number(r.transport_value) || 0), 0),
            receivedRicardo: paidRentals.filter(r => r.received_by === 'Ricardo').reduce((acc, r) => acc + (r.materials_value || 0) + (Number(r.transport_value) || 0), 0),
            extMaterials
        };
    }, [filteredRentals]);



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
                    .ext-subrow { display: table-row !important; }
                }
                .ext-subrow-animate {
                    animation: fadeInRow 0.18s ease;
                }
                @keyframes fadeInRow {
                    from { opacity: 0; transform: translateY(-4px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            {/* Header / Printing */}
            <div className="hidden print:block mb-8 text-black">
                <h1 className="text-3xl font-bold mb-2">Relatório Enredo Janota Unp Lda - {view === 'partnership' ? 'Parceria' : 'Caixa'}</h1>
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
                                        filteredRentals.map(r => {
                                            const exts = getExtensions(r);
                                            const hasExts = exts.length > 0;
                                            const expanded = isExpanded(r);
                                            // Valor de materiais da linha principal (sem prolongamentos)
                                            const baseMatValue = r.materials_value || 0;
                                            // Valor de materiais acumulado dos prolongamentos usando getExtValue robusto
                                            const extMatTotal = exts.reduce((s: number, e: any) => s + getExtValue(e), 0);
                                            // Valor base estrito inicial (subtraindo prolongamentos)
                                            const initialMatValue = Math.max(0, baseMatValue - extMatTotal);
                                            return (
                                                <React.Fragment key={r.id}>
                                                    {/* Linha Principal */}
                                                    <TableRow key={r.id} className={`border-slate-800/50 hover:bg-slate-800/40 transition-all ${r.payment_status === 'pending' ? 'opacity-40 grayscale-[0.3]' : ''}`}>
                                                        <TableCell className="text-xs text-slate-500 print:text-black">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span>{new Date(r.pickup_date).toLocaleDateString('pt-BR')}</span>
                                                                <span className="text-slate-600">→ {new Date(r.return_date).toLocaleDateString('pt-BR')}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-bold text-slate-100 print:text-black">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    {hasExts ? (
                                                                        <div className="flex items-center gap-1 print:hidden">
                                                                            <button
                                                                                onClick={() => toggleRow(r.id)}
                                                                                className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all border ${
                                                                                    expanded
                                                                                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                                                                        : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-amber-500/40 hover:text-amber-400'
                                                                                }`}
                                                                                title={expanded ? 'Ocultar prolongamentos' : `Ver ${exts.length} prolongamento(s)`}
                                                                            >
                                                                                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleOpenAddExt(r)}
                                                                                className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all border bg-slate-800 border-slate-700 text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/15"
                                                                                title="Adicionar novo prolongamento"
                                                                            >
                                                                                <Plus className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleOpenAddExt(r)}
                                                                            className="print:hidden flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all border bg-slate-800 border-slate-700 text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/15"
                                                                            title="Adicionar prolongamento"
                                                                        >
                                                                            <Plus className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                    <span>{r.customers?.full_name}</span>
                                                                </div>
                                                                {r.payment_status === 'pending' && (
                                                                    <span className="text-[8px] text-amber-500 uppercase font-black tracking-tighter flex items-center gap-1 mt-0.5 print:text-black">
                                                                        <Clock className="w-2 h-2 print:hidden" /> Não contabilizado (Pendente)
                                                                    </span>
                                                                )}
                                                                {hasExts && (
                                                                    <span className="text-[8px] text-amber-400/70 font-bold uppercase tracking-wider mt-0.5 print:hidden">
                                                                        {exts.length} prolongamento{exts.length > 1 ? 's' : ''}
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
                                                        <TableCell className="text-right font-black text-emerald-400 print:text-black print:text-right">
                                                            {initialMatValue.toFixed(2).replace('.', ',')} €
                                                            {hasExts && extMatTotal > 0 && (
                                                                <div className="text-[9px] text-amber-400/70 font-bold print:hidden">
                                                                    +{extMatTotal.toFixed(2).replace('.', ',')} € ext.
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-amber-500 print:text-black print:text-right">{(Number(r.transport_value || 0)).toFixed(2).replace('.', ',')} €</TableCell>
                                                        <TableCell className="text-right text-emerald-500/80 font-medium print:hidden">{(initialMatValue * 0.8).toFixed(2).replace('.', ',')} €</TableCell>
                                                        <TableCell className="text-right text-blue-500 font-bold print:hidden">{(initialMatValue * 0.2).toFixed(2).replace('.', ',')} €</TableCell>
                                                    </TableRow>

                                                    {/* Sublinhas de Prolongamento (tela) */}
                                                    {hasExts && expanded && exts.map((ext: any, ei: number) => {
                                                        // getExtValue: compatível com todos os formatos (novo e antigo)
                                                        const extMat = getExtValue(ext);
                                                        return (
                                                            <TableRow key={`${r.id}-ext-${ei}`} className="ext-subrow-animate border-amber-500/10 bg-amber-500/[0.03] hover:bg-amber-500/[0.06] transition-all">
                                                                <TableCell className="text-[10px] text-amber-500/70 pl-6 print:text-black">
                                                                    <div className="flex flex-col gap-0.5 border-l-2 border-amber-500/30 pl-2">
                                                                        <span>{new Date(ext.old_return_date).toLocaleDateString('pt-BR')}</span>
                                                                        <span>→ {new Date(ext.new_return_date).toLocaleDateString('pt-BR')}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="print:text-black">
                                                                    <div className="pl-7 flex flex-col">
                                                                        <span className="text-[11px] font-bold text-amber-400/80">↳ Prolongamento</span>
                                                                        <span className="text-[9px] text-slate-500">{ext.days_added} dias adicionais</span>
                                                                        {ext.note && <span className="text-[9px] italic text-slate-600 truncate max-w-[160px]" title={ext.note}>{ext.note}</span>}
                                                                        {/* Botões de edição e exclusão */}
                                                                        <div className="flex items-center gap-1 mt-1.5 print:hidden">
                                                                            <button
                                                                                onClick={() => handleOpenEditExt(r, ei, ext)}
                                                                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 transition-all"
                                                                                title="Editar prolongamento"
                                                                            >
                                                                                <Pencil className="w-2.5 h-2.5" /> Editar
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteExt(r, ei)}
                                                                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all"
                                                                                title="Eliminar prolongamento"
                                                                            >
                                                                                <Trash2 className="w-2.5 h-2.5" /> Excluir
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleOpenAddExt(r)}
                                                                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition-all"
                                                                                title="Adicionar novo prolongamento"
                                                                            >
                                                                                <Plus className="w-2.5 h-2.5" /> Adicionar
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-[10px] text-slate-500 print:text-black">
                                                                    {ext.received_by || r.received_by || 'ND'}
                                                                </TableCell>
                                                                <TableCell className="print:hidden">
                                                                    <div className="pl-7 flex flex-wrap gap-1">
                                                                        {(ext.added_items || []).map((it: any, aii: number) => (
                                                                            <span key={aii} className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400/80 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                                                                {it.quantity}x {it.name}
                                                                            </span>
                                                                        ))}
                                                                        {(!ext.added_items || ext.added_items.length === 0) && <span className="text-[9px] text-slate-600 italic">Mesmos itens</span>}
                                                                    </div>
                                                                </TableCell>
                                                                {/* BASE: valor extra de materiais do prolongamento */}
                                                                <TableCell className="text-right font-bold text-amber-400/80 print:text-black print:text-right">
                                                                    {extMat > 0 ? `+${extMat.toFixed(2).replace('.', ',')} €` : <span className="text-slate-600">0,00 €</span>}
                                                                </TableCell>
                                                                {/* TRANSP: sempre — (transporte cobrado uma única vez no aluguer principal) */}
                                                                <TableCell className="text-right text-slate-600 print:text-black print:text-right">—</TableCell>
                                                                {/* PROPOSTA 80%: sobre o valor base do prolongamento */}
                                                                <TableCell className="text-right text-emerald-500/50 print:hidden">
                                                                    {extMat > 0 ? `${(extMat * 0.8).toFixed(2).replace('.', ',')} €` : <span className="text-slate-600">—</span>}
                                                                </TableCell>
                                                                {/* COMIS 20%: sobre o valor base do prolongamento */}
                                                                <TableCell className="text-right text-blue-500/50 print:hidden">
                                                                    {extMat > 0 ? `${(extMat * 0.2).toFixed(2).replace('.', ',')} €` : <span className="text-slate-600">—</span>}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}

                                                    {/* Sublinhas de Prolongamento (impressão - sempre visíveis) */}
                                                    {hasExts && exts.map((ext: any, ei: number) => {
                                                        const extMat = getExtValue(ext);
                                                        return (
                                                            <TableRow key={`${r.id}-ext-print-${ei}`} className="hidden print:table-row ext-subrow border-0">
                                                                <TableCell className="text-[9px] text-slate-600 pl-6 print:text-black">
                                                                    {new Date(ext.old_return_date).toLocaleDateString('pt-BR')} → {new Date(ext.new_return_date).toLocaleDateString('pt-BR')}
                                                                </TableCell>
                                                                <TableCell className="print:text-black">
                                                                    <span className="text-[10px] font-medium text-slate-500 pl-4">↳ Prolongamento ({ext.days_added}d)</span>
                                                                </TableCell>
                                                                <TableCell className="text-[9px] text-slate-500 print:text-black">{ext.received_by || r.received_by || 'ND'}</TableCell>
                                                                <TableCell className="text-right text-[9px] text-slate-600 print:text-black print:text-right">
                                                                    {extMat > 0 ? `+${extMat.toFixed(2).replace('.', ',')} €` : '—'}
                                                                </TableCell>
                                                                {/* Transporte sempre — nos prolongamentos */}
                                                                <TableCell className="text-right text-[9px] text-slate-600 print:text-black print:text-right">—</TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                    <TableRow className="bg-slate-950 font-black border-t-2 border-slate-800 hover:bg-slate-950">
                                        <TableCell colSpan={4} className="py-5 text-right uppercase tracking-widest text-[10px] text-slate-500 print:hidden">Totais do Período:</TableCell>
                                        <TableCell colSpan={3} className="py-5 text-right uppercase tracking-widest text-[10px] text-slate-500 hidden print:table-cell print:text-black">Totais do Período:</TableCell>
                                        <TableCell className="text-right text-emerald-400 text-lg print:text-black print:text-right">
                                            {totals.materialsTotal.toFixed(2).replace('.', ',')} €
                                            {totals.extMaterials > 0 && (
                                                <div className="text-[9px] text-amber-400/70 font-medium print:hidden">incl. {totals.extMaterials.toFixed(2).replace('.', ',')} € ext.</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-amber-500 text-lg print:text-black print:text-right">{totals.transportTotal.toFixed(2).replace('.', ',')} €</TableCell>
                                        <TableCell className="text-right text-emerald-500 text-lg print:hidden">{(totals.materialsTotal * 0.8).toFixed(2).replace('.', ',')} €</TableCell>
                                        <TableCell className="text-right text-blue-500 text-lg print:hidden">{(totals.materialsTotal * 0.2).toFixed(2).replace('.', ',')} €</TableCell>
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
                                                <TableCell className="text-right text-emerald-400/90 font-medium">{(r.materials_value || 0).toFixed(2).replace('.', ',')} €</TableCell>
                                                <TableCell className="text-right text-amber-500/90">{(Number(r.transport_value || 0)).toFixed(2).replace('.', ',')} €</TableCell>
                                                <TableCell className="text-right text-slate-400">{( Number(r.iva_materials || 0) + Number(r.iva_transport || 0) ).toFixed(2).replace('.', ',')} €</TableCell>
                                                <TableCell className="text-right bg-blue-500/5 group-hover:bg-blue-500/10 transition-all">
                                                    <span className="font-black text-blue-400">{(r.deposit_value || 0).toFixed(2).replace('.', ',')} €</span>
                                                </TableCell>
                                                <TableCell className="text-right bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-all px-4">
                                                    <span className="font-black text-emerald-400 text-base">{(r.total_amount || 0).toFixed(2).replace('.', ',')} €</span>
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
                                        <TableCell className="text-right text-emerald-400">{totals.materialsTotal.toFixed(2).replace('.', ',')} €</TableCell>
                                        <TableCell className="text-right text-amber-500/80">{totals.transportTotal.toFixed(2).replace('.', ',')} €</TableCell>
                                        <TableCell className="text-right text-slate-500">{totals.ivaTotal.toFixed(2).replace('.', ',')} €</TableCell>
                                        <TableCell className="text-right text-blue-400 bg-blue-500/5">{totals.depositsTotal.toFixed(2).replace('.', ',')} €</TableCell>
                                        <TableCell className="text-right text-emerald-400 text-xl bg-emerald-500/10 px-4">{totals.totalGross.toFixed(2).replace('.', ',')} €</TableCell>
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
                    const transferAmount = Math.abs(diffGabriel).toFixed(2).replace('.', ',');

                    return (
                        <div className="hidden print:block mt-8 p-4 border-2 border-slate-200 bg-[#f9f9f9] rounded-xl text-black break-inside-avoid">
                            <h3 className="text-lg font-black uppercase tracking-widest mb-4 border-b border-slate-300 pb-2">Resumo de Partilha</h3>
                            
                            <div className="grid grid-cols-2 gap-8 mb-6">
                                {/* Coluna Gabriel */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-emerald-700 uppercase tracking-widest text-sm border-b border-emerald-200 pb-1">Parte Gabriel</h4>
                                    <div className="flex justify-between text-sm">
                                        <span>Base (80%)</span>
                                        <span className="font-medium">{(totals.materialsTotal * 0.8).toFixed(2).replace('.', ',')} €</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Transporte (50%)</span>
                                        <span className="font-medium">{(totals.transportTotal / 2).toFixed(2).replace('.', ',')} €</span>
                                    </div>
                                    <div className="flex justify-between text-base pt-2 mt-2 border-t border-slate-300 font-black text-emerald-800">
                                        <span>Total a Receber</span>
                                        <span>{totalGabriel.toFixed(2).replace('.', ',')} €</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-1 text-slate-600">
                                        <span>Já recebido em mão</span>
                                        <span className="font-bold">- {totals.receivedGabriel.toFixed(2).replace('.', ',')} €</span>
                                    </div>
                                </div>
                                
                                {/* Coluna Ricardo */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-blue-700 uppercase tracking-widest text-sm border-b border-blue-200 pb-1">Parte Ricardo</h4>
                                    <div className="flex justify-between text-sm">
                                        <span>Base (20%)</span>
                                        <span className="font-medium">{(totals.materialsTotal * 0.2).toFixed(2).replace('.', ',')} €</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Transporte (50%)</span>
                                        <span className="font-medium">{(totals.transportTotal / 2).toFixed(2).replace('.', ',')} €</span>
                                    </div>
                                    <div className="flex justify-between text-base pt-2 mt-2 border-t border-slate-300 font-black text-blue-800">
                                        <span>Total a Receber</span>
                                        <span>{totalRicardo.toFixed(2).replace('.', ',')} €</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-1 text-slate-600">
                                        <span>Já recebido em mão</span>
                                        <span className="font-bold">- {totals.receivedRicardo.toFixed(2).replace('.', ',')} €</span>
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

            {/* Modal de Edição de Prolongamento */}
            {editingExt && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 animate-in fade-in">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-500/40 p-6 shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-base font-black text-slate-50 flex items-center gap-2 uppercase tracking-tight">
                                    {editingExt.extIndex >= 0 ? (
                                        <>
                                            <Pencil className="h-4 w-4 text-amber-500" />
                                            Editar Prolongamento
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4 text-emerald-400" />
                                            Adicionar Prolongamento
                                        </>
                                    )}
                                </h3>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {editingExt.rental.customers?.full_name} • {editingExt.extIndex >= 0 ? `Prolongamento #${editingExt.extIndex + 1}` : 'Novo Prolongamento'}
                                </p>
                            </div>
                            <button onClick={() => setEditingExt(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-all">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Valor Base */}
                            <div>
                                <label className="block text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest mb-1">Valor Extra Materiais (€)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editValue}
                                    onChange={e => setEditValue(parseFloat(e.target.value) || 0)}
                                    className="bg-slate-950 border-emerald-500/20 text-lg font-black text-emerald-400 h-12"
                                />
                                <div className="flex gap-4 mt-1">
                                    <p className="text-[9px] text-emerald-500/60">Proposta (80%): {(editValue * 0.8).toFixed(2)} €</p>
                                    <p className="text-[9px] text-blue-500/60">Comissão (20%): {(editValue * 0.2).toFixed(2)} €</p>
                                </div>
                            </div>

                            {/* Datas de Início e Término */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-1">Data de Início</label>
                                    <Input
                                        type="date"
                                        value={editStartDate}
                                        onChange={e => setEditStartDate(e.target.value)}
                                        className="bg-slate-950 border-slate-800 font-bold text-amber-400 h-11"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-1">Data de Término</label>
                                    <Input
                                        type="date"
                                        value={editReturnDate}
                                        onChange={e => setEditReturnDate(e.target.value)}
                                        className="bg-slate-950 border-slate-800 font-bold text-amber-400 h-11"
                                    />
                                </div>
                            </div>

                            {/* Recebido Por */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recebido Por</label>
                                <select
                                    value={editReceivedBy}
                                    onChange={e => setEditReceivedBy(e.target.value)}
                                    className="w-full h-10 px-3 bg-slate-950 border border-slate-800 text-sm text-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                                >
                                    <option value="Ricardo">Ricardo</option>
                                    <option value="Gabriel">Gabriel</option>
                                </select>
                            </div>

                            {/* Notas */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notas Internas</label>
                                <textarea
                                    value={editNote}
                                    onChange={e => setEditNote(e.target.value)}
                                    rows={2}
                                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none placeholder:text-slate-700"
                                    placeholder="Observações do prolongamento..."
                                />
                            </div>
                        </div>

                        {/* Acções */}
                        <div className="flex gap-3 pt-5 border-t border-slate-800 mt-5">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 h-11 border-slate-700 text-slate-400 hover:bg-slate-800 text-xs"
                                onClick={() => setEditingExt(null)}
                                disabled={isSavingExt}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                className={`flex-[2] h-11 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all ${
                                    editingExt.extIndex >= 0
                                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-amber-500/10'
                                        : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/10'
                                }`}
                                onClick={handleSaveExt}
                                disabled={isSavingExt}
                            >
                                <Save className="w-4 h-4" />
                                {isSavingExt ? 'A Guardar...' : editingExt.extIndex >= 0 ? 'Guardar Alterações' : 'Adicionar Prolongamento'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
