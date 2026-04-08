import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, PlusCircle, Trash, CheckCircle2 } from 'lucide-react';
import { useGlobalRentals, useGlobalCustomers, useGlobalProducts } from '../data/api';
import type { Customer } from '../data/api';
// import { supabase } from '../lib/supabase';

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
    const [durationWeeks, setDurationWeeks] = useState<number | ''>(1);
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    const [showCustomerForm, setShowCustomerForm] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState<{ full_name: string, phone: string, address: string, tax_id: string, email: string, document_id: string }>({ full_name: '', phone: '', address: '', tax_id: '', email: '', document_id: '' });

    useEffect(() => {
        if (!isOpen) return;

        if (rentalToEdit) {
            // Preenchimento imediato para evitar "amnésia" visual
            setSelectedCustomer(rentalToEdit.customers);
            setPickupDate(rentalToEdit.pickup_date);
            setReturnDate(rentalToEdit.return_date);
            setDurationWeeks(rentalToEdit.semanas || 1);
            setDeliveryAddress(rentalToEdit.delivery_address || '');
            setPaymentStatus(rentalToEdit.payment_status || 'pending');
            
            // Valores financeiros (Já vêm do hook useGlobalRentals)
            const transport = rentalToEdit.transport_value || 0;
            const deposit = rentalToEdit.deposit_value || 0;
            const total = rentalToEdit.total_amount || 0;
            
            setTransportFee(transport);
            setDepositFee(deposit);
            setManualTotal(total > 0 ? total - transport - deposit : 0);

            // Itens/Produtos selecionados
            if (rentalToEdit.items && rentalToEdit.items.length > 0) {
                const mappedProducts = rentalToEdit.items.map((it: any) => ({
                    product: { id: it.product_id, name: it.name },
                    quantity: it.quantity
                }));
                setSelectedProducts(mappedProducts);
            } else {
                setSelectedProducts([]);
            }
        } else {
            resetState();
        }
    }, [isOpen, rentalToEdit]);

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
        setPaymentStatus('pending');
        setShowCustomerForm(false);
        setNewCustomerData({ full_name: '', phone: '', address: '', tax_id: '', email: '', document_id: '' });
        setFormError('');
        setDurationWeeks(1);
        setDeliveryAddress('');
    }

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

        let finalProducts = [...selectedProducts];

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

        const finalSemanas = (typeof durationWeeks === 'number' && durationWeeks > 0) ? durationWeeks : 0;
        const totalPayload = (typeof manualTotal === 'number' ? manualTotal : 0) + (typeof transportFee === 'number' ? transportFee : 0) + (typeof depositFee === 'number' ? depositFee : 0);

        const payload = {
            customers: customerToUse,
            pickup_date: pickupDate,
            return_date: returnDate,
            semanas: finalSemanas,
            delivery_address: deliveryAddress,
            total_amount: totalPayload,
            transport_value: transportFee || 0,
            deposit_value: depositFee || 0,
            payment_status: paymentStatus,
            status: rentalToEdit ? rentalToEdit.status : 'active',
            itemsCount: finalProducts.reduce((sum, sp) => sum + sp.quantity, 0),
            items: finalProducts.map(sp => ({
                product_id: sp.product.id,
                name: sp.product.name,
                price_unit: 0,
                quantity: sp.quantity
            }))
        };

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
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Entrega</label>
                                    <Input type="date" required className="h-8 text-[10px] px-1" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Semanas</label>
                                    <Input type="number" min="1" required className="h-8 text-xs" value={durationWeeks} onChange={e => setDurationWeeks(e.target.value === '' ? '' : parseInt(e.target.value))} />
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

                        <div className="mt-3 pt-3 border-t border-slate-800/60 flex justify-between items-center">
                             <div className="flex flex-col">
                                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Status Pagamento</label>
                                <select
                                    value={paymentStatus}
                                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                                    className="h-7 px-1.5 bg-slate-900 border border-slate-700 text-[10px] text-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="pending">Pendente</option>
                                    <option value="paid">Pago</option>
                                </select>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Total a Pagar</span>
                                <span className="text-xl font-black text-amber-500 leading-none">{(manualTotal + transportFee + depositFee).toFixed(2)} €</span>
                            </div>
                        </div>
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
