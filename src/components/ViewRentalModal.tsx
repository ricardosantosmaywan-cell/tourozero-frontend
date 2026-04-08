import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { X, FileText, Edit2, Trash2, User, Hash, Phone, Mail, MapPin, Calendar, Clock, Activity, Package, Truck, ShieldCheck, CreditCard } from 'lucide-react';
import { useGlobalRentals } from '../data/api';
import { supabase } from '../lib/supabase';
import { printRentalContractHTML } from '../lib/htmlContractGenerator';

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
    
    // Financial Sync States
    const [liveTransport, setLiveTransport] = useState<number>(0);
    const [liveDeposit, setLiveDeposit] = useState<number>(0);
    const [liveTotal, setLiveTotal] = useState<number>(0);

    useEffect(() => {
        if (!isOpen || !rental) return;

        setNotes(rental.observacoes || '');
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
                    .select('transport_value, deposit_value, total_amount, observacoes')
                    .eq('id', rental.id)
                    .single();
                
                if (rentData) {
                    setLiveTransport(Number(rentData.transport_value || 0));
                    setLiveDeposit(Number(rentData.deposit_value || 0));
                    setLiveTotal(Number(rentData.total_amount || 0));
                    setNotes(rentData.observacoes || '');
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
                                    <p className="text-sm font-semibold text-slate-100">{rental.semanas} semana(s)</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-slate-500 uppercase flex items-center gap-1"><Activity className="h-2.5 w-2.5" /> Status</p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${rental.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-700 text-slate-300'}`}>
                                        {rental.status === 'active' ? 'Ativo' : rental.status === 'completed' ? 'Concluído' : rental.status}
                                    </span>
                                </div>
                            </div>

                            {/* Tabela de Valores Slim */}
                            <div className="bg-slate-900/60 rounded-lg border border-slate-700/40 overflow-hidden">
                                <table className="w-full text-[11px]">
                                    <tbody className="divide-y divide-slate-700/30">
                                        <tr>
                                            <td className="px-3 py-1.5 text-slate-400 flex items-center gap-1.5"><Package className="h-2.5 w-2.5" /> Materiais</td>
                                            <td className="px-3 py-1.5 text-right font-semibold text-slate-100">{Number((liveTotal || 0) - (liveTransport || 0) - (liveDeposit || 0)).toFixed(2)} €</td>
                                        </tr>
                                        <tr>
                                            <td className="px-3 py-1.5 text-slate-400 flex items-center gap-1.5"><Truck className="h-2.5 w-2.5" /> Transporte</td>
                                            <td className="px-3 py-1.5 text-right font-semibold text-amber-500">{Number(liveTransport || 0).toFixed(2)} €</td>
                                        </tr>
                                        <tr>
                                            <td className="px-3 py-1.5 text-slate-400 flex items-center gap-1.5"><ShieldCheck className="h-2.5 w-2.5" /> Caução</td>
                                            <td className="px-3 py-1.5 text-right font-medium text-blue-400 italic">{Number(liveDeposit || 0).toFixed(2)} €</td>
                                        </tr>
                                        <tr className="bg-amber-500/5">
                                            <td className="px-3 py-2 text-slate-100 font-bold flex items-center gap-1.5 uppercase tracking-tighter"><CreditCard className="h-3 w-3 text-amber-500" /> Total Pago</td>
                                            <td className="px-3 py-2 text-right text-lg font-black text-amber-500">{Number(liveTotal).toFixed(2)} €</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
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
                    <div className="flex gap-2 ml-auto">
                        <Button type="button" variant="outline" className="h-9 px-4 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 text-xs" onClick={onClose}>
                            Fechar
                        </Button>
                        <Button type="button" className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs" onClick={handleSaveNotes}>
                            Salvar Alterações
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
