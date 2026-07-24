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

        // Gabriel: 70% de 1000 = 700 + 70% de 200 (140) = 840
        expect(result.gabrielBase).toBe(700);
        expect(result.gabrielTransport).toBe(140);
        expect(result.gabrielTotalToReceive).toBe(840);

        // Ricardo: 30% de 1000 = 300 + 30% de 200 (60) = 360
        expect(result.ricardoBase).toBe(300);
        expect(result.ricardoTransport).toBe(60);
        expect(result.ricardoTotalToReceive).toBe(360);

        // Ninguém recebeu nada, logo Gabriel tem a receber 840 de quem tem o dinheiro
        expect(result.diffGabriel).toBe(840);
        expect(result.isRicardoToGabriel).toBe(true);
        expect(result.transferAmount).toBe(840);
    });

    it('calcula o acerto de contas quando Ricardo recebeu todo o dinheiro em mão', () => {
        const result = calculatePartnershipSummary({
            materialsTotal: 1000,
            transportTotal: 200,
            receivedGabriel: 0,
            receivedRicardo: 1200 // Recebeu o total
        });

        // Gabriel tem direito a 840, recebeu 0. Ricardo deve transferir 840.
        expect(result.diffGabriel).toBe(840);
        expect(result.isRicardoToGabriel).toBe(true);
        expect(result.transferAmount).toBe(840);
    });

    it('calcula o acerto de contas quando Gabriel recebeu mais do que a sua parte', () => {
        const result = calculatePartnershipSummary({
            materialsTotal: 1000, // Gabriel tem direito a 700
            transportTotal: 0,
            receivedGabriel: 1000, // Gabriel recebeu tudo em mão
            receivedRicardo: 0
        });

        // Gabriel tem direito a 700, recebeu 1000. Gabriel deve devolver 300 ao Ricardo.
        expect(result.diffGabriel).toBe(-300);
        expect(result.isRicardoToGabriel).toBe(false);
        expect(result.transferAmount).toBe(300);
    });

    it('calcula corretamente com casas decimais', () => {
        const result = calculatePartnershipSummary({
            materialsTotal: 150.50,
            transportTotal: 30.25,
            receivedGabriel: 50.10,
            receivedRicardo: 0
        });

        // Gabriel: 70% de 150.50 = 105.35
        // Transport: 70% de 30.25 = 21.175
        // Gabriel To Receive: 126.525
        // diffGabriel: 126.525 - 50.10 = 76.425
        expect(result.gabrielBase).toBeCloseTo(105.35);
        expect(result.gabrielTransport).toBeCloseTo(21.175);
        expect(result.gabrielTotalToReceive).toBeCloseTo(126.525);

        expect(result.diffGabriel).toBeCloseTo(76.425);
        expect(result.isRicardoToGabriel).toBe(true);
        expect(result.transferAmount).toBeCloseTo(76.425);
    });
});
