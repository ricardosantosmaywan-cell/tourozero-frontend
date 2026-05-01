import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { X, FileText, Edit2, Trash2, User, Hash, Phone, Mail, MapPin, Calendar, Clock, Activity, Package, CreditCard } from 'lucide-react';
import { useGlobalRentals } from '../data/api';
import { supabase } from '../lib/supabase';
import { printRentalContractHTML } from '../lib/htmlContractGenerator';
import { ProlongModal } from './ProlongModal';
import { CalendarPlus } from 'lucide-react';

interface ViewRentalModalProps {
    isOpen: boolean;
    onClose: () => void;
    rental: any;
    onEdit?: (rental: any) => void;
    onDelete?: (id: string) => void;
}

export function ViewRentalModal({ isOpen, onClose, rental, onEdit, onDelete }: ViewRentalModalProps) {
    const { updateRentalPartial } = useGlobalRentals();
    const [notes, setNotes] = useState('');
    const [fetchedItems, setFetchedItems] = useState<any[]>([]);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [isProlongModalOpen, setIsProlongModalOpen] = useState(false);
    
    // Financial Sync States
    const [liveTransport, setLiveTransport] = useState<number>(0);
    const [liveDeposit, setLiveDeposit] = useState<number>(0);
    const [liveIvaMats, setLiveIvaMats] = useState<number>(0);
    const [liveIvaTransp, setLiveIvaTransp] = useState<number>(0);
    const [liveTotal, setLiveTotal] = useState<number>(0);
    const [liveReceivedBy, setLiveReceivedBy] = useState<string>('Não definido');

    useEffect(() => {
        if (!isOpen || !rental) return;

        setNotes(rental.observacoes || '');
        setLiveReceivedBy(rental.received_by || 'Não definido');
        // Usar itens já mapeados no rental como estado inicial para evitar "Nenhum produto" visual
        if (rental.items && rental.items.length > 0) {
            setFetchedItems(rental.items);
        }

        const loadItems = async () => {
            setIsLoadingItems(true);
            try {
                // Fetch Financials frescos
                const { data: rentData } = await supabase
                    .from('rentals')
                    .select('transport_value, deposit_value, iva_materials, iva_transport, total_amount, observacoes, received_by')
                    .eq('id', rental.id)
                    .single();
                
                if (rentData) {
                    setLiveTransport(Number(rentData.transport_value || 0));
                    setLiveDeposit(Number(rentData.deposit_value || 0));
                    setLiveIvaMats(Number(rentData.iva_materials || 0));
                    setLiveIvaTransp(Number(rentData.iva_transport || 0));
                    setLiveTotal(Number(rentData.total_amount || 0));
                    setNotes(rentData.observacoes || '');
                    setLiveReceivedBy(rentData.received_by || 'Não definido');
                }

                // Busca Profunda de Itens (com alias para segurança)
                const { data, error } = await supabase
                    .from('rental_items')
                    .select(`
                        quantity,
                        price_unit,
                        products:product_id ( name )
                    `)
                    .eq('rental_id', rental.id);

                if (error) throw error;

                if (data && data.length > 0) {
                    const mapped = data.map((item: any) => {
                        const prodData = Array.isArray(item.products) ? item.products[0] : item.products;
                        return {
                            quantity: Number(item.quantity || 0),
                            price_unit: Number(item.price_unit || 0),
                            name: prodData?.name || item.name || 'Produto'
                        };
                    });
                    setFetchedItems(mapped);
                } else if (rental.items && rental.items.length > 0) {
                    // Mantém os da prop se o fetch falhar mas a prop tiver dados
                    setFetchedItems(rental.items);
                }
            } catch (err) {
                console.error("Erro ao carregar os itens do aluguer", err);
            } finally {
                setIsLoadingItems(false);
            }
        };

        loadItems();
    }, [isOpen, rental]);

    if (!isOpen || !rental) return null;

    const handleSaveNotes = () => {
        updateRentalPartial(rental.id, { observacoes: notes });
        onClose();
    };

    const handleConfirmProlong = async (daysDiff: number, extraValue: number, note: string, newItems: any[], newReturnDateStr: string, depositValue: number, transportValue: number, receivedBy: string) => {
        const oldTotal = Number(rental.total_amount || 0);
        
        // O extraValue vindo do modal é apenas o adicional de materiais.
        // O novo total é o total antigo + extra de materiais + diferença de caução/transporte (se houver alteração manual)
        const diffDeposit = depositValue - (Number(rental.deposit_value || 0));
        const diffTransport = transportValue - (Number(rental.transport_value || 0));
        const newTotal = oldTotal + extraValue + diffDeposit + diffTransport;
        
        // Calcular novo total de semanas (original + fração do prolongamento)
        const oldWeeks = Number(rental.semanas || 0);
        const extraWeeksFraction = daysDiff / 7;
        const newWeeksTotal = Number((oldWeeks + extraWeeksFraction).toFixed(1));

        // Registo para o histórico
        const extensionEntry = {
            date: new Date().toISOString(),
            type: 'prolongamento',
            days_added: daysDiff,
            extra_materials: extraValue,
            old_return_date: rental.return_date,
            new_return_date: newReturnDateStr,
            old_value: oldTotal,
            new_value: newTotal,
            old_deposit: Number(rental.deposit_value || 0),
            new_deposit: depositValue,
            old_transport: Number(rental.transport_value || 0),
            new_transport: transportValue,
            received_by: receivedBy || 'Ricardo',
            note: note,
            added_items: newItems.map(it => ({ name: it.product.name, quantity: it.quantity }))
        };

        const updatedHistory = [...(rental.extensions_history || []), extensionEntry];

        try {
            // 1. Atualizar Header do Aluguer no DB
            await updateRentalPartial(rental.id, {
                return_date: newReturnDateStr,
                total_amount: Number(newTotal.toFixed(2)),
                deposit_value: Number(depositValue.toFixed(2)),
                transport_value: Number(transportValue.toFixed(2)),
                received_by: receivedBy || 'Ricardo',
                semanas: newWeeksTotal,
                rental_duration_value: newWeeksTotal, // Sincronizar com a nova duração total
                extensions_history: updatedHistory
            });

            // 2. Processar novos itens (Agregando itens repetidos para evitar bugs de soma)
            if (newItems && newItems.length > 0) {
                // Agrupar itens por product_id
                const aggregatedItems: {[key: string]: {product: any, quantity: number}} = {};
                newItems.forEach(item => {
                    if (aggregatedItems[item.product.id]) {
                        aggregatedItems[item.product.id].quantity += item.quantity;
                    } else {
                        aggregatedItems[item.product.id] = { ...item };
                    }
                });

                for (const productId in aggregatedItems) {
                    const item = aggregatedItems[productId];
                    // Verificar se produto já existe no aluguer original
                    const existingItem = (rental.items || []).find((it: any) => it.product_id === productId);
                    
                    if (existingItem) {
                        // UPDATE na tabela rental_items (incrementar quantidade)
                        const { error: itemUpdateErr } = await supabase
                            .from('rental_items')
                            .update({ quantity: Number(existingItem.quantity || 0) + item.quantity })
                            .eq('rental_id', rental.id)
                            .eq('product_id', productId);
                        if (itemUpdateErr) throw itemUpdateErr;
                    } else {
                        // INSERT na tabela rental_items
                        const { error: itemInsertErr } = await supabase
                            .from('rental_items')
                            .insert([{
                                rental_id: rental.id,
                                product_id: productId,
                                quantity: item.quantity,
                                price_unit: item.product.price_unit || 0
                            }]);
                        if (itemInsertErr) throw itemInsertErr;
                    }

                    // 3. Atualizar Stock do Produto
                    const { data: prodData } = await supabase.from('products').select('available').eq('id', productId).single();
                    if (prodData) {
                        await supabase.from('products').update({ available: prodData.available - item.quantity }).eq('id', productId);
                    }
                }
            }
            
            onClose();
        } catch (err: any) {
            alert("Erro ao processar prolongamento: " + err.message);
        }
    };

    const subMatsRef = Number((liveTotal || 0) - (liveTransport || 0) - (liveDeposit || 0) - (liveIvaMats || 0) - (liveIvaTransp || 0));

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-2 md:p-4 animate-in fade-in overflow-y-auto">
            <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 p-4 md:p-6 shadow-2xl my-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold tracking-tight text-slate-50 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-amber-500" />
                        Ficha de Detalhes
                    </h2>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                        <X className="h-4 w-4 text-slate-400" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Coluna Esquerda: Dados do Cliente */}
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-800/60 transition-colors hover:border-slate-700/80">
                            <h3 className="text-[11px] uppercase tracking-wider font-bold text-amber-500 mb-2 flex items-center gap-1.5">
                                <User className="h-3 w-3" /> Dados do Cliente
                            </h3>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                                <div className="col-span-2 sm:col-span-1">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase flex items-center gap-1"><User className="h-2.5 w-2.5" /> Cliente</p>
                                    <p className="text-sm font-semibold text-slate-100 truncate">{rental.customers?.full_name}</p>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase flex items-center gap-1"><Hash className="h-2.5 w-2.5" /> NIF</p>
                                    <p className="text-sm font-semibold text-slate-100">{rental.customers?.tax_id || '---'}</p>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> WhatsApp</p>
                                    {rental.customers?.phone ? (
                                        <a href={`https://wa.me/351${rental.customers.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                                            {rental.customers.phone}
                                        </a>
                                    ) : (
                                        <p className="text-sm font-semibold text-slate-500">Não informado</p>
                                    )}
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase flex items-center gap-1"><Mail className="h-2.5 w-2.5" /> E-mail</p>
                                    <p className="text-sm font-semibold text-slate-100 truncate">{rental.customers?.email || '---'}</p>
                                </div>
                            </div>
                            <div className="mt-3 p-2 bg-slate-900/60 rounded border border-slate-700/40">
                                <p className="text-[10px] font-medium text-amber-500 uppercase flex items-center gap-1 mb-0.5"><MapPin className="h-2.5 w-2.5" /> Endereço da Obra</p>
                                <p className="text-xs font-medium text-slate-300 leading-tight">
                                    {rental.delivery_address ? rental.delivery_address : <span className="text-slate-500 italic">Recolha nas instalações</span>}
                                </p>
                            </div>
                        </div>

                        {/* Produtos (Compacto) */}
                        <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-800/60 transition-colors hover:border-slate-700/80">
                            <h3 className="text-[11px] uppercase tracking-wider font-bold text-amber-500 mb-2 flex items-center gap-1.5 font-mono">
                                <Package className="h-3 w-3" /> Itens Alugados
                            </h3>
                            <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                {isLoadingItems ? (
                                    <div className="text-[11px] text-slate-500 italic py-2">A carregar itens...</div>
                                ) : fetchedItems.length > 0 ? (
                                    fetchedItems.map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-900/60 px-2 py-1.5 rounded border border-slate-700/30 group hover:border-amber-500/30 transition-colors">
                                            <span className="text-slate-300 font-medium group-hover:text-slate-100"><span className="text-amber-500/70 font-bold">{item.quantity}x</span> {item.name}</span>
                                            <span className="text-slate-500 font-mono">{(item.price_unit * item.quantity).toFixed(2)}€</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-[11px] text-slate-500 italic py-2 text-center bg-slate-900/40 rounded">Nenhum produto associado.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Coluna Direita: Detalhes do Aluguer e Tabela de Valores */}
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-800/60">
                            <h3 className="text-[11px] uppercase tracking-wider font-bold text-amber-500 mb-2 flex items-center gap-1.5">
                                <Activity className="h-3 w-3" /> Detalhes do Aluguer
                            </h3>
                            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-700/40 mb-3">
                                <div>
                                    <p className="text-[10px] font-medium text-slate-500 uppercase flex items-center gap-1"><Calendar className="h-2.5 w-2.5" /> Início</p>
                                    <p className="text-sm font-semibold text-slate-100">{new Date(rental.pickup_date).toLocaleDateString('pt-PT')}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-slate-500 uppercase flex items-center gap-1"><Calendar className="h-2.5 w-2.5" /> Fim</p>
                                    <p className="text-sm font-semibold text-slate-100">{new Date(rental.return_date).toLocaleDateString('pt-PT')}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-slate-500 uppercase flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> Duração</p>
                                    <p className="text-sm font-semibold text-slate-100">
                                        {rental.rental_duration_value || rental.semanas} {
                                            (rental.rental_duration_type === 'dia' ? 
                                                ((rental.rental_duration_value || 1) === 1 ? 'dia' : 'dias') : 
                                                ((rental.rental_duration_value || rental.semanas || 1) === 1 ? 'semana' : 'semanas'))
                                        }
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-slate-500 uppercase flex items-center gap-1"><Activity className="h-2.5 w-2.5" /> Status</p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${rental.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-700 text-slate-300'}`}>
                                        {rental.status === 'active' ? 'Ativo' : rental.status === 'completed' ? 'Concluído' : rental.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-slate-500 uppercase flex items-center gap-1"><User className="h-2.5 w-2.5" /> Recebido por</p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${liveReceivedBy === 'Ricardo' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                        {liveReceivedBy}
                                    </span>
                                </div>
                            </div>

                            {/* Tabela de Valores Slim */}
                            <div className="bg-slate-900/60 rounded-lg border border-slate-700/40 overflow-hidden">
                                <table className="w-full text-[11px]">
                                    <tbody className="divide-y divide-slate-700/30">
                                        <tr>
                                            <td className="px-3 py-1 text-slate-400 flex items-center gap-1.5">Subtotal Materiais</td>
                                            <td className="px-3 py-1 text-right font-semibold text-slate-100">{subMatsRef.toFixed(2)} €</td>
                                        </tr>
                                        <tr>
                                            <td className="px-3 py-1 text-slate-500 flex items-center gap-1.5 pl-6">IVA Materiais ({subMatsRef > 0 ? Math.round((liveIvaMats / subMatsRef) * 100) : 0}%)</td>
                                            <td className="px-3 py-1 text-right font-medium text-slate-400">{Number(liveIvaMats || 0).toFixed(2)} €</td>
                                        </tr>
                                        <tr>
                                            <td className="px-3 py-1 text-slate-400 flex items-center gap-1.5">Subtotal Transporte</td>
                                            <td className="px-3 py-1 text-right font-semibold text-slate-100">{Number(liveTransport || 0).toFixed(2)} €</td>
                                        </tr>
                                        <tr>
                                            <td className="px-3 py-1 text-slate-500 flex items-center gap-1.5 pl-6">IVA Transporte ({liveTransport > 0 ? Math.round((liveIvaTransp / liveTransport) * 100) : 0}%)</td>
                                            <td className="px-3 py-1 text-right font-medium text-slate-400">{Number(liveIvaTransp || 0).toFixed(2)} €</td>
                                        </tr>
                                        <tr className="bg-blue-500/10 border-y border-blue-500/20">
                                            <td className="px-3 py-2 text-blue-400 font-bold flex items-center gap-1.5 uppercase tracking-tighter">Caução Total Acumulada</td>
                                            <td className="px-3 py-2 text-right font-black text-blue-400">{Number(liveDeposit || 0).toFixed(2)} €</td>
                                        </tr>
                                        <tr className="bg-amber-500/5">
                                            <td className="px-3 py-2 text-slate-100 font-bold flex items-center gap-1.5 uppercase tracking-tighter"><CreditCard className="h-3 w-3 text-amber-500" /> Total a Pagar</td>
                                            <td className="px-3 py-2 text-right text-lg font-black text-amber-500">{Number(liveTotal).toFixed(2)} €</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Linha do Tempo / Timeline do Contrato */}
                <div className="md:col-span-3 mt-4 p-4 bg-slate-950/50 rounded-xl border border-slate-800 shadow-inner">
                    <h3 className="text-[11px] uppercase tracking-widest font-black text-slate-400 mb-4 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" /> Histórico deste Contrato (Timeline)
                    </h3>
                    
                    <div className="space-y-3 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-slate-800 before:pointer-events-none pb-2">
                        {/* Evento Inicial */}
                        <div className="relative pl-7 group">
                            <div className="absolute left-[3px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-700 border-2 border-slate-900 z-10 group-hover:bg-amber-500 transition-colors"></div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800 group-hover:border-slate-700 transition-all">
                                <div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase block mb-0.5">{new Date(rental.pickup_date).toLocaleDateString('pt-PT')}</span>
                                    <span className="text-sm font-bold text-slate-200">Aluguer Inicial (Abertura)</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                                        Pago: {Number(rental.extensions_history && rental.extensions_history.length > 0 ? rental.extensions_history[0].old_value : (liveTotal || 0)).toFixed(2)}€
                                    </span>
                                    {(rental.extensions_history && rental.extensions_history.length > 0 ? rental.extensions_history[0].old_deposit : liveDeposit) > 0 && (
                                        <span className="text-xs font-bold text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10">
                                            Caução: {Number(rental.extensions_history && rental.extensions_history.length > 0 ? rental.extensions_history[0].old_deposit : liveDeposit).toFixed(2)}€
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Prolongamentos */}
                        {rental.extensions_history && rental.extensions_history.map((ext: any, i: number) => (
                            <div key={i} className="relative pl-7 group">
                                <div className="absolute left-[3px] top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-slate-900 z-10 animate-pulse"></div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50 hover:border-amber-500/30 transition-all">
                                    <div>
                                        <span className="text-[10px] font-black text-amber-500/70 uppercase block mb-0.5">{new Date(ext.date).toLocaleDateString('pt-PT')}</span>
                                        <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                            Prolongamento de {ext.days_added} dias 
                                            <span className="text-[10px] font-medium text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                                                Até {new Date(ext.new_return_date).toLocaleDateString('pt-PT')}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black text-emerald-400">
                                            + {Number(ext.extra_materials || ext.extra_value || 0).toFixed(2)}€
                                        </span>
                                        {Number(ext.new_deposit - ext.old_deposit) > 0 && (
                                            <span className="text-xs font-bold text-blue-400">
                                                + {Number(ext.new_deposit - ext.old_deposit).toFixed(2)}€ (Caução)
                                            </span>
                                        )}
                                        {ext.note && <span className="text-[10px] italic text-slate-500 max-w-[150px] truncate" title={ext.note}>"{ext.note}"</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Observacoes e Botão Imprimir */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <FileText className="h-2.5 w-2.5" /> Observações / Notas Internas
                        </label>
                        <textarea
                            className="w-full h-14 rounded-lg border border-slate-700 bg-slate-900/40 p-2 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none placeholder:text-slate-600"
                            placeholder="Notas sobre materiais, entrega, horários..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                    
                    <div className="md:col-span-3">
                        <Button 
                        type="button" 
                        variant="outline" 
                        className="h-14 border-amber-500/30 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10 font-bold text-xs flex flex-col gap-1 items-center justify-center transition-all hover:border-amber-500/50" 
                        onClick={() => printRentalContractHTML(rental)}
                    >
                        <FileText className="w-4 h-4" /> 
                        <span>IMPRIMIR CONTRATO</span>
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                    <div className="flex gap-2">
                        {onEdit && (
                            <Button type="button" variant="ghost" className="h-9 px-3 text-amber-500 hover:bg-amber-500/10 text-xs font-semibold" onClick={() => { onClose(); onEdit(rental); }}>
                                <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Editar
                            </Button>
                        )}
                        {onDelete && (
                            <Button type="button" variant="ghost" className="h-9 px-3 text-red-500 hover:bg-red-500/10 text-xs font-semibold" onClick={() => {
                                if (window.confirm("Apagar agendamento?")) {
                                    onDelete(rental.id);
                                    onClose();
                                }
                            }}>
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Eliminar
                            </Button>
                        )}
                    </div>
                    <Button 
                        type="button" 
                        variant="ghost" 
                        className="h-9 px-3 text-amber-400 hover:bg-amber-500/10 text-xs font-bold border border-amber-500/20" 
                        onClick={() => setIsProlongModalOpen(true)}
                    >
                        <CalendarPlus className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Prolongar Aluguer
                    </Button>
                    <div className="flex gap-2 ml-auto">
                        <Button type="button" variant="outline" className="h-9 px-4 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 text-xs" onClick={onClose}>
                            Fechar
                        </Button>
                        <Button type="button" className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs" onClick={handleSaveNotes}>
                            Salvar Alterações
                        </Button>
                    </div>
                </div>

            
            <ProlongModal 
                isOpen={isProlongModalOpen}
                onClose={() => setIsProlongModalOpen(false)}
                rental={rental}
                onConfirm={handleConfirmProlong}
            />
        </div>
    </div>
    );
}
