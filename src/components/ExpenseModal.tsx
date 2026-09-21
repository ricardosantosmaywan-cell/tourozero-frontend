import { useState } from 'react';
import { Plus, Pencil, Save, X as XIcon } from 'lucide-react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import type { Expense, ExpenseInput } from '../data/api';
import { EXPENSE_CATEGORIES, EXPENSE_GROUPS } from '../utils/financialCalculations';

interface ExpenseModalProps {
    /** Despesa a editar; undefined = nova despesa */
    expense?: Expense;
    /** Data sugerida para uma nova despesa (YYYY-MM-DD) */
    defaultDate: string;
    onSave: (data: ExpenseInput) => Promise<void>;
    onClose: () => void;
}

const PAYERS = ['Ricardo', 'Gabriel', 'Empresa'];

export default function ExpenseModal({ expense, defaultDate, onSave, onClose }: ExpenseModalProps) {
    const [date, setDate] = useState(expense?.expense_date.slice(0, 10) ?? defaultDate);
    const [category, setCategory] = useState(expense?.category ?? EXPENSE_CATEGORIES[0].key);
    const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
    const [description, setDescription] = useState(expense?.description ?? '');
    const [paidBy, setPaidBy] = useState(expense?.paid_by ?? '');
    const [notes, setNotes] = useState(expense?.notes ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isEditing = !!expense;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(amount.replace(',', '.'));
        if (!date) return setError('Indique a data da despesa.');
        if (!Number.isFinite(value) || value <= 0) return setError('Indique um valor maior que zero.');

        setSaving(true);
        setError('');
        try {
            await onSave({
                expense_date: date,
                category,
                amount: Number(value.toFixed(2)),
                description,
                paid_by: paidBy,
                notes,
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Não foi possível guardar a despesa.');
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4 print:hidden">
            <form onSubmit={handleSubmit} className="w-full max-w-md max-h-full overflow-y-auto rounded-2xl bg-slate-900 border border-amber-500/40 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-black text-slate-50 flex items-center gap-2 uppercase tracking-tight">
                        {isEditing ? <Pencil className="h-4 w-4 text-amber-500" /> : <Plus className="h-4 w-4 text-emerald-400" />}
                        {isEditing ? 'Editar Despesa' : 'Nova Despesa'}
                    </h3>
                    <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-all">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data</label>
                            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-slate-950 h-11" required />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-red-400/80 uppercase tracking-widest mb-1">Valor (€)</label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                inputMode="decimal"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="0,00"
                                className="bg-slate-950 border-red-500/20 text-lg font-black text-red-400 h-11"
                                autoFocus={!isEditing}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Categoria</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full h-11 px-3 bg-slate-950 border border-slate-800 text-sm text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                        >
                            {EXPENSE_GROUPS.map(g => (
                                <optgroup key={g.key} label={g.label}>
                                    {EXPENSE_CATEGORIES.filter(c => c.group === g.key).map(c => (
                                        <option key={c.key} value={c.key}>{c.label}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Descrição</label>
                        <Input
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Ex: Gasóleo Galp, mudança de óleo..."
                            className="bg-slate-950 h-11"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pago por</label>
                        <select
                            value={paidBy}
                            onChange={e => setPaidBy(e.target.value)}
                            className="w-full h-11 px-3 bg-slate-950 border border-slate-800 text-sm text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                        >
                            <option value="">Não definido</option>
                            {PAYERS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notas Internas</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none placeholder:text-slate-700"
                            placeholder="Nº da fatura, observações..."
                        />
                    </div>

                    {error && <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
                </div>

                <div className="flex gap-3 pt-5 border-t border-slate-800 mt-5">
                    <Button type="button" variant="outline" className="flex-1 h-11 border-slate-700 text-slate-400 hover:bg-slate-800 text-xs" onClick={onClose} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button type="submit" className="flex-[2] h-11 font-black text-xs uppercase tracking-widest gap-2" disabled={saving}>
                        <Save className="w-4 h-4" />
                        {saving ? 'A Guardar...' : isEditing ? 'Guardar Alterações' : 'Adicionar Despesa'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
