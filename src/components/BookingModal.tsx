import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, PlusCircle, Trash, CheckCircle2 } from 'lucide-react';
import { useGlobalRentals, useGlobalCustomers, useGlobalProducts } from '../data/mockDatabase';
import type { Customer } from '../data/mockDatabase';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    rentalToEdit?: any; // Passado quando o botão Editar é clicado (opcional)
}

export function BookingModal({ isOpen, onClose, rentalToEdit }: BookingModalProps) {
    const { addRental, updateRental } = useGlobalRentals();
    const { customers, addCustomer } = useGlobalCustomers();
    const { products } = useGlobalProducts();

    const [formError, setFormError] = useState('');

    // Form States
    const [nifSearch, setNifSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [pickupDate, setPickupDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<{ product: any, quantity: number }[]>([]);
    const [manualTotal, setManualTotal] = useState<number>(0);
    const [durationWeeks, setDurationWeeks] = useState<number | ''>(1);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    const [showCustomerForm, setShowCustomerForm] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState<{ full_name: string, phone: string, address: string, tax_id: string, email: string, document_id: string }>({ full_name: '', phone: '', address: '', tax_id: '', email: '', document_id: '' });

    useEffect(() => {
        if (!isOpen) return;

        if (rentalToEdit) {
            // "Passando os dados do aluguel selecionado para preencher os campos automaticamente"
            setSelectedCustomer(rentalToEdit.customers);
            setPickupDate(rentalToEdit.pickup_date);
            setReturnDate(rentalToEdit.return_date);
            setDurationWeeks(rentalToEdit.semanas || 1);
            setDeliveryAddress(rentalToEdit.delivery_address || '');

            if (rentalToEdit.items && rentalToEdit.items.length > 0) {
                const mappedProducts = rentalToEdit.items.map((it: any) => ({
                    product: { id: it.product_id, name: it.name },
                    quantity: it.quantity
                }));
                setSelectedProducts(mappedProducts);
            } else {
                setSelectedProducts([]);
            }
            setManualTotal(rentalToEdit.total_value || 0);
        } else {
            // "todos os campos iniciem vazios"
            resetState();
        }
    }, [isOpen, rentalToEdit]);

    function resetState() {
        setNifSearch('');
        setSelectedCustomer(null);
        setPickupDate('');
        setReturnDate('');
        setSelectedProducts([]);
        setManualTotal(0);
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
        for (const sp of finalProducts) {
            const currentProduct = products.find(p => p.id === sp.product.id);
            if (!currentProduct) continue;

            const availableStock = currentProduct.available ?? currentProduct.stock_total;
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
        const totalPayload = manualTotal;

        const payload = {
            customers: customerToUse,
            pickup_date: pickupDate,
            return_date: returnDate,
            semanas: finalSemanas,
            delivery_address: deliveryAddress,
            total_value: totalPayload,
            status: rentalToEdit ? rentalToEdit.status : 'active',
            itemsCount: finalProducts.reduce((sum, sp) => sum + sp.quantity, 0),
            items: finalProducts.map(sp => ({
                product_id: sp.product.id,
                name: sp.product.name,
                price_unit: 0,
                quantity: sp.quantity
            }))
        };

        console.log("Dados do Agendamento:", payload);

        if (rentalToEdit) {
            updateRental(rentalToEdit.id, payload);
        } else {
            addRental(payload);
        }

        setShowSuccessToast(true);
        setTimeout(() => {
            setShowSuccessToast(false);
            resetState();
            onClose();
        }, 1500);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
            {showSuccessToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg font-medium flex items-center gap-2 animate-in slide-in-from-top-4">
                    <CheckCircle2 className="w-5 h-5" /> Agendamento realizado com sucesso!
                </div>
            )}
            <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl my-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">
                        {rentalToEdit ? 'Editar Agendamento' : 'Novo Agendamento'}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => { resetState(); onClose(); }}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {formError && (
                        <div className="rounded-md bg-red-500/10 p-3 border border-red-500/20 text-sm text-red-500">
                            {formError}
                        </div>
                    )}

                    <div className="p-4 border border-slate-800 rounded-lg bg-slate-950">
                        <h3 className="text-sm font-semibold mb-3 text-amber-500">1. Identificação do Cliente</h3>
                        {!rentalToEdit && (
                            <div className="flex gap-2 mb-4">
                                <Input
                                    placeholder="Digite o NIF..."
                                    value={nifSearch}
                                    onChange={(e) => setNifSearch(e.target.value)}
                                />
                                <Button type="button" onClick={searchCustomer} variant="secondary">Buscar</Button>
                            </div>
                        )}

                        {selectedCustomer && (
                            <div className="p-3 bg-slate-900 rounded border border-emerald-500/30 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-emerald-400">{selectedCustomer.full_name}</p>
                                    <p className="text-sm text-slate-400">NIF: {selectedCustomer.tax_id} | {selectedCustomer.phone}</p>
                                </div>
                                {!rentalToEdit && (
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>Limpar</Button>
                                )}
                            </div>
                        )}

                        {showCustomerForm && !selectedCustomer && (
                            <div className="grid grid-cols-2 gap-3 mt-4 animate-in fade-in">
                                <div className="col-span-2">
                                    <p className="text-sm text-amber-500 mb-2">Cliente não encontrado. Preencha os dados abaixo para cadastrar:</p>
                                </div>
                                <Input placeholder="Nome Completo *" required value={newCustomerData.full_name} onChange={e => setNewCustomerData({ ...newCustomerData, full_name: e.target.value })} />
                                <Input placeholder="NIF *" required value={newCustomerData.tax_id} onChange={e => setNewCustomerData({ ...newCustomerData, tax_id: e.target.value })} />
                                <Input placeholder="Telefone" value={newCustomerData.phone} onChange={e => setNewCustomerData({ ...newCustomerData, phone: e.target.value })} />
                                <Input placeholder="Email" type="email" value={newCustomerData.email} onChange={e => setNewCustomerData({ ...newCustomerData, email: e.target.value })} />
                            </div>
                        )}
                    </div>

                    <div className="p-4 border border-slate-800 rounded-lg bg-slate-950">
                        <h3 className="text-sm font-semibold mb-3 text-amber-500">Local de Entrega</h3>
                        <div className="col-span-3">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Endereço da Obra / Local de Entrega</label>
                            <Input
                                type="text"
                                placeholder="Ex: Rua das Flores, nº 10, Lisboa"
                                value={deliveryAddress}
                                onChange={e => setDeliveryAddress(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Data de Recolha</label>
                            <Input type="date" required value={pickupDate} onChange={e => setPickupDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Data de Entrega</label>
                            <Input type="date" required value={returnDate} onChange={e => setReturnDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Duração (Semanas)</label>
                            <Input type="number" min="1" required value={durationWeeks} onChange={e => setDurationWeeks(e.target.value === '' ? '' : parseInt(e.target.value))} />
                        </div>
                    </div>

                    <div className="p-4 border border-slate-800 rounded-lg bg-slate-950">
                        <h3 className="text-sm font-semibold mb-3 text-amber-500">2. Produtos do Aluguer</h3>
                        <div className="flex gap-2 mb-4 relative">
                            <div className="flex-1">
                                <select
                                    id="productSelect"
                                    className="flex h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1 text-sm text-slate-50 focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="">Selecione um produto...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <Input type="number" id="productQty" defaultValue="1" min="1" className="w-24 h-9" />
                            <Button type="button" variant="secondary" onClick={() => {
                                const sel = document.getElementById('productSelect') as HTMLSelectElement;
                                const qty = document.getElementById('productQty') as HTMLInputElement;
                                if (!sel.value) return;

                                const prod = products.find(p => p.id === sel.value);
                                if (prod) {
                                    const exists = selectedProducts.find(sp => sp.product.id === prod.id);
                                    if (exists) {
                                        setSelectedProducts(selectedProducts.map(sp => sp.product.id === prod.id ? { ...sp, quantity: sp.quantity + parseInt(qty.value) } : sp));
                                    } else {
                                        setSelectedProducts([...selectedProducts, { product: prod, quantity: parseInt(qty.value) }]);
                                    }
                                }
                            }}><PlusCircle className="h-4 w-4" /></Button>
                        </div>
                        <div className="space-y-2">
                            {selectedProducts.map((sp, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800">
                                    <span className="text-sm">{sp.quantity}x {sp.product.name}</span>
                                    <div className="flex items-center gap-3">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedProducts(selectedProducts.filter((_, i) => i !== idx))}>
                                            <Trash className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 border border-slate-800 rounded-lg bg-slate-950 flex flex-col items-end">
                        <div className="w-full flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-300">Valor Total do Agendamento (€) *</span>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={manualTotal || ''}
                                onChange={(e) => setManualTotal(parseFloat(e.target.value) || 0)}
                                className="w-32 text-right font-bold text-amber-500 text-lg border-amber-500/50 bg-slate-900 focus:ring-amber-500"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => { resetState(); onClose(); }}>Cancelar</Button>
                        <Button type="submit" disabled={manualTotal <= 0}>
                            {showCustomerForm && !selectedCustomer ? 'Guardar Cliente e Agendar' : 'Confirmar Agendamento'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
