/**
 * Utility functions for financial calculations used in the Accounting module.
 */

export interface PartnershipTotals {
    materialsTotal: number;
    transportTotal: number;
    receivedGabriel: number;
    receivedRicardo: number;
}

export interface PartnershipSummary {
    gabrielBase: number;
    gabrielTransport: number;
    gabrielTotalToReceive: number;
    
    ricardoBase: number;
    ricardoTransport: number;
    ricardoTotalToReceive: number;
    
    diffGabriel: number;
    isRicardoToGabriel: boolean;
    transferAmount: number;
}

/**
 * Calcula a partilha de lucros entre Gabriel (70% base) e Ricardo (30% base)
 * e 70% / 30% de transporte.
 * Calcula também o acerto de contas (quem deve transferir para quem).
 */
export function calculatePartnershipSummary(totals: PartnershipTotals): PartnershipSummary {
    const gabrielBase = totals.materialsTotal * 0.7;
    const ricardoBase = totals.materialsTotal * 0.3;
    const gabrielTransportSplit = totals.transportTotal * 0.7;
    const ricardoTransportSplit = totals.transportTotal * 0.3;

    const gabrielTotalToReceive = gabrielBase + gabrielTransportSplit;
    const ricardoTotalToReceive = ricardoBase + ricardoTransportSplit;

    const diffGabriel = gabrielTotalToReceive - totals.receivedGabriel;
    const isRicardoToGabriel = diffGabriel >= 0;
    const transferAmount = Math.abs(diffGabriel);

    return {
        gabrielBase,
        gabrielTransport: gabrielTransportSplit,
        gabrielTotalToReceive,

        ricardoBase,
        ricardoTransport: ricardoTransportSplit,
        ricardoTotalToReceive,
        
        diffGabriel,
        isRicardoToGabriel,
        transferAmount
    };
}

// ============================================
// DRE (Demonstração do Resultado do Exercício)
// ============================================

export type ExpenseGroupKey = 'veiculo' | 'material' | 'geral';

export const EXPENSE_GROUPS: { key: ExpenseGroupKey; label: string }[] = [
    { key: 'veiculo', label: 'Despesas com a Carrinha' },
    { key: 'material', label: 'Despesas com Material' },
    { key: 'geral', label: 'Despesas Gerais e Administrativas' },
];

export const EXPENSE_CATEGORIES: { key: string; label: string; group: ExpenseGroupKey }[] = [
    { key: 'combustivel', label: 'Combustível', group: 'veiculo' },
    { key: 'manutencao_veiculo', label: 'Manutenção da Carrinha', group: 'veiculo' },
    { key: 'portagens', label: 'Portagens', group: 'veiculo' },
    { key: 'seguro_veiculo', label: 'Seguro e IUC da Carrinha', group: 'veiculo' },
    { key: 'manutencao_material', label: 'Manutenção de Material', group: 'material' },
    { key: 'pessoal', label: 'Pessoal / Mão de Obra', group: 'geral' },
    { key: 'impostos', label: 'Impostos e Taxas', group: 'geral' },
    { key: 'marketing', label: 'Marketing e Publicidade', group: 'geral' },
    { key: 'outros', label: 'Outros', group: 'geral' },
];

const FALLBACK_CATEGORY_KEY = 'outros';

export function getCategoryLabel(key: string): string {
    return EXPENSE_CATEGORIES.find(c => c.key === key)?.label ?? 'Outros';
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Valor de materiais de um prolongamento (compatível com registos antigos e novos). */
export function getExtensionValue(ext: any): number {
    if (Number(ext?.extra_materials) > 0) return Number(ext.extra_materials);
    if (Number(ext?.extra_value) > 0) return Number(ext.extra_value);
    const diff = Number(ext?.new_value || 0) - Number(ext?.old_value || 0);
    return diff > 0 ? diff : 0;
}

export interface RevenueTotals {
    /** Aluguer de material (base + prolongamentos) efetivamente recebido, sem IVA nem caução */
    materials: number;
    /** Transporte (ida e volta) efetivamente recebido */
    transport: number;
    /** Material e prolongamentos ainda por receber (não entra no resultado) */
    pending: number;
    /** IVA cobrado nos alugueres pagos (passivo fiscal, fora da receita) */
    iva: number;
    /** Cauções em custódia nos alugueres pagos (a devolver, fora da receita) */
    deposits: number;
}

/**
 * Receita em regime de caixa, com as mesmas regras do card de faturamento do Dashboard:
 * só conta o que foi efetivamente recebido — aluguer base pelo payment_status, cada
 * prolongamento pelo seu próprio status e transporte (ida/volta) separadamente.
 */
export function calculateRevenueTotals(rentals: any[]): RevenueTotals {
    const totals: RevenueTotals = { materials: 0, transport: 0, pending: 0, iva: 0, deposits: 0 };

    for (const r of rentals) {
        const exts: any[] = (Array.isArray(r.extensions_history) ? r.extensions_history : [])
            .filter((e: any) => e.type === 'prolongamento');
        const extSum = exts.reduce((s, e) => s + getExtensionValue(e), 0);
        const baseValue = Math.max(0, Number(r.materials_value || 0) - extSum);

        if (r.payment_status === 'paid') {
            totals.materials += baseValue;
            totals.iva += Number(r.iva_materials || 0) + Number(r.iva_transport || 0);
            totals.deposits += Number(r.deposit_value || 0);
        } else {
            totals.pending += baseValue;
        }

        for (const ext of exts) {
            if (ext.payment_status === 'pending') totals.pending += getExtensionValue(ext);
            else totals.materials += getExtensionValue(ext);
        }

        if (r.transport_ida_paid) totals.transport += Number(r.transport_ida_value || 0);
        if (r.transport_volta_paid) totals.transport += Number(r.transport_volta_value || 0);
    }

    return {
        materials: round2(totals.materials),
        transport: round2(totals.transport),
        pending: round2(totals.pending),
        iva: round2(totals.iva),
        deposits: round2(totals.deposits),
    };
}

export interface DREExpenseLine { category: string; label: string; amount: number }
export interface DREExpenseGroup { key: ExpenseGroupKey; label: string; lines: DREExpenseLine[]; total: number }

export interface DRE {
    materials: number;
    transport: number;
    grossRevenue: number;
    groups: DREExpenseGroup[];
    totalExpenses: number;
    netResult: number;
    /** Resultado / receita, em %. null quando não há receita no período. */
    margin: number | null;
}

/** Monta o DRE do período: receita recebida menos despesas agrupadas por natureza. */
export function buildDRE(
    revenue: Pick<RevenueTotals, 'materials' | 'transport'>,
    expenses: { category: string; amount: number }[]
): DRE {
    const byCategory = new Map<string, number>();
    for (const e of expenses) {
        // Categorias desconhecidas (ex.: removidas da lista) não podem sumir do resultado
        const key = EXPENSE_CATEGORIES.some(c => c.key === e.category) ? e.category : FALLBACK_CATEGORY_KEY;
        byCategory.set(key, (byCategory.get(key) || 0) + Number(e.amount || 0));
    }

    const groups: DREExpenseGroup[] = EXPENSE_GROUPS.map(g => {
        const lines = EXPENSE_CATEGORIES
            .filter(c => c.group === g.key && (byCategory.get(c.key) || 0) > 0)
            .map(c => ({ category: c.key, label: c.label, amount: round2(byCategory.get(c.key) || 0) }));
        return { key: g.key, label: g.label, lines, total: round2(lines.reduce((s, l) => s + l.amount, 0)) };
    });

    const grossRevenue = round2(revenue.materials + revenue.transport);
    const totalExpenses = round2(groups.reduce((s, g) => s + g.total, 0));
    const netResult = round2(grossRevenue - totalExpenses);

    return {
        materials: revenue.materials,
        transport: revenue.transport,
        grossRevenue,
        groups,
        totalExpenses,
        netResult,
        margin: grossRevenue > 0 ? round2((netResult / grossRevenue) * 100) : null,
    };
}
