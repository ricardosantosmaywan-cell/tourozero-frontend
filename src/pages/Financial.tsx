import React, { useMemo, useState } from 'react';
import {
    Banknote,
    Fuel,
    Info,
    Pencil,
    Percent,
    Plus,
    Printer,
    Receipt,
    Scale,
    TrendingDown,
    TrendingUp,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import { useGlobalExpenses, useGlobalRentals, type Expense, type ExpenseInput } from '../data/api';
import { usePeriod } from '../contexts/PeriodContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import ExpenseModal from '../components/ExpenseModal';
import { buildDRE, calculateRevenueTotals, EXPENSE_CATEGORIES, getCategoryLabel } from '../utils/financialCalculations';

const eur = (n: number) => `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const formatDate = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR');

// Datas montadas com os campos locais (toISOString desloca o dia em fusos a leste de UTC, como Portugal)
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

function periodRange(year: number, month: number, day: number | null) {
    if (day !== null) return { start: ymd(year, month, day), end: ymd(year, month, day) };
    return { start: ymd(year, month, 1), end: ymd(year, month, new Date(year, month + 1, 0).getDate()) };
}

const inRange = (date: string | undefined, start: string, end: string) => {
    const d = (date || '').slice(0, 10);
    return d !== '' && (!start || d >= start) && (!end || d <= end);
};

type View = 'dre' | 'expenses';

export default function Financial() {
    const { rentals, loading: loadingRentals } = useGlobalRentals();
    const { expenses, loading: loadingExpenses, tableMissing, addExpense, updateExpense, deleteExpense } = useGlobalExpenses();
    const { selectedYear, selectedMonth, selectedDay } = usePeriod();

    const [view, setView] = useState<View>('dre');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [modal, setModal] = useState<{ expense?: Expense } | null>(null);
    const [deleteError, setDeleteError] = useState('');

    // O intervalo segue o calendário do menu lateral; editar De/Até sobrepõe-o até o período do menu mudar.
    const periodKey = `${selectedYear}-${selectedMonth}-${selectedDay}`;
    const periodDefault = periodRange(selectedYear, selectedMonth, selectedDay);
    const [override, setOverride] = useState<{ key: string; start: string; end: string } | null>(null);
    const { start, end } = override?.key === periodKey ? override : periodDefault;
    const setRange = (patch: Partial<{ start: string; end: string }>) =>
        setOverride({ key: periodKey, start, end, ...patch });

    const periodRentals = useMemo(() => rentals.filter(r => inRange(r.pickup_date, start, end)), [rentals, start, end]);
    const periodExpenses = useMemo(() => expenses.filter(e => inRange(e.expense_date, start, end)), [expenses, start, end]);

    const revenue = useMemo(() => calculateRevenueTotals(periodRentals), [periodRentals]);
    const dre = useMemo(() => buildDRE(revenue, periodExpenses), [revenue, periodExpenses]);

    const visibleExpenses = useMemo(
        () => periodExpenses.filter(e => categoryFilter === 'all' || e.category === categoryFilter),
        [periodExpenses, categoryFilter]
    );
    const visibleTotal = visibleExpenses.reduce((s, e) => s + e.amount, 0);

    // Nova despesa: hoje, se estiver dentro do período visível; senão o primeiro dia dele
    const now = new Date();
    const todayStr = ymd(now.getFullYear(), now.getMonth(), now.getDate());
    const newExpenseDate = inRange(todayStr, start, end) ? todayStr : start;

    const isLoading = loadingRentals || loadingExpenses;
    const pct = (value: number) => (dre.grossRevenue > 0 ? `${((value / dre.grossRevenue) * 100).toFixed(1).replace('.', ',')}%` : '—');
    const resultPositive = dre.netResult >= 0;

    const handleSave = async (data: ExpenseInput) => {
        if (modal?.expense) await updateExpense(modal.expense.id, data);
        else await addExpense(data);
    };

    const handleDelete = async (e: Expense) => {
        if (!window.confirm(`Eliminar a despesa "${e.description || getCategoryLabel(e.category)}" de ${eur(e.amount)}?`)) return;
        setDeleteError('');
        try {
            await deleteExpense(e.id);
        } catch (err: any) {
            setDeleteError(err.message || 'Não foi possível eliminar a despesa.');
        }
    };

    const tabClass = (active: boolean, color: string) =>
        `px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-2.5 transition-all border-b-2 whitespace-nowrap ${active ? `${color} bg-white/5` : 'border-transparent text-slate-500 hover:text-slate-300'}`;

    return (
        <div className="space-y-6">
            {/* Cabeçalho de impressão */}
            <div className="hidden print:block mb-8 text-black">
                <h1 className="text-3xl font-bold mb-2">Enredo Janota Unp Lda - {view === 'dre' ? 'DRE' : 'Despesas'}</h1>
                <p className="text-sm">Período: {formatDate(start)} até {formatDate(end)}</p>
                <p className="text-sm italic">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <h1 className="text-2xl font-bold tracking-tight text-slate-50">Financeiro</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.print()} className="border-slate-700">
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                    </Button>
                    <Button onClick={() => setModal({})} disabled={tableMissing}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Despesa
                    </Button>
                </div>
            </div>

            {tableMissing && (
                <div className="flex gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm print:hidden">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                        <p className="font-bold">A tabela de despesas ainda não existe no Supabase.</p>
                        <p className="text-xs text-amber-200/80 mt-1">
                            Abra o SQL Editor do Supabase e execute o ficheiro <code className="font-mono">migration_expenses.sql</code> (na raiz do projeto); depois recarregue a página.
                        </p>
                    </div>
                </div>
            )}

            {/* Filtro de período */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl print:hidden">
                <div className="flex items-end gap-3">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1">De:</label>
                        <Input type="date" value={start} onChange={e => setRange({ start: e.target.value })} className="bg-slate-950 border-slate-800 h-10 w-40" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1">Até:</label>
                        <Input type="date" value={end} onChange={e => setRange({ end: e.target.value })} className="bg-slate-950 border-slate-800 h-10 w-40" />
                    </div>
                </div>
                <div className="hidden lg:block h-8 w-px bg-slate-800 mx-2" />
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Acompanha o calendário do menu lateral.</p>
            </div>

            {/* Indicadores */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 print:hidden">
                <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-emerald-500/10">
                    <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 sm:pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Receita Recebida</CardTitle>
                        <Banknote className="h-5 w-5 text-emerald-400" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-xl sm:text-3xl font-black text-emerald-400">{eur(dre.grossRevenue)}</div>
                        <p className="text-[10px] text-slate-500 mt-2">Alugueres + transporte pagos</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-red-500/10">
                    <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 sm:pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Despesas</CardTitle>
                        <TrendingDown className="h-5 w-5 text-red-400" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-xl sm:text-3xl font-black text-red-400">{eur(dre.totalExpenses)}</div>
                        <p className="text-[10px] text-slate-500 mt-2">{periodExpenses.length} lançamento{periodExpenses.length === 1 ? '' : 's'} no período</p>
                    </CardContent>
                </Card>
                <Card className={`bg-gradient-to-br from-slate-900 to-slate-950 ${resultPositive ? 'border-emerald-500/20' : 'border-red-500/30'}`}>
                    <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 sm:pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resultado</CardTitle>
                        {resultPositive ? <TrendingUp className="h-5 w-5 text-emerald-400" /> : <TrendingDown className="h-5 w-5 text-red-400" />}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-xl sm:text-3xl font-black ${resultPositive ? 'text-emerald-400' : 'text-red-400'}`}>{eur(dre.netResult)}</div>
                        <p className="text-[10px] text-slate-500 mt-2">{resultPositive ? 'Lucro' : 'Prejuízo'} do período</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 sm:pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Margem</CardTitle>
                        <Percent className="h-5 w-5 text-amber-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-xl sm:text-3xl font-black text-slate-50">
                            {dre.margin === null ? '—' : `${dre.margin.toFixed(1).replace('.', ',')}%`}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2">Resultado sobre a receita</p>
                    </CardContent>
                </Card>
            </div>

            {/* Abas */}
            <div className="flex border-b border-slate-800 print:hidden overflow-x-auto gap-2">
                <button onClick={() => setView('dre')} className={tabClass(view === 'dre', 'border-amber-500 text-amber-500')}>
                    <Scale className="w-4 h-4" />
                    DRE
                </button>
                <button onClick={() => setView('expenses')} className={tabClass(view === 'expenses', 'border-red-500 text-red-400')}>
                    <Receipt className="w-4 h-4" />
                    Despesas
                    <span className="text-[10px] bg-slate-800 text-slate-300 rounded-full px-2 py-0.5">{periodExpenses.length}</span>
                </button>
            </div>

            {isLoading && <p className="text-sm text-slate-500 print:hidden">A carregar...</p>}

            {view === 'dre' ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl print:border-none print:shadow-none print:bg-white print:text-black">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/50 print:hidden">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-3">
                            <Scale className="w-4 h-4 text-amber-500" />
                            Demonstração do Resultado do Exercício
                        </h2>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-950 border-slate-800 print:border-black hover:bg-transparent">
                                <TableHead className="text-slate-300 font-bold uppercase text-[10px] tracking-widest px-3 sm:px-4 print:text-black">Descrição</TableHead>
                                <TableHead className="text-right text-slate-300 font-bold uppercase text-[10px] tracking-widest px-2 sm:px-4 print:text-black">Valor</TableHead>
                                <TableHead className="text-right text-slate-300 font-bold uppercase text-[10px] tracking-widest w-16 sm:w-24 px-2 sm:px-4 print:text-black">% Rec.</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <DRESection label="Receita Operacional" />
                            <DRELine label="Aluguer de Andaimes (incl. prolongamentos)" value={dre.materials} pct={pct(dre.materials)} indent />
                            <DRELine label="Transporte (ida e volta)" value={dre.transport} pct={pct(dre.transport)} indent />
                            <DRELine label="(=) Receita Bruta" value={dre.grossRevenue} pct={pct(dre.grossRevenue)} strong tone="text-emerald-400" />

                            <DRESection label="(−) Despesas" />
                            {dre.totalExpenses === 0 ? (
                                <TableRow className="border-slate-800/50 hover:bg-transparent">
                                    <TableCell colSpan={3} className="pl-8 text-xs italic text-slate-500 print:text-black">Sem despesas lançadas neste período.</TableCell>
                                </TableRow>
                            ) : (
                                dre.groups.filter(g => g.lines.length > 0).map(g => (
                                    <React.Fragment key={g.key}>
                                        <DRELine label={g.label} value={-g.total} pct={pct(g.total)} strong indent tone="text-slate-200" />
                                        {g.lines.map(l => (
                                            <DRELine key={l.category} label={l.label} value={-l.amount} pct={pct(l.amount)} indent="deep" muted />
                                        ))}
                                    </React.Fragment>
                                ))
                            )}
                            <DRELine label="(=) Total de Despesas" value={-dre.totalExpenses} pct={pct(dre.totalExpenses)} strong tone="text-red-400" />

                            <TableRow className={`border-t-2 border-slate-700 hover:bg-transparent ${resultPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'} print:bg-transparent`}>
                                <TableCell className="py-5 font-black uppercase tracking-widest text-sm text-slate-50 print:text-black">(=) Resultado Líquido do Período</TableCell>
                                <TableCell className={`py-5 text-right font-black text-xl ${resultPositive ? 'text-emerald-400' : 'text-red-400'} print:text-black`}>{eur(dre.netResult)}</TableCell>
                                <TableCell className="py-5 text-right font-bold text-slate-300 print:text-black">{dre.margin === null ? '—' : `${dre.margin.toFixed(1).replace('.', ',')}%`}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>

                    <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-1.5 print:bg-transparent print:border-slate-300">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 print:text-black">
                            <Info className="w-3 h-3" /> Fora do resultado (informativo)
                        </p>
                        <MemoLine label="IVA cobrado nos alugueres pagos (a entregar ao Estado)" value={revenue.iva} />
                        <MemoLine label="Cauções em custódia (a devolver aos clientes)" value={revenue.deposits} />
                        <MemoLine label="Aluguer ainda por receber (pendente)" value={revenue.pending} />
                        <p className="text-[10px] text-slate-600 pt-2 print:text-black">
                            Regime de caixa: a receita segue as mesmas regras do Dashboard — só conta o que já foi pago e pertence a alugueres com recolha no período. As despesas entram pela data em que foram lançadas.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl print:border-none print:shadow-none print:bg-white print:text-black">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-3">
                            <Fuel className="w-4 h-4 text-red-400" />
                            Despesas do Período
                        </h2>
                        <select
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                            className="h-9 px-3 bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                        >
                            <option value="all">Todas as categorias</option>
                            {EXPENSE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                    </div>

                    {deleteError && <p className="m-4 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{deleteError}</p>}

                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-950 border-slate-800 print:border-black hover:bg-transparent">
                                <TableHead className="text-slate-300 font-bold uppercase text-[10px] tracking-widest print:text-black">Data</TableHead>
                                <TableHead className="text-slate-300 font-bold uppercase text-[10px] tracking-widest print:text-black">Categoria</TableHead>
                                <TableHead className="text-slate-300 font-bold uppercase text-[10px] tracking-widest print:text-black">Descrição</TableHead>
                                <TableHead className="text-slate-300 font-bold uppercase text-[10px] tracking-widest print:text-black">Pago por</TableHead>
                                <TableHead className="text-right text-red-400 font-bold uppercase text-[10px] tracking-widest print:text-black">Valor</TableHead>
                                <TableHead className="w-24 print:hidden" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleExpenses.length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-500 italic">
                                        {periodExpenses.length === 0 ? 'Nenhuma despesa lançada neste período.' : 'Nenhuma despesa nesta categoria.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visibleExpenses.map(e => (
                                    <TableRow key={e.id} className="border-slate-800/50 hover:bg-slate-800/40 transition-all">
                                        <TableCell className="text-xs text-slate-400 whitespace-nowrap print:text-black">{formatDate(e.expense_date)}</TableCell>
                                        <TableCell className="print:text-black">
                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-950 border border-slate-800 text-slate-300 px-2 py-1 rounded-md whitespace-nowrap print:border-0 print:bg-transparent print:text-black print:p-0">
                                                {getCategoryLabel(e.category)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-200 print:text-black">
                                            {e.description || <span className="text-slate-600">—</span>}
                                            {e.notes && <div className="text-[10px] italic text-slate-500 print:text-black">{e.notes}</div>}
                                        </TableCell>
                                        <TableCell className="text-xs font-bold text-slate-400 print:text-black">{e.paid_by || 'ND'}</TableCell>
                                        <TableCell className="text-right font-black text-red-400 whitespace-nowrap print:text-black">{eur(e.amount)}</TableCell>
                                        <TableCell className="print:hidden">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => setModal({ expense: e })} title="Editar" className="w-7 h-7 rounded flex items-center justify-center bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 transition-all">
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                                <button onClick={() => handleDelete(e)} title="Eliminar" className="w-7 h-7 rounded flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            <TableRow className="bg-slate-950 font-black border-t-2 border-slate-800 hover:bg-slate-950">
                                <TableCell colSpan={4} className="py-5 text-right uppercase tracking-widest text-[10px] text-slate-500 print:text-black">
                                    {categoryFilter === 'all' ? 'Total do Período:' : 'Total da Categoria:'}
                                </TableCell>
                                <TableCell className="py-5 text-right text-red-400 text-lg whitespace-nowrap print:text-black">{eur(visibleTotal)}</TableCell>
                                <TableCell className="print:hidden" />
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            )}

            {modal && (
                <ExpenseModal
                    expense={modal.expense}
                    defaultDate={newExpenseDate}
                    onSave={handleSave}
                    onClose={() => setModal(null)}
                />
            )}
        </div>
    );
}

function DRESection({ label }: { label: string }) {
    return (
        <TableRow className="bg-slate-950/60 border-slate-800 hover:bg-slate-950/60">
            <TableCell colSpan={3} className="py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 print:text-black">{label}</TableCell>
        </TableRow>
    );
}

interface DRELineProps {
    label: string;
    value: number;
    pct: string;
    indent?: boolean | 'deep';
    strong?: boolean;
    muted?: boolean;
    tone?: string;
}

function DRELine({ label, value, pct, indent, strong, muted, tone }: DRELineProps) {
    const color = tone ?? (muted ? 'text-slate-400' : 'text-slate-200');
    return (
        <TableRow className={`border-slate-800/50 hover:bg-slate-800/30 ${strong ? 'bg-slate-950/30' : ''}`}>
            <TableCell className={`px-3 sm:px-4 py-3 sm:py-4 ${indent === 'deep' ? 'pl-8 sm:pl-14' : indent ? 'pl-5 sm:pl-8' : ''} ${strong ? 'font-bold' : ''} ${muted ? 'text-xs' : 'text-sm'} ${color} print:text-black`}>{label}</TableCell>
            <TableCell className={`text-right whitespace-nowrap px-2 sm:px-4 py-3 sm:py-4 ${strong ? 'font-black' : 'font-medium'} ${muted ? 'text-xs' : ''} ${color} print:text-black`}>{eur(value)}</TableCell>
            <TableCell className="text-right text-[10px] sm:text-xs text-slate-500 px-2 sm:px-4 py-3 sm:py-4 print:text-black">{pct}</TableCell>
        </TableRow>
    );
}

function MemoLine({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex justify-between text-xs text-slate-400 print:text-black">
            <span>{label}</span>
            <span className="font-bold whitespace-nowrap">{eur(value)}</span>
        </div>
    );
}
