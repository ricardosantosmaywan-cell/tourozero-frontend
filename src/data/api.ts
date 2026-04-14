import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ============================================
// INTERFACES (DB Types)
// ============================================

export interface Customer {
    id: string;
    full_name: string;
    phone: string;
    tax_id: string;
    email?: string | null;
    address?: string | null;
    document_id?: string | null;
    document_photo_url?: string | null;
    created_at?: string;
}

export interface Product {
    id: string;
    name: string;
    price_unit?: number;
    stock_total: number;
    available: number;
    created_at?: string;
}

export interface RentalItem {
    id?: string;
    product_id: string;
    name: string; // From table join
    price_unit: number;
    quantity: number;
    durationWeeks?: number;
}

export interface Rental {
    id: string;
    customer_id: string;
    customers: { full_name: string; phone: string; email: string; tax_id: string }; // From table join
    customer_phone?: string;
    pickup_date: string;
    return_date: string;
    total_amount: number;
    status: 'active' | 'completed' | 'canceled';
    semanas?: number;
    delivery_address?: string;
    observacoes?: string;
    transport_value?: number;
    deposit_value?: number;
    materials_value?: number;
    iva_materials?: number;
    iva_transport?: number;
    payment_status?: 'pending' | 'paid';
    itemsCount: number;
    items: RentalItem[];
    extensions_history?: any[];
    created_at?: string;
}

// ============================================
// CLIENTES: Supabase Hook
// ============================================

export function useGlobalCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchCustomers() {
        setLoading(true);
        const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
        if (!error && data) {
            setCustomers(data as Customer[]);
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchCustomers();
    }, []);

    async function addCustomer(newCustomer: Omit<Customer, 'id'>) {
        const payload = {
            ...newCustomer,
            phone: newCustomer.phone?.trim() ? newCustomer.phone : 'Não informado',
            email: newCustomer.email?.trim() ? newCustomer.email : null,
            address: newCustomer.address?.trim() ? newCustomer.address : null,
            document_id: newCustomer.document_id?.trim() ? newCustomer.document_id : null,
        };
        const { data, error } = await supabase.from('customers').insert([payload]).select().single();
        if (!error && data) {
            setCustomers(prev => [...prev, data as Customer].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
            return data;
        }
        if (error) throw new Error(error.message);
    }

    async function updateCustomer(id: string, updatedData: Partial<Customer>) {
        const payload = { ...updatedData };
        if (payload.phone !== undefined) {
            payload.phone = payload.phone?.trim() ? payload.phone : 'Não informado';
        }
        if (payload.email !== undefined) {
            payload.email = payload.email?.trim() ? payload.email : null;
        }
        if (payload.address !== undefined) {
            payload.address = payload.address?.trim() ? payload.address : null;
        }
        if (payload.document_id !== undefined) {
            payload.document_id = payload.document_id?.trim() ? payload.document_id : null;
        }

        const { data, error } = await supabase.from('customers').update(payload).eq('id', id).select().single();
        if (!error && data) {
            setCustomers(prev => prev.map(c => c.id === id ? data as Customer : c).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
            return data;
        }
        if (error) throw new Error(error.message);
    }

    async function deleteCustomer(id: string) {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (!error) {
            setCustomers(prev => prev.filter(c => c.id !== id));
        } else {
            throw new Error(error.message);
        }
    }

    return {
        customers,
        loading,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        refreshCustomers: fetchCustomers
    };
}

// ============================================
// PRODUTOS: Supabase Hook
// ============================================

export function useGlobalProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchProducts() {
        setLoading(true);
        const { data, error } = await supabase.from('products').select('*').order('name');
        if (!error && data) {
            setProducts(data as Product[]);
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchProducts();
    }, []);

    async function addProduct(newProduct: Omit<Product, 'id'>) {
        // Se available não for defenido assumimos igual a stock_total
        const payload = {
            ...newProduct,
            available: newProduct.available !== undefined ? newProduct.available : newProduct.stock_total
        };
        const { data, error } = await supabase.from('products').insert([payload]).select().single();
        if (!error && data) {
            setProducts(prev => [...prev, data as Product].sort((a, b) => a.name.localeCompare(b.name)));
            return data;
        }
        if (error) throw new Error(error.message);
    }

    async function updateProduct(id: string, updatedData: Partial<Product>) {
        const { data, error } = await supabase.from('products').update(updatedData).eq('id', id).select().single();
        if (!error && data) {
            setProducts(prev => prev.map(p => p.id === id ? data as Product : p).sort((a, b) => a.name.localeCompare(b.name)));
            return data;
        }
        if (error) throw new Error(error.message);
    }

    async function deleteProduct(id: string) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) {
            setProducts(prev => prev.filter(p => p.id !== id));
        } else {
            throw new Error(error.message);
        }
    }

    return {
        products,
        loading,
        addProduct,
        updateProduct,
        deleteProduct,
        refreshProducts: fetchProducts
    };
}

// ============================================
// AGENDAMENTOS: Supabase Hook
// ============================================

export function useGlobalRentals() {
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchRentals() {
        setLoading(true);
        const { data, error } = await supabase
            .from('rentals')
            .select(`
                *,
                customers:customer_id (*),
                items:rental_items (*, products:product_id (*))
            `)
            .order('pickup_date', { ascending: false });

        if (!error && data) {
            const mapped = data.map((r: any): Rental => {
                const rawItems = r.items || r.rental_items || r.RentalItems || [];
                const transport = Number(r.transport_value || 0);
                const deposit = Number(r.deposit_value || 0);
                const ivaMats = Number(r.iva_materials || 0);
                const ivaTransp = Number(r.iva_transport || 0);
                const total = Number(r.total_amount || 0);
                
                return {
                    id: r.id,
                    customer_id: r.customer_id,
                    customers: r.customers || { full_name: 'Desconhecido', phone: '', email: '', tax_id: '' },
                    pickup_date: r.pickup_date,
                    return_date: r.return_date,
                    total_amount: total,
                    status: r.status,
                    semanas: r.semanas,
                    delivery_address: r.delivery_address,
                    observacoes: r.observacoes,
                    transport_value: transport,
                    deposit_value: deposit,
                    iva_materials: ivaMats,
                    iva_transport: ivaTransp,
                    materials_value: total - transport - deposit - ivaMats - ivaTransp, // Faturamento Líquido (Real)
                    payment_status: r.payment_status || 'pending',
                    extensions_history: r.extensions_history || [],
                    created_at: r.created_at,
                    itemsCount: Array.isArray(rawItems) ? rawItems.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0) : 0,
                    items: Array.isArray(rawItems) ? rawItems.map((it: any) => {
                        const prodData = Array.isArray(it.products) ? it.products[0] : it.products;
                        return {
                            id: it.id,
                            product_id: it.product_id,
                            name: prodData?.name || it.product_name || 'Item',
                            price_unit: Number(it.price_unit || 0),
                            quantity: Number(it.quantity || 0)
                        };
                    }) : []
                };
            });
            setRentals(mapped);
        } else if (error) {
            console.error("Erro ao carregar agendamentos:", error.message);
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchRentals();
    }, []);

    async function addRental(newRentalData: any) {
        try {
            const rentalPayload = {
                customer_id: newRentalData.customers?.id || newRentalData.customer_id,
                pickup_date: newRentalData.pickup_date,
                return_date: newRentalData.return_date,
                total_amount: newRentalData.total_amount,
                status: newRentalData.status || 'active',
                semanas: newRentalData.semanas,
                delivery_address: newRentalData.delivery_address,
                observacoes: newRentalData.observacoes,
                transport_value: newRentalData.transport_value || 0,
                deposit_value: newRentalData.deposit_value || 0,
                iva_materials: newRentalData.iva_materials || 0,
                iva_transport: newRentalData.iva_transport || 0,
                payment_status: newRentalData.payment_status || 'pending',
                // extensions_history: newRentalData.extensions_history || [] 
            };

            const { data: insertedRental, error: rentalError } = await supabase.from('rentals').insert([rentalPayload]).select().single();
            if (rentalError) throw new Error(rentalError.message);

            if (newRentalData.items && newRentalData.items.length > 0) {
                const itemsPayload = newRentalData.items.map((it: any) => ({
                    rental_id: insertedRental.id,
                    product_id: it.product?.id || it.product_id,
                    quantity: it.quantity,
                    price_unit: it.price_unit || 0
                }));
                const { error: itemsError } = await supabase.from('rental_items').insert(itemsPayload);
                if (itemsError) throw new Error(itemsError.message);

                if (rentalPayload.status === 'active') {
                    for (const it of newRentalData.items) {
                        const prodId = it.product?.id || it.product_id;
                        const { data: prodData } = await supabase.from('products').select('available').eq('id', prodId).single();
                        if (prodData) {
                            await supabase.from('products').update({ available: prodData.available - it.quantity }).eq('id', prodId);
                        }
                    }
                }
            }

            await fetchRentals();
            return insertedRental;
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    async function updateRental(id: string, updatedData: any) {
        try {
            // SEGURANÇA: Se não vierem dados de itens, abortamos a parte destrutiva
            // para evitar limpar o agendamento por erro de carregamento do modal.
            const hasItemsInPayload = updatedData.items && updatedData.items.length > 0;

            const { data: oldRental } = await supabase.from('rentals').select('status').eq('id', id).single();

            // Só mexemos no stock se o agendamento estava ativo
            if (oldRental && oldRental.status === 'active' && hasItemsInPayload) {
                const { data: currentItems } = await supabase.from('rental_items').select('*').eq('rental_id', id);
                if (currentItems) {
                    for (const item of currentItems) {
                        const { data: p } = await supabase.from('products').select('available').eq('id', item.product_id).single();
                        if (p) {
                            await supabase.from('products').update({ available: p.available + item.quantity }).eq('id', item.product_id);
                        }
                    }
                }
            }

            // Se o payload tem itens, reconstrói a relação
            if (hasItemsInPayload) {
                await supabase.from('rental_items').delete().eq('rental_id', id);
            }

            const rentalPayload: any = {
                pickup_date: updatedData.pickup_date,
                return_date: updatedData.return_date,
                total_amount: updatedData.total_amount,
                status: updatedData.status,
                semanas: updatedData.semanas,
                delivery_address: updatedData.delivery_address,
                observacoes: updatedData.observacoes,
                transport_value: updatedData.transport_value || 0,
                deposit_value: updatedData.deposit_value || 0,
                iva_materials: updatedData.iva_materials || 0,
                iva_transport: updatedData.iva_transport || 0,
                payment_status: updatedData.payment_status || 'pending',
                // extensions_history: updatedData.extensions_history 
            };
            if (updatedData.customers?.id || updatedData.customer_id) {
                rentalPayload.customer_id = updatedData.customers?.id || updatedData.customer_id;
            }

            const { data: newlyUpdatedRental, error: headerError } = await supabase.from('rentals').update(rentalPayload).eq('id', id).select().single();
            if (headerError) throw new Error(headerError.message);

            if (hasItemsInPayload) {
                const itemsPayload = updatedData.items.map((it: any) => ({
                    rental_id: id,
                    product_id: it.product?.id || it.product_id,
                    quantity: it.quantity,
                    price_unit: it.price_unit || 0
                }));
                await supabase.from('rental_items').insert(itemsPayload);

                if (updatedData.status === 'active') {
                    for (const it of updatedData.items) {
                        const prodId = it.product?.id || it.product_id;
                        const { data: p } = await supabase.from('products').select('available').eq('id', prodId).single();
                        if (p) {
                            await supabase.from('products').update({ available: p.available - it.quantity }).eq('id', prodId);
                        }
                    }
                }
            }

            await fetchRentals();
            return newlyUpdatedRental;
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    async function deleteRental(id: string) {
        try {
            // Estornar Stock antes de deletar
            const { data: oldRental } = await supabase.from('rentals').select('status').eq('id', id).single();
            if (oldRental && oldRental.status === 'active') {
                const { data: oldItems } = await supabase.from('rental_items').select('*').eq('rental_id', id);
                if (oldItems) {
                    for (const item of oldItems) {
                        const { data: p } = await supabase.from('products').select('available').eq('id', item.product_id).single();
                        if (p) {
                            await supabase.from('products').update({ available: p.available + item.quantity }).eq('id', item.product_id);
                        }
                    }
                }
            }

            // Através do Schema ON DELETE CASCADE, deletar em alugueres paga os items em relação
            const { error } = await supabase.from('rentals').delete().eq('id', id);
            if (error) throw new Error(error.message);

            await fetchRentals();
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    const updateRentalPartial = async (id: string, partialData: any) => {
        try {
            // Filtrar extensions_history se a coluna ainda não existir
            const sanitizedData = { ...partialData };
            delete sanitizedData.extensions_history;

            const { error } = await supabase.from('rentals').update(sanitizedData).eq('id', id);
            if (error) throw new Error(error.message);
            await fetchRentals();
        } catch (e: any) {
            console.error('Erro ao atualizar aluguer (parcial):', e);
            throw new Error(e.message);
        }
    };

    const updatePaymentStatus = async (id: string, newStatus: 'pending' | 'paid') => {
        await updateRentalPartial(id, { payment_status: newStatus });
    };

    return {
        rentals,
        loading,
        addRental,
        updateRental,
        updateRentalPartial,
        deleteRental,
        updatePaymentStatus,
        refreshRentals: fetchRentals
    };
}
