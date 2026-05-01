import { describe, it, expect } from 'vitest';
import { calculatePartnershipSummary } from '../utils/financialCalculations';

describe('financialCalculations - calculatePartnershipSummary', () => {
    it('calcula corretamente uma partilha justa (sem recebimentos prévios)', () => {
        const result = calculatePartnershipSummary({
            materialsTotal: 1000,
            transportTotal: 200,
            receivedGabriel: 0,
            receivedRicardo: 0
        });

        // Gabriel: 80% de 1000 = 800 + 100 (metade transporte) = 900
        expect(result.gabrielBase).toBe(800);
        expect(result.gabrielTransport).toBe(100);
        expect(result.gabrielTotalToReceive).toBe(900);

        // Ricardo: 20% de 1000 = 200 + 100 (metade transporte) = 300
        expect(result.ricardoBase).toBe(200);
        expect(result.ricardoTransport).toBe(100);
        expect(result.ricardoTotalToReceive).toBe(300);

        // Ninguém recebeu nada, logo Gabriel tem a receber 900 de quem tem o dinheiro
        expect(result.diffGabriel).toBe(900);
        expect(result.isRicardoToGabriel).toBe(true);
        expect(result.transferAmount).toBe(900);
    });

    it('calcula o acerto de contas quando Ricardo recebeu todo o dinheiro em mão', () => {
        const result = calculatePartnershipSummary({
            materialsTotal: 1000,
            transportTotal: 200,
            receivedGabriel: 0,
            receivedRicardo: 1200 // Recebeu o total
        });

        // Gabriel tem direito a 900, recebeu 0. Ricardo deve transferir 900.
        expect(result.diffGabriel).toBe(900);
        expect(result.isRicardoToGabriel).toBe(true);
        expect(result.transferAmount).toBe(900);
    });

    it('calcula o acerto de contas quando Gabriel recebeu mais do que a sua parte', () => {
        const result = calculatePartnershipSummary({
            materialsTotal: 1000, // Gabriel tem direito a 800
            transportTotal: 0,
            receivedGabriel: 1000, // Gabriel recebeu tudo em mão
            receivedRicardo: 0
        });

        // Gabriel tem direito a 800, recebeu 1000. Gabriel deve devolver 200 ao Ricardo.
        expect(result.diffGabriel).toBe(-200);
        expect(result.isRicardoToGabriel).toBe(false);
        expect(result.transferAmount).toBe(200);
    });

    it('calcula corretamente com casas decimais', () => {
        const result = calculatePartnershipSummary({
            materialsTotal: 150.50,
            transportTotal: 30.25,
            receivedGabriel: 50.10,
            receivedRicardo: 0
        });

        // Gabriel: 80% de 150.50 = 120.40
        // Transport: 30.25 / 2 = 15.125
        // Gabriel To Receive: 135.525
        // diffGabriel: 135.525 - 50.10 = 85.425
        expect(result.gabrielBase).toBeCloseTo(120.40);
        expect(result.gabrielTransport).toBeCloseTo(15.125);
        expect(result.gabrielTotalToReceive).toBeCloseTo(135.525);
        
        expect(result.diffGabriel).toBeCloseTo(85.425);
        expect(result.isRicardoToGabriel).toBe(true);
        expect(result.transferAmount).toBeCloseTo(85.425);
    });
});
