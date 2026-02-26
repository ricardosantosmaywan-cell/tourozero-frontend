import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X } from 'lucide-react';
import { useGlobalCustomers } from '../data/mockDatabase';
import type { Customer } from '../data/mockDatabase';

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerToEdit?: Customer | null;
}

export function ClientModal({ isOpen, onClose, customerToEdit }: ClientModalProps) {
    const { customers, addCustomer, updateCustomer } = useGlobalCustomers();

    const [formData, setFormData] = useState<Partial<Customer>>({});
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        if (customerToEdit) {
            setFormData(customerToEdit);
        } else {
            setFormData({});
        }
        setFormError('');
    }, [isOpen, customerToEdit]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setFormError('');

        try {
            if (customerToEdit && formData.id) {
                // Modo de Edição
                updateCustomer(formData.id, formData);
            } else {
                // Modo de Criação: Verificar NIF Duplicado
                if (formData.tax_id) {
                    const existing = customers.find(c => c.tax_id === formData.tax_id);
                    if (existing) {
                        throw new Error('Já existe um cliente com este NIF (Contribuinte).');
                    }
                }

                addCustomer(formData as Omit<Customer, 'id'>);
            }

            onClose();
        } catch (err: any) {
            setFormError(err.message || 'Erro ao salvar cliente.');
        }
    }

    if (!isOpen) return null;

    const isEditing = !!customerToEdit;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    {formError && (
                        <div className="rounded-md bg-red-500/10 p-3 border border-red-500/20 text-sm text-red-500">
                            {formError}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Nome Completo</label>
                            <Input
                                required
                                value={formData.full_name || ''}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Telefone</label>
                            <Input
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                            <Input
                                type="email"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">NIF (Contribuinte)</label>
                            <Input
                                required
                                value={formData.tax_id || ''}
                                onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">CC / Passaporte</label>
                            <Input
                                value={formData.document_id || ''}
                                onChange={e => setFormData({ ...formData, document_id: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Morada</label>
                            <Input
                                value={formData.address || ''}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">Guardar</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
