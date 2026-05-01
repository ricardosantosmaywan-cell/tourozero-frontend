import { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, CalendarPlus, Clock, Euro, MessageSquare, Package, Plus, Trash2, Calendar } from 'lucide-react';
import { useGlobalProducts } from '../data/api';

interface ProlongModalProps {
    isOpen: boolean;
    onClose: () => void;
    rental: any;
    onConfirm: (daysDiff: number, extraValue: number, note: string, newItems: any[], newReturnDateStr: string, depositValue: number, transportValue: number, receivedBy: string) => Promise<void>;
}

export function ProlongModal({ isOpen, onClose, rental, onConfirm }: ProlongModalProps) {
    const { products } = useGlobalProducts();
    const [newReturnDate, setNewReturnDate] = useState('');
    const [extraValue, setExtraValue] = useState(0); // Este é o valor ADICIONAL de materiais
    const [depositValue, setDepositValue] = useState(rental?.deposit_value || 0);
    const [transportValue, setTransportValue] = useState(rental?.transport_value || 0);
    const [receivedBy, setReceivedBy] = useState('Ricardo');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Novos produtos adicionados nesta extensão
    const [newItems, setNewItems] = useState<{product: any, quantity: number}[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedQty, setSelectedQty] = useState(1);

    // Data de hoje (Registo)
    const today = new Date().toLocaleDateString('pt-PT');

    // Inicializar data (padrão: +1 semana do fim atual) e valores
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
    }, [rental, isOpen]);

    // Cálculo de Dias Adicionais
    const daysDiff = useMemo(() => {
        if (!rental || !newReturnDate) return 0;
        const current = new Date(rental.return_date);
        const next = new Date(newReturnDate);
        const diffTime = next.getTime() - current.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    }, [rental, newReturnDate]);

    // Cálculo Inteligente de Valor Baseado em Dias (APENAS MATERIAIS EXTRAS)
    useEffect(() => {
        if (!rental || daysDiff <= 0) return;

        let calculatedExtra = 0;
        const weeksFraction = daysDiff / 7;
        
        // Itens atuais (proporcional aos dias)
        if (rental.items && rental.items.length > 0) {
            rental.items.forEach((item: any) => {
                const prod = products.find(p => p.id === item.product_id);
                const priceMatch = item.price_unit > 0 ? item.price_unit : (prod?.price_unit || 0);
                calculatedExtra += (priceMatch * item.quantity * weeksFraction);
            });
        }

        // Novos itens (para os dias adicionais)
        newItems.forEach(item => {
            const price = item.product.price_unit || 0;
            calculatedExtra += (price * item.quantity * weeksFraction);
        });

        setExtraValue(Number(calculatedExtra.toFixed(2)));
    }, [daysDiff, newItems, rental, products]);

    // Cálculo do NOVO TOTAL ACUMULADO
    const newTotalCalculated = useMemo(() => {
        if (!rental) return 0;
        
        // Diferenças de caução e transporte
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
            // onConfirm(daysDiff, extraValue, note, newItems, newReturnDateStr, depositValue, transportValue, receivedBy)
            await onConfirm(daysDiff, extraValue, note, newItems, newReturnDate, depositValue, transportValue, receivedBy);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-4 animate-in fade-in overflow-y-auto">
            <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-amber-500/40 p-5 md:p-8 shadow-2xl my-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-slate-50 flex items-center gap-2 uppercase">
                            <CalendarPlus className="h-6 w-6 text-amber-500" />
                            Prolongar Contrato
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Data do Registo: {today}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/5" onClick={onClose}>
                        <X className="h-5 w-5 text-slate-400" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Configuração do Tempo e Extras de Valor */}
                        <div className="space-y-4 p-4 bg-slate-800/30 rounded-xl border border-slate-800/50">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-amber-500/80 uppercase flex items-center gap-1.5">
                                    <Clock className="h-3 w-3" /> Nova Data de Término
                                </label>
                                <Input 
                                    type="date" 
                                    required 
                                    className="bg-slate-950 border-slate-800 text-sm font-bold text-amber-500 h-11"
                                    value={newReturnDate}
                                    min={rental.return_date}
                                    onChange={e => setNewReturnDate(e.target.value)}
                                />
                                <div className="p-2 bg-amber-500/5 rounded-lg border border-amber-500/10 mt-1">
                                    <p className="text-[10px] text-slate-500 uppercase font-medium">Prolongamento de {daysDiff} Dias</p>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-[11px] font-bold text-emerald-500/80 uppercase flex items-center gap-1.5">
                                    <Euro className="h-3 w-3" /> Valor Extra Materiais
                                </label>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    min="0" 
                                    required 
                                    className="bg-slate-950 border-emerald-500/20 text-lg font-black text-emerald-500 h-11"
                                    value={extraValue}
                                    onChange={e => setExtraValue(parseFloat(e.target.value) || 0)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
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

                            <div className="pt-3 border-t border-slate-700/50 flex flex-col gap-3">
                                <div className="flex flex-col">
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Recebido por</label>
                                    <select
                                        value={receivedBy}
                                        onChange={(e) => setReceivedBy(e.target.value)}
                                        className="h-8 px-2 bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    >
                                        <option value="Ricardo">Ricardo</option>
                                        <option value="Gabriel">Gabriel</option>
                                    </select>
                                </div>
                                <div className="flex justify-between items-center bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Novo Total do Contrato:</span>
                                    <span className="text-xl font-black text-emerald-500">{newTotalCalculated.toFixed(2)} €</span>
                                </div>
                                <p className="text-[9px] text-slate-500 mt-2 italic px-1">
                                    * Inclui materiais originais + adicionais + transporte + caução.
                                </p>
                            </div>
                        </div>

                        {/* Adicionar novos produtos */}
                        <div className="space-y-4 p-4 bg-slate-800/30 rounded-xl border border-slate-800/50">
                            <label className="text-[11px] font-bold text-blue-400 uppercase flex items-center gap-1.5">
                                <Package className="h-3 w-3" /> Adicionar Mais Material (Opcional)
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

                            <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                                {newItems.length > 0 ? newItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/50 rounded-lg border border-slate-800/50 text-[11px]">
                                        <span className="text-slate-200"><span className="text-blue-400 font-bold">{item.quantity}x</span> {item.product.name}</span>
                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-500/10" onClick={() => handleRemoveItem(idx)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )) : (
                                    <p className="text-[10px] text-slate-600 italic text-center py-4">Nenhum material extra adicionado.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                            <MessageSquare className="h-3 w-3" /> Notas Internas do Prolongamento
                        </label>
                        <textarea 
                            className="w-full h-20 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none placeholder:text-slate-700"
                            placeholder="Descreva o motivo ou observações desta extensão..."
                            value={note}
                            onChange={e => setNote(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-slate-800/50">
                        <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl text-slate-400 border-slate-800" onClick={onClose} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="flex-[2] h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-black uppercase text-xs tracking-widest shadow-lg shadow-amber-500/10" disabled={isSubmitting}>
                            {isSubmitting ? 'A Processar...' : 'Confirmar e Atualizar Contrato'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
