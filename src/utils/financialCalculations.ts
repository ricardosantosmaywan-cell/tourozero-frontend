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
 * Calcula a partilha de lucros entre Gabriel (80% base) e Ricardo (20% base)
 * e 50% / 50% de transporte.
 * Calcula também o acerto de contas (quem deve transferir para quem).
 */
export function calculatePartnershipSummary(totals: PartnershipTotals): PartnershipSummary {
    const gabrielBase = totals.materialsTotal * 0.8;
    const ricardoBase = totals.materialsTotal * 0.2;
    const transportSplit = totals.transportTotal / 2;

    const gabrielTotalToReceive = gabrielBase + transportSplit;
    const ricardoTotalToReceive = ricardoBase + transportSplit;

    const diffGabriel = gabrielTotalToReceive - totals.receivedGabriel;
    const isRicardoToGabriel = diffGabriel >= 0;
    const transferAmount = Math.abs(diffGabriel);

    return {
        gabrielBase,
        gabrielTransport: transportSplit,
        gabrielTotalToReceive,
        
        ricardoBase,
        ricardoTransport: transportSplit,
        ricardoTotalToReceive,
        
        diffGabriel,
        isRicardoToGabriel,
        transferAmount
    };
}
