import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye, Edit2, Trash2, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useGlobalRentals } from '../data/mockDatabase';
import { generateRentalContract } from '../lib/pdfGenerator';
import { BookingModal } from '../components/BookingModal';
import { ViewRentalModal } from '../components/ViewRentalModal';

export default function Rentals() {
    // Integração Directa à Base Central Mock
    const { rentals, deleteRental } = useGlobalRentals();

    // Remover o loading já que os dados vêm imediatamente em memória
    const [searchTerm, setSearchTerm] = useState('');

    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [rentalToEdit, setRentalToEdit] = useState<any>(null);

    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewRental, setViewRental] = useState<any>(null);

    // Search & Paginação Global na Table
    const filteredRentals = rentals.filter(r =>
        r.customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.includes(searchTerm) // Permitir busca por ID de contrato se necessário
    );

    const totalPages = Math.ceil(filteredRentals.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedRentals = filteredRentals.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Reset da Página a cada nova Pesquisa
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    function isLate(returnDate: string, status: string) {
        if (status === 'completed') return false;
        return new Date(returnDate) < new Date();
    }
    const openEditModal = (rental: any) => {
        setRentalToEdit(rental);
        setIsBookingModalOpen(true);
    };

    const openViewModal = (rental: any) => {
        setViewRental(rental);
        setIsViewModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Tem certeza que deseja eliminar este agendamento? Esta ação não pode ser desfeita.")) {
            deleteRental(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Agendamentos</h1>
            </div>

            <div className="flex items-center gap-2 max-w-sm">
                <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Pesquisar por cliente..."
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
                            <TableHead>Cliente</TableHead>
                            <TableHead>Recolha</TableHead>
                            <TableHead>Entrega</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Total (€)</TableHead>
                            <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedRentals.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                                    Nenhum agendamento encontrado nesta base de dados inteira.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedRentals.map(rental => (
                                <TableRow key={rental.id}>
                                    <TableCell className="font-medium text-slate-200">
                                        {rental.customers?.full_name || 'Desconhecido'}
                                    </TableCell>
                                    <TableCell className="text-slate-300">{new Date(rental.pickup_date).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-slate-300">{new Date(rental.return_date).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isLate(rental.return_date, rental.status)
                                            ? 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-500'
                                            : rental.status === 'active'
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-500'
                                                : rental.status === 'canceled'
                                                    ? 'bg-slate-100 text-slate-800 dark:bg-slate-500/10 dark:text-slate-400'
                                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-500'
                                            }`}>
                                            {isLate(rental.return_date, rental.status) ? 'Atrasado'
                                                : rental.status === 'active' ? 'Ativo'
                                                    : rental.status === 'canceled' ? 'Cancelado'
                                                        : 'Concluído'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-medium">{Number(rental.total_value).toFixed(2)} €</TableCell>
                                    <TableCell className="text-right flex items-center justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent"
                                            onClick={() => openViewModal(rental)}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
                                            onClick={() => generateRentalContract(rental)}
                                            title="Imprimir Contrato PDF"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent"
                                            onClick={() => openEditModal(rental)}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent"
                                            onClick={() => handleDelete(rental.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Paginação */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/50 px-4 py-3 sm:px-6">
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-slate-400">
                                    A mostrar <span className="font-medium text-slate-200">{startIndex + 1}</span> a <span className="font-medium text-slate-200">{Math.min(startIndex + ITEMS_PER_PAGE, filteredRentals.length)}</span> de{' '}
                                    <span className="font-medium text-slate-200">{filteredRentals.length}</span> resultados
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <Button
                                        variant="outline"
                                        className="rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-800 hover:bg-slate-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <span className="sr-only">Anterior</span>
                                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                    </Button>
                                    <div className="px-4 py-2 text-sm font-semibold text-slate-200 ring-1 ring-inset ring-slate-800 bg-slate-800/50">
                                        {currentPage} / {totalPages}
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-800 hover:bg-slate-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        <span className="sr-only">Próxima</span>
                                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                    </Button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Modal Centralizado de Novo Agendamento */}
            <BookingModal
                isOpen={isBookingModalOpen}
                onClose={() => {
                    setIsBookingModalOpen(false);
                    setRentalToEdit(null);
                }}
                rentalToEdit={rentalToEdit}
            />

            <ViewRentalModal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setViewRental(null);
                }}
                rental={viewRental}
                onEdit={(rental) => {
                    openEditModal(rental);
                }}
                onDelete={handleDelete}
            />
        </div>
    );
}
