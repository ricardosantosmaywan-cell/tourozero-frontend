import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, PlusCircle, Trash, CheckCircle2 } from 'lucide-react';
import { useGlobalRentals, useGlobalCustomers, useGlobalProducts } from '../data/api';
import type { Customer } from '../data/api';
import { supabase } from '../lib/supabase';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    rentalToEdit?: any; // Passado quando o botão Editar é clicado (opcional)
    onSuccess?: () => void;
}

export function BookingModal({ isOpen, onClose, rentalToEdit, onSuccess }: BookingModalProps) {
    const { rentals, addRental, updateRental } = useGlobalRentals();
    const { customers, addCustomer } = useGlobalCustomers();
    const { products } = useGlobalProducts();

    const [formError, setFormError] = useState('');

    // Form States
    const [nifSearch, setNifSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [pickupDate, setPickupDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<{ product: any, quantity: number }[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [manualTotal, setManualTotal] = useState<number>(0);
    const [transportFee, setTransportFee] = useState<number>(0);
    const [depositFee, setDepositFee] = useState<number>(0);
    const [ivaMaterials, setIvaMaterials] = useState<number>(0);
    const [ivaTransport, setIvaTransport] = useState<number>(0);
    const [durationValue, setDurationValue] = useState<number>(1);
    const [durationUnit, setDurationUnit] = useState<'dia' | 'semana'>('semana');
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [receivedBy, setReceivedBy] = useState('Ricardo');
    const [extensionReason, setExtensionReason] = useState('');
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    const [showCustomerForm, setShowCustomerForm] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState<{ full_name: string, phone: string, address: string, tax_id: string, email: string, document_id: string }>({ full_name: '', phone: '', address: '', tax_id: '', email: '', document_id: '' });

    function resetState() {
        setNifSearch('');
        setSelectedCustomer(null);
        setPickupDate('');
        setReturnDate('');
        setSelectedProducts([]);
        setSelectedProductId('');
        setManualTotal(0);
        setTransportFee(0);
        setDepositFee(0);
        setIvaMaterials(0);
        setIvaTransport(0);
        setPaymentStatus('pending');
        setShowCustomerForm(false);
        setNewCustomerData({ full_name: '', phone: '', address: '', tax_id: '', email: '', document_id: '' });
        setFormError('');
        setDurationValue(1);
        setDurationUnit('semana');
        setDeliveryAddress('');
        setNotes('');
        setReceivedBy('Ricardo');
        setExtensionReason('');
    }

    useEffect(() => {
        if (!isOpen) return;

        const loadFullRentalData = async () => {
            if (rentalToEdit) {
                // 1. Carregamento Imediato (Evita amnésia visual)
                setSelectedCustomer(rentalToEdit.customers);
                setPickupDate(rentalToEdit.pickup_date);
                setReturnDate(rentalToEdit.return_date);
                setDurationValue(rentalToEdit.rental_duration_value || rentalToEdit.semanas || 1);
                setDurationUnit(rentalToEdit.rental_duration_type || 'semana');
                setDeliveryAddress(rentalToEdit.delivery_address || '');
                setPaymentStatus(rentalToEdit.payment_status || 'pending');
                setReceivedBy(rentalToEdit.received_by || 'Ricardo');
                setNotes(rentalToEdit.observacoes || '');
                
                // Preencher valores e itens iniciais vindos da prop
                const propTransport = Number(rentalToEdit.transport_value || 0);
                const propDeposit = Number(rentalToEdit.deposit_value || 0);
                const propIvaMatsEuro = Number(rentalToEdit.iva_materials || 0);
                const propIvaTranspEuro = Number(rentalToEdit.iva_transport || 0);
                const propTotal = Number(rentalToEdit.total_amount || 0);
                
                // Calcular Subtotal de Materiais (Líquido)
                const subRef = propTotal > 0 ? propTotal - propTransport - propDeposit - propIvaMatsEuro - propIvaTranspEuro : 0;
                setManualTotal(subRef);
                setTransportFee(propTransport);
                setDepositFee(propDeposit);
                
                // Tentar reverter para percentagem para visualização
                setIvaMaterials(subRef > 0 ? Math.round((propIvaMatsEuro / subRef) * 100) : 0);
                setIvaTransport(propTransport > 0 ? Math.round((propIvaTranspEuro / propTransport) * 100) : 0);

                if (rentalToEdit.items && rentalToEdit.items.length > 0) {
                    setSelectedProducts(rentalToEdit.items.map((it: any) => ({
                        product: { id: it.product_id, name: it.name },
                        quantity: Number(it.quantity || 0)
                    })));
                }

                // 2. Busca Profunda de Reforço (Dados frescos do DB)
                try {
                    const { data: freshRental } = await supabase
                        .from('rentals')
                        .select('transport_value, deposit_value, iva_materials, iva_transport, total_amount, observacoes, received_by')
                        .eq('id', rentalToEdit.id)
                        .single();

                    if (freshRental) {
                        const transport = Number(freshRental.transport_value || 0);
                        const deposit = Number(freshRental.deposit_value || 0);
                        const ivaMatsEuro = Number(freshRental.iva_materials || 0);
                        const ivaTranspEuro = Number(freshRental.iva_transport || 0);
                        const total = Number(freshRental.total_amount || 0);
                        
                        const subRef = total > 0 ? total - transport - deposit - ivaMatsEuro - ivaTranspEuro : 0;
                        setManualTotal(subRef);
                        setTransportFee(transport);
                        setDepositFee(deposit);
                        
                        // Reverter para percentagem
                        setIvaMaterials(subRef > 0 ? Math.round((ivaMatsEuro / subRef) * 100) : 0);
                        setIvaTransport(transport > 0 ? Math.round((ivaTranspEuro / transport) * 100) : 0);
                        setNotes(freshRental.observacoes || '');
                        setReceivedBy(freshRental.received_by || 'Ricardo');
                    }

                    const { data: freshItems } = await supabase
                        .from('rental_items')
                        .select(`
                            quantity,
                            product_id,
                            products:product_id ( id, name )
                        `)
                        .eq('rental_id', rentalToEdit.id);

                    if (freshItems && freshItems.length > 0) {
                        const mappedProducts = freshItems.map((it: any) => {
                            const prodData = Array.isArray(it.products) ? it.products[0] : it.products;
                            return {
                                product: { id: it.product_id || it.id, name: prodData?.name || it.name || 'Produto' },
                                quantity: Number(it.quantity || 0)
                            };
                        });
                        setSelectedProducts(mappedProducts);
                    }
                } catch (err) {
                    console.error("Erro no deep fetch do agendamento:", err);
                }
            } else {
                resetState();
            }
        };

        loadFullRentalData();
    }, [isOpen, rentalToEdit]);

    // Cálculo automático da data de entrega
    useEffect(() => {
        if (!pickupDate || !durationValue) return;

        const start = new Date(pickupDate);
        if (isNaN(start.getTime())) return;

        const resultDate = new Date(start);
        if (durationUnit === 'semana') {
            resultDate.setDate(start.getDate() + (durationValue * 7));
        } else {
            resultDate.setDate(start.getDate() + durationValue);
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReturnDate(resultDate.toISOString().split('T')[0]);
    }, [pickupDate, durationValue, durationUnit]);

    async function searchCustomer() {
        setFormError('');
        if (!nifSearch) return;

        const foundCustomer = customers.find(c => c.tax_id === nifSearch);

        if (foundCustomer) {
            setSelectedCustomer(foundCustomer as Customer);
            setShowCustomerForm(false);
        } else {
            setSelectedCustomer(null);
            setShowCustomerForm(true);
            setNewCustomerData({ ...newCustomerData, tax_id: nifSearch });
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setFormError('');

        // FORÇA BRUTA: Captura Produto selecionado mas não adicionado (evita que fique vazio)
        const sel = document.getElementById('productSelect') as HTMLSelectElement;
        const qty = document.getElementById('productQty') as HTMLInputElement;

        const finalProducts = [...selectedProducts];

        if (sel && sel.value) {
            const implicitProd = products.find(p => p.id === sel.value);
            if (implicitProd && !finalProducts.find(sp => sp.product.id === implicitProd.id)) {
                finalProducts.push({ product: implicitProd, quantity: parseInt(qty.value) || 1 });
            }
        }

        if (finalProducts.length === 0) {
            setFormError('Adicione pelo menos um produto ao agendamento.');
            return;
        }

        // Validação de Stock
        const activeRentals = rentals.filter((r: any) => r.status === 'active');
        for (const sp of finalProducts) {
            const currentProduct = products.find(p => p.id === sp.product.id);
            if (!currentProduct) continue;

            const rentedQuantity = activeRentals.reduce((total: number, rental: any) => {
                const item = rental.items?.find((i: any) => i.product_id === sp.product.id);
                return total + (item ? item.quantity : 0);
            }, 0);
            const availableStock = currentProduct.stock_total - rentedQuantity;

            let previouslyReserved = 0;

            if (rentalToEdit && rentalToEdit.status === 'active') {
                const oldItem = rentalToEdit.items.find((i: any) => i.product_id === sp.product.id);
                if (oldItem) previouslyReserved = oldItem.quantity;
            }

            if (sp.quantity - previouslyReserved > availableStock) {
                setFormError(`A quantidade solicitada para "${currentProduct.name}" está indisponível. Apenas ${availableStock + previouslyReserved} em stock.`);
                return;
            }
        }

        if (!pickupDate || !returnDate) {
            setFormError('Selecione as datas de recolha e entrega.');
            return;
        }

        let customerToUse = selectedCustomer;

        if (showCustomerForm && !selectedCustomer) {
            if (!newCustomerData.full_name || !newCustomerData.tax_id) {
                setFormError('Nome e NIF são obrigatórios.');
                return;
            }
            customerToUse = await addCustomer(newCustomerData as Omit<Customer, 'id'>);
        }

        if (!customerToUse) {
            setFormError('Nenhum cliente selecionado.');
            return;
        }

        
        const calcIvaMats = (manualTotal * (ivaMaterials / 100));
        const calcIvaTransp = (transportFee * (ivaTransport / 100));
        
        const totalPayload = (manualTotal || 0) + 
                             (transportFee || 0) + 
                             (depositFee || 0) + 
                             calcIvaMats + 
                             calcIvaTransp;

        const payload = {
            customers: customerToUse,
            pickup_date: pickupDate,
            return_date: returnDate,
            rental_duration_type: durationUnit,
            rental_duration_value: durationValue,
            total_amount: totalPayload,
            transport_value: transportFee || 0,
            deposit_value: depositFee || 0,
            iva_materials: calcIvaMats,
            iva_transport: calcIvaTransp,
            observacoes: notes,
            payment_status: paymentStatus,
            received_by: receivedBy,
            status: rentalToEdit ? rentalToEdit.status : 'active',
            itemsCount: finalProducts.reduce((sum, sp) => sum + sp.quantity, 0),
            items: finalProducts.map(sp => ({
                product_id: sp.product.id,
                name: sp.product.name,
                price_unit: 0,
                quantity: sp.quantity
            })),
            extensions_history: rentalToEdit ? rentalToEdit.extensions_history : []
        };

        if (rentalToEdit) {
            const updatedExtensions = rentalToEdit.extensions_history ? [...rentalToEdit.extensions_history] : [];
            const oldValue = Number(rentalToEdit.total_amount || 0);
            const newValue = totalPayload;
            const oldDate = rentalToEdit.return_date;
            const newDate = returnDate;

            if (oldDate !== newDate || oldValue !== newValue || extensionReason.trim() !== '') {
                updatedExtensions.push({
                    date: new Date().toISOString(),
                    old_return_date: oldDate,
                    new_return_date: newDate,
                    old_value: oldValue,
                    new_value: newValue,
                    reason: extensionReason.trim()
                });
                payload.extensions_history = updatedExtensions;
            }
        }

        try {
            if (rentalToEdit) {
                await updateRental(rentalToEdit.id, payload);
            } else {
                await addRental(payload);
            }

            setShowSuccessToast(true);
            if (onSuccess) onSuccess();

            setTimeout(() => {
                setShowSuccessToast(false);
                resetState();
                onClose();
            }, 1500);
        } catch (e: any) {
            setFormError(e.message || 'Erro ao processar o agendamento.');
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 md:p-4 overflow-y-auto">
            {showSuccessToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg font-medium flex items-center gap-2 animate-in slide-in-from-top-4">
                    <CheckCircle2 className="w-5 h-5" /> Agendamento realizado com sucesso!
                </div>
            )}
            <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-4 md:p-6 shadow-2xl my-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">
                        {rentalToEdit ? 'Editar Agendamento' : 'Novo Agendamento'}
                    </h2>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { resetState(); onClose(); }}>
                        <X className="h-4 w-4 text-slate-400" />
                    </Button>
                </div>

                <form onSubmit={handleSave} className="space-y-3">
                    {formError && (
                        <div className="rounded-md bg-red-500/10 p-2 border border-red-500/20 text-[11px] text-red-500">
                            {formError}
                        </div>
                    )}

                    {/* Section 1: Cliente e Logística */}
                    <div className="p-3 border border-slate-800 rounded-lg bg-slate-950/50">
                        <h3 className="text-[10px] uppercase tracking-wider font-bold mb-2 text-amber-500 flex items-center gap-1.5">
                            <span className="bg-amber-500 text-slate-900 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">1</span> Cliente e Local
                        </h3>
                        
                        {!rentalToEdit && (
                            <div className="flex gap-2 mb-3">
                                <Input
                                    placeholder="NIF do cliente..."
                                    className="h-8 text-xs"
                                    value={nifSearch}
                                    onChange={(e) => setNifSearch(e.target.value)}
                                />
                                <Button type="button" onClick={searchCustomer} variant="secondary" className="h-8 text-xs px-3">Buscar</Button>
                            </div>
                        )}

                        {selectedCustomer && (
                            <div className="p-2 bg-slate-900/80 rounded border border-emerald-500/30 flex justify-between items-center mb-3">
                                <div>
                                    <p className="text-xs font-bold text-emerald-400">{selectedCustomer.full_name}</p>
                                    <p className="text-[10px] text-slate-500">NIF: {selectedCustomer.tax_id} | {selectedCustomer.phone}</p>
                                </div>
                                {!rentalToEdit && (
                                    <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setSelectedCustomer(null)}>Mudar</Button>
                                )}
                            </div>
                        )}

                        {showCustomerForm && !selectedCustomer && (
                            <div className="grid grid-cols-2 gap-2 mt-2 py-2 border-t border-slate-800/50">
                                <div className="col-span-2">
                                    <p className="text-[10px] text-amber-500">Novo cliente? Preencha os dados:</p>
                                </div>
                                <Input className="h-8 text-xs" placeholder="Nome *" required value={newCustomerData.full_name} onChange={e => setNewCustomerData({ ...newCustomerData, full_name: e.target.value })} />
                                <Input className="h-8 text-xs" placeholder="NIF *" required value={newCustomerData.tax_id} onChange={e => setNewCustomerData({ ...newCustomerData, tax_id: e.target.value })} />
                                <Input className="h-8 text-xs" placeholder="Telemóvel" value={newCustomerData.phone} onChange={e => setNewCustomerData({ ...newCustomerData, phone: e.target.value })} />
                                <Input className="h-8 text-xs" placeholder="Email" type="email" value={newCustomerData.email} onChange={e => setNewCustomerData({ ...newCustomerData, email: e.target.value })} />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                            <div className="md:col-span-2">
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Endereço da Obra</label>
                                <Input
                                    type="text"
                                    placeholder="Rua, número, localidade..."
                                    className="h-8 text-xs"
                                    value={deliveryAddress}
                                    onChange={e => setDeliveryAddress(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2 md:col-span-2">
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Recolha</label>
                                    <Input type="date" required className="h-8 text-[10px] px-1" value={pickupDate} onChange={e => setPickupDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Duração</label>
                                    <div className="flex gap-1 h-8">
                                        <Input 
                                            type="number" 
                                            min="1" 
                                            required 
                                            className="w-12 h-full text-xs" 
                                            value={durationValue} 
                                            onChange={e => setDurationValue(parseInt(e.target.value) || 1)} 
                                        />
                                        <select
                                            value={durationUnit}
                                            onChange={(e) => setDurationUnit(e.target.value as any)}
                                            className="flex-1 h-full rounded-md border border-slate-800 bg-slate-900 px-1 text-[10px] text-slate-50 focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="dia">Dia(s)</option>
                                            <option value="semana">Semana(s)</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Entrega Prevista</label>
                                    <Input 
                                        type="date" 
                                        required 
                                        className="h-8 text-[10px] px-1 bg-slate-900/50 border-emerald-500/20 text-emerald-400 font-bold" 
                                        value={returnDate} 
                                        onChange={e => setReturnDate(e.target.value)} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Produtos */}
                    <div className="p-3 border border-slate-800 rounded-lg bg-slate-950/50">
                        <h3 className="text-[10px] uppercase tracking-wider font-bold mb-2 text-amber-500 flex items-center gap-1.5">
                            <span className="bg-amber-500 text-slate-900 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">2</span> Itens do Aluguer
                        </h3>
                        <div className="flex gap-2 mb-2">
                            <select
                                id="productSelect"
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                                className="flex-1 h-8 rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-50 focus:ring-1 focus:ring-amber-500"
                            >
                                <option value="">Selecionar produto...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <Input type="number" id="productQty" defaultValue="1" min="1" className="w-14 h-8 text-xs px-1" />
                            <Button type="button" variant="secondary" className="h-8 px-2" onClick={() => {
                                const sel = document.getElementById('productSelect') as HTMLSelectElement;
                                const qty = document.getElementById('productQty') as HTMLInputElement;
                                if (!sel.value) return;

                                const prod = products.find(p => p.id === sel.value);
                                if (prod) {
                                    const qtyValue = parseInt(qty.value) || 1;
                                    const exists = selectedProducts.find(sp => sp.product.id === prod.id);
                                    if (exists) {
                                        setSelectedProducts(selectedProducts.map(sp => sp.product.id === prod.id ? { ...sp, quantity: sp.quantity + qtyValue } : sp));
                                    } else {
                                        setSelectedProducts([...selectedProducts, { product: prod, quantity: qtyValue }]);
                                    }
                                }
                            }}>
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-1 max-h-[80px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                            {selectedProducts.length > 0 ? selectedProducts.map((sp, idx) => (
                                <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-900/60 rounded border border-slate-800/40 group">
                                    <span className="text-[10px] font-medium text-slate-300"><span className="text-amber-500 font-bold">{sp.quantity}x</span> {sp.product.name}</span>
                                    <Button type="button" variant="ghost" size="icon" className="h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity" onClick={() => setSelectedProducts(selectedProducts.filter((_, i) => i !== idx))}>
                                        <Trash className="h-3 w-3 text-red-500" />
                                    </Button>
                                </div>
                            )) : (
                                <p className="text-[10px] text-slate-600 italic text-center py-1">Nenhum produto adicionado.</p>
                            )}
                        </div>
                    </div>

                    {/* Section 3: Financeiro */}
                    <div className="p-3 border border-slate-800 rounded-lg bg-slate-950/50">
                        <h3 className="text-[10px] uppercase tracking-wider font-bold mb-2 text-amber-500 flex items-center gap-1.5">
                            <span className="bg-amber-500 text-slate-900 w-4 h-4 rounded-full flex items-center justify-center text-[9px]">3</span> Financeiro
                        </h3>
                        
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Subtotal €</label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={manualTotal === 0 && !rentalToEdit ? '' : manualTotal}
                                    onChange={(e) => setManualTotal(parseFloat(e.target.value) || 0)}
                                    className="h-8 text-xs px-1 border-slate-700 bg-slate-900 focus:ring-amber-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Transp. €</label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={transportFee === 0 && !rentalToEdit ? '' : transportFee}
                                    onChange={(e) => setTransportFee(parseFloat(e.target.value) || 0)}
                                    className="h-8 text-xs px-1 border-slate-700 bg-slate-900 focus:ring-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Caução €</label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={depositFee === 0 && !rentalToEdit ? '' : depositFee}
                                    onChange={(e) => setDepositFee(parseFloat(e.target.value) || 0)}
                                    className="h-8 text-xs px-1 border-slate-700 bg-slate-900 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">IVA Materiais (%)</label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={ivaMaterials === 0 && !rentalToEdit ? '' : ivaMaterials}
                                        onChange={(e) => setIvaMaterials(parseFloat(e.target.value) || 0)}
                                        className="h-8 text-xs pl-1 pr-6 border-slate-700 bg-slate-900 focus:ring-amber-500"
                                    />
                                    <span className="absolute right-2 top-1.5 text-[10px] text-slate-500 font-bold">%</span>
                                </div>
                                <p className="text-[8px] text-slate-600 mt-0.5">= {(manualTotal * (ivaMaterials / 100)).toFixed(2)}€</p>
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">IVA Transporte (%)</label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={ivaTransport === 0 && !rentalToEdit ? '' : ivaTransport}
                                        onChange={(e) => setIvaTransport(parseFloat(e.target.value) || 0)}
                                        className="h-8 text-xs pl-1 pr-6 border-slate-700 bg-slate-900 focus:ring-amber-500"
                                    />
                                    <span className="absolute right-2 top-1.5 text-[10px] text-slate-500 font-bold">%</span>
                                </div>
                                <p className="text-[8px] text-slate-600 mt-0.5">= {(transportFee * (ivaTransport / 100)).toFixed(2)}€</p>
                            </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-800/60 flex justify-between items-center">
                             <div className="flex gap-3">
                                <div className="flex flex-col">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Status</label>
                                    <select
                                        value={paymentStatus}
                                        onChange={(e) => setPaymentStatus(e.target.value as any)}
                                        className="h-7 px-1.5 bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    >
                                        <option value="pending">Pendente</option>
                                        <option value="paid">Pago</option>
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Recebido por</label>
                                    <select
                                        value={receivedBy}
                                        onChange={(e) => setReceivedBy(e.target.value)}
                                        className="h-7 px-1.5 bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    >
                                        <option value="Ricardo">Ricardo</option>
                                        <option value="Gabriel">Gabriel</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Total a Pagar</span>
                                <span className="text-xl font-black text-amber-500 leading-none">{(manualTotal + transportFee + depositFee + (manualTotal * (ivaMaterials / 100)) + (transportFee * (ivaTransport / 100))).toFixed(2)} €</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 border border-slate-800 rounded-lg bg-slate-950/50">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                            Notas Internas / Observações
                        </label>
                        <textarea
                            className="w-full h-16 rounded-lg border border-slate-700 bg-slate-900/40 p-2 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none placeholder:text-slate-600"
                            placeholder="Notas sobre o estado do material, caução em falta, etc..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                        {rentalToEdit && (
                            <div className="mt-3 pt-3 border-t border-slate-800">
                                <label className="block text-[9px] font-bold text-amber-500 uppercase mb-1.5">
                                    Motivo da Alteração / Prolongamento (Opcional)
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Ex: Desconto por fidelidade, Adiado por atraso na obra..."
                                    className="h-8 text-xs bg-slate-900 border-slate-700 focus:ring-amber-500 text-amber-400 placeholder:text-amber-500/30"
                                    value={extensionReason}
                                    onChange={e => setExtensionReason(e.target.value)}
                                    maxLength={200}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <Button type="button" variant="outline" className="h-8 px-3 text-[10px]" onClick={() => { resetState(); onClose(); }}>Cancelar</Button>
                        <Button type="submit" className="h-8 px-5 font-bold text-[11px] bg-amber-500 hover:bg-amber-600 text-slate-900" disabled={manualTotal <= 0}>
                            {showCustomerForm && !selectedCustomer ? 'Criar Cliente e Agendar' : rentalToEdit ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
