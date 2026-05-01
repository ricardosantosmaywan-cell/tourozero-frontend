import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printRentalContractHTML } from '../htmlContractGenerator';

describe('htmlContractGenerator', () => {
    beforeEach(() => {
        // Mock the global window object since Vitest runs in Node.js
        (globalThis as any).window = {
            open: vi.fn()
        } as any;
    });

    afterEach(() => {
        delete (globalThis as any).window;
    });

    it('gera o HTML do contrato corretamente sem erros e abre a janela de impressão', () => {
        // Mock do window.open e do objeto document
        const mockDocument = {
            open: vi.fn(),
            write: vi.fn(),
            close: vi.fn()
        };
        const windowOpenSpy = vi.spyOn((globalThis as any).window, 'open').mockReturnValue({ document: mockDocument } as any);

        const mockRental = {
            id: '123',
            customers: { full_name: 'Cliente Teste', tax_id: '999999999' },
            pickup_date: '2026-05-01T00:00:00.000Z',
            return_date: '2026-05-10T00:00:00.000Z',
            total_amount: 150.00,
            payment_status: 'paid',
            items: [
                { name: 'Andaime XPTO', quantity: 2 }
            ]
        };

        // Act
        printRentalContractHTML(mockRental as any);

        // Assert
        expect(windowOpenSpy).toHaveBeenCalledWith('', '_blank');
        expect(mockDocument.open).toHaveBeenCalled();
        expect(mockDocument.write).toHaveBeenCalled();
        expect(mockDocument.close).toHaveBeenCalled();

        // Verificar se os dados cruciais foram injetados no HTML
        const htmlWritten = mockDocument.write.mock.calls[0][0];
        expect(htmlWritten).toContain('Cliente Teste');
        expect(htmlWritten).toContain('999999999');
        expect(htmlWritten).toContain('Andaime XPTO');
        expect(htmlWritten).toContain('150.00 €'); // Verifica formatação do total

        // Clean up
        windowOpenSpy.mockRestore();
    });
});
