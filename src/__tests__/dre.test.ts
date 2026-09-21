import { describe, it, expect } from 'vitest';
import { buildDRE, calculateRevenueTotals, getExtensionValue } from '../utils/financialCalculations';

describe('getExtensionValue', () => {
    it('prefere extra_materials, depois extra_value, depois a diferença de totais', () => {
        expect(getExtensionValue({ extra_materials: 50, extra_value: 30 })).toBe(50);
        expect(getExtensionValue({ extra_value: 30 })).toBe(30);
        expect(getExtensionValue({ old_value: 100, new_value: 140 })).toBe(40);
        expect(getExtensionValue({ old_value: 100, new_value: 90 })).toBe(0);
    });
});

describe('calculateRevenueTotals', () => {
    it('só conta o que foi efetivamente recebido e separa o resto', () => {
        const rentals = [
            // pago, com um prolongamento pago (materials_value 300 inclui os 100 do prolongamento)
            {
                payment_status: 'paid', materials_value: 300, iva_materials: 69, iva_transport: 0, deposit_value: 50,
                transport_ida_paid: true, transport_ida_value: 40, transport_volta_paid: false, transport_volta_value: 40,
                extensions_history: [{ type: 'prolongamento', extra_materials: 100 }],
            },
            // pendente, com prolongamento pendente e transporte de ida pago
            {
                payment_status: 'pending', materials_value: 200, iva_materials: 0, deposit_value: 20,
                transport_ida_paid: true, transport_ida_value: 10, transport_volta_paid: true, transport_volta_value: 10,
                extensions_history: [{ type: 'prolongamento', extra_materials: 60, payment_status: 'pending' }],
            },
        ];

        expect(calculateRevenueTotals(rentals)).toEqual({
            materials: 300,   // 200 base + 100 prolongamento pago (o aluguer pendente não entra)
            transport: 60,    // 40 (ida paga) + 10 + 10 do segundo aluguer
            pending: 200,     // base pendente 140 + prolongamento pendente 60
            iva: 69,
            deposits: 50,     // só cauções de alugueres pagos
        });
    });

    it('devolve zeros sem alugueres', () => {
        expect(calculateRevenueTotals([])).toEqual({ materials: 0, transport: 0, pending: 0, iva: 0, deposits: 0 });
    });
});

describe('buildDRE', () => {
    const revenue = { materials: 1000, transport: 200 };

    it('agrupa despesas, soma o total e calcula resultado e margem', () => {
        const dre = buildDRE(revenue, [
            { category: 'combustivel', amount: 80.5 },
            { category: 'combustivel', amount: 40 },
            { category: 'manutencao_veiculo', amount: 250 },
            { category: 'manutencao_material', amount: 100 },
            { category: 'marketing', amount: 30 },
        ]);

        expect(dre.grossRevenue).toBe(1200);
        const veiculo = dre.groups.find(g => g.key === 'veiculo')!;
        expect(veiculo.total).toBe(370.5);
        expect(veiculo.lines.map(l => [l.category, l.amount])).toEqual([['combustivel', 120.5], ['manutencao_veiculo', 250]]);
        expect(dre.totalExpenses).toBe(500.5);
        expect(dre.netResult).toBe(699.5);
        expect(dre.margin).toBe(58.29);
    });

    it('não perde despesas de categorias desconhecidas (vão para Outros)', () => {
        const dre = buildDRE(revenue, [{ category: 'categoria_antiga', amount: 25 }]);
        expect(dre.totalExpenses).toBe(25);
        expect(dre.groups.find(g => g.key === 'geral')!.lines).toEqual([{ category: 'outros', label: 'Outros', amount: 25 }]);
    });

    it('mostra prejuízo e margem nula quando não há receita', () => {
        const dre = buildDRE({ materials: 0, transport: 0 }, [{ category: 'combustivel', amount: 60 }]);
        expect(dre.netResult).toBe(-60);
        expect(dre.margin).toBeNull();
    });

    it('evita erros de vírgula flutuante nas somas', () => {
        const dre = buildDRE({ materials: 0.3, transport: 0 }, [{ category: 'portagens', amount: 0.1 }, { category: 'portagens', amount: 0.2 }]);
        expect(dre.totalExpenses).toBe(0.3);
        expect(dre.netResult).toBe(0);
    });
});
