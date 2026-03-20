import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { X, FileText, Edit2, Trash2 } from 'lucide-react';
import { useGlobalRentals } from '../data/mockDatabase';

interface ViewRentalModalProps {
    isOpen: boolean;
    onClose: () => void;
    rental: any;
    onEdit?: (rental: any) => void;
    onDelete?: (id: string) => void;
}

export function ViewRentalModal({ isOpen, onClose, rental, onEdit, onDelete }: ViewRentalModalProps) {
    const { updateRental } = useGlobalRentals();
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (rental) {
            setNotes(rental.observacoes || '');
        }
    }, [rental]);

    if (!isOpen || !rental) return null;

    const handleSaveNotes = () => {
        updateRental(rental.id, { observacoes: notes });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 animate-in fade-in overflow-y-auto">
            <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl my-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold tracking-tight text-slate-50 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-amber-500" />
                        Ficha de Detalhes do Agendamento
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5 text-slate-400" />
                    </Button>
                </div>

                <div className="space-y-6 mb-6">
                    {/* Cliente Info */}
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-800">
                        <h3 className="text-sm font-semibold text-amber-500 mb-3">Dados do Cliente</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Cliente</p>
                                <p className="font-semibold text-slate-100">{rental.customers?.full_name}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">NIF</p>
                                <p className="font-semibold text-slate-100">{rental.customers?.tax_id || 'Não informado'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Contacto WhatsApp</p>
                                {rental.customers?.phone ? (
                                    <a href={`https://wa.me/351${rental.customers.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors inline-block pb-0.5 border-b border-emerald-500/30">
                                        {rental.customers.phone}
                                    </a>
                                ) : (
                                    <p className="font-semibold text-slate-500">Não informado</p>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">E-mail</p>
                                <p className="font-semibold text-slate-100">{rental.customers?.email || 'Não informado'}</p>
                            </div>
                            <div className="col-span-2 mt-2 p-3 bg-slate-900 rounded border border-slate-700/50">
                                <p className="text-sm font-medium text-amber-500 mb-1">Local de Entrega / Endereço da Obra</p>
                                <p className="font-semibold text-slate-200">
                                    {rental.delivery_address ? rental.delivery_address : <span className="text-slate-500 font-normal italic">Recolha nas instalações</span>}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Datas e Produtos */}
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-800">
                        <h3 className="text-sm font-semibold text-amber-500 mb-3">Detalhes do Aluguer</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-700/50">
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Data de Recolha</p>
                                <p className="font-semibold text-slate-100">{new Date(rental.pickup_date).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Data de Entrega</p>
                                <p className="font-semibold text-slate-100">{new Date(rental.return_date).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Duração</p>
                                <p className="font-semibold text-slate-100">{rental.semanas} semana(s)</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Status</p>
                                <p className="font-semibold text-slate-100 uppercase text-xs">{rental.status === 'active' ? 'Ativo' : rental.status === 'completed' ? 'Concluído' : rental.status}</p>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-slate-400 mb-2">Produtos Alugados ({rental.itemsCount} un.)</p>
                            <div className="space-y-2">
                                {rental.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-sm bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                        <span className="text-slate-300">{item.quantity}x {item.name}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between items-center">
                                <span className="font-semibold text-slate-300">Total Efetivo</span>
                                <span className="text-lg font-bold text-amber-500">{Number(rental.total_amount).toFixed(2)} €</span>
                            </div>
                        </div>
                    </div>

                    {/* Observacoes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Observações / Notas Internas</label>
                        <textarea
                            className="w-full h-24 rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none placeholder:text-slate-600"
                            placeholder="Adicione notas sobre o estado dos materiais, condições de entrega, horários..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800 pt-5">
                    <div className="flex gap-2">
                        {onEdit && (
                            <Button type="button" variant="outline" className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 border-amber-500/30" onClick={() => { onClose(); onEdit(rental); }}>
                                <Edit2 className="w-4 h-4 mr-2" /> Editar
                            </Button>
                        )}
                        {onDelete && (
                            <Button type="button" variant="outline" className="text-red-500 hover:text-red-400 hover:bg-red-500/10 border-red-500/30" onClick={() => {
                                if (window.confirm("Tem certeza que deseja eliminar este agendamento? Esta ação não pode ser desfeita.")) {
                                    onDelete(rental.id);
                                    onClose();
                                }
                            }}>
                                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button type="button" variant="outline" className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800" onClick={onClose}>
                            Fechar
                        </Button>
                        <Button type="button" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold" onClick={handleSaveNotes}>
                            Salvar Notas
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
