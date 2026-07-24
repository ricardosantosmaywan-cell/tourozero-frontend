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
