import { useState } from 'react';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Search, Plus, Edit2, Trash2, X, Eye, User, History, Euro, Clock, CheckCircle2, ExternalLink, RotateCw } from 'lucide-react';
import { useGlobalCustomers } from '../data/api';
import type { Customer } from '../data/api';
import { ClientModal } from '../components/ClientModal';

export default function Customers() {
    const { customers, deleteCustomer } = useGlobalCustomers();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

    // Profile Modal State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<Customer | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
    const [rotation, setRotation] = useState<number>(0);

    // Mock History State (Global for simulation)
    const [mockRentalsDataset] = useState([
        { id: '101', customer_id: '1', pickup_date: '2025-08-10', return_date: '2025-09-10', total_amount: 120.00, status: 'completed' },
        { id: '102', customer_id: '1', pickup_date: '2025-11-05', return_date: '2025-11-20', total_amount: 60.00, status: 'completed' },
        { id: '103', customer_id: '1', pickup_date: '2026-02-10', return_date: '2026-03-10', total_amount: 240.00, status: 'active' },
        { id: '104', customer_id: '2', pickup_date: '2026-01-15', return_date: '2026-01-20', total_amount: 80.00, status: 'completed' },
        { id: '105', customer_id: '3', pickup_date: '2025-12-01', return_date: '2026-01-01', total_amount: 300.00, status: 'completed' },
        { id: '106', customer_id: '3', pickup_date: '2026-02-15', return_date: '2026-02-28', total_amount: 150.00, status: 'active' },
    ]);

    // Relacional filter for History
    const getCustomerRentals = (customerId: string) => {
        return mockRentalsDataset.filter(r => r.customer_id === customerId);
    };

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.tax_id?.includes(searchTerm);
        const matchesDate = filterDate ? c.created_at?.startsWith(filterDate) : true;
        return matchesSearch && matchesDate;
    });

    function openNewModal() {
        setCustomerToEdit(null);
        setIsModalOpen(true);
    }

    function openEditModal(customer: Customer) {
        setCustomerToEdit(customer);
        setIsModalOpen(true);
    }

    function openProfileModal(customer: Customer) {
        setRotation(0);
        setSelectedProfile(customer);
        setActiveTab('details');
        setIsProfileModalOpen(true);
    }

    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
        await deleteCustomer(id);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Gestão de Clientes</h1>
                <Button onClick={openNewModal}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Cliente
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Buscar por nome ou NIF..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-auto bg-slate-900/50"
                    />
                    {filterDate && (
                        <Button variant="outline" onClick={() => setFilterDate('')} className="text-slate-400 hover:text-slate-200">
                            Limpar
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>NIF</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Data de Registo</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCustomers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                    Nenhum cliente encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCustomers.map(customer => (
                                <TableRow key={customer.id}>
                                    <TableCell className="font-medium">{customer.full_name}</TableCell>
                                    <TableCell>{customer.tax_id}</TableCell>
                                    <TableCell>{customer.phone}</TableCell>
                                    <TableCell>{customer.email}</TableCell>
                                    <TableCell>
                                        {customer.created_at ? new Date(customer.created_at).toLocaleString('pt-PT', { 
                                            day: '2-digit', month: '2-digit', year: 'numeric', 
                                            hour: '2-digit', minute: '2-digit' 
                                        }) : '--'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => openProfileModal(customer)}>
                                            <Eye className="h-4 w-4 text-slate-400 hover:text-blue-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => openEditModal(customer)}>
                                            <Edit2 className="h-4 w-4 text-slate-400 hover:text-amber-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)}>
                                            <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Modal / Dialog de Cadastro */}
            <ClientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                customerToEdit={customerToEdit}
            />

            {/* Modal de Perfil do Cliente */}
            {isProfileModalOpen && selectedProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in">
                    <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header Minimalista */}
                        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                    <User className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-50 leading-none">{selectedProfile.full_name}</h2>
                                    <p className="text-sm text-slate-400 mt-1">NIF: {selectedProfile.tax_id}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => { setIsProfileModalOpen(false); setSelectedProfile(null); }}>
                                <X className="h-5 w-5 text-slate-400" />
                            </Button>
                        </div>

                        {/* Abas */}
                        <div className="flex border-b border-slate-800 px-6">
                            <button
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                                onClick={() => setActiveTab('details')}
                            >
                                <User className="w-4 h-4 inline-block mr-2" />
                                Detalhes de Contato
                            </button>
                            <button
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                                onClick={() => setActiveTab('history')}
                            >
                                <History className="w-4 h-4 inline-block mr-2" />
                                Histórico de Alugueres
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-900">
                            {activeTab === 'details' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-slate-500">Email</p>
                                            <p className="text-base text-slate-50">{selectedProfile.email}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-slate-500">Telefone / WhatsApp</p>
                                            <p className="text-base text-slate-50">{selectedProfile.phone}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-slate-500">Documento Identidade</p>
                                            <p className="text-base text-slate-50">{selectedProfile.document_id || '--'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-slate-500">Morada</p>
                                            <p className="text-base text-slate-50">{selectedProfile.address}</p>
                                        </div>
                                    </div>

                                    {selectedProfile.document_photo_url && (
                                        <div className="pt-4 border-t border-slate-800 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-slate-500">Foto do Documento</p>
                                                <div className="flex items-center gap-2">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10 h-8"
                                                        onClick={() => setRotation(r => r + 90)}
                                                    >
                                                        <RotateCw className="w-4 h-4 mr-1.5" /> Girar 90°
                                                    </Button>
                                                    <a 
                                                        href={selectedProfile.document_photo_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                    >
                                                        <Button variant="outline" size="sm" className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10 h-8">
                                                            <ExternalLink className="w-4 h-4 mr-1.5" />
                                                            Abrir Nova Aba
                                                        </Button>
                                                    </a>
                                                </div>
                                            </div>
                                            <div className="rounded-lg overflow-hidden border border-slate-700 bg-black flex justify-center items-center p-2 min-h-[300px]">
                                                <img 
                                                    src={selectedProfile.document_photo_url} 
                                                    alt="Documento do Cliente" 
                                                    className="w-full h-auto max-h-[400px] object-contain rounded transition-transform duration-300"
                                                    style={{ maxWidth: '100%', transform: `rotate(${rotation}deg)` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-6 border-t border-slate-800 flex justify-end">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsProfileModalOpen(false);
                                                openEditModal(selectedProfile);
                                            }}
                                            className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                                        >
                                            <Edit2 className="w-4 h-4 mr-2" /> Editar Cadastro
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="space-y-6">
                                    {/* LTV Highlight */}
                                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Lifetime Value (LTV)</h3>
                                            <p className="text-xs text-slate-500 mt-1">Soma total de todos os contratos em área de consulta.</p>
                                        </div>
                                        <div className="text-3xl font-bold text-emerald-400 flex items-center gap-2">
                                            <Euro className="w-6 h-6 text-emerald-500/50" />
                                            {getCustomerRentals(selectedProfile.id).reduce((acc, r) => acc + r.total_amount, 0).toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-slate-800/80">
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="py-3">Data Entrega</TableHead>
                                                    <TableHead className="py-3">Data Prevista Retorno</TableHead>
                                                    <TableHead className="py-3">Valor Faturado</TableHead>
                                                    <TableHead className="py-3 text-right">Status Atual</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {getCustomerRentals(selectedProfile.id).map(rental => (
                                                    <TableRow key={rental.id} className="hover:bg-slate-800/30 transition-colors opacity-90">
                                                        <TableCell className="py-3">{new Date(rental.pickup_date).toLocaleDateString()}</TableCell>
                                                        <TableCell className="py-3">{new Date(rental.return_date).toLocaleDateString()}</TableCell>
                                                        <TableCell className="py-3 font-medium text-slate-300">{rental.total_amount.toFixed(2)} €</TableCell>
                                                        <TableCell className="py-3 text-right">
                                                            {rental.status === 'active' ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                    <Clock className="w-3 h-3" /> Em Curso
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                                                    <CheckCircle2 className="w-3 h-3" /> Finalizado
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <p className="text-xs text-center text-slate-500 pt-2 flex items-center justify-center gap-2 italic">
                                        <Eye className="w-3 h-3" /> Tabela de visualização estrita apenas-leitura. Alterações de status devem ser feitas em tela de Dashboard.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
