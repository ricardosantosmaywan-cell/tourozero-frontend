import { useState, useEffect } from 'react';

// Interfaces Básicas (Clonadas dos componentes, mas agora globais)
export interface Customer {
    id: string;
    full_name: string;
    phone: string;
    tax_id: string;
    email: string;
    address?: string;
    document_id?: string;
}

export interface Product {
    id: string;
    name: string;
    price_unit?: number;
    stock_total: number;
    available?: number;
}

export interface RentalItem {
    product_id: string;
    name: string;
    price_unit: number;
    quantity: number;
    durationWeeks?: number;
}

export interface Rental {
    id: string;
    customers: { full_name: string };
    customer_phone?: string;
    pickup_date: string;
    return_date: string;
    total_value: number;
    status: 'active' | 'completed' | 'canceled';
    itemsCount: number;
    items: RentalItem[];
    semanas?: number;
    observacoes?: string;
    delivery_address?: string;
}

// ============================================
// BASE DE DADOS EM MEMÓRIA (MOCK CENTRALIZADO)
// ============================================

// Inicializamos com um Dataset Rico para testar Paginação e Filtros
let globalRentalsDB: Rental[] = [
    {
        id: '1',
        pickup_date: '2026-02-15',
        return_date: '2026-03-15',
        total_value: 120.00,
        status: 'active',
        customers: { full_name: 'João Silva' },
        customer_phone: '912345678',
        itemsCount: 5,
        items: [{ product_id: '1', name: 'Andaime Tubular 1x1m', price_unit: 1.50, quantity: 5, durationWeeks: 4 }],
        observacoes: 'Entregar na porta traseira.'
    },
    {
        id: '2',
        pickup_date: '2026-02-18',
        return_date: '2026-02-25',
        total_value: 60.00, // Forçado taxa mínima
        status: 'active',
        customers: { full_name: 'Maria Oliveira' },
        customer_phone: '918765432',
        itemsCount: 2,
        items: [{ product_id: '4', name: 'Guincho Elétrico 500kg', price_unit: 15.00, quantity: 2, durationWeeks: 1 }],
        observacoes: ''
    },
    {
        id: '3',
        pickup_date: '2026-01-10',
        return_date: '2026-01-20',
        total_value: 80.00,
        status: 'completed',
        customers: { full_name: 'Carlos Santos' },
        customer_phone: '921112233',
        itemsCount: 100,
        items: [{ product_id: '3', name: 'Escora Metálica 3G', price_unit: 0.80, quantity: 100, durationWeeks: 1 }],
        observacoes: ''
    },
    {
        id: '4',
        pickup_date: '2026-01-05',
        return_date: '2026-01-25',
        total_value: 450.00,
        status: 'completed',
        customers: { full_name: 'Empresa X' },
        customer_phone: '930001122',
        itemsCount: 15,
        items: [{ product_id: '2', name: 'Betoneira 130L', price_unit: 10.00, quantity: 15, durationWeeks: 3 }],
        observacoes: 'Uso intenso.'
    },
    // Adicionando mais 10 registos para forçar a paginação (> 10 items) no Rentals.tsx
    { id: '5', pickup_date: '2025-12-01', return_date: '2025-12-15', total_value: 90.00, status: 'completed', customers: { full_name: 'Ana Costa' }, itemsCount: 3, items: [] },
    { id: '6', pickup_date: '2025-12-10', return_date: '2025-12-20', total_value: 110.00, status: 'completed', customers: { full_name: 'Rui Mota' }, itemsCount: 4, items: [] },
    { id: '7', pickup_date: '2025-11-05', return_date: '2025-11-25', total_value: 75.00, status: 'completed', customers: { full_name: 'Telmo Sousa' }, itemsCount: 2, items: [] },
    { id: '8', pickup_date: '2025-10-12', return_date: '2025-10-30', total_value: 200.00, status: 'canceled', customers: { full_name: 'Susana Lima' }, itemsCount: 10, items: [] },
    { id: '9', pickup_date: '2026-02-01', return_date: '2026-02-10', total_value: 65.00, status: 'completed', customers: { full_name: 'Vitor Hugo' }, itemsCount: 1, items: [] },
    { id: '10', pickup_date: '2026-02-05', return_date: '2026-02-28', total_value: 320.00, status: 'active', customers: { full_name: 'Filipa Ramos' }, itemsCount: 8, items: [] },
    { id: '11', pickup_date: '2026-02-10', return_date: '2026-03-01', total_value: 180.00, status: 'active', customers: { full_name: 'Gonçalo Nuno' }, itemsCount: 6, items: [] },
    { id: '12', pickup_date: '2026-01-15', return_date: '2026-02-15', total_value: 400.00, status: 'completed', customers: { full_name: 'Sonia Morais' }, itemsCount: 20, items: [] },
    { id: '13', pickup_date: '2026-02-22', return_date: '2026-02-24', total_value: 60.00, status: 'active', customers: { full_name: 'Bruno Dias' }, itemsCount: 1, items: [] }, // Atrasado (Simulação: Retorno < Hoje)
];

// Listeners para forçar re-render em componentes inscritos quando a BD MOCK muda
type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
    listeners.forEach(listener => listener());
}

export function subscribeToRentals(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener); // Unsubscribe function
}

// ============================================
// CRUD OPERATIONS (Simulate Backend)
// ============================================

export function getGlobalRentals(): Rental[] {
    // Retorna ordenado do mais recente para o mais antigo por pickup_date
    return [...globalRentalsDB].sort((a, b) => new Date(b.pickup_date).getTime() - new Date(a.pickup_date).getTime());
}

export function addGlobalRental(newRental: Omit<Rental, 'id'>): Rental {
    const rentalWithId: Rental = {
        ...newRental,
        id: Math.random().toString(36).substr(2, 9) // Generate Random ID
    };
    globalRentalsDB = [rentalWithId, ...globalRentalsDB];

    // Deduct stock for active rentals
    if (rentalWithId.status === 'active') {
        rentalWithId.items.forEach(item => {
            const prod = globalProductsDB.find(p => p.id === item.product_id);
            if (prod) {
                const currentAvailable = prod.available ?? prod.stock_total;
                updateGlobalProduct(prod.id, { available: currentAvailable - item.quantity });
            }
        });
    }

    notifyListeners();
    return rentalWithId;
}

export function updateGlobalRental(id: string, updatedData: Partial<Rental>): Rental | undefined {
    let updatedObj = undefined;

    // To handle stock correctly, we first refund the old items if they were active
    const oldRental = globalRentalsDB.find(r => r.id === id);
    if (oldRental && oldRental.status === 'active') {
        oldRental.items.forEach(item => {
            const prod = globalProductsDB.find(p => p.id === item.product_id);
            if (prod) {
                const currentAvailable = prod.available ?? prod.stock_total;
                updateGlobalProduct(prod.id, { available: currentAvailable + item.quantity });
            }
        });
    }

    globalRentalsDB = globalRentalsDB.map(rental => {
        if (rental.id === id) {
            updatedObj = { ...rental, ...updatedData };
            return updatedObj;
        }
        return rental;
    });

    // Then we deduct the new items if the rental is still active
    if (updatedObj && (updatedObj as Rental).status === 'active') {
        (updatedObj as Rental).items.forEach(item => {
            const prod = globalProductsDB.find(p => p.id === item.product_id);
            if (prod) {
                const currentAvailable = prod.available ?? prod.stock_total;
                updateGlobalProduct(prod.id, { available: currentAvailable - item.quantity });
            }
        });
    }

    if (updatedObj) notifyListeners();
    return updatedObj;
}

export function deleteGlobalRental(id: string): void {
    const oldRental = globalRentalsDB.find(r => r.id === id);
    if (oldRental && oldRental.status === 'active') {
        oldRental.items.forEach(item => {
            const prod = globalProductsDB.find(p => p.id === item.product_id);
            if (prod) {
                const currentAvailable = prod.available ?? prod.stock_total;
                updateGlobalProduct(prod.id, { available: currentAvailable + item.quantity });
            }
        });
    }

    globalRentalsDB = globalRentalsDB.filter(rental => rental.id !== id);
    notifyListeners();
}

// Custom Hook to bind state to the mock DB in React Components
export function useGlobalRentals() {
    const [rentals, setRentals] = useState<Rental[]>(getGlobalRentals());

    useEffect(() => {
        const unsubscribe = subscribeToRentals(() => {
            setRentals(getGlobalRentals());
        });
        return () => { unsubscribe(); };
    }, []);

    return {
        rentals,
        addRental: addGlobalRental,
        updateRental: updateGlobalRental,
        deleteRental: deleteGlobalRental
    };
}

// ============================================
// BASE DE DADOS EM MEMÓRIA DE CLIENTES (MOCK CENTRALIZADO)
// ============================================

let globalCustomersDB: Customer[] = [
    { id: '1', full_name: 'João Silva', phone: '912345678', address: 'Rua das Flores 123', tax_id: '123456789', document_id: 'CC1234', email: 'joao@sandbox.com' },
    { id: '2', full_name: 'Maria Oliveira', phone: '918765432', address: 'Avenida Central 45', tax_id: '987654321', document_id: 'CC5678', email: 'maria@sandbox.com' },
    { id: '3', full_name: 'Carlos Santos', phone: '921112233', address: 'Praceta do Sol 3', tax_id: '222333444', document_id: 'CC9012', email: 'carlos@sandbox.com' },
];

const customerListeners: Set<Listener> = new Set();
function notifyCustomerListeners() {
    customerListeners.forEach(listener => listener());
}

export function subscribeToCustomers(listener: Listener) {
    customerListeners.add(listener);
    return () => customerListeners.delete(listener);
}

export function getGlobalCustomers(): Customer[] {
    return [...globalCustomersDB].sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export function addGlobalCustomer(newCustomer: Omit<Customer, 'id'>): Customer {
    const customerWithId: Customer = {
        ...newCustomer,
        id: Math.random().toString(36).substr(2, 9)
    };
    globalCustomersDB = [...globalCustomersDB, customerWithId];
    notifyCustomerListeners();
    return customerWithId;
}

export function updateGlobalCustomer(id: string, updatedData: Partial<Customer>): Customer | undefined {
    let updatedObj = undefined;
    globalCustomersDB = globalCustomersDB.map(customer => {
        if (customer.id === id) {
            updatedObj = { ...customer, ...updatedData } as Customer;
            return updatedObj;
        }
        return customer;
    });

    if (updatedObj) notifyCustomerListeners();
    return updatedObj;
}

export function deleteGlobalCustomer(id: string): void {
    globalCustomersDB = globalCustomersDB.filter(c => c.id !== id);
    notifyCustomerListeners();
}

export function useGlobalCustomers() {
    const [customers, setCustomers] = useState<Customer[]>(getGlobalCustomers());

    useEffect(() => {
        const unsubscribe = subscribeToCustomers(() => {
            setCustomers(getGlobalCustomers());
        });
        return () => { unsubscribe(); };
    }, []);

    return {
        customers,
        addCustomer: addGlobalCustomer,
        updateCustomer: updateGlobalCustomer,
        deleteCustomer: deleteGlobalCustomer
    };
}

// ============================================
// BASE DE DADOS EM MEMÓRIA DE PRODUTOS (MOCK CENTRALIZADO)
// ============================================

let globalProductsDB: Product[] = [
    { id: '1', name: 'Andaime Tubular 1x1m', price_unit: 1.50, stock_total: 100, available: 80 },
    { id: '2', name: 'Plataforma Metálica 2m', price_unit: 2.00, stock_total: 50, available: 45 },
    { id: '3', name: 'Escora Metálica 3G', price_unit: 0.80, stock_total: 200, available: 120 },
    { id: '4', name: 'Guincho Elétrico 500kg', price_unit: 15.00, stock_total: 5, available: 1 },
];

const productListeners: Set<Listener> = new Set();
function notifyProductListeners() {
    productListeners.forEach(listener => listener());
}

export function subscribeToProducts(listener: Listener) {
    productListeners.add(listener);
    return () => productListeners.delete(listener);
}

export function getGlobalProducts(): Product[] {
    return [...globalProductsDB].sort((a, b) => a.name.localeCompare(b.name));
}

export function addGlobalProduct(newProduct: Omit<Product, 'id'>): Product {
    const productWithId: Product = {
        ...newProduct,
        id: Math.random().toString(36).substr(2, 9)
    };
    globalProductsDB = [...globalProductsDB, productWithId];
    notifyProductListeners();
    return productWithId;
}

export function updateGlobalProduct(id: string, updatedData: Partial<Product>): Product | undefined {
    let updatedObj = undefined;
    globalProductsDB = globalProductsDB.map(product => {
        if (product.id === id) {
            updatedObj = { ...product, ...updatedData } as Product;
            return updatedObj;
        }
        return product;
    });

    if (updatedObj) notifyProductListeners();
    return updatedObj;
}

export function deleteGlobalProduct(id: string): void {
    globalProductsDB = globalProductsDB.filter(p => p.id !== id);
    notifyProductListeners();
}

export function useGlobalProducts() {
    const [products, setProducts] = useState<Product[]>(getGlobalProducts());

    useEffect(() => {
        const unsubscribe = subscribeToProducts(() => {
            setProducts(getGlobalProducts());
        });
        return () => { unsubscribe(); };
    }, []);

    return {
        products,
        addProduct: addGlobalProduct,
        updateProduct: updateGlobalProduct,
        deleteProduct: deleteGlobalProduct
    };
}
