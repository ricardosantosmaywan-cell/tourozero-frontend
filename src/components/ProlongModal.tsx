import { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, CalendarPlus, Clock, Euro, MessageSquare, Package, Plus, Trash2, Calendar, ChevronDown, ChevronRight, Hash } from 'lucide-react';
import { useGlobalProducts } from '../data/api';

interface ProlongModalProps {
    isOpen: boolean;
    onClose: () => void;
    rental: any;
    onConfirm: (
        daysDiff: number,
        extraValue: number,
        note: string,
        newItems: any[],
        newReturnDateStr: string,
        depositValue: number,
        transportValue: number,
        receivedBy: string,
        paymentStatus: 'paid' | 'pending',
        paymentReference: string
    ) => Promise<void>;
}

export function ProlongModal({ isOpen, onClose, rental, onConfirm }: ProlongModalProps) {
    const { products } = useGlobalProducts();
    const [newReturnDate, setNewReturnDate] = useState('');
    const [extraValue, setExtraValue] = useState(0); // Valor do prolongamento (materiais)
    const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('pending');
    const [paymentReference, setPaymentReference] = useState('');
    const [depositValue, setDepositValue] = useState(rental?.deposit_value || 0);
    const [transportValue, setTransportValue] = useState(rental?.transport_value || 0);
    const [receivedBy, setReceivedBy] = useState('Ricardo');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showMoreOptions, setShowMoreOptions] = useState(false);

    // Novos produtos adicionados nesta extensão (opção avançada)
    const [newItems, setNewItems] = useState<{ product: any, quantity: number }[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedQty, setSelectedQty] = useState(1);

    const today = new Date().toLocaleDateString('pt-PT');

    // Inicializar data (padrão: +1 semana do fim atual) e valores base
    useEffect(() => {
        if (rental && rental.return_date && !newReturnDate) {
            const current = new Date(rental.return_date);
            const next = new Date(current);
            next.setDate(next.getDate() + 7);
            setNewReturnDate(next.toISOString().split('T')[0]);
        }
        if (rental) {
            setDepositValue(rental.deposit_value || 0);
            setTransportValue(rental.transport_value || 0);
            setReceivedBy(rental.received_by || 'Ricardo');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rental, isOpen]);

    const daysDiff = useMemo(() => {
        if (!rental || !newReturnDate) return 0;
        const current = new Date(rental.return_date);
        const next = new Date(newReturnDate);
        const diffTime = next.getTime() - current.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }, [rental, newReturnDate]);

    const bumpReturnDate = (days: number) => {
        const base = newReturnDate ? new Date(newReturnDate) : new Date(rental?.return_date || Date.now());
        base.setDate(base.getDate() + days);
        setNewReturnDate(base.toISOString().split('T')[0]);
    };

    const newTotalCalculated = useMemo(() => {
        if (!rental) return 0;
        const diffDeposit = depositValue - (rental.deposit_value || 0);
        const diffTransport = transportValue - (rental.transport_value || 0);
        return Number(rental.total_amount || 0) + extraValue + diffDeposit + diffTransport;
    }, [rental, extraValue, depositValue, transportValue]);

    if (!isOpen || !rental) return null;

    const handleAddItem = () => {
        if (!selectedProductId) return;
        const product = products.find(p => p.id === selectedProductId);
        if (product) {
            setNewItems([...newItems, { product, quantity: selectedQty }]);
            setSelectedProductId('');
            setSelectedQty(1);
        }
    };

    const handleRemoveItem = (index: number) => {
        setNewItems(newItems.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (daysDiff <= 0) {
            alert("A nova data deve ser posterior à data de término atual.");
            return;
        }
        setIsSubmitting(true);
        try {
            await onConfirm(daysDiff, extraValue, note, newItems, newReturnDate, depositValue, transportValue, receivedBy, paymentStatus, paymentReference);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-4 animate-in fade-in overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-amber-500/40 p-5 md:p-6 shadow-2xl my-8">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-black tracking-tight text-slate-50 flex items-center gap-2 uppercase">
                            <CalendarPlus className="h-5 w-5 text-amber-500" />
                            Prolongar Contrato
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {rental.customers?.full_name} · Registo: {today}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-white/5" onClick={onClose}>
                        <X className="h-5 w-5 text-slate-400" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nova data + atalhos */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-amber-500/80 uppercase flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> Nova Data de Término
                        </label>
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                required
                                className="bg-slate-950 border-slate-800 text-sm font-bold text-amber-500 h-11 flex-1"
                                value={newReturnDate}
                                min={rental.return_date}
                                onChange={e => setNewReturnDate(e.target.value)}
                            />
                            <Button type="button" variant="secondary" className="h-11 px-3 text-xs whitespace-nowrap" onClick={() => bumpReturnDate(7)}>
                                +1 semana
                            </Button>
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase font-medium px-0.5">
                            {daysDiff > 0 ? `Prolongamento de ${daysDiff} dia${daysDiff === 1 ? '' : 's'}` : 'Escolha uma data posterior ao término atual'}
                        </p>
                    </div>

                    {/* Valor + Pago/Por Pagar */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-emerald-500/80 uppercase flex items-center gap-1.5">
                            <Euro className="h-3 w-3" /> Valor do Prolongamento (€)
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            className="bg-slate-950 border-emerald-500/20 text-xl font-black text-emerald-500 h-12"
                            value={extraValue === 0 ? '' : extraValue}
                            placeholder="0.00"
                            onChange={e => setExtraValue(parseFloat(e.target.value) || 0)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setPaymentStatus('paid')}
                                className={`h-10 rounded-lg text-xs font-bold uppercase tracking-wide border transition-colors ${paymentStatus === 'paid' ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                            >
                                ✓ Pago
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentStatus('pending')}
                                className={`h-10 rounded-lg text-xs font-bold uppercase tracking-wide border transition-colors ${paymentStatus === 'pending' ? 'bg-red-500/15 border-red-500/50 text-red-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                            >
                                Por Pagar
                            </button>
                        </div>
                        <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
                            <Input
                                type="text"
                                placeholder="Referência de pagamento (opcional): MBWay, transferência..."
                                className="bg-slate-950 border-slate-800 text-xs h-10 pl-8"
                                value={paymentReference}
                                onChange={e => setPaymentReference(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Recebido por + total */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="flex flex-col">
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Recebido por</label>
                            <select
                                value={receivedBy}
                                onChange={(e) => setReceivedBy(e.target.value)}
                                className="h-8 px-2 bg-slate-900 border border-slate-700 text-[11px] text-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                                <option value="Ricardo">Ricardo</option>
                                <option value="Gabriel">Gabriel</option>
                            </select>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Novo Total do Contrato</span>
                            <span className="text-lg font-black text-emerald-500">{newTotalCalculated.toFixed(2)} €</span>
                        </div>
                    </div>

                    {/* Notas */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                            <MessageSquare className="h-3 w-3" /> Notas (opcional)
                        </label>
                        <textarea
                            className="w-full h-14 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none placeholder:text-slate-700"
                            placeholder="Observações internas..."
                            value={note}
                            onChange={e => setNote(e.target.value)}
                        />
                    </div>

                    {/* Mais opções (colapsado por padrão) */}
                    <div className="border-t border-slate-800/60 pt-3">
                        <button
                            type="button"
                            onClick={() => setShowMoreOptions(v => !v)}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wide transition-colors"
                        >
                            {showMoreOptions ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            Mais opções (caução, transporte, materiais extra)
                        </button>

                        {showMoreOptions && (
                            <div className="mt-3 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-blue-400 uppercase">Caução Acumulada</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            className="bg-slate-950 border-slate-800 h-9 text-xs font-bold text-blue-400"
                                            value={depositValue}
                                            onChange={e => setDepositValue(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Transporte Total</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            className="bg-slate-950 border-slate-800 h-9 text-xs font-bold text-slate-400"
                                            value={transportValue}
                                            onChange={e => setTransportValue(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 p-3 bg-slate-800/30 rounded-xl border border-slate-800/50">
                                    <label className="text-[11px] font-bold text-blue-400 uppercase flex items-center gap-1.5">
                                        <Package className="h-3 w-3" /> Adicionar Mais Material
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            value={selectedProductId}
                                            onChange={e => setSelectedProductId(e.target.value)}
                                        >
                                            <option value="">Selecionar...</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <Input
                                            type="number"
                                            min="1"
                                            className="w-16 bg-slate-950 border-slate-800 text-center"
                                            value={selectedQty}
                                            onChange={e => setSelectedQty(parseInt(e.target.value) || 1)}
                                        />
                                        <Button type="button" variant="secondary" className="h-10 px-3 bg-blue-600 hover:bg-blue-500" onClick={handleAddItem}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {newItems.length > 0 && (
                                        <div className="space-y-1.5 pt-1">
                                            {newItems.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/50 rounded-lg border border-slate-800/50 text-[11px]">
                                                    <span className="text-slate-200"><span className="text-blue-400 font-bold">{item.quantity}x</span> {item.product.name}</span>
                                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-500/10" onClick={() => handleRemoveItem(idx)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-800/50">
                        <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl text-slate-400 border-slate-800" onClick={onClose} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="flex-[2] h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-black uppercase text-xs tracking-widest shadow-lg shadow-amber-500/10" disabled={isSubmitting}>
                            {isSubmitting ? 'A Processar...' : 'Confirmar Prolongamento'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
