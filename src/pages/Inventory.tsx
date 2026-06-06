import { useState } from 'react';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useGlobalProducts, useGlobalRentals } from '../data/api';
import type { Product } from '../data/api';

export default function Inventory() {
    // Liga directamente à Store Global MOCK
    const { products, addProduct, updateProduct, deleteProduct } = useGlobalProducts();
    const { rentals } = useGlobalRentals();
    const activeRentals = rentals.filter(r => r.status === 'active');

    const [searchTerm, setSearchTerm] = useState('');
    const loading = false; // Mock data is instant

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Product>>({});
    const [formError, setFormError] = useState('');
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    function openNewModal() {
        setFormData({});
        setIsEditing(false);
        setFormError('');
        setIsModalOpen(true);
    }

    function openEditModal(product: Product) {
        setFormData(product);
        setIsEditing(true);
        setFormError('');
        setIsModalOpen(true);
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        await deleteProduct(id);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setFormError('');

        try {
            if (isEditing && formData.id) {
                // Real Update
                await updateProduct(formData.id, { ...formData, available: formData.stock_total } as Product);
            } else {
                // Real Insert
                await addProduct({
                    ...formData,
                    available: formData.stock_total
                } as Omit<Product, 'id'>);
            }

            setIsModalOpen(false);
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 2000);
        } catch (err: any) {
            setFormError(err.message || 'Erro ao salvar produto.');
        }
    }

    return (
        <div className="space-y-6 relative">
            {showSuccessToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg font-medium flex items-center gap-2 animate-in slide-in-from-top-4">
                    <CheckCircle2 className="w-5 h-5" /> Produto cadastrado com sucesso!
                </div>
            )}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Estoque e Inventário</h1>
                <Button onClick={openNewModal}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Produto
                </Button>
            </div>

            <div className="flex items-center gap-2 max-w-sm">
                <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Buscar produto por nome..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Disponível</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                                    Carregando estoque...
                                </TableCell>
                            </TableRow>
                        ) : filteredProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                                    Nenhum produto cadastrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProducts.map(product => {
                                const rentedQuantity = activeRentals.reduce((total, rental) => {
                                    // Apenas conta como "alugado" (fora do armazém) se a data de levantamento já chegou
                                    const pickupDate = new Date(rental.pickup_date);
                                    pickupDate.setHours(0, 0, 0, 0);
                                    const today = new Date();
                                    today.setHours(23, 59, 59, 999);

                                    if (pickupDate <= today) {
                                        const item = rental.items?.find((i: any) => i.product_id === product.id);
                                        return total + (item ? item.quantity : 0);
                                    }
                                    return total;
                                }, 0);
                                const available = product.stock_total - rentedQuantity;
                                const isLowStock = available <= (product.stock_total * 0.2); // Alerta se =< 20%

                                return (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell className="text-center">{product.stock_total}</TableCell>
                                        <TableCell className="text-center">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${isLowStock
                                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                }`}>
                                                {isLowStock && <AlertTriangle className="w-3 h-3" />}
                                                {available}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openEditModal(product)}>
                                                <Edit2 className="h-4 w-4 text-slate-400 hover:text-amber-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                                                <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Modal / Dialog de Cadastro de Produto */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">{isEditing ? 'Editar Produto' : 'Novo Produto'}</h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            {formError && (
                                <div className="rounded-md bg-red-500/10 p-3 border border-red-500/20 text-sm text-red-500">
                                    {formError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Produto</label>
                                    <Input
                                        required
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Total em Estoque</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        required
                                        value={formData.stock_total || ''}
                                        onChange={e => setFormData({ ...formData, stock_total: parseInt(e.target.value, 10) })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit">Guardar</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
