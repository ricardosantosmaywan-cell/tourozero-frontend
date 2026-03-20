import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Rental } from '../data/mockDatabase';

export function generateRentalContract(rental: Rental) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- CABEÇALHO ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('Tourozero', 14, 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.text('CONTRATO DE ALUGUER', pageWidth - 14, 25, { align: 'right' });

    // Linha divisória
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(14, 30, pageWidth - 14, 30);

    // --- DADOS DO CLIENTE ---
    const startYCustomer = 40;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', 14, startYCustomer);

    doc.setFont('helvetica', 'normal');
    const customer = rental.customers;
    const phoneInfo = customer.phone ? `Tlm: ${customer.phone}` : 'Tlm: N/A';
    const emailInfo = customer.email ? `Email: ${customer.email}` : 'Email: N/A';
    const nifInfo = `NIF: ${customer.tax_id || 'N/A'}`;

    // Fallback: garante que lê rental.delivery_address, ou que indica recolha
    const moradaFinal = rental.delivery_address && rental.delivery_address.trim() !== ''
        ? rental.delivery_address
        : 'Recolha nas instalações';

    doc.text(`Nome: ${customer.full_name}`, 14, startYCustomer + 8);
    doc.text(nifInfo, 14, startYCustomer + 14);
    doc.text(`Morada de Entrega: ${moradaFinal}`, 14, startYCustomer + 20);

    doc.text(phoneInfo, pageWidth / 2, startYCustomer + 8);
    doc.text(emailInfo, pageWidth / 2, startYCustomer + 14);


    // --- DADOS DO ALUGUER ---
    const startYRental = startYCustomer + 35;
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHES DO ALUGUER', 14, startYRental);

    doc.setFont('helvetica', 'normal');
    doc.text(`Data de Recolha: ${new Date(rental.pickup_date).toLocaleDateString('pt-BR')}`, 14, startYRental + 8);
    doc.text(`Data Prevista de Entrega: ${new Date(rental.return_date).toLocaleDateString('pt-BR')}`, pageWidth / 2, startYRental + 8);

    // --- TABELA DE ITENS ---
    const tableData = rental.items.map(item => [
        item.name,
        item.quantity.toString()
    ]);

    autoTable(doc, {
        startY: startYRental + 15,
        head: [['Material', 'Qtd']],
        body: tableData,
        theme: 'plain',
        headStyles: {
            fillColor: false,
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            lineWidth: { bottom: 0.5 },
            lineColor: [0, 0, 0]
        },
        bodyStyles: {
            lineColor: [200, 200, 200],
            lineWidth: { bottom: 0.1 },
            textColor: [0, 0, 0],
            fillColor: false
        },
        alternateRowStyles: {
            fillColor: false
        },
        margin: { top: 10, left: 14, right: 14 }
    });

    // --- TOTAL ---
    // cast pois na declaração do jspdf autoTable "lastAutoTable" entra como propriedade estendida
    const finalY = (doc as any).lastAutoTable.finalY || startYRental + 30;

    const subtotal = Number(rental.total_value) - Number(rental.transport_fee || 0) - Number(rental.deposit_fee || 0);
    const transport = Number(rental.transport_fee || 0);
    const deposit = Number(rental.deposit_fee || 0);
    const total = Number(rental.total_value);

    let currentY = finalY + 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    doc.text(`Valor dos Materiais: ${subtotal.toFixed(2)} €`, pageWidth - 14, currentY, { align: 'right' });
    currentY += 6;
    
    if (transport > 0) {
        doc.text(`Serviço de Transporte: ${transport.toFixed(2)} €`, pageWidth - 14, currentY, { align: 'right' });
        currentY += 6;
    }
    
    if (deposit > 0) {
        doc.text(`Valor de Caução (Garantia Reembolsável): ${deposit.toFixed(2)} €`, pageWidth - 14, currentY, { align: 'right' });
        currentY += 6;
    }
    
    currentY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL A PAGAR NO ATO: ${total.toFixed(2)} €`, pageWidth - 14, currentY, { align: 'right' });

    if (deposit > 0) {
        currentY += 12;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text(`* O valor de ${deposit.toFixed(2)} € referente ao caução será restituído ao cliente após a conferência e devolução dos materiais em bom estado.`, 14, currentY, { maxWidth: pageWidth - 28 });
    }

    // --- DATA DE EMISSÃO E ASSINATURAS ---
    const signatureY = currentY + 30;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Documento emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, signatureY - 10);

    doc.setDrawColor(0);
    doc.setLineWidth(0.3);

    // Linha Tourozero
    doc.line(14, signatureY + 10, (pageWidth / 2) - 10, signatureY + 10);
    doc.text('Tourozero', 14, signatureY + 15);

    // Linha Cliente
    doc.line((pageWidth / 2) + 10, signatureY + 10, pageWidth - 14, signatureY + 10);
    doc.text(`O(A) Cliente: ${customer.full_name}`, (pageWidth / 2) + 10, signatureY + 15);

    // Guardar Documento PDF localmente com nome formatado
    doc.save(`Contrato_Tourozero_${customer.full_name.replace(/\s+/g, '_')}_${rental.id.substring(0, 5)}.pdf`);
}
