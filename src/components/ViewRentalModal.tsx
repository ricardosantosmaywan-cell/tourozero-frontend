import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, FileText, Edit2, Trash2, Pencil, Save, CalendarPlus, Printer } from 'lucide-react';
import { useGlobalRentals } from '../data/api';
import { supabase } from '../lib/supabase';
import { printRentalContractHTML } from '../lib/htmlContractGenerator';
import { ProlongModal } from './ProlongModal';

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

    const [liveTransport, setLiveTransport] = useState(0);
    const [liveDeposit, setLiveDeposit] = useState(0);
    const [liveIvaMats, setLiveIvaMats] = useState(0);
    const [liveIvaTransp, setLiveIvaTransp] = useState(0);
    const [liveTotal, setLiveTotal] = useState(0);
    const [liveHistory, setLiveHistory] = useState<any[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    const [editingExt, setEditingExt] = useState<{ extIndex: number } | null>(null);
    const [editValue, setEditValue] = useState(0);
    const [editStartDate, setEditStartDate] = useState('');
    const [editReturnDate, setEditReturnDate] = useState('');
    const [editReceivedBy, setEditReceivedBy] = useState('Ricardo');
    const [editNote, setEditNote] = useState('');
    const [isSavingExt, setIsSavingExt] = useState(false);

    useEffect(() => {
        if (!isOpen || !rental) return;
        setNotes(rental.observacoes || '');
        setLiveHistory(rental.extensions_history || []);
        if (rental.items && rental.items.length > 0) setFetchedItems(rental.items);

        const load = async () => {
            setIsLoadingItems(true);
            try {
                const { data: rentData } = await supabase
                    .from('rentals')
                    .select('transport_value, deposit_value, iva_materials, iva_transport, total_amount, observacoes, received_by, extensions_history')
                    .eq('id', rental.id).single();
                if (rentData) {
                    setLiveTransport(Number(rentData.transport_value || 0));
                    setLiveDeposit(Number(rentData.deposit_value || 0));
                    setLiveIvaMats(Number(rentData.iva_materials || 0));
                    setLiveIvaTransp(Number(rentData.iva_transport || 0));
                    setLiveTotal(Number(rentData.total_amount || 0));
                    setNotes(rentData.observacoes || '');
                    setLiveHistory(rentData.extensions_history || []);
                }
                const { data } = await supabase
                    .from('rental_items')
                    .select('quantity, price_unit, products:product_id ( name )')
                    .eq('rental_id', rental.id);
                if (data && data.length > 0) {
                    setFetchedItems(data.map((item: any) => {
                        const p = Array.isArray(item.products) ? item.products[0] : item.products;
                        return { quantity: Number(item.quantity || 0), price_unit: Number(item.price_unit || 0), name: p?.name || 'Produto' };
                    }));
                }
            } catch (err) { console.error(err); }
            finally { setIsLoadingItems(false); }
        };
        load();
    }, [isOpen, rental, refreshKey]);

    if (!isOpen || !rental) return null;

    const getExtValue = (ext: any): number => {
        if (Number(ext.extra_materials) > 0) return Number(ext.extra_materials);
        if (Number(ext.extra_value) > 0) return Number(ext.extra_value);
        const diff = Number(ext.new_value || 0) - Number(ext.old_value || 0);
        return diff > 0 ? diff : 0;
    };

    const recalcRentalAfterExtChange = (rentalObj: any, newExts: any[]) => {
        const allExts = rentalObj.extensions_history || [];
        const baseValue   = allExts.length > 0 ? Number(allExts[0].old_value    || 0) : Number(rentalObj.total_amount    || 0);
        const baseDeposit = allExts.length > 0 ? Number(allExts[0].old_deposit   || 0) : Number(rentalObj.deposit_value   || 0);
        const baseTransp  = allExts.length > 0 ? Number(allExts[0].old_transport || 0) : Number(rentalObj.transport_value || 0);
        const baseReturn  = allExts.length > 0 ? allExts[0].old_return_date          : rentalObj.return_date;
        if (newExts.length === 0) return { extensions_history: [], return_date: baseReturn, total_amount: Number(baseValue.toFixed(2)), deposit_value: Number(baseDeposit.toFixed(2)), transport_value: Number(baseTransp.toFixed(2)) };
        const extSum  = newExts.reduce((s: number, e: any) => s + getExtValue(e), 0);
        const lastExt = newExts[newExts.length - 1];
        return { extensions_history: newExts, return_date: lastExt.new_return_date, total_amount: Number((baseValue + extSum).toFixed(2)), deposit_value: Number(lastExt.new_deposit ?? baseDeposit), transport_value: Number(lastExt.new_transport ?? baseTransp) };
    };

    const handleDeleteExt = async (extIndex: number) => {
        if (!window.confirm('Eliminar este prolongamento?')) return;
        const newExts = liveHistory.filter((_: any, i: number) => i !== extIndex);
        await updateRentalPartial(rental.id, recalcRentalAfterExtChange(rental, newExts));
        setRefreshKey(prev => prev + 1);
    };

    const handleSaveExt = async () => {
        if (!editingExt) return;
        setIsSavingExt(true);
        try {
            const exts = [...liveHistory];
            const orig = exts[editingExt.extIndex];
            exts[editingExt.extIndex] = { ...orig, extra_materials: editValue, extra_value: editValue, new_value: Number((Number(orig.old_value || 0) + editValue).toFixed(2)), old_return_date: editStartDate, new_return_date: editReturnDate, received_by: editReceivedBy, note: editNote };
            await updateRentalPartial(rental.id, recalcRentalAfterExtChange(rental, exts));
            setEditingExt(null);
            setRefreshKey(prev => prev + 1);
        } finally { setIsSavingExt(false); }
    };

    const handleSaveNotes = () => { updateRentalPartial(rental.id, { observacoes: notes }); onClose(); };

    const handleConfirmProlong = async (daysDiff: number, extraValue: number, note: string, newItems: any[], newReturnDateStr: string, depositValue: number, transportValue: number, receivedBy: string) => {
        const oldTotal = Number(rental.total_amount || 0);
        const newTotal = oldTotal + extraValue + (depositValue - Number(rental.deposit_value || 0)) + (transportValue - Number(rental.transport_value || 0));
        const newWeeksTotal = Number((Number(rental.semanas || 0) + daysDiff / 7).toFixed(1));
        const extensionEntry = { date: new Date().toISOString(), type: 'prolongamento', days_added: daysDiff, extra_materials: extraValue, old_return_date: rental.return_date, new_return_date: newReturnDateStr, old_value: oldTotal, new_value: newTotal, old_deposit: Number(rental.deposit_value || 0), new_deposit: depositValue, old_transport: Number(rental.transport_value || 0), new_transport: transportValue, received_by: receivedBy || 'Ricardo', note, added_items: newItems.map(it => ({ name: it.product.name, quantity: it.quantity })) };
        try {
            await updateRentalPartial(rental.id, { return_date: newReturnDateStr, total_amount: Number(newTotal.toFixed(2)), deposit_value: Number(depositValue.toFixed(2)), transport_value: Number(transportValue.toFixed(2)), received_by: receivedBy || 'Ricardo', semanas: newWeeksTotal, rental_duration_value: newWeeksTotal, extensions_history: [...(rental.extensions_history || []), extensionEntry] });
            if (newItems && newItems.length > 0) {
                for (const item of newItems) {
                    const existing = (rental.items || []).find((it: any) => it.product_id === item.product.id);
                    if (existing) { await supabase.from('rental_items').update({ quantity: Number(existing.quantity || 0) + item.quantity }).eq('rental_id', rental.id).eq('product_id', item.product.id); }
                    else { await supabase.from('rental_items').insert([{ rental_id: rental.id, product_id: item.product.id, quantity: item.quantity, price_unit: item.product.price_unit || 0 }]); }
                    const { data: p } = await supabase.from('products').select('available').eq('id', item.product.id).single();
                    if (p) await supabase.from('products').update({ available: p.available - item.quantity }).eq('id', item.product.id);
                }
            }
            setRefreshKey(prev => prev + 1);
            setIsProlongModalOpen(false);
        } catch (err: any) { alert('Erro ao prolongar: ' + err.message); }
    };

    // Helpers de formatação
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '---';
    const fmtDateShort = (d: string) => d ? new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }) : '---';
    const fmtMoney = (v: number) => v.toFixed(2) + ' €';

    const durationLabel = `${rental.rental_duration_value || rental.semanas || 1} ${rental.rental_duration_type === 'dia' ? ((rental.rental_duration_value || 1) === 1 ? 'dia' : 'dias') : ((rental.rental_duration_value || rental.semanas || 1) === 1 ? 'semana' : 'semanas')}`;
    const liveMaterials = liveTotal - liveTransport - liveDeposit - liveIvaMats - liveIvaTransp;
    const hasIva = liveIvaMats > 0 || liveIvaTransp > 0;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-2 md:p-4 animate-in fade-in overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl my-4">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                    <h2 className="text-base font-bold text-slate-50 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-amber-500" /> Ficha do Aluguer
                    </h2>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                        <X className="h-4 w-4 text-slate-400" />
                    </Button>
                </div>

                <div className="p-5 space-y-4">

                    {/* Bloco 1: Resumo Principal */}
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                        {/* Datas */}
                        <div className="text-center mb-3">
                            <p className="text-2xl font-black text-slate-50 tracking-tight">
                                {fmtDateShort(rental.pickup_date)} a {fmtDate(rental.return_date)}
                            </p>
                            <p className="text-sm text-slate-400 mt-0.5">{durationLabel}</p>
                        </div>

                        {/* Cliente */}
                        <div className="border-t border-slate-700/50 pt-3 space-y-1">
                            <p className="text-sm font-semibold text-slate-100">{rental.customers?.full_name}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                                {rental.customers?.phone && (
                                    <a href={`https://wa.me/351${rental.customers.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300">
                                        📱 {rental.customers.phone}
                                    </a>
                                )}
                                {rental.customers?.tax_id && <span>NIF: {rental.customers.tax_id}</span>}
                                {rental.customers?.email && <span>{rental.customers.email}</span>}
                            </div>
                            {rental.delivery_address && (
                                <p className="text-xs text-amber-400/80 mt-1">📍 {rental.delivery_address}</p>
                            )}
                        </div>
                    </div>

                    {/* Bloco 2: Itens Alugados */}
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">Itens Alugados</p>
                        {isLoadingItems ? (
                            <p className="text-xs text-slate-500 italic">A carregar...</p>
                        ) : fetchedItems.length > 0 ? (
                            <div className="space-y-1">
                                {fetchedItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-200">
                                            <span className="font-bold text-amber-400">{item.quantity}x</span> {item.name}
                                        </span>
                                        {item.price_unit > 0 && (
                                            <span className="text-slate-400 text-xs">{fmtMoney(item.price_unit * item.quantity)}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500 italic">Nenhum item.</p>
                        )}
                    </div>

                    {/* Bloco 3: Tabela de Valores */}
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 pt-3 pb-2">
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Resumo Financeiro</p>
                            <button
                                type="button"
                                onClick={() => {
                                    const clientName = rental.customers?.full_name || '';
                                    const phone = rental.customers?.phone || '';
                                    const nif = rental.customers?.tax_id || '';
                                    const pickupFmt = new Date(rental.pickup_date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
                                    const returnFmt = new Date(rental.return_date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                    const dur = `${rental.rental_duration_value || rental.semanas || 1} ${rental.rental_duration_type === 'dia' ? 'dia(s)' : 'semana(s)'}`;
                                    const rows = [
                                        liveMaterials > 0 ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${fetchedItems.map(i => `${i.quantity}x ${i.name}`).join(', ')} — ${dur}</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${liveMaterials.toFixed(2)} €</td></tr>` : '',
                                        liveTransport > 0 ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">Transporte</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${liveTransport.toFixed(2)} €</td></tr>` : '',
                                        liveDeposit > 0 ? `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">Caução</td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;color:#3b82f6;">${liveDeposit.toFixed(2)} €</td></tr>` : '',
                                        liveIvaMats > 0 ? `<tr><td style="padding:6px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;">IVA Materiais</td><td style="padding:6px 0;border-bottom:1px solid #e2e8f0;text-align:right;color:#64748b;font-size:12px;">${liveIvaMats.toFixed(2)} €</td></tr>` : '',
                                        liveIvaTransp > 0 ? `<tr><td style="padding:6px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;">IVA Transporte</td><td style="padding:6px 0;border-bottom:1px solid #e2e8f0;text-align:right;color:#64748b;font-size:12px;">${liveIvaTransp.toFixed(2)} €</td></tr>` : '',
                                    ].join('');
                                    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Resumo Financeiro</title><style>body{font-family:Arial,sans-serif;max-width:480px;margin:40px auto;padding:20px;color:#1e293b;}h1{font-size:18px;font-weight:800;margin-bottom:4px;}p{margin:2px 0;color:#64748b;font-size:13px;}table{width:100%;border-collapse:collapse;margin-top:20px;}tfoot td{padding:10px 0;font-weight:800;font-size:16px;}.note{font-size:11px;color:#94a3b8;margin-top:12px;font-style:italic;}@media print{body{margin:20px;}}</style></head><body><h1>${clientName}</h1><p>${phone}${nif ? ' · NIF: ' + nif : ''}</p><p style="margin-top:8px;font-weight:600;font-size:15px;">${pickupFmt} a ${returnFmt} — ${dur}</p>${rental.delivery_address ? `<p>📍 ${rental.delivery_address}</p>` : ''}<table><tbody>${rows}</tbody><tfoot><tr><td>Total</td><td style="text-align:right;color:#d97706;">${liveTotal.toFixed(2)} €</td></tr></tfoot></table>${liveDeposit > 0 ? `<p class="note">* Caução de ${liveDeposit.toFixed(2)} € a ser devolvida no final se não houver danos.${hasIva ? ' Valores acrescidos de IVA.' : ''}</p>` : ''}</body></html>`;
                                    const w = window.open('', '_blank');
                                    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400); }
                                }}
                                className="text-[10px] text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:bg-blue-500/10 rounded px-2 py-0.5 transition-colors font-semibold"
                            >
                                🖨 Ver Resumo
                            </button>
                        </div>
                        <div className="max-h-[280px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <tbody>
                                {liveMaterials > 0 && (
                                    <tr className="border-t border-slate-700/40">
                                        <td className="px-4 py-2 text-slate-300">
                                            {fetchedItems.length > 0 ? `${fetchedItems.map(i => `${i.quantity}x ${i.name}`).join(', ')} — ${durationLabel}` : 'Materiais'}
                                        </td>
                                        <td className="px-4 py-2 text-right font-semibold text-slate-100">{fmtMoney(liveMaterials)}</td>
                                    </tr>
                                )}
                                {liveTransport > 0 && (
                                    <tr className="border-t border-slate-700/40">
                                        <td className="px-4 py-2 text-slate-300">Transporte</td>
                                        <td className="px-4 py-2 text-right font-semibold text-slate-100">{fmtMoney(liveTransport)}</td>
                                    </tr>
                                )}
                                {liveDeposit > 0 && (
                                    <tr className="border-t border-slate-700/40">
                                        <td className="px-4 py-2 text-slate-300">Caução</td>
                                        <td className="px-4 py-2 text-right font-semibold text-blue-400">{fmtMoney(liveDeposit)}</td>
                                    </tr>
                                )}
                                {liveIvaMats > 0 && (
                                    <tr className="border-t border-slate-700/40">
                                        <td className="px-4 py-2 text-slate-400 text-xs">IVA Materiais</td>
                                        <td className="px-4 py-2 text-right text-slate-400 text-xs">{fmtMoney(liveIvaMats)}</td>
                                    </tr>
                                )}
                                {liveIvaTransp > 0 && (
                                    <tr className="border-t border-slate-700/40">
                                        <td className="px-4 py-2 text-slate-400 text-xs">IVA Transporte</td>
                                        <td className="px-4 py-2 text-right text-slate-400 text-xs">{fmtMoney(liveIvaTransp)}</td>
                                    </tr>
                                )}
                                <tr className="border-t-2 border-slate-600 bg-slate-900/40">
                                    <td className="px-4 py-3 font-bold text-slate-100">Total</td>
                                    <td className="px-4 py-3 text-right font-black text-amber-400 text-lg">{fmtMoney(liveTotal)}</td>
                                </tr>
                            </tbody>
                        </table>
                        </div>
                        {liveDeposit > 0 && (
                            <p className="text-[10px] text-slate-500 italic px-4 pb-3">
                                * Caução de {fmtMoney(liveDeposit)} a ser devolvida no final se não houver danos.{hasIva ? ' Valores acrescidos de IVA.' : ''}
                            </p>
                        )}
                    </div>

                    {/* Prolongamentos */}
                    {liveHistory.length > 0 && (
                        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">Prolongamentos</p>
                            <div className="space-y-2">
                                {liveHistory.map((ext: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700/30">
                                        <div>
                                            <span className="text-slate-300 font-semibold">
                                                {ext.old_return_date ? `${fmtDateShort(ext.old_return_date)} → ${fmtDateShort(ext.new_return_date)}` : `Prolongamento #${idx + 1}`}
                                            </span>
                                            {ext.note && <p className="text-slate-500 mt-0.5">{ext.note}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-emerald-400">+{fmtMoney(getExtValue(ext))}</span>
                                            <button onClick={() => { setEditValue(getExtValue(ext)); setEditStartDate(ext.old_return_date?.split('T')[0] || ''); setEditReturnDate(ext.new_return_date?.split('T')[0] || ''); setEditReceivedBy(ext.received_by || 'Ricardo'); setEditNote(ext.note || ''); setEditingExt({ extIndex: idx }); }} className="text-slate-500 hover:text-amber-400 transition-colors"><Pencil className="w-3 h-3" /></button>
                                            <button onClick={() => handleDeleteExt(idx)} className="text-slate-500 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notas */}
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Observações / Notas Internas</p>
                        <textarea
                            className="w-full h-16 rounded-lg border border-slate-700 bg-slate-800/40 p-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none placeholder:text-slate-600"
                            placeholder="Notas internas..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer Ações */}
                <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl">
                    <Button type="button" variant="ghost" className="h-8 px-3 text-xs text-amber-400 border border-amber-500/20 hover:bg-amber-500/10"
                        onClick={() => printRentalContractHTML(rental)}>
                        <Printer className="w-3.5 h-3.5 mr-1.5" /> Imprimir
                    </Button>
                    {onEdit && (
                        <Button type="button" variant="ghost" className="h-8 px-3 text-xs text-slate-300 border border-slate-700 hover:bg-slate-800"
                            onClick={() => { onEdit(rental); onClose(); }}>
                            <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Editar
                        </Button>
                    )}
                    {onDelete && (
                        <Button type="button" variant="ghost" className="h-8 px-3 text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10"
                            onClick={() => { if (window.confirm('Apagar agendamento?')) { onDelete(rental.id); onClose(); } }}>
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Eliminar
                        </Button>
                    )}
                    <Button type="button" variant="ghost" className="h-8 px-3 text-xs text-amber-400 border border-amber-500/20 hover:bg-amber-500/10"
                        onClick={() => setIsProlongModalOpen(true)}>
                        <CalendarPlus className="w-3.5 h-3.5 mr-1.5" /> Prolongar
                    </Button>
                    <div className="flex gap-2 ml-auto">
                        <Button type="button" variant="outline" className="h-8 px-4 text-xs border-slate-700" onClick={onClose}>Fechar</Button>
                        <Button type="button" className="h-8 px-4 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold" onClick={handleSaveNotes}>Guardar</Button>
                    </div>
                </div>
            </div>

            <ProlongModal isOpen={isProlongModalOpen} onClose={() => setIsProlongModalOpen(false)} rental={rental} onConfirm={handleConfirmProlong} />

            {editingExt && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 animate-in fade-in">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-500/40 p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-black text-slate-50 flex items-center gap-2"><Pencil className="h-4 w-4 text-amber-500" /> Editar Prolongamento</h3>
                            <button onClick={() => setEditingExt(null)} className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Valor Extra (€)</label>
                                <Input type="number" step="0.01" min="0" value={editValue} onChange={e => setEditValue(parseFloat(e.target.value) || 0)} className="bg-slate-950 border-emerald-500/20 text-lg font-black text-emerald-400 h-12" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Data Início</label>
                                    <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="bg-slate-950 border-slate-800 font-bold text-amber-400 h-11" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Data Término</label>
                                    <Input type="date" value={editReturnDate} onChange={e => setEditReturnDate(e.target.value)} className="bg-slate-950 border-slate-800 font-bold text-amber-400 h-11" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recebido Por</label>
                                <select value={editReceivedBy} onChange={e => setEditReceivedBy(e.target.value)} className="w-full h-10 px-3 bg-slate-950 border border-slate-800 text-sm text-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500/30">
                                    <option value="Ricardo">Ricardo</option>
                                    <option value="Gabriel">Gabriel</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notas</label>
                                <textarea value={editNote} onChange={e => setEditNote(e.target.value)} rows={2} className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none placeholder:text-slate-700" placeholder="Observações..." />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-5 border-t border-slate-800 mt-5">
                            <Button type="button" variant="outline" className="flex-1 h-11 border-slate-700 text-slate-400 text-xs" onClick={() => setEditingExt(null)} disabled={isSavingExt}>Cancelar</Button>
                            <Button type="button" className="flex-[2] h-11 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2" onClick={handleSaveExt} disabled={isSavingExt}>
                                <Save className="w-4 h-4" /> {isSavingExt ? 'A Guardar...' : 'Guardar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
