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
    total_value: number;
    status: 'active' | 'completed' | 'canceled';
    semanas?: number;
    delivery_address?: string;
    observacoes?: string;
    itemsCount: number;
    items: RentalItem[];
    created_at?: string;
}

// ============================================
// CLIENTES: Supabase Hook
// ============================================

export function useGlobalCustomers() {
    const [customers, setCustomers] = useState<Customer[]>([]);

    async function fetchCustomers() {
        const { data, error } = await supabase.from('customers').select('*').order('full_name');
        if (!error && data) {
            setCustomers(data as Customer[]);
        }
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
            setCustomers(prev => [...prev, data as Customer].sort((a, b) => a.full_name.localeCompare(b.full_name)));
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
            setCustomers(prev => prev.map(c => c.id === id ? data as Customer : c).sort((a, b) => a.full_name.localeCompare(b.full_name)));
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

    async function fetchProducts() {
        const { data, error } = await supabase.from('products').select('*').order('name');
        if (!error && data) {
            setProducts(data as Product[]);
        }
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

    async function fetchRentals() {
        // Nested JOIN no Supabase (Rentals -> Customers, Rentals -> Rental Items -> Products)
        const { data, error } = await supabase
            .from('rentals')
            .select(`
                *,
                customers (full_name, phone, email, tax_id),
                rental_items (*, products (name))
            `)
            .order('pickup_date', { ascending: false });

        if (!error && data) {
            const mapped = data.map((r: any): Rental => ({
                id: r.id,
                customer_id: r.customer_id,
                customers: r.customers || { full_name: 'Desconhecido', phone: '', email: '', tax_id: '' },
                pickup_date: r.pickup_date,
                return_date: r.return_date,
                total_value: r.total_value,
                status: r.status,
                semanas: r.semanas,
                delivery_address: r.delivery_address,
                observacoes: r.observacoes,
                created_at: r.created_at,
                itemsCount: r.rental_items ? r.rental_items.reduce((sum: number, it: any) => sum + it.quantity, 0) : 0,
                items: r.rental_items ? r.rental_items.map((it: any) => ({
                    id: it.id,
                    product_id: it.product_id,
                    name: it.products?.name || 'Item Apagado',
                    price_unit: it.price_unit,
                    quantity: it.quantity
                })) : []
            }));
            setRentals(mapped);
        }
    }

    useEffect(() => {
        fetchRentals();
    }, []);

    async function addRental(newRentalData: any) {
        try {
            // 1. Guardar o esqueleto do rental
            const rentalPayload = {
                customer_id: newRentalData.customers?.id || newRentalData.customer_id,
                pickup_date: newRentalData.pickup_date,
                return_date: newRentalData.return_date,
                total_value: newRentalData.total_value,
                status: newRentalData.status || 'active',
                semanas: newRentalData.semanas,
                delivery_address: newRentalData.delivery_address,
                observacoes: newRentalData.observacoes
            };

            const { data: insertedRental, error: rentalError } = await supabase.from('rentals').insert([rentalPayload]).select().single();
            if (rentalError) throw new Error(rentalError.message);

            // 2. Guardar Itens relacionais
            if (newRentalData.items && newRentalData.items.length > 0) {
                const itemsPayload = newRentalData.items.map((it: any) => ({
                    rental_id: insertedRental.id,
                    product_id: it.product?.id || it.product_id,
                    quantity: it.quantity,
                    price_unit: it.price_unit || 0
                }));
                const { error: itemsError } = await supabase.from('rental_items').insert(itemsPayload);
                if (itemsError) throw new Error(itemsError.message);

                // 3. Subtração de Estoque automático (em substituição dos triggers SQL por agora)
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
            // 1. Snapshot da base de dados antiga para repor stock
            const { data: oldRental } = await supabase.from('rentals').select('status').eq('id', id).single();

            if (oldRental && oldRental.status === 'active') {
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

            // 2. Apagar Itens Antigos (para reconstruir a relação sem duplicados)
            await supabase.from('rental_items').delete().eq('rental_id', id);

            // 3. Atualizar Esqueleto (Header)
            const rentalPayload = {
                pickup_date: updatedData.pickup_date,
                return_date: updatedData.return_date,
                total_value: updatedData.total_value,
                status: updatedData.status,
                semanas: updatedData.semanas,
                delivery_address: updatedData.delivery_address,
                observacoes: updatedData.observacoes
            };
            if (updatedData.customers?.id || updatedData.customer_id) {
                (rentalPayload as any).customer_id = updatedData.customers?.id || updatedData.customer_id;
            }

            const { data: newlyUpdatedRental, error: headerError } = await supabase.from('rentals').update(rentalPayload).eq('id', id).select().single();
            if (headerError) throw new Error(headerError.message);

            // 4. Inserir Itens Novos/Editados
            if (updatedData.items && updatedData.items.length > 0) {
                const itemsPayload = updatedData.items.map((it: any) => ({
                    rental_id: id,
                    product_id: it.product?.id || it.product_id,
                    quantity: it.quantity,
                    price_unit: it.price_unit || 0
                }));
                await supabase.from('rental_items').insert(itemsPayload);

                // 5. Retirar Stock caso ativado
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

    return {
        rentals,
        addRental,
        updateRental,
        deleteRental,
        refreshRentals: fetchRentals
    };
}
