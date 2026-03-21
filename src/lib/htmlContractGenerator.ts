import type { Rental } from '../data/mockDatabase';

export function printRentalContractHTML(rental: Rental) {
    if (!rental) return;

    const customer = rental.customers;
    const start_date = new Date(rental.pickup_date).toLocaleDateString('pt-BR');
    const end_date = new Date(rental.return_date).toLocaleDateString('pt-BR');
    
    const deposit_value = Number(rental.deposit_value || 0).toFixed(2);
    // Subtotal dos materiais
    const total_price = (Number(rental.total_amount) - Number(rental.deposit_value || 0) - Number(rental.transport_value || 0)).toFixed(2);
    
    // Calcula quantidade total aproximada de conjuntos (andaimes)
    let quantity_sets = rental.items?.find((i: any) => i.name.toLowerCase().includes('andaime'))?.quantity;
    if (!quantity_sets) {
        // Fallback: soma todas as quantidades ou define 0
        quantity_sets = rental.items?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) || 0;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
    <meta charset="UTF-8">
    <title>Contrato Tourozero - ${customer.full_name}</title>
    <style>
        @media print {
            @page {
                size: A4;
                margin: 20mm;
            }
            body {
                background: white;
                color: black;
                margin: 0;
                padding: 0;
            }
            .no-print {
                display: none;
            }
            .document-container {
                box-shadow: none !important;
                padding: 0 !important;
                background: transparent !important;
            }
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
        }
        .document-container {
            background: white;
            padding: 0;
            max-width: 210mm;
            width: 100%;
            box-shadow: none;
            box-sizing: border-box;
        }
        h1 {
            text-align: center;
            font-weight: bold;
            font-size: 16pt;
            text-decoration: underline;
            margin-bottom: 25px;
            margin-top: 0;
        }
        .section {
            margin-bottom: 15px;
            text-align: justify;
        }
        .signatures {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
        }
        .signature-box {
            width: 45%;
            text-align: center;
            border-top: 1px solid #000;
            padding-top: 5px;
            font-size: 10pt;
        }
        .checkbox-list {
            list-style: none;
            padding: 0;
            margin: 5px 0 0 0;
        }
        .checkbox-item {
            margin-bottom: 8px;
        }
        p {
            margin: 0 0 10px 0;
        }
    </style>
</head>
<body onload="setTimeout(() => { window.print(); window.onafterprint = function(){ window.close(); }; }, 500);">
    <div class="document-container">
        <div class="section" style="margin-bottom: 20px;">
            <p><strong>Adicionais (Pranchas, Pés e Rodas, outros).</strong></p>
            <ul class="checkbox-list">
                <li class="checkbox-item">( &nbsp; ) Pé nivelador ________________________</li>
                <li class="checkbox-item">( &nbsp; ) Pranchas ________________________</li>
                <li class="checkbox-item">( &nbsp; ) Rodas ________________________</li>
                <li class="checkbox-item">( &nbsp; ) Outros ________________________</li>
            </ul>
        </div>

        <div class="section" style="margin-bottom: 30px;">
            <p>Obs: Caso necessite de prolongar o período deve ser pago com antecedência. É necessário apresentação dos documentos.</p>
        </div>

        <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
        
        <div class="section">
            <p><strong>Entre:</strong><br>
            <strong>PRIMEIRA OUTORGANTE:</strong> Enredo Janota Unipessoal, Lda., com sede na Rua Judiaria 14, Almada, 2800-125 Almada, Pessoa Coletiva 515 854 832, representada pelo gerente Gabriel Figueiredo Guimarães.</p>
            
            <p><strong>SEGUNDA OUTORGANTE:</strong> ${customer.full_name}, NIF: ${customer.tax_id || '___________'}.</p>
        </div>

        <div class="section">
            <p>É CELEBRADO O PRESENTE CONTRATO DE PRESTAÇÃO DE SERVIÇOS QUE SE REGE PELAS SEGUINTES CLÁUSULAS:</p>
        </div>

        <div class="section">
            <p><strong>CLÁUSULA PRIMEIRA (Objeto):</strong><br>
            O Primeiro Outorgante cede ao Segundo Outorgante, a título de aluguer, os equipamentos detalhados neste documento, garantindo o seu bom estado de funcionamento no momento da entrega.</p>
        </div>

        <div class="section">
            <p><strong>CLÁUSULA SEGUNDA (Prazo):</strong><br>
            O aluguer tem início na data de recolha (${start_date}) e término na data prevista de entrega (${end_date}), podendo ser prorrogado mediante acordo prévio e pagamento antecipado.</p>
        </div>

        <div class="section">
            <p><strong>CLÁUSULA TERCEIRA:</strong><br>
            UM – Cedência de ${quantity_sets} Conjuntos (2 laterais, 1 cruzeta, 1 travão, 1 prancha).<br>
            DOIS – Valor de ${total_price} € + IVA + caução de ${deposit_value} €.<br>
            TRÊS – Multa por atraso conforme acordado.</p>
        </div>

        <div class="section">
            <p><strong>CLÁUSULA QUARTA (Responsabilidade e Manutenção):</strong><br>
            O Segundo Outorgante assume total responsabilidade pela guarda, conservação e correta utilização dos equipamentos, obrigando-se a restituí-los nas mesmas condições. Em caso de dano, furto ou extravio, o Segundo Outorgante indemnizará o Primeiro Outorgante no valor de substituição integral do material, perdendo imediatamente o direito ao valor da caução entregue.</p>
        </div>

        <div class="section">
            <p><strong>CLÁUSULA QUINTA (Resolução):</strong><br>
            O incumprimento de qualquer obrigação estipulada constitui motivo de resolução imediata do presente contrato, reservando-se o Primeiro Outorgante o direito de recolher o equipamento de imediato, sem necessidade de aviso prévio ou indemnização.</p>
        </div>

        <div class="section">
            <p><strong>CLÁUSULA SEXTA (Foro Competente):</strong><br>
            Para dirimir quaisquer litígios emergentes da interpretação ou execução deste contrato, as partes estipulam como competente o foro da Comarca de Almada, com expressa renúncia a qualquer outro foro legal.</p>
        </div>

        <div class="section" style="margin-top: 20px;">
            <p>Data de recolha: <strong>${start_date}</strong> | Tendo a data da entrega: <strong>${end_date}</strong></p>
        </div>

        <div class="signatures">
            <div class="signature-box">
                <p>A PRIMEIRA OUTORGANTE</p>
            </div>
            <div class="signature-box">
                <p>A SEGUNDA OUTORGANTE</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
    } else {
        alert('O bloqueador de janelas pop-up está ativo. Por favor, permita a abertura de janelas para gerar o contrato.');
    }
}
