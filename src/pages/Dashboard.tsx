import { useState, useEffect, useMemo, Fragment } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '../components/ui/Table';
import { Euro, Users, Package, Clock, AlertCircle, Plus, CheckCircle2, Search, Edit2, Eye, AlertTriangle, FileText, FileCheck2, Loader2, RotateCcw, Calendar, MoreHorizontal, ChevronDown, ChevronRight, CalendarPlus, Pencil, Trash2, Save, X, Printer } from 'lucide-react';
import { BookingModal } from '../components/BookingModal';
import { ViewRentalModal } from '../components/ViewRentalModal';
import { ProlongModal } from '../components/ProlongModal';
import { PickupSignatureModal } from '../components/PickupSignatureModal';
import { useGlobalRentals, useGlobalProducts } from '../data/api';
import { usePeriod } from '../contexts/PeriodContext';
import { printRentalContractHTML } from '../lib/htmlContractGenerator';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
    const [currentTime, setCurrentTime] = useState(new Date());

    const { rentals, loading: loadingRentals, updateRentalPartial, deleteRental, confirmPickup, refreshRentals } = useGlobalRentals();
    const { products, loading: loadingProducts, refreshProducts } = useGlobalProducts();
    const { selectedMonth, selectedYear, selectedDay, startDate, isSpecificDay } = usePeriod();
    const isLoading = loadingRentals || loadingProducts;


    useEffect(() => {
        refreshRentals();
        refreshProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Tabela State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'ontime' | 'late' | 'ricardo' | 'gabriel'>('all');
    
    // Filtros de Histórico
    const [historyStartDate, setHistoryStartDate] = useState('');
    const [historyEndDate, setHistoryEndDate] = useState('');

    // Filtros de Alugueres Ativos
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    // Booking Modal State
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [bookingRentalToEdit, setBookingRentalToEdit] = useState<any>(null);

    // View Modal State
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewRental, setViewRental] = useState<any>(null);
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

    // Prolong Modal & Expansão de Linha State
    const [selectedRentalForProlong, setSelectedRentalForProlong] = useState<any>(null);
    const [isProlongModalOpen, setIsProlongModalOpen] = useState(false);
    const [expandedRentalIds, setExpandedRentalIds] = useState<string[]>([]);
    const [extensionsData, setExtensionsData] = useState<{[key: string]: any[]}>({});
    const [loadedExtensionsSum, setLoadedExtensionsSum] = useState<{[key: string]: number}>({});
    const [loadingExtensions, setLoadingExtensions] = useState<{[key: string]: boolean}>({});

    // Prolongamento Edit/Delete States
    const [editingExt, setEditingExt] = useState<{ rentalId: string, extIndex: number } | null>(null);
    const [editValue, setEditValue] = useState(0);
    const [editStartDate, setEditStartDate] = useState('');
    const [editReturnDate, setEditReturnDate] = useState('');
    const [editReceivedBy, setEditReceivedBy] = useState('Ricardo');
    const [editNote, setEditNote] = useState('');
    const [editPaymentStatus, setEditPaymentStatus] = useState<'paid' | 'pending'>('pending');
    const [editPaymentReference, setEditPaymentReference] = useState('');
    const [isSavingExt, setIsSavingExt] = useState(false);

    // Stock Sync Modal States
    const [isStockSyncOpen, setIsStockSyncOpen] = useState(false);
    const [stockSyncRentals, setStockSyncRentals] = useState<any[]>([]);
    const [stockSyncSelected, setStockSyncSelected] = useState<Set<string>>(new Set());
    const [isSyncingStock, setIsSyncingStock] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.dropdown-container')) {
                setActiveDropdownId(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    const getOriginalReturnDate = (rental: any): string => {
        if (!rental) return '';
        const exts = Array.isArray(rental.extensions_history) ? rental.extensions_history : [];
        if (exts.length > 0 && exts[0].old_return_date) {
            return exts[0].old_return_date;
        }
        return rental.return_date || '';
    };

    const getEffectiveReturnDate = (rental: any): string => {
        if (!rental) return '';
        const exts = Array.isArray(rental.extensions_history) ? rental.extensions_history : [];
        if (exts.length > 0) {
            const lastExt = exts[exts.length - 1];
            if (lastExt.new_return_date) {
                return lastExt.new_return_date;
            }
        }
        return rental.return_date || '';
    };

    const handleEditRental = (rental: any) => {
        setBookingRentalToEdit(rental);
        setIsBookingModalOpen(true);
    };

    const handleDeleteRental = async (rentalOrId: any) => {
        let rentalObj = null;
        let rentalId = '';
        if (typeof rentalOrId === 'string') {
            rentalId = rentalOrId;
            rentalObj = rentals.find(r => r.id === rentalId);
        } else {
            rentalObj = rentalOrId;
            rentalId = rentalObj?.id;
        }

        const clientName = rentalObj?.customers?.full_name || 'Desconhecido';
        const confirmDelete = window.confirm(`Tem a certeza que deseja eliminar o aluguer de ${clientName}? Esta ação não pode ser revertida.`);
        if (!confirmDelete) return;

        try {
            await deleteRental(rentalId);
            refreshRentals();
        } catch (err: any) {
            alert("Erro ao eliminar aluguer: " + err.message);
        }
    };

    const loadExtensionsForRental = async (rentalId: string, forceRefresh = false) => {
        if (!forceRefresh && extensionsData[rentalId] !== undefined) return;
        
        setLoadingExtensions(prev => ({ ...prev, [rentalId]: true }));
        try {
            const { data, error } = await supabase
                .from('rental_extensions')
                .select('*')
                .eq('rental_id', rentalId)
                .order('created_at', { ascending: false });
            
            if (!error && data) {
                const mappedData = data.map((ext: any) => ({
                    id: ext.id,
                    period: ext.period || (ext.start_date && ext.end_date ? `${new Date(ext.start_date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })} → ${new Date(ext.end_date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}` : '-'),
                    extra_value: ext.extra_value ?? ext.extra_materials ?? 0,
                    received_by: ext.received_by || 'Ricardo',
                    notes: ext.notes ?? ext.note ?? '',
                    payment_status: ext.payment_status || 'pending',
                    payment_reference: ext.payment_reference || ''
                }));
                setExtensionsData(prev => ({ ...prev, [rentalId]: mappedData }));
                const sum = mappedData.reduce((acc: number, ext: any) => acc + Number(ext.extra_value || 0), 0);
                setLoadedExtensionsSum(prev => ({ ...prev, [rentalId]: sum }));
            } else {
                throw new Error(error?.message || "Tabela não encontrada");
            }
        } catch (err) {
            const currentRental = rentals.find(r => r.id === rentalId);
            const prolongEntries = (currentRental?.extensions_history || [])
                .map((ext: any, originalIndex: number) => ({ ext, originalIndex }))
                .filter(({ ext }: any) => ext.type === 'prolongamento');
            if (currentRental && prolongEntries.length > 0) {
                const mappedData = prolongEntries.map(({ ext, originalIndex }: any) => ({
                    id: ext.date || `${rentalId}-ext-${originalIndex}`,
                    originalIndex,
                    period: ext.old_return_date && ext.new_return_date ? `${new Date(ext.old_return_date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })} → ${new Date(ext.new_return_date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}` : '-',
                    extra_value: ext.extra_materials ?? ext.extra_value ?? 0,
                    received_by: ext.received_by || 'Ricardo',
                    notes: ext.note ?? '',
                    payment_status: ext.payment_status || 'pending',
                    payment_reference: ext.payment_reference || ''
                }));
                setExtensionsData(prev => ({ ...prev, [rentalId]: mappedData }));
                const sum = mappedData.reduce((acc: number, ext: any) => acc + Number(ext.extra_value || 0), 0);
                setLoadedExtensionsSum(prev => ({ ...prev, [rentalId]: sum }));
            } else {
                setExtensionsData(prev => ({ ...prev, [rentalId]: [] }));
                setLoadedExtensionsSum(prev => ({ ...prev, [rentalId]: 0 }));
            }
        } finally {
            setLoadingExtensions(prev => ({ ...prev, [rentalId]: false }));
        }
    };

    const toggleRentalExpansion = (rentalId: string) => {
        if (expandedRentalIds.includes(rentalId)) {
            setExpandedRentalIds(expandedRentalIds.filter(id => id !== rentalId));
        } else {
            setExpandedRentalIds([...expandedRentalIds, rentalId]);
            loadExtensionsForRental(rentalId);
        }
    };

    const handleConfirmProlong = async (
        daysDiff: number,
        extraValue: number,
        note: string,
        newItems: any[],
        newReturnDateStr: string,
        depositValue: number,
        transportValue: number,
        receivedBy: string,
        paymentStatus: 'paid' | 'pending' = 'pending',
        paymentReference: string = ''
    ) => {
        if (!selectedRentalForProlong) return;
        const rental = selectedRentalForProlong;
        const oldTotal = Number(rental.total_amount || 0);

        const diffDeposit = depositValue - (Number(rental.deposit_value || 0));
        const diffTransport = transportValue - (Number(rental.transport_value || 0));
        const newTotal = oldTotal + extraValue + diffDeposit + diffTransport;

        const oldWeeks = Number(rental.semanas || 0);
        const extraWeeksFraction = daysDiff / 7;
        const newWeeksTotal = Number((oldWeeks + extraWeeksFraction).toFixed(1));

        const extensionEntry = {
            date: new Date().toISOString(),
            type: 'prolongamento',
            days_added: daysDiff,
            extra_materials: extraValue,
            old_return_date: getEffectiveReturnDate(rental),
            new_return_date: newReturnDateStr,
            old_value: oldTotal,
            new_value: newTotal,
            old_deposit: Number(rental.deposit_value || 0),
            new_deposit: depositValue,
            old_transport: Number(rental.transport_value || 0),
            new_transport: transportValue,
            received_by: receivedBy || 'Ricardo',
            note: note,
            payment_status: paymentStatus,
            payment_reference: paymentReference,
            added_items: newItems.map(it => ({ name: it.product.name, quantity: it.quantity }))
        };

        const updatedHistory = [...(rental.extensions_history || []), extensionEntry];

        try {
            await updateRentalPartial(rental.id, {
                return_date: getOriginalReturnDate(rental),
                total_amount: Number(newTotal.toFixed(2)),
                deposit_value: Number(depositValue.toFixed(2)),
                transport_value: Number(transportValue.toFixed(2)),
                received_by: receivedBy || 'Ricardo',
                semanas: newWeeksTotal,
                rental_duration_value: newWeeksTotal,
                extensions_history: updatedHistory
            });

            if (newItems && newItems.length > 0) {
                const aggregatedItems: {[key: string]: {product: any, quantity: number}} = {};
                newItems.forEach(item => {
                    if (aggregatedItems[item.product.id]) {
                        aggregatedItems[item.product.id].quantity += item.quantity;
                    } else {
                        aggregatedItems[item.product.id] = { ...item };
                    }
                });

                for (const productId in aggregatedItems) {
                    const item = aggregatedItems[productId];
                    const existingItem = (rental.items || []).find((it: any) => it.product_id === productId);
                    
                    if (existingItem) {
                        const { error: itemUpdateErr } = await supabase
                            .from('rental_items')
                            .update({ quantity: Number(existingItem.quantity || 0) + item.quantity })
                            .eq('rental_id', rental.id)
                            .eq('product_id', productId);
                        if (itemUpdateErr) throw itemUpdateErr;
                    } else {
                        const { error: itemInsertErr } = await supabase
                            .from('rental_items')
                            .insert([{
                                rental_id: rental.id,
                                product_id: productId,
                                quantity: item.quantity,
                                price_unit: item.product.price_unit || 0
                            }]);
                        if (itemInsertErr) throw itemInsertErr;
                    }

                    const { data: prodData } = await supabase.from('products').select('available').eq('id', productId).single();
                    if (prodData) {
                        await supabase.from('products').update({ available: prodData.available - item.quantity }).eq('id', productId);
                    }
                }
            }
            
            // Recarregar os prolongamentos
            if (expandedRentalIds.includes(rental.id)) {
                loadExtensionsForRental(rental.id, true);
            }
            
            refreshRentals();
            refreshProducts();
            setIsProlongModalOpen(false);
            setSelectedRentalForProlong(null);
        } catch (err: any) {
            alert("Erro ao processar prolongamento: " + err.message);
        }
    };

    const getExtValue = (ext: any): number => {
        if (!ext) return 0;
        if (Number(ext.extra_materials) > 0) return Number(ext.extra_materials);
        if (Number(ext.extra_value) > 0) return Number(ext.extra_value);
        const diff = Number(ext.new_value || 0) - Number(ext.old_value || 0);
        return diff > 0 ? diff : 0;
    };

    const recalcRentalAfterExtChange = (rentalObj: any, newExts: any[]) => {
        const allExts = rentalObj.extensions_history || [];
        const baseValue    = allExts.length > 0 ? Number(allExts[0].old_value   || 0) : Number(rentalObj.total_amount   || 0);
        const baseDeposit  = allExts.length > 0 ? Number(allExts[0].old_deposit  || 0) : Number(rentalObj.deposit_value  || 0);
        const baseTransp   = allExts.length > 0 ? Number(allExts[0].old_transport|| 0) : Number(rentalObj.transport_value|| 0);
        const baseReturn   = allExts.length > 0 ? allExts[0].old_return_date         : rentalObj.return_date;

        if (newExts.length === 0) {
            return {
                extensions_history: [],
                return_date:      baseReturn,
                total_amount:     Number(baseValue.toFixed(2)),
                deposit_value:    Number(baseDeposit.toFixed(2)),
                transport_value:  Number(baseTransp.toFixed(2)),
            };
        }
        const extSum  = newExts.reduce((s: number, e: any) => s + getExtValue(e), 0);
        const lastExt = newExts[newExts.length - 1];
        return {
            extensions_history: newExts,
            return_date:     baseReturn,
            total_amount:    Number((baseValue + extSum).toFixed(2)),
            deposit_value:   Number(lastExt.new_deposit   ?? baseDeposit),
            transport_value: Number(lastExt.new_transport ?? baseTransp),
        };
    };

    // Recebe o índice real dentro de rental.extensions_history (não o índice da lista filtrada exibida)
    // e busca a entrada crua ali, já que o objeto exibido na lista é uma versão resumida/mapeada.
    const handleOpenEditExt = (rental: any, extIndex: number) => {
        const rawExt = (rental.extensions_history || [])[extIndex];
        if (!rawExt) return;
        setEditingExt({ rentalId: rental.id, extIndex });
        setEditValue(getExtValue(rawExt));
        const formatDateForInput = (d: string) => d ? d.split('T')[0] : '';
        setEditStartDate(formatDateForInput(rawExt.old_return_date));
        setEditReturnDate(formatDateForInput(rawExt.new_return_date || ''));
        setEditReceivedBy(rawExt.received_by || rental.received_by || 'Ricardo');
        setEditNote(rawExt.note || '');
        setEditPaymentStatus(rawExt.payment_status || 'pending');
        setEditPaymentReference(rawExt.payment_reference || '');
    };

    const handleDeleteExt = async (rental: any, extIndex: number) => {
        if (!window.confirm('Eliminar este prolongamento? A data e valores do aluguer serão revertidos.')) return;
        const exts    = [...(rental.extensions_history || [])];
        const newExts = exts.filter((_: any, i: number) => i !== extIndex);
        const update  = recalcRentalAfterExtChange(rental, newExts);
        
        try {
            await updateRentalPartial(rental.id, update);
            loadExtensionsForRental(rental.id, true);
            refreshRentals();
        } catch (err: any) {
            alert("Erro ao excluir prolongamento: " + err.message);
        }
    };

    const handleSaveExt = async () => {
        if (!editingExt) return;
        const rental = rentals.find(r => r.id === editingExt.rentalId);
        if (!rental) return;

        setIsSavingExt(true);
        try {
            const { extIndex } = editingExt;
            const exts = [...(rental.extensions_history || [])];
            const orig = exts[extIndex];
            exts[extIndex] = {
                ...orig,
                extra_materials: editValue,
                extra_value:     editValue,
                new_value:       Number((Number(orig.old_value || 0) + editValue).toFixed(2)),
                old_return_date: editStartDate,
                new_return_date: editReturnDate,
                received_by:     editReceivedBy,
                note:            editNote,
                payment_status:  editPaymentStatus,
                payment_reference: editPaymentReference,
            };
            const update = recalcRentalAfterExtChange(rental, exts);
            await updateRentalPartial(rental.id, update);
            setEditingExt(null);
            loadExtensionsForRental(rental.id, true);
            refreshRentals();
        } catch (err: any) {
            alert("Erro ao salvar prolongamento: " + err.message);
        } finally {
            setIsSavingExt(false);
        }
    };

    function isLate(returnDate: string) {
        const end = new Date(returnDate);
        end.setHours(23, 59, 59, 999);
        return end < new Date();
    }
    const activeRentals = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return (rentals || []).filter(r => {
            if (r.status === 'active') return true;
            if (r.status === 'completed' || r.status === 'canceled') {
                const pickup = new Date(r.pickup_date);
                const inCurrentMonth =
                    pickup.getMonth() === currentMonth && pickup.getFullYear() === currentYear;
                return inCurrentMonth;
            }
            return false;
        });
    }, [rentals]);
    
    // Filtragem do Histórico de Concluídos
    const filteredCompletedRentals = useMemo(() => {
        if (!historyStartDate && !historyEndDate) {
            return [];
        }

        const getExtValue = (ext: any): number => {
            if (!ext) return 0;
            if (typeof ext.extra_materials === 'number') return ext.extra_materials;
            if (typeof ext.extra_value === 'number') return ext.extra_value;
            const diff = Number(ext.new_value || 0) - Number(ext.old_value || 0);
            return diff > 0 ? diff : 0;
        };

        let list = (rentals || []).filter(r => {
            const statusStr = typeof r.status === 'string' ? r.status.toLowerCase() : '';
            return ['completed', 'finalizado', 'concluido', 'concluído'].includes(statusStr);
        });

        // Filtro por Nome (Busca Global)
        if (searchTerm) {
            list = list.filter(r => 
                r.customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Mapeia e calcula os valores estritos e filtra por data com base no início (pickup_date) usando strings YMD (timezone safe)
        let mappedList = list.map(r => {
            const exts = Array.isArray(r.extensions_history) ? r.extensions_history : [];
            const extMatTotal = exts.reduce((s: number, e: any) => s + getExtValue(e), 0);
            const initialMatValue = Math.max(0, (r.materials_value || 0) - extMatTotal);

            const getYearMonthDay = (dateStr: string) => {
                if (!dateStr) return '';
                return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim();
            };

            const pickupYMD = getYearMonthDay(r.pickup_date);
            const startYMD = historyStartDate || '';
            const endYMD = historyEndDate || '';

            // Se não houver filtro de data ativo, mostramos o valor total
            if (!startYMD && !endYMD) {
                return {
                    ...r,
                    displayed_value: r.materials_value || 0,
                    matches_filter: true
                };
            }

            let displayedValue = 0;
            let matchesFilter = false;

            // 1. Verifica a data de recolha (pickup_date) inicial do aluguer
            const pickupInFilter = (!startYMD || pickupYMD >= startYMD) && (!endYMD || pickupYMD <= endYMD);
            if (pickupInFilter) {
                displayedValue += initialMatValue;
                matchesFilter = true;
            }

            // 2. Verifica cada prolongamento pelo seu início (old_return_date)
            exts.forEach((ext: any) => {
                if (ext.old_return_date) {
                    const extStartYMD = getYearMonthDay(ext.old_return_date);
                    const extInFilter = (!startYMD || extStartYMD >= startYMD) && (!endYMD || extStartYMD <= endYMD);
                    if (extInFilter) {
                        displayedValue += getExtValue(ext);
                        matchesFilter = true;
                    }
                }
            });

            return {
                ...r,
                displayed_value: displayedValue,
                matches_filter: matchesFilter
            };
        });

        // Se houver filtros de data ativos, mantemos apenas os correspondentes
        if (historyStartDate || historyEndDate) {
            mappedList = mappedList.filter(item => item.matches_filter);
        }

        // Ordenar por data de retorno decrescente (usando a data efetiva de retorno)
        mappedList.sort((a, b) => new Date(getEffectiveReturnDate(b)).getTime() - new Date(getEffectiveReturnDate(a)).getTime());

        // Se não houver filtros, mostrar apenas os últimos 10 (comportamento original)
        if (!historyStartDate && !historyEndDate && !searchTerm) {
            return mappedList.slice(0, 10);
        }

        return mappedList;
    }, [rentals, searchTerm, historyStartDate, historyEndDate]);




    // Filtragens Dinâmicas da Tabela (Alugueres Ativos / Período)
    const displayRentals = useMemo(() => {
        const getYearMonthDay = (dateStr: string) => {
            if (!dateStr) return '';
            return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim();
        };

        const startYMD = filterStartDate || '';
        const endYMD = filterEndDate || '';
        const hasDateFilter = !!(startYMD || endYMD);

        // Se houver filtro de datas, busca em todos os registros (rentals), senão apenas nos ativos
        const baseList = hasDateFilter ? (rentals || []) : activeRentals;

        return baseList.filter(r => {
            const matchName = r.customers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
            const late = isLate(getEffectiveReturnDate(r));
            
            // Se houver filtro de data, o filtro de status (Em Dia / Atrasados) é ignorado,
            // mas mantemos filtros de pessoa (ricardo/gabriel)
            let matchStatus = true;
            if (!hasDateFilter) {
                if (filterStatus === 'ontime') matchStatus = !late;
                if (filterStatus === 'late') matchStatus = late;
            }

            let matchPessoa = true;
            if (filterStatus === 'ricardo' || filterStatus === 'gabriel') {
                const targetPerson = filterStatus;
                const principalMatches = r.received_by?.toLowerCase() === targetPerson;
                const exts = Array.isArray(r.extensions_history) ? r.extensions_history : [];
                const extensionMatches = exts.some((ext: any) => ext.received_by?.toLowerCase() === targetPerson);
                matchPessoa = principalMatches || extensionMatches;
            }

            // Se houver um dia específico selecionado, filtramos por recolha ou entrega nesse dia
            if (isSpecificDay) {
                const pickup = r.pickup_date.startsWith(startDate);
                const returns = getEffectiveReturnDate(r).startsWith(startDate);
                if (!((pickup || returns) && matchName && matchStatus && matchPessoa)) return false;
            } else {
                if (!(matchName && matchStatus && matchPessoa)) return false;
            }

            // Filtro por intervalo de datas (apenas por pickup_date)
            if (hasDateFilter) {
                const pickupYMD = getYearMonthDay(r.pickup_date);
                const pickupInFilter = (!startYMD || pickupYMD >= startYMD) && (!endYMD || pickupYMD <= endYMD);
                return pickupInFilter;
            }

            return true;
        });
    }, [rentals, activeRentals, searchTerm, filterStatus, isSpecificDay, startDate, filterStartDate, filterEndDate]);

    const getExtensions = (r: any): any[] => Array.isArray(r.extensions_history) ? r.extensions_history : [];

    const getOriginalMaterialsValue = (rental: any): number => {
        const totalVal = Number(rental.total_value || 0);
        const baseVal = totalVal > 0 ? totalVal : Number(rental.materials_value || 0);
        const exts = getExtensions(rental);
        const extSum = exts
            .filter((ext: any) => ext.type === 'prolongamento')
            .reduce((s: number, e: any) => s + getExtValue(e), 0);
        return Math.max(0, baseVal - extSum);
    };

    const formatDateDM = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        return `${d}-${m}`;
    };

    const formatDateRange = (pickupStr: string, returnStr: string) => {
        if (!pickupStr || !returnStr) return '';
        const getYearMonthDay = (dateStr: string) => {
            if (!dateStr) return null;
            const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim();
            const parts = clean.split('-');
            if (parts.length === 3) {
                return {
                    day: parts[2],
                    month: parts[1],
                    year: parts[0]
                };
            }
            return null;
        };

        const p = getYearMonthDay(pickupStr);
        const r = getYearMonthDay(returnStr);

        if (p && r) {
            return `${p.day}/${p.month} - ${r.day}/${r.month}/${r.year}`;
        }

        try {
            const pickup = new Date(pickupStr);
            const ret = new Date(returnStr);
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${pad(pickup.getDate())}/${pad(pickup.getMonth() + 1)} - ${pad(ret.getDate())}/${pad(ret.getMonth() + 1)}/${ret.getFullYear()}`;
        } catch {
            return '';
        }
    };

    const formatCurrency = (val: number) => {
        const parts = val.toFixed(2).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return `${parts.join(',')} €`;
    };

    const getRentalPrintDescription = (r: any) => {
        const exts = getExtensions(r);
        const hasExts = exts.length > 0;
        
        // Nelson / Custom formatting if note contains payment detail keywords
        if (r.observacoes && (r.observacoes.includes('(Ricardo)') || r.observacoes.includes('(Gabriel)'))) {
            return r.observacoes.split('\n').map((line: string) => line.trim()).filter(Boolean).join(' | ');
        }

        const andaimeItem = (r.items || []).find((it: any) => it.name?.toLowerCase().includes('andaime'));
        let desc = '';
        if (andaimeItem) {
            const qty = andaimeItem.quantity || 0;
            desc = `${qty} ${qty === 1 ? 'Conjunto' : 'Conjuntos'}`;
        } else {
            desc = (r.items || []).map((it: any) => `${it.quantity} ${it.name}`).join(', ');
        }

        if (hasExts) {
            const extsDesc = exts.map((ext: any) => {
                const extVal = getExtValue(ext);
                const sD = ext.old_return_date ? formatDateDM(ext.old_return_date) : '';
                const eD = ext.new_return_date ? formatDateDM(ext.new_return_date) : '';
                return `Prolongamento ${sD} - ${eD}: ${extVal}€`;
            }).join(' | ');
            if (desc) desc += ' | ' + extsDesc;
            else desc = extsDesc;
        } else if (!desc && r.observacoes) {
            desc = r.observacoes.split('\n')[0].trim();
        }

        return desc;
    };

    const renderReceivedBy = (receivedByMain: string | null | undefined, extensions: any[]) => {
        const recipients = new Set<string>();
        if (receivedByMain && receivedByMain !== 'Não definido' && receivedByMain !== 'ND') {
            recipients.add(receivedByMain);
        }
        extensions.forEach(ext => {
            if (ext.received_by) {
                recipients.add(ext.received_by);
            }
        });
        
        const list = Array.from(recipients);
        if (list.length === 0) return 'ND';

        list.sort((a, b) => {
            if (a === 'Ricardo') return -1;
            if (b === 'Ricardo') return 1;
            return a.localeCompare(b);
        });

        return (
            <div className="flex items-center gap-1">
                {list.map((name, idx) => (
                    <Fragment key={name}>
                        {idx > 0 && <span className="text-slate-400 font-normal"> + </span>}
                        <span className="font-semibold text-black">{name}</span>
                        {name === 'Gabriel' && (
                            <span className="inline-flex items-center justify-center bg-emerald-100 text-emerald-800 rounded-full p-0.5 ml-0.5">
                                <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </span>
                        )}
                    </Fragment>
                ))}
            </div>
        );
    };

    const totals = useMemo(() => {
        // Só entra no relatório o que foi EFETIVAMENTE recebido: aluguer base conta se
        // payment_status === 'paid'; cada prolongamento conta pelo seu próprio status;
        // transporte conta Ida e Volta separadamente, cada um pelo seu próprio status.
        let materialsTotal = 0;
        let extMaterials = 0;
        let transportTotal = 0;
        let receivedGabriel = 0;
        let receivedRicardo = 0;

        const addToReceiver = (receivedBy: string, amount: number) => {
            if (amount <= 0) return;
            const name = (receivedBy || 'Ricardo').toLowerCase();
            if (name.includes('ricardo') && name.includes('gabriel')) {
                receivedRicardo += amount / 2;
                receivedGabriel += amount / 2;
            } else if (name.includes('gabriel')) {
                receivedGabriel += amount;
            } else {
                receivedRicardo += amount;
            }
        };

        displayRentals.forEach(r => {
            const exts = getExtensions(r);
            const extSum = exts.reduce((s: number, e: any) => s + getExtValue(e), 0);
            const initialMat = Math.max(0, (r.materials_value || 0) - extSum);
            const mainReceivedBy = r.received_by || 'Ricardo';

            const baseReceived = r.payment_status === 'paid' ? initialMat : 0;
            materialsTotal += baseReceived;
            addToReceiver(mainReceivedBy, baseReceived);

            const idaReceived = r.transport_ida_paid ? Number(r.transport_ida_value || 0) : 0;
            const voltaReceived = r.transport_volta_paid ? Number(r.transport_volta_value || 0) : 0;
            transportTotal += idaReceived + voltaReceived;
            addToReceiver(mainReceivedBy, idaReceived + voltaReceived);

            exts.filter((ext: any) => ext.type === 'prolongamento').forEach((ext: any) => {
                if (ext.payment_status === 'pending') return;
                const extVal = getExtValue(ext);
                materialsTotal += extVal;
                extMaterials += extVal;
                addToReceiver(ext.received_by || mainReceivedBy, extVal);
            });
        });

        return {
            materialsTotal,
            transportTotal,
            receivedGabriel,
            receivedRicardo,
            extMaterials
        };
    }, [displayRentals]);

    // Ação: Finalizar Aluguel globalmente
    const finalizeRental = async (id: string) => {
        try {
            // 1. Buscar o estado atual do aluguer no banco
            const { data: currentRental, error: fetchErr } = await supabase
                .from('rentals')
                .select('status')
                .eq('id', id)
                .single();

            if (fetchErr) throw new Error(fetchErr.message);

            if (currentRental && currentRental.status === 'completed') {
                // Já estava finalizado — o stock já foi devolvido automaticamente
                // porque o cálculo de stock usa: stock_total - soma(itens de alugueres ATIVOS)
                // Como este aluguer não é mais 'active', seus itens já não contam no stock.
                alert(
                    'ℹ️ Este aluguer já está como "Concluído".\n\n' +
                    'O stock já foi devolvido automaticamente porque o sistema calcula:\n' +
                    'Stock Disponível = Total − Itens em Alugueres Ativos.\n\n' +
                    'Como este contrato não é mais "Ativo", os seus itens já foram devolvidos ao stock.'
                );
                return;
            }

            // 2. Confirmar finalização
            const rental = rentals.find(r => r.id === id);
            const clientName = rental?.customers?.full_name || 'Cliente';
            const itemsList = (rental?.items || []).map((it: any) => `  • ${it.quantity}x ${it.name}`).join('\n');

            const confirmMsg = `Finalizar o aluguer de ${clientName}?\n\n` +
                `Os seguintes itens serão devolvidos ao stock:\n${itemsList || '  (sem itens)'}\n\n` +
                `✅ OK = Finalizar e devolver ao stock\n❌ Cancelar = Manter ativo`;

            if (!window.confirm(confirmMsg)) return;

            // 3. Finalizar: muda status para 'completed'
            // O updateRentalPartial detecta active→completed e devolve o stock automaticamente
            await updateRentalPartial(id, { status: 'completed' });

            // 4. Recarregar produtos e alugueres para atualizar a UI
            await refreshProducts();
            await refreshRentals();

            alert(`✅ Aluguer de ${clientName} finalizado!\nProdutos devolvidos ao stock com sucesso.`);

        } catch (err: any) {
            alert("Erro ao finalizar aluguer: " + err.message);
        }
    };

    const [signatureRental, setSignatureRental] = useState<any>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    const handleConfirmPickup = (rental: any) => {
        setSignatureRental(rental);
        setIsSignatureModalOpen(true);
    };

    // Ação: Abrir modal de Sincronização de Stock
    const openStockSync = () => {
        // Encontrar todos os alugueres ATIVOS cuja data de retorno já passou
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const expiredActive = activeRentals.filter(r => {
            const returnDate = new Date(getEffectiveReturnDate(r));
            return returnDate < today;
        });

        // Também incluir os ativos em dia para o usuário poder finalizá-los se quiser
        const currentActive = activeRentals.filter(r => {
            const returnDate = new Date(getEffectiveReturnDate(r));
            return returnDate >= today;
        });

        // Juntar: primeiro os expirados, depois os em dia
        const allActive = [...expiredActive, ...currentActive];

        setStockSyncRentals(allActive);
        // Pré-selecionar os expirados (os que claramente deveriam ser finalizados)
        setStockSyncSelected(new Set(expiredActive.map(r => r.id)));
        setIsStockSyncOpen(true);
    };

    // Ação: Executar Sincronização de Stock (finalizar em lote)
    const executeStockSync = async () => {
        if (stockSyncSelected.size === 0) {
            alert('Nenhum aluguer selecionado para finalizar.');
            return;
        }

        const count = stockSyncSelected.size;
        if (!window.confirm(`Vai finalizar ${count} aluguer(es) e devolver os produtos ao stock.\n\nConfirmar?`)) return;

        setIsSyncingStock(true);
        let successCount = 0;
        let errorCount = 0;

        for (const rentalId of stockSyncSelected) {
            try {
                await updateRentalPartial(rentalId, { status: 'completed' });
                successCount++;
            } catch (err) {
                errorCount++;
                console.error(`Erro ao finalizar aluguer ${rentalId}:`, err);
            }
        }

        await refreshProducts();
        await refreshRentals();
        setIsSyncingStock(false);
        setIsStockSyncOpen(false);

        alert(`✅ Sincronização concluída!\n\n${successCount} aluguer(es) finalizado(s) com sucesso.${errorCount > 0 ? `\n⚠️ ${errorCount} erro(s).` : ''}\n\nO stock foi atualizado.`);
    };
    // Estatísticas Dinâmicas para os Cards
    const currentMonthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const monthlyRevenue = rentals.filter(r => r.pickup_date.startsWith(currentMonthPrefix) && r.payment_status === 'paid').reduce((acc, curr) => acc + (curr.materials_value || 0), 0);
    const pendingRevenue = rentals.filter(r => r.pickup_date.startsWith(currentMonthPrefix) && r.payment_status === 'pending').reduce((acc, curr) => acc + (curr.materials_value || 0), 0);

    const stats = {
        monthlyRevenue,
        pendingRevenue,
        activeCustomers: displayRentals.length,
        stockStatus: {
            total: products.filter(p => p.name.toLowerCase().includes('andaime')).reduce((acc, p) => acc + p.stock_total, 0),
            rented: activeRentals.reduce((acc, curr) => {
                // Apenas conta alugueres ativos (concluídos/cancelados já devolveram ao stock)
                if (curr.status !== 'active') return acc;
                // Apenas conta como stock "alugado" se a retirada já foi confirmada (reserva ainda não confirmada continua no stock)
                if (curr.pickup_confirmed === false) return acc;
                // Apenas conta como stock "alugado" (fora do armazém) se a data de levantamento já chegou ou já passou
                const pickupDate = new Date(curr.pickup_date);
                pickupDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(23, 59, 59, 999);

                if (pickupDate <= today) {
                    const andaimesRented = curr.items?.filter((it: any) => it.name.toLowerCase().includes('andaime')).reduce((sum: number, it: any) => sum + it.quantity, 0) || 0;
                    return acc + andaimesRented;
                }
                return acc;
            }, 0)
        }
    };

    const monthsFull = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dynamicFaturamentoTitle = `Faturamento ${monthsFull[selectedMonth]}/${selectedYear}`;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const clearHistoryFilters = () => {
        setHistoryStartDate('');
        setHistoryEndDate('');
    };

    return (
        <div className="space-y-4">
            <style>{`
                @media print {
                    tbody tr:nth-child(even) {
                        background-color: #f9f9f9 !important;
                    }
                    th, td {
                        padding: 8px !important;
                        color: #000 !important;
                        border-color: #e2e8f0 !important;
                    }
                    table {
                        border-color: #e2e8f0 !important;
                    }
                }
            `}</style>

            {/* Relatório Contábil Exclusivo para Impressão */}
            <div className="hidden print:block text-black bg-white w-full p-4">
                {/* Cabeçalho do Relatório */}
                <div className="mb-8 border-b-2 border-slate-300 pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-1">Relatório Enredo Janota Unp Lda - Parceria</h1>
                            <p className="text-sm text-slate-600">
                                Período: {filterStartDate || 'Início'} até {filterEndDate || 'Fim'}
                            </p>
                        </div>
                        <div className="text-right text-xs text-slate-500 italic">
                            Gerado em: {new Date().toLocaleString('pt-PT')}
                        </div>
                    </div>
                </div>

                {/* Tabela de Transações */}
                <table className="w-full text-left border-collapse border-b border-slate-300 mb-8">
                    <thead>
                        <tr className="border-b-2 border-slate-900 bg-slate-100 text-[10px] uppercase font-bold text-black">
                            <th className="px-3 py-2">Data</th>
                            <th className="px-3 py-2">Cliente</th>
                            <th className="px-3 py-2">Recebido por</th>
                            <th className="px-3 py-2 text-right">Base (€)</th>
                            <th className="px-3 py-2 text-right">Transp. (€)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                        {displayRentals.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-slate-500 italic">Sem resultados.</td>
                            </tr>
                        ) : (
                            displayRentals.map(r => {
                                const baseVal = getOriginalMaterialsValue(r);
                                const prolongEntries = getExtensions(r).filter((ext: any) => ext.type === 'prolongamento');
                                const prolongSum = prolongEntries.reduce((s: number, e: any) => s + getExtValue(e), 0);
                                const totalMateriais = baseVal + prolongSum;
                                const transport = Number(r.transport_value || 0);

                                return (
                                    <Fragment key={`print-${r.id}`}>
                                        {/* Linha do aluguel principal */}
                                        <tr className={`hover:bg-slate-50 ${r.payment_status === 'pending' ? 'opacity-40' : ''} border-b-0`}>
                                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                                                {formatDateRange(r.pickup_date, getOriginalReturnDate(r))}
                                            </td>
                                            <td className="px-3 py-2 text-black">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{r.customers?.full_name}</span>
                                                    <span className="text-[9px] text-slate-500 mt-0.5">{getRentalPrintDescription(r)}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-slate-700">
                                                {renderReceivedBy(r.received_by, getExtensions(r))}
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold text-black whitespace-nowrap">
                                                {formatCurrency(baseVal)}
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">—</td>
                                        </tr>

                                        {/* Uma linha por prolongamento */}
                                        {prolongEntries.map((ext: any, idx: number) => (
                                            <tr key={`print-${r.id}-ext-${idx}`} className={`hover:bg-slate-50 ${r.payment_status === 'pending' ? 'opacity-40' : ''} border-b-0`}>
                                                <td className="px-3 py-1.5 pl-6 text-slate-500 whitespace-nowrap text-[10px]">
                                                    {formatDateRange(ext.old_return_date, ext.new_return_date)}
                                                </td>
                                                <td className="px-3 py-1.5 text-slate-600 italic text-[10px]">
                                                    ↳ Prolongamento {ext.payment_status === 'pending' ? '(Por Pagar)' : '(Pago)'}
                                                </td>
                                                <td className="px-3 py-1.5 text-slate-500 text-[10px]">
                                                    {ext.received_by || r.received_by || '-'}
                                                </td>
                                                <td className="px-3 py-1.5 text-right text-slate-700 whitespace-nowrap text-[10px]">
                                                    {formatCurrency(getExtValue(ext))}
                                                </td>
                                                <td className="px-3 py-1.5 text-right text-slate-500 whitespace-nowrap text-[10px]">—</td>
                                            </tr>
                                        ))}

                                        {/* Linha de total do cliente (aluguel + prolongamentos + transporte) */}
                                        <tr className="border-b border-slate-300 bg-slate-50/60">
                                            <td colSpan={3} className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-slate-500">
                                                Total {r.customers?.full_name}{prolongEntries.length > 0 ? ` (${prolongEntries.length} prolong.)` : ''}:
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold text-black whitespace-nowrap">
                                                {formatCurrency(totalMateriais)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold text-slate-700 whitespace-nowrap">
                                                {transport > 0 ? (
                                                    <div className="flex flex-col leading-tight">
                                                        <span>{formatCurrency(transport)}</span>
                                                        {Number(r.transport_ida_value || 0) > 0 && (
                                                            <span className="text-[9px] font-normal text-slate-500">Ida {formatCurrency(Number(r.transport_ida_value || 0))} {r.transport_ida_paid ? '✓' : '(por pagar)'}</span>
                                                        )}
                                                        {Number(r.transport_volta_value || 0) > 0 && (
                                                            <span className="text-[9px] font-normal text-slate-500">Volta {formatCurrency(Number(r.transport_volta_value || 0))} {r.transport_volta_paid ? '✓' : '(por pagar)'}</span>
                                                        )}
                                                    </div>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    </Fragment>
                                );
                            })
                        )}
                        {/* Linha de Totais Gerais */}
                        <tr className="font-bold border-t-2 border-slate-900 bg-slate-100 text-sm">
                            <td colSpan={3} className="px-3 py-4 text-right uppercase tracking-wider text-xs">Totais do Período (Recebido):</td>
                            <td className="px-3 py-4 text-right">{formatCurrency(totals.materialsTotal)}</td>
                            <td className="px-3 py-4 text-right">{formatCurrency(totals.transportTotal)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Bloco de Resumo de Partilha */}
                {(() => {
                    const totalGabriel = (totals.materialsTotal * 0.7) + (totals.transportTotal * 0.7);
                    const totalRicardo = (totals.materialsTotal * 0.3) + (totals.transportTotal * 0.3);
                    const balanceGabriel = totalGabriel - totals.receivedGabriel;
                    const isRicardoToGabriel = balanceGabriel >= 0;
                    const transferAmount = Math.abs(balanceGabriel);

                    return (
                        <div className="p-5 border border-slate-300 bg-slate-50 rounded-xl break-inside-avoid">
                            <h3 className="text-base font-black uppercase tracking-widest mb-4 border-b border-slate-200 pb-2 text-slate-800">Resumo de Partilha</h3>
                            
                            <div className="grid grid-cols-2 gap-8 mb-6">
                                {/* Parte Gabriel */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-emerald-800 uppercase tracking-widest text-xs border-b border-emerald-200 pb-1">Parte Gabriel</h4>
                                    <div className="flex justify-between text-xs text-slate-700">
                                        <span>Base Andaimes (70%)</span>
                                        <span className="font-medium">{formatCurrency(totals.materialsTotal * 0.7)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-700">
                                        <span>Transporte (70%)</span>
                                        <span className="font-medium">{formatCurrency(totals.transportTotal * 0.7)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 mt-2 border-t border-slate-200 font-bold text-emerald-900">
                                        <span>Total a Receber</span>
                                        <span>{formatCurrency(totalGabriel)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs pt-1 text-slate-500">
                                        <span>Já recebido em mão</span>
                                        <span className="font-bold text-red-600">- {formatCurrency(totals.receivedGabriel)}</span>
                                    </div>
                                    {isRicardoToGabriel ? (
                                        <div className="flex justify-between text-xs pt-2 mt-2 border-t border-slate-300 font-bold text-black">
                                            <span>Saldo Gabriel</span>
                                            <span>{formatCurrency(transferAmount)}</span>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between text-xs pt-2 mt-2 border-t border-slate-300 font-bold text-red-600">
                                            <span>Deve a Ricardo</span>
                                            <span>- {formatCurrency(transferAmount)}</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Parte Ricardo */}
                                <div className="space-y-2">
                                    <h4 className="font-bold text-blue-800 uppercase tracking-widest text-xs border-b border-blue-200 pb-1">Parte Ricardo</h4>
                                    <div className="flex justify-between text-xs text-slate-700">
                                        <span>Base Andaimes (30%)</span>
                                        <span className="font-medium">{formatCurrency(totals.materialsTotal * 0.3)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-700">
                                        <span>Transporte (30%)</span>
                                        <span className="font-medium">{formatCurrency(totals.transportTotal * 0.3)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm pt-2 mt-2 border-t border-slate-200 font-bold text-blue-900">
                                        <span>Total a Receber</span>
                                        <span>{formatCurrency(totalRicardo)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs pt-1 text-slate-500">
                                        <span>Já recebido em mão</span>
                                        <span className="font-bold text-red-600">- {formatCurrency(totals.receivedRicardo)}</span>
                                    </div>
                                    {isRicardoToGabriel ? (
                                        <div className="flex justify-between text-xs pt-2 mt-2 border-t border-slate-300 font-bold text-red-600">
                                            <span>Deve a Gabriel</span>
                                            <span>- {formatCurrency(transferAmount)}</span>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between text-xs pt-2 mt-2 border-t border-slate-300 font-bold text-black">
                                            <span>Saldo Ricardo</span>
                                            <span>{formatCurrency(transferAmount)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Acerto Final */}
                            <div className={`p-4 rounded-lg border text-center font-bold ${isRicardoToGabriel ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                                <h4 className="text-[10px] uppercase tracking-wider opacity-85 mb-1">Acerto de Contas</h4>
                                <div className="text-lg font-black">
                                    {isRicardoToGabriel 
                                        ? `Valor a transferir de Ricardo para Gabriel: ${formatCurrency(transferAmount)}`
                                        : `Valor a transferir de Gabriel para Ricardo: ${formatCurrency(transferAmount)}`
                                    }
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-50 flex items-center gap-2">
                        Painel de Controlo
                        {isSpecificDay && (
                            <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter animate-pulse">
                                Vista Diária: {selectedDay}/{selectedMonth + 1}
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-400 text-xs mt-0.5">
                        {isSpecificDay ? `Mostrando atividade para o dia selecionado` : `Bem-vindo(a) ao Enredo Janota Unp Lda`}
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-amber-500 text-xs font-semibold whitespace-nowrap">
                    <Clock className="w-4 h-4 text-amber-500/70" />
                    {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    <span className="text-slate-600 mx-1.5">|</span>
                    {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
            </div>

            {/* Cards de Métricas e Ações Rápidas (Compactos na mesma linha) */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
                {/* Faturamento */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 flex flex-col justify-between">
                    <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                        <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{dynamicFaturamentoTitle}</CardTitle>
                        <Euro className="h-3.5 w-3.5 text-emerald-400" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 flex-1 flex flex-col justify-between">
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-slate-500 py-1">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-xs">Carregando...</span>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <div className="text-2xl font-extrabold text-emerald-400">{stats.monthlyRevenue.toFixed(2)} €</div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Dinheiro em caixa (Pago)</p>
                                </div>
                                {stats.pendingRevenue > 0 && (
                                    <div className="mt-2 pt-1.5 border-t border-slate-800/60">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-slate-500">Pendente:</span>
                                            <span className="font-bold text-amber-500">{stats.pendingRevenue.toFixed(2)} €</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Clientes Ativos */}
                <Card className="border-slate-800 bg-slate-900 flex flex-col justify-between">
                    <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                        <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clientes Ativos</CardTitle>
                        <Users className="h-3.5 w-3.5 text-amber-500" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 flex-1 flex flex-col justify-between">
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-slate-500 py-1">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-xs">Carregando...</span>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <div className="text-2xl font-extrabold text-slate-50 flex items-baseline gap-1.5">
                                        {stats.activeCustomers}
                                        <span className="text-[10px] font-normal text-slate-400">
                                            ({displayRentals.filter(r => !isLate(getEffectiveReturnDate(r))).length} em dia)
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Com contratos em curso</p>
                                </div>
                                <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-red-400 font-medium">
                                    <span>Atrasados:</span>
                                    <span>{displayRentals.filter(r => isLate(getEffectiveReturnDate(r))).length}</span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Estoque */}
                <Card className={`border-slate-800 bg-slate-900 flex flex-col justify-between ${(!isLoading && stats.stockStatus.total > 0 && ((stats.stockStatus.total - stats.stockStatus.rented) / stats.stockStatus.total) < 0.1)
                    ? 'bg-gradient-to-br from-red-950/40 to-orange-900/30 border-red-500/30'
                    : ''
                    }`}>
                    <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                        <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock de Andaimes</CardTitle>
                        {(!isLoading && stats.stockStatus.total > 0 && ((stats.stockStatus.total - stats.stockStatus.rented) / stats.stockStatus.total) < 0.1) ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                        ) : (
                            <Package className="h-3.5 w-3.5 text-blue-400" />
                        )}
                    </CardHeader>
                    <CardContent className="p-3 pt-0 flex-1 flex flex-col justify-between">
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-slate-500 py-1">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-xs">Carregando...</span>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <div className={`text-2xl font-extrabold ${(stats.stockStatus.total > 0 && ((stats.stockStatus.total - stats.stockStatus.rented) / stats.stockStatus.total) < 0.1) ? 'text-red-400' : 'text-slate-50'}`}>
                                        {stats.stockStatus.total - stats.stockStatus.rented}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Disponíveis no stock</p>
                                </div>
                                <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                                    <span>Alugados:</span>
                                    <span className="font-semibold text-slate-200">{stats.stockStatus.rented} / {stats.stockStatus.total}</span>
                                </div>
                                <button
                                    onClick={openStockSync}
                                    className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Sincronizar Stock
                                </button>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Ações Rápidas (Compacto na mesma linha) */}
                <Card className="border-slate-800 bg-slate-900/60 p-2 flex items-center justify-center">
                    <Button className="w-full h-full min-h-[92px] text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 flex flex-col items-center justify-center gap-1.5 transition-transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-amber-500/10 rounded-xl" variant="default" onClick={() => {
                        setBookingRentalToEdit(null);
                        setIsBookingModalOpen(true);
                    }}>
                        <Plus className="h-5 w-5" />
                        <span>Novo Agendamento</span>
                    </Button>
                </Card>
            </div>

            <div className="space-y-4">
                    {/* Controles de Tabela */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                        <div className="flex items-center justify-between w-full md:w-auto gap-3">
                            <h2 className="text-xl font-semibold tracking-tight text-slate-50">
                                {isSpecificDay 
                                    ? 'Movimentações do Dia' 
                                    : (filterStartDate || filterEndDate) 
                                        ? 'Alugueres do Período' 
                                        : 'Alugueres Ativos'}
                            </h2>
                            <div className="flex items-center gap-2">
                                {isSpecificDay && (
                                    <span className="text-[10px] text-slate-500 font-bold uppercase border border-slate-800 px-2 py-0.5 rounded">
                                        {displayRentals.length} resultados
                                    </span>
                                )}
                                {/* Botão Imprimir em Mobile (< md) */}
                                <Button
                                    onClick={() => window.print()}
                                    className="md:hidden h-9 px-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 rounded-lg shrink-0 transition-transform active:scale-95"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Imprimir</span>
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto flex-1 justify-end">
                            <div className="relative w-full md:max-w-xs shrink-1">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="Buscar por cliente..."
                                    className="pl-9 h-10 w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Filtro por Datas */}
                            <div className="flex rounded-md shadow-sm border border-slate-700 bg-slate-900 shrink-0 h-10 items-center px-3 gap-2 w-full md:w-auto justify-between md:justify-start">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] uppercase text-slate-500 font-bold">De:</span>
                                    <input 
                                        type="date" 
                                        className="bg-transparent border-none text-xs text-slate-300 outline-none w-[105px] h-7 p-0 focus:ring-0 cursor-pointer [color-scheme:dark]"
                                        value={filterStartDate}
                                        onChange={(e) => setFilterStartDate(e.target.value)}
                                    />
                                </div>
                                <span className="text-slate-700">|</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] uppercase text-slate-500 font-bold">Até:</span>
                                    <input 
                                        type="date" 
                                        className="bg-transparent border-none text-xs text-slate-300 outline-none w-[105px] h-7 p-0 focus:ring-0 cursor-pointer [color-scheme:dark]"
                                        value={filterEndDate}
                                        onChange={(e) => setFilterEndDate(e.target.value)}
                                    />
                                </div>
                                {(filterStartDate || filterEndDate) && (
                                    <button 
                                        onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                                        className="p-1 hover:bg-slate-800 rounded transition-colors text-red-400 hover:text-red-300 ml-1"
                                        title="Limpar data"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Filtro de Status */}
                            <div className="flex rounded-md shadow-sm border border-slate-700 p-0.5 bg-slate-900 shrink-0 h-10 items-center w-full md:w-auto overflow-x-auto no-scrollbar flex-nowrap justify-start">
                                <button
                                    onClick={() => setFilterStatus('all')}
                                    className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${filterStatus === 'all' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setFilterStatus('ontime')}
                                    className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${filterStatus === 'ontime' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Em Dia
                                </button>
                                <button
                                    onClick={() => setFilterStatus('late')}
                                    className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${filterStatus === 'late' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Atrasados
                                </button>
                                <button
                                    onClick={() => setFilterStatus('ricardo')}
                                    className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${filterStatus === 'ricardo' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Ricardo
                                </button>
                                <button
                                    onClick={() => setFilterStatus('gabriel')}
                                    className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${filterStatus === 'gabriel' ? 'bg-amber-500 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Gabriel
                                </button>
                            </div>

                            {/* Botão de Impressão Desktop */}
                            <Button
                                onClick={() => window.print()}
                                className="hidden md:flex h-10 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 rounded-lg shrink-0 transition-transform hover:scale-[1.02]"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Imprimir</span>
                            </Button>
                        </div>
                    </div>
                    <div className="hidden md:block rounded-lg border border-slate-800 bg-slate-900/50 overflow-x-auto print:hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-950 border-slate-800 print:border-black print:bg-white hover:bg-transparent">
                                    <TableHead className="w-[30%] min-w-[200px] print:text-black">Cliente</TableHead>
                                    <TableHead className="w-[13%] min-w-[120px] print:text-black">Prazo</TableHead>
                                    <TableHead className="w-[13%] min-w-[130px] print:text-black">Status</TableHead>
                                    <TableHead className="w-[12%] min-w-[110px] print:text-black">Valor (€)</TableHead>
                                    <TableHead className="w-[10%] min-w-[100px] print:text-black">Transporte (€)</TableHead>
                                    <TableHead className="w-[12%] min-w-[100px] print:text-black">Pagamento</TableHead>
                                    <TableHead className="w-[10%] text-right print:hidden">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayRentals.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-6 text-slate-400">
                                            {(filterStartDate || filterEndDate)
                                                ? 'Nenhum aluguer encontrado para o período selecionado.'
                                                : activeRentals.length > 0 
                                                    ? 'Nenhum aluguel encontrado para o filtro.' 
                                                    : 'Nenhum aluguer em curso.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    displayRentals.map((rental) => {
                                        const late = isLate(getEffectiveReturnDate(rental));
                                        const isPending = rental.payment_status === 'pending';
                                        const isCompleted = rental.status === 'completed';
                                        const isCanceled = rental.status === 'canceled';
                                        const isExpanded = expandedRentalIds.includes(rental.id);
                                        const exts = extensionsData[rental.id] || [];
                                        const isLoadingExts = loadingExtensions[rental.id];

                                        const valor_base = getOriginalMaterialsValue(rental);
                                        const realExtsSum = getExtensions(rental)
                                            .filter((ext: any) => ext.type === 'prolongamento')
                                            .reduce((s: number, e: any) => s + getExtValue(e), 0);
                                        const soma_prolongamentos = loadedExtensionsSum[rental.id] !== undefined
                                            ? loadedExtensionsSum[rental.id]
                                            : realExtsSum;
                                        const total_exibido = valor_base + soma_prolongamentos;
                                        const isDropdownOpen = activeDropdownId === rental.id;

                                        // Estilo da linha: concluídos/cancelados ficam mais escuros
                                        const rowDimClass = isDropdownOpen
                                            ? ''
                                            : isPending && !isCompleted
                                                ? 'opacity-50 grayscale-[0.2]'
                                                : (isCompleted || isCanceled)
                                                    ? 'opacity-60'
                                                    : '';

                                        return (
                                            <Fragment key={rental.id}>
                                                <TableRow className={`${rowDimClass} border-slate-800/50 print:border-black print:opacity-100 print:grayscale-0 ${isDropdownOpen ? 'relative z-50' : ''}`}>
                                                    <TableCell className="font-medium print:text-black">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleRentalExpansion(rental.id);
                                                                }}
                                                                className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200 print:hidden"
                                                                title={isExpanded ? "Ocultar prolongamentos" : "Mostrar prolongamentos"}
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronDown className="h-4 w-4" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4" />
                                                                )}
                                                            </button>
                                                            <div>
                                                                <div className="print:text-black print:font-semibold">{rental.customers?.full_name}</div>
                                                                {isPending && (
                                                                    <div className="text-[9px] text-amber-500 font-black uppercase tracking-tighter mt-1 flex items-center gap-1 print:text-black print:font-bold">
                                                                        <Clock className="w-2 h-2 print:hidden" /> Não Pago (Pendente)
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap print:text-black">
                                                        <div>
                                                            <span className="font-semibold text-slate-200 print:text-black print:font-medium">
                                                                {new Date(rental.pickup_date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                                                            </span>
                                                            <span className="text-slate-500 mx-1 print:text-black">→</span>
                                                            <span className="font-semibold text-slate-200 print:text-black print:font-medium">
                                                                {new Date(getOriginalReturnDate(rental)).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        {(() => {
                                                            const numProlong = getExtensions(rental).filter((ext: any) => ext.type === 'prolongamento').length;
                                                            if (numProlong === 0) return null;
                                                            return (
                                                                <div className="text-[10px] text-amber-400 font-bold mt-0.5 flex items-center gap-1 print:hidden">
                                                                    <CalendarPlus className="w-3 h-3" />
                                                                    +{numProlong} prolong. até {new Date(getEffectiveReturnDate(rental)).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                                                                </div>
                                                            );
                                                        })()}
                                                    </TableCell>
                                                    <TableCell className="print:text-black">
                                                        {rental.status === 'completed' ? (
                                                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap print:bg-transparent print:text-black print:border-black">
                                                                Concluído
                                                            </span>
                                                        ) : rental.status === 'canceled' ? (
                                                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap print:bg-transparent print:text-black print:border-black">
                                                                Cancelado
                                                            </span>
                                                        ) : rental.pickup_confirmed === false ? (
                                                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap print:bg-transparent print:text-black print:border-black">
                                                                Reserva
                                                            </span>
                                                        ) : late ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20 whitespace-nowrap print:bg-transparent print:text-red-600 print:border-red-600">
                                                                <AlertCircle className="w-3.5 h-3.5 print:hidden" /> Atrasado
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap print:bg-transparent print:text-black print:border-black">
                                                                Em dia
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-emerald-400 print:text-black print:font-bold">
                                                        <div className="flex flex-col">
                                                            <span>{total_exibido.toFixed(2)} €</span>
                                                            {soma_prolongamentos > 0 && (
                                                                <span className="text-[10px] text-slate-400 font-normal mt-0.5 print:text-black">
                                                                    (base: {valor_base.toFixed(0)}€ + prol: {soma_prolongamentos.toFixed(0)}€)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-slate-300 print:text-black">
                                                        {Number(rental.transport_value || 0) === 0 ? (
                                                            <span className="text-slate-600">—</span>
                                                        ) : (
                                                            <div className="flex flex-col gap-0.5 text-[11px] leading-tight">
                                                                {Number(rental.transport_ida_value || 0) > 0 && (
                                                                    <span className={rental.transport_ida_paid ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                                                                        Ida {formatCurrency(Number(rental.transport_ida_value || 0))} {rental.transport_ida_paid ? '✓' : '(pendente)'}
                                                                    </span>
                                                                )}
                                                                {Number(rental.transport_volta_value || 0) > 0 && (
                                                                    <span className={rental.transport_volta_paid ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                                                                        Volta {formatCurrency(Number(rental.transport_volta_value || 0))} {rental.transport_volta_paid ? '✓' : '(pendente)'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="print:text-black">
                                                        {rental.payment_status === 'paid' ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 print:bg-transparent print:text-black print:border-black">
                                                                Pago
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20 print:bg-transparent print:text-red-600 print:border-red-600">
                                                                Pendente
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className={`text-right relative print:hidden ${isDropdownOpen ? 'z-50' : ''}`}>
                                                        <div className="inline-block text-left dropdown-container">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDropdownId(activeDropdownId === rental.id ? null : rental.id);
                                                                }}
                                                            >
                                                                <MoreHorizontal className="h-5 w-5" />
                                                            </Button>

                                                            {activeDropdownId === rental.id && (
                                                                <div className="absolute right-0 mt-1 w-48 rounded-xl border border-slate-800 bg-slate-950 p-1.5 shadow-2xl z-30 animate-in fade-in slide-in-from-top-1 duration-100 text-left">
                                                                    {rental.payment_status !== 'paid' && (
                                                                        <button
                                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/10 rounded-lg text-left transition-colors mb-1 cursor-pointer"
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                setActiveDropdownId(null);
                                                                                if (window.confirm('Confirmar pagamento deste aluguer?')) {
                                                                                    await updateRentalPartial(rental.id, { payment_status: 'paid' });
                                                                                }
                                                                            }}
                                                                        >
                                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                                            Confirmar Pagamento
                                                                        </button>
                                                                    )}
                                                                    {rental.status === 'active' && rental.pickup_confirmed === false && (
                                                                        <button
                                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-500/10 rounded-lg text-left transition-colors mb-1 cursor-pointer"
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                setActiveDropdownId(null);
                                                                                await handleConfirmPickup(rental);
                                                                            }}
                                                                        >
                                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                                            Confirmar Retirada
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg text-left transition-colors cursor-pointer mb-1"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveDropdownId(null);
                                                                            setViewRental({ ...rental });
                                                                            setIsViewModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                                                                        Ver Detalhes
                                                                    </button>
                                                                    <button
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg text-left transition-colors cursor-pointer mb-1"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveDropdownId(null);
                                                                            setSelectedRentalForProlong(rental);
                                                                            setIsProlongModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <CalendarPlus className="w-3.5 h-3.5 text-amber-500" />
                                                                        Prolongar Serviço
                                                                    </button>
                                                                    <button
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg text-left transition-colors cursor-pointer mb-1"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveDropdownId(null);
                                                                            printRentalContractHTML(rental);
                                                                        }}
                                                                    >
                                                                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                                                                        Recibo + Contrato
                                                                    </button>
                                                                    {rental.signature_url && (
                                                                        <button
                                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg text-left transition-colors cursor-pointer mb-1"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveDropdownId(null);
                                                                                window.open(rental.signature_url as string, '_blank');
                                                                            }}
                                                                        >
                                                                            <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
                                                                            Ver Contrato Assinado
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg text-left transition-colors cursor-pointer mb-1"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveDropdownId(null);
                                                                            setBookingRentalToEdit(rental);
                                                                            setIsBookingModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                                                                        Editar Contrato
                                                                    </button>
                                                                    <button
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-left transition-colors border-t border-slate-900 mt-1 pt-2 cursor-pointer"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveDropdownId(null);
                                                                            finalizeRental(rental.id);
                                                                        }}
                                                                    >
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        Finalizar Aluguer
                                                                    </button>
                                                                    <button
                                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-lg text-left transition-colors border-t border-slate-900 mt-1 pt-2 cursor-pointer"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveDropdownId(null);
                                                                            handleDeleteRental(rental);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                        Eliminar Aluguer
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {isExpanded && (
                                                    <TableRow className="bg-slate-950/40 hover:bg-slate-950/40 border-b border-slate-800">
                                                        <TableCell colSpan={7} className="p-3 border-t border-slate-800/60">
                                                            <div className="pl-8 pr-4 py-2 space-y-2">
                                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                    Histórico de Prolongamentos
                                                                </h4>
                                                                {isLoadingExts ? (
                                                                    <div className="flex items-center gap-2 text-slate-500 py-2">
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                        <span className="text-xs">A carregar prolongamentos...</span>
                                                                    </div>
                                                                ) : exts.length === 0 ? (
                                                                    <p className="text-xs text-slate-500 italic py-2">Sem prolongamentos registados.</p>
                                                                ) : (
                                                                    <div className="space-y-1.5">
                                                                        {exts.map((ext: any, idx: number) => {
                                                                            const realIdx = ext.originalIndex ?? idx;
                                                                            const isPaid = ext.payment_status === 'paid';
                                                                            return (
                                                                                <div key={ext.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-900/30 px-3 py-2 print:border-black print:bg-white">
                                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                                        <span className="font-semibold text-slate-200 text-xs whitespace-nowrap print:text-black">{ext.period}</span>
                                                                                        <span className="font-black text-emerald-400 text-sm whitespace-nowrap print:text-black">{Number(ext.extra_value).toFixed(2)} €</span>
                                                                                        {isPaid ? (
                                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">✓ Pago</span>
                                                                                        ) : (
                                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 whitespace-nowrap">Por Pagar</span>
                                                                                        )}
                                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${ext.received_by?.toLowerCase() === 'gabriel' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                                                                            {ext.received_by || '-'}
                                                                                        </span>
                                                                                        {ext.payment_reference && (
                                                                                            <span className="text-[10px] text-slate-500 truncate">{ext.payment_reference}</span>
                                                                                        )}
                                                                                        {ext.notes && (
                                                                                            <span className="text-[10px] text-slate-500 truncate" title={ext.notes}>· {ext.notes}</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1.5 shrink-0 print:hidden">
                                                                                        <button
                                                                                            onClick={() => handleOpenEditExt(rental, realIdx)}
                                                                                            className="p-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                                                                                            title="Editar Prolongamento"
                                                                                        >
                                                                                            <Pencil className="w-3 h-3" />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleDeleteExt(rental, realIdx)}
                                                                                            className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                                                                            title="Eliminar Prolongamento"
                                                                                        >
                                                                                            <Trash2 className="w-3 h-3" />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </Fragment>
                                        );
                                    })
                                )}
                            </TableBody>
                            <TableFooter className="print:bg-white">
                                                                <TableRow className="bg-slate-900 border-t border-slate-800 print:bg-white print:border-black">
                                                                    <TableCell className="md:hidden text-right font-medium text-slate-400 print:text-black" colSpan={2}>Total Filtrado (Pago):</TableCell>
                                                                    <TableCell className="hidden md:table-cell text-right font-medium text-slate-400 print:text-black" colSpan={3}>Total Filtrado (Pago):</TableCell>
                                                                    <TableCell className="font-bold text-emerald-400 print:text-black print:font-bold">
                                                                        {displayRentals
                                                                            .reduce((acc, r) => {
                                                                                const baseVal = getOriginalMaterialsValue(r);
                                                                                const baseReceived = r.payment_status === 'paid' ? baseVal : 0;
                                                                                const prolongReceived = getExtensions(r)
                                                                                    .filter((ext: any) => ext.type === 'prolongamento' && ext.payment_status !== 'pending')
                                                                                    .reduce((s: number, e: any) => s + getExtValue(e), 0);
                                                                                return acc + baseReceived + prolongReceived;
                                                                            }, 0)
                                                                            .toFixed(2)} €
                                                                    </TableCell>
                                    <TableCell className="font-bold text-slate-300 print:text-black">
                                        {formatCurrency(
                                            displayRentals.reduce((acc, r) => {
                                                const idaReceived = r.transport_ida_paid ? Number(r.transport_ida_value || 0) : 0;
                                                const voltaReceived = r.transport_volta_paid ? Number(r.transport_volta_value || 0) : 0;
                                                return acc + idaReceived + voltaReceived;
                                            }, 0)
                                        )}
                                    </TableCell>
                                    <TableCell colSpan={2} className="print:hidden"></TableCell>
                                    <TableCell className="hidden print:table-cell" colSpan={1}></TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>

                    {/* Cards Verticais para Dispositivos Móveis (< md) */}
                    <div className="space-y-3 md:hidden">
                        {displayRentals.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 border border-slate-800 rounded-lg bg-slate-900/30">
                                {(filterStartDate || filterEndDate)
                                    ? 'Nenhum aluguer encontrado para o período selecionado.'
                                    : activeRentals.length > 0 
                                        ? 'Nenhum aluguel encontrado para o filtro.' 
                                        : 'Nenhum aluguer em curso.'}
                            </div>
                        ) : (
                            displayRentals.map((rental) => {
                                const late = isLate(getEffectiveReturnDate(rental));
                                const isPending = rental.payment_status === 'pending';
                                const isCompleted = rental.status === 'completed';
                                const isCanceled = rental.status === 'canceled';
                                const isExpanded = expandedRentalIds.includes(rental.id);
                                const exts = extensionsData[rental.id] || [];
                                const isLoadingExts = loadingExtensions[rental.id];

                                const valor_base = getOriginalMaterialsValue(rental);
                                const realExtsSum = getExtensions(rental)
                                    .filter((ext: any) => ext.type === 'prolongamento')
                                    .reduce((s: number, e: any) => s + getExtValue(e), 0);
                                const soma_prolongamentos = loadedExtensionsSum[rental.id] !== undefined
                                    ? loadedExtensionsSum[rental.id]
                                    : realExtsSum;
                                const total_exibido = valor_base + soma_prolongamentos;
                                const isDropdownOpen = activeDropdownId === rental.id;

                                // Estilo do card: concluídos/cancelados ficam mais escuros
                                const cardDimClass = isDropdownOpen
                                    ? 'border-slate-800 relative z-50'
                                    : isPending && !isCompleted
                                        ? 'border-slate-800/50 opacity-70'
                                        : (isCompleted || isCanceled)
                                            ? 'border-slate-800/50 opacity-60'
                                            : 'border-slate-800';

                                return (
                                    <div 
                                        key={`card-${rental.id}`} 
                                        className={`p-4 rounded-xl border bg-slate-900/30 transition-all ${cardDimClass}`}
                                    >
                                        {/* Linha 1: Chevron + Nome do cliente (bold) + badge Status à direita */}
                                        <div className="flex items-center justify-between gap-2 mb-2.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleRentalExpansion(rental.id);
                                                    }}
                                                    className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200"
                                                    title={isExpanded ? "Ocultar prolongamentos" : "Mostrar prolongamentos"}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4 shrink-0" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4 shrink-0" />
                                                    )}
                                                </button>
                                                <span className="font-bold text-slate-200 text-sm truncate">{rental.customers?.full_name}</span>
                                            </div>
                                            <div className="shrink-0">
                                                {rental.status === 'completed' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        Concluído
                                                    </span>
                                                ) : rental.status === 'canceled' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                                        Cancelado
                                                    </span>
                                                ) : rental.pickup_confirmed === false ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                        Reserva
                                                    </span>
                                                ) : late ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                                                        <AlertCircle className="w-2.5 h-2.5" /> Atrasado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                        Em dia
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Linha 2: Prazo (26/05 → 29/05) + badge Pagamento à direita */}
                                        <div className="flex items-center justify-between gap-2 mb-2.5">
                                            <div className="text-xs text-slate-400">
                                                <div>
                                                    <span className="font-semibold text-slate-300">
                                                        {new Date(rental.pickup_date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                    <span className="text-slate-500 mx-1">→</span>
                                                    <span className="font-semibold text-slate-300">
                                                        {new Date(getOriginalReturnDate(rental)).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                                                    </span>
                                                </div>
                                                {(() => {
                                                    const numProlong = getExtensions(rental).filter((ext: any) => ext.type === 'prolongamento').length;
                                                    if (numProlong === 0) return null;
                                                    return (
                                                        <div className="text-[10px] text-amber-400 font-bold mt-0.5 flex items-center gap-1">
                                                            <CalendarPlus className="w-3 h-3" />
                                                            +{numProlong} até {new Date(getEffectiveReturnDate(rental)).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div className="shrink-0">
                                                {rental.payment_status === 'paid' ? (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                        Pago
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                                                        Pendente
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Linha 3: Valor (€) em destaque + botão ... de ações à direita */}
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                                            <div className="flex flex-col">
                                                <div className="flex items-center">
                                                    <span className="text-xs text-slate-500 mr-1.5">Valor Total:</span>
                                                    <span className="text-sm font-extrabold text-emerald-400">
                                                        {total_exibido.toFixed(2)} €
                                                    </span>
                                                </div>
                                                {soma_prolongamentos > 0 && (
                                                    <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                                                        (base: {valor_base.toFixed(0)}€ + prol: {soma_prolongamentos.toFixed(0)}€)
                                                    </span>
                                                )}
                                            </div>

                                            {/* Botão de ações (...) com o mesmo dropdown */}
                                            <div className="relative dropdown-container">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveDropdownId(activeDropdownId === rental.id ? null : rental.id);
                                                    }}
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>

                                                {/* Dropdown de Ações Responsivo (abre para cima em mobile: bottom-full mb-1) */}
                                                {activeDropdownId === rental.id && (
                                                    <div className="absolute right-0 bottom-full mb-1 w-48 rounded-xl border border-slate-850 bg-slate-900/95 backdrop-blur-md p-1.5 shadow-2xl z-30 min-w-[190px]">
                                                        {rental.status === 'active' && rental.pickup_confirmed === false && (
                                                            <button
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-500/10 rounded-lg text-left transition-colors mb-1 cursor-pointer"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDropdownId(null);
                                                                    await handleConfirmPickup(rental);
                                                                }}
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Confirmar Retirada
                                                            </button>
                                                        )}
                                                        <button
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg text-left transition-colors cursor-pointer mb-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdownId(null);
                                                                setSelectedRentalForProlong(rental);
                                                                setIsProlongModalOpen(true);
                                                            }}
                                                        >
                                                            <CalendarPlus className="w-3.5 h-3.5 text-amber-500" />
                                                            Prolongar Serviço
                                                        </button>
                                                        <button
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg text-left transition-colors cursor-pointer mb-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdownId(null);
                                                                setViewRental(rental);
                                                                setIsViewModalOpen(true);
                                                            }}
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                                                            Visualizar Fatura
                                                        </button>
                                                        <button
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg text-left transition-colors cursor-pointer mb-1"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdownId(null);
                                                                const { data: freshRentalData, error: rError } = await supabase
                                                                    .from('rentals')
                                                                    .select('*, customers:customer_id (*)')
                                                                    .eq('id', rental.id)
                                                                    .single();
                                                                if (rError || !freshRentalData) {
                                                                    alert("Erro ao buscar dados atualizados do aluguer");
                                                                    return;
                                                                }
                                                                const { data: freshItemsData } = await supabase
                                                                    .from('rental_items')
                                                                    .select('*, products:product_id (*)')
                                                                    .eq('rental_id', rental.id);
                                                                const fullRental = {
                                                                    ...freshRentalData,
                                                                    items: freshItemsData || []
                                                                };
                                                                printRentalContractHTML(fullRental);
                                                            }}
                                                        >
                                                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                                                            Recibo + Contrato
                                                        </button>
                                                        {rental.signature_url && (
                                                            <button
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg text-left transition-colors cursor-pointer mb-1"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveDropdownId(null);
                                                                    window.open(rental.signature_url as string, '_blank');
                                                                }}
                                                            >
                                                                <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
                                                                Ver Contrato Assinado
                                                            </button>
                                                        )}
                                                        <button
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg text-left transition-colors cursor-pointer mb-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdownId(null);
                                                                setBookingRentalToEdit(rental);
                                                                setIsBookingModalOpen(true);
                                                            }}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                                                            Editar Contrato
                                                        </button>
                                                        <button
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 rounded-lg text-left transition-colors border-t border-slate-900 mt-1 pt-2 cursor-pointer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdownId(null);
                                                                finalizeRental(rental.id);
                                                            }}
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            Finalizar Aluguer
                                                        </button>
                                                        <button
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-lg text-left transition-colors border-t border-slate-900 mt-1 pt-2 cursor-pointer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveDropdownId(null);
                                                                handleDeleteRental(rental);
                                                            }}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Eliminar Aluguer
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Sub-linha de prolongamentos expandidos */}
                                        {isExpanded && (
                                            <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                    Histórico de Prolongamentos
                                                </h4>
                                                {isLoadingExts ? (
                                                    <div className="flex items-center gap-2 text-slate-500 py-1">
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        <span className="text-[10px]">A carregar prolongamentos...</span>
                                                    </div>
                                                ) : exts.length === 0 ? (
                                                    <p className="text-[10px] text-slate-500 italic py-1">Sem prolongamentos registados.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {exts.map((ext, extIdx) => {
                                                            const realIdx = ext.originalIndex ?? extIdx;
                                                            const isPaid = ext.payment_status === 'paid';
                                                            const extReceivedColor = ext.received_by?.toLowerCase() === 'ricardo'
                                                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                                : ext.received_by?.toLowerCase() === 'gabriel'
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                    : 'bg-slate-800 text-slate-400 border border-slate-700';

                                                            return (
                                                                <div
                                                                    key={ext.id || `ext-${extIdx}`}
                                                                    className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50 space-y-1.5 text-[11px]"
                                                                >
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="font-semibold text-slate-400">{ext.period}</span>
                                                                        <span className="font-extrabold text-emerald-400">{Number(ext.extra_value).toFixed(2)} €</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <div className="flex items-center gap-1">
                                                                            {isPaid ? (
                                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✓ Pago</span>
                                                                            ) : (
                                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">Por Pagar</span>
                                                                            )}
                                                                            <span className={`px-1.5 py-0.5 rounded-sm font-semibold text-[9px] ${extReceivedColor}`}>
                                                                                {ext.received_by}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleOpenEditExt(rental, realIdx);
                                                                                }}
                                                                                className="p-1 text-slate-500 hover:text-slate-350 hover:bg-slate-800 rounded transition-colors"
                                                                                title="Editar prolongamento"
                                                                            >
                                                                                <Pencil className="w-3 h-3" />
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDeleteExt(rental, realIdx);
                                                                                }}
                                                                                className="p-1 text-red-500/70 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                                                                                title="Excluir prolongamento"
                                                                            >
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    {ext.payment_reference && (
                                                                        <div className="text-slate-500 leading-snug">Ref: {ext.payment_reference}</div>
                                                                    )}
                                                                    {ext.notes && (
                                                                        <div className="text-slate-500 italic mt-1 leading-snug">
                                                                            Nota: {ext.notes}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
            </div>

            {/* Histórico de Alugueres */}
            <div className="space-y-4 pt-6 print:hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-400">Histórico de Alugueres (Concluídos)</h2>
                    
                    <div className="flex flex-col sm:flex-row items-end gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                        <div className="flex flex-col gap-1 w-full sm:w-40">
                            <label className="text-[10px] font-uppercase tracking-wider text-slate-500 ml-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> DE:
                            </label>
                            <Input 
                                type="date" 
                                className="h-9 text-xs bg-slate-950 border-slate-800"
                                value={historyStartDate}
                                onChange={(e) => setHistoryStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1 w-full sm:w-40">
                            <label className="text-[10px] font-uppercase tracking-wider text-slate-500 ml-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> ATÉ:
                            </label>
                            <Input 
                                type="date" 
                                className="h-9 text-xs bg-slate-950 border-slate-800"
                                value={historyEndDate}
                                onChange={(e) => setHistoryEndDate(e.target.value)}
                            />
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 px-3 text-slate-400 hover:text-amber-500 hover:bg-amber-500/5 transition-all border border-transparent hover:border-amber-500/20"
                            onClick={clearHistoryFilters}
                            disabled={!historyStartDate && !historyEndDate}
                        >
                            <RotateCcw className={`w-3.5 h-3.5 mr-2 ${(!historyStartDate && !historyEndDate) ? '' : 'animate-spin-once'}`} />
                            Limpar
                        </Button>
                    </div>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/30 overflow-x-auto opacity-80">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-slate-800/50">
                                <TableHead className="w-[30%] min-w-[200px] text-slate-500">Cliente</TableHead>
                                <TableHead className="w-[15%] min-w-[120px] text-slate-500">Prazo</TableHead>
                                <TableHead className="hidden md:table-cell w-[20%] min-w-[160px] text-slate-500">Produtos</TableHead>
                                <TableHead className="w-[15%] min-w-[130px] text-slate-500">Status</TableHead>
                                <TableHead className="w-[15%] min-w-[120px] text-slate-500">Valor (€)</TableHead>
                                <TableHead className="w-[20%] text-right whitespace-nowrap min-w-[200px] text-slate-500">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCompletedRentals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500 font-medium italic">
                                        {(!historyStartDate && !historyEndDate)
                                            ? 'Selecione um período de datas para visualizar o histórico de alugueres concluídos.'
                                            : 'Nenhum aluguer concluído encontrado para este período/busca.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCompletedRentals.map((rental, index) => (
                                    <TableRow key={rental?.id || `rental-${index}`} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                        <TableCell className="font-medium">
                                            <div className="text-slate-400">{rental?.customers?.full_name || 'Desconhecido'}</div>
                                            <div className="flex md:hidden flex-wrap gap-1 mt-1.5 opacity-70">
                                                {rental?.items && rental.items.length > 0 ? (
                                                    rental.items.map((it: any, idx: number) => (
                                                        <span key={idx} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap">
                                                            {it.quantity || 1}x {it.name || '-'}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-slate-600 italic">Sem itens</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-slate-400">
                                            {rental?.return_date ? new Date(getOriginalReturnDate(rental)).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }) : '-'}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell max-w-[180px] opacity-70">
                                            <div className="flex flex-wrap gap-1">
                                                {rental?.items && rental.items.length > 0 ? (
                                                    rental.items.map((it: any, idx: number) => (
                                                        <span key={idx} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap">
                                                            {it.quantity || 1}x {it.name || '-'}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-slate-600 italic">Sem itens</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-slate-800/50 text-slate-400 border border-slate-700/50">
                                                Concluído
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-400 font-medium">
                                            {(Number(rental?.displayed_value ?? rental?.materials_value ?? 0)).toFixed(2)} €
                                        </TableCell>
                                        <TableCell className="text-right flex items-center justify-end gap-2 opacity-80">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20"
                                                onClick={() => {
                                                    setViewRental({ ...rental });
                                                    setIsViewModalOpen(true);
                                                }}
                                            >
                                                <Eye className="w-4 h-4 mr-1.5" /> Ver
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20"
                                                onClick={() => {
                                                    setBookingRentalToEdit(rental);
                                                    setIsBookingModalOpen(true);
                                                }}
                                            >
                                                <Edit2 className="w-4 h-4 mr-1.5" /> Editar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Modal Global de Novo / Edição Agendamento */}
            <BookingModal
                isOpen={isBookingModalOpen}
                onClose={() => setIsBookingModalOpen(false)}
                rentalToEdit={bookingRentalToEdit}
            />

            <ViewRentalModal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setViewRental(null);
                }}
                rental={viewRental}
                onEdit={handleEditRental}
                onDelete={handleDeleteRental}
            />

            <PickupSignatureModal
                isOpen={isSignatureModalOpen}
                onClose={() => {
                    setIsSignatureModalOpen(false);
                    setSignatureRental(null);
                }}
                rental={signatureRental}
                confirmPickup={confirmPickup}
                updateRentalPartial={updateRentalPartial}
                refreshProducts={refreshProducts}
                onConfirmed={refreshRentals}
            />

            {/* Modal de Prolongamento de Aluguer */}
            <ProlongModal
                isOpen={isProlongModalOpen}
                onClose={() => {
                    setIsProlongModalOpen(false);
                    setSelectedRentalForProlong(null);
                }}
                rental={selectedRentalForProlong}
                onConfirm={handleConfirmProlong}
            />

            {/* Modal de Edição de Prolongamento */}
            {editingExt && (() => {
                const rental = rentals.find(r => r.id === editingExt.rentalId);
                if (!rental) return null;
                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 animate-in fade-in">
                        <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-500/40 p-6 shadow-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-base font-black text-slate-50 flex items-center gap-2 uppercase tracking-tight">
                                        <Pencil className="h-4 w-4 text-amber-500" />
                                        Editar Prolongamento
                                    </h3>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        {rental.customers?.full_name} • Prolongamento #{editingExt.extIndex + 1}
                                    </p>
                                </div>
                                <button onClick={() => setEditingExt(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Valor Base */}
                                <div>
                                    <label className="block text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest mb-1">Valor Extra Materiais (€)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editValue}
                                        onChange={e => setEditValue(parseFloat(e.target.value) || 0)}
                                        className="bg-slate-950 border-emerald-500/20 text-lg font-black text-emerald-400 h-12"
                                    />
                                    <div className="flex gap-4 mt-1">
                                        <p className="text-[9px] text-emerald-500/60">Proposta (80%): {(editValue * 0.8).toFixed(2)} €</p>
                                        <p className="text-[9px] text-blue-500/60">Comissão (20%): {(editValue * 0.2).toFixed(2)} €</p>
                                    </div>
                                </div>

                                {/* Datas de Início e Término */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-1">Data de Início</label>
                                        <Input
                                            type="date"
                                            value={editStartDate}
                                            onChange={e => setEditStartDate(e.target.value)}
                                            className="bg-slate-950 border-slate-800 font-bold text-amber-400 h-11"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-1">Data de Término</label>
                                        <Input
                                            type="date"
                                            value={editReturnDate}
                                            onChange={e => setEditReturnDate(e.target.value)}
                                            className="bg-slate-950 border-slate-800 font-bold text-amber-400 h-11"
                                        />
                                    </div>
                                </div>

                                {/* Status de Pagamento */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status de Pagamento</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditPaymentStatus('paid')}
                                            className={`h-10 rounded-lg text-xs font-bold uppercase tracking-wide border transition-colors ${editPaymentStatus === 'paid' ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                                        >
                                            ✓ Pago
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditPaymentStatus('pending')}
                                            className={`h-10 rounded-lg text-xs font-bold uppercase tracking-wide border transition-colors ${editPaymentStatus === 'pending' ? 'bg-red-500/15 border-red-500/50 text-red-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Por Pagar
                                        </button>
                                    </div>
                                </div>

                                {/* Referência de Pagamento */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Referência de Pagamento</label>
                                    <Input
                                        type="text"
                                        placeholder="MBWay, transferência... (opcional)"
                                        value={editPaymentReference}
                                        onChange={e => setEditPaymentReference(e.target.value)}
                                        className="bg-slate-950 border-slate-800 text-xs h-10"
                                    />
                                </div>

                                {/* Recebido Por */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recebido Por</label>
                                    <select
                                        value={editReceivedBy}
                                        onChange={e => setEditReceivedBy(e.target.value)}
                                        className="w-full h-10 px-3 bg-slate-950 border border-slate-800 text-sm text-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                                    >
                                        <option value="Ricardo">Ricardo</option>
                                        <option value="Gabriel">Gabriel</option>
                                    </select>
                                </div>

                                {/* Notas */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notas Internas</label>
                                    <textarea
                                        value={editNote}
                                        onChange={e => setEditNote(e.target.value)}
                                        rows={2}
                                        className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none placeholder:text-slate-700"
                                        placeholder="Observações do prolongamento..."
                                    />
                                </div>
                            </div>

                            {/* Acções */}
                            <div className="flex gap-3 pt-5 border-t border-slate-800 mt-5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 h-11 border-slate-700 text-slate-400 hover:bg-slate-800 text-xs"
                                    onClick={() => setEditingExt(null)}
                                    disabled={isSavingExt}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    className="flex-[2] h-11 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
                                    onClick={handleSaveExt}
                                    disabled={isSavingExt}
                                >
                                    <Save className="w-4 h-4" />
                                    {isSavingExt ? 'A Guardar...' : 'Guardar Alterações'}
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {/* Stock Sync Modal */}
            {isStockSyncOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <RotateCcw className="w-5 h-5 text-amber-500" />
                                    Sincronizar Stock
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">
                                    Encontrámos {stockSyncRentals.length} aluguer(es) Ativo(s).
                                    Abaixo estão os alugueres que não foram concluídos no sistema.
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsStockSyncOpen(false)} disabled={isSyncingStock}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                            {stockSyncRentals.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm">
                                    Não há alugueres ativos para sincronizar. O stock está correto.
                                </div>
                            ) : (
                                stockSyncRentals.map(rental => {
                                    const isSelected = stockSyncSelected.has(rental.id);
                                    const returnDate = new Date(getEffectiveReturnDate(rental));
                                    const today = new Date();
                                    today.setHours(23, 59, 59, 999);
                                    const isExpired = returnDate < today;

                                    return (
                                        <div 
                                            key={rental.id} 
                                            className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${
                                                isSelected 
                                                    ? 'border-amber-500/50 bg-amber-500/10' 
                                                    : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/50'
                                            }`}
                                            onClick={() => {
                                                const newSet = new Set(stockSyncSelected);
                                                if (isSelected) {
                                                    newSet.delete(rental.id);
                                                } else {
                                                    newSet.add(rental.id);
                                                }
                                                setStockSyncSelected(newSet);
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`flex items-center justify-center w-5 h-5 rounded border ${isSelected ? 'bg-amber-500 border-amber-500 text-slate-900' : 'border-slate-600 bg-slate-800'}`}>
                                                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm text-slate-200">
                                                        {rental.customers?.full_name || 'Desconhecido'}
                                                    </div>
                                                    <div className="flex gap-2 items-center mt-0.5">
                                                        <span className="text-[10px] text-slate-400">
                                                            Ida: {new Date(rental.pickup_date).toLocaleDateString('pt-PT')}
                                                        </span>
                                                        <span className="text-slate-600 text-[10px]">•</span>
                                                        <span className={`text-[10px] ${isExpired ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                                                            Volta: {returnDate.toLocaleDateString('pt-PT')} {isExpired && '(Atrasado)'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-amber-500">
                                                    {(rental.items || []).reduce((acc: number, it: any) => acc + (it.quantity || 0), 0)} itens
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
                            <div className="text-sm">
                                <span className="text-slate-400">Selecionados: </span>
                                <span className="font-bold text-amber-500">{stockSyncSelected.size}</span>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsStockSyncOpen(false)}
                                    disabled={isSyncingStock}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={executeStockSync}
                                    disabled={stockSyncSelected.size === 0 || isSyncingStock}
                                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center gap-2"
                                >
                                    {isSyncingStock ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Sincronizando...
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw className="w-4 h-4" />
                                            Finalizar Selecionados
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
