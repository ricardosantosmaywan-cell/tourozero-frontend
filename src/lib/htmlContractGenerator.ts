import type { Rental } from '../data/api';

export function printRentalContractHTML(rental: Rental) {
    if (!rental) return;

    const c = rental.customers;
    const customerName = c?.full_name || '________________________';
    const customerNif = c?.tax_id || '________________________';
    const customerPhone = c?.phone || '---';
    const customerEmail = c?.email || '---';
    const startDate = new Date(rental.pickup_date).toLocaleDateString('pt-PT');
    const endDate = new Date(rental.return_date).toLocaleDateString('pt-PT');
    const depositValue = Number(rental.deposit_value || 0).toFixed(2);
    const transportValue = Number(rental.transport_value || 0).toFixed(2);
    const ivaMats = Number(rental.iva_materials || 0).toFixed(2);
    const ivaTransp = Number(rental.iva_transport || 0).toFixed(2);
    const totalAmount = Number(rental.total_amount || 0).toFixed(2);
    const materialsValue = (Number(rental.total_amount || 0) - Number(rental.deposit_value || 0) - Number(rental.transport_value || 0) - Number(rental.iva_materials || 0) - Number(rental.iva_transport || 0)).toFixed(2);
    const rawWorkAddress = (rental.customers as any)?.work_address || '';
    const workAddress = rawWorkAddress
        ? rawWorkAddress.split(' | ').filter(Boolean)[0]
        : '';
    const deliveryAddress = rental.delivery_address || workAddress || 'Recolha nas instalações';

    const hasDelivery = !!(rental.delivery_address || workAddress);
    
    // Período de Aluguer Formatado
    const durationVal = rental.rental_duration_value || rental.semanas || 1;
    const durationType = rental.rental_duration_type === 'dia' ? (durationVal === 1 ? 'Dia' : 'Dias') : (durationVal === 1 ? 'Semana' : 'Semanas');
    const durationText = `${durationVal} ${durationType}`;

    // Conjuntos de andaimes
    let quantitySets: number = 0;
    const andaimeItem = rental.items?.find((i: any) => i.name?.toLowerCase().includes('andaime'));
    if (andaimeItem) {
        quantitySets = andaimeItem.quantity;
    } else {
        quantitySets = rental.items?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) || 0;
    }

    // Gerar linhas de itens para a tabela do recibo
    const itemsRows = (rental.items || []).map((item: any) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #ddd;">${item.name}</td><td style="padding:6px 10px;border-bottom:1px solid #ddd;text-align:center;">${item.quantity}</td></tr>`
    ).join('');

    const now = new Date().toLocaleString('pt-PT');

    const doc = `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<title>Recibo e Contrato - ${customerName}</title>
<style>
@media print {
  @page { size: A4; margin: 15mm; }
  body { margin: 0; padding: 0; }
}
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11pt;
  line-height: 1.4;
  color: #000;
  background: #fff;
  margin: 0;
  padding: 0;
}
.page {
  max-width: 210mm;
  margin: 0 auto;
  padding: 15mm;
  box-sizing: border-box;
}
.page-break {
  page-break-after: always;
}

/* ===== PÁGINA 1: RECIBO ===== */
.recibo-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 3px solid #000;
  padding-bottom: 15px;
  margin-bottom: 20px;
}
.recibo-header h1 {
  font-size: 18pt;
  margin: 0;
  font-weight: 900;
  letter-spacing: -1px;
  white-space: nowrap;
}
.recibo-header .doc-type {
  font-size: 14pt;
  font-weight: bold;
  text-align: right;
}
.client-block {
  margin-bottom: 20px;
}
.client-block h3 {
  font-size: 11pt;
  font-weight: bold;
  margin: 0 0 8px 0;
  text-transform: uppercase;
}
.client-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 20px;
  font-size: 10pt;
}
.client-grid span.label { font-weight: bold; }
.items-table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
}
.items-table th {
  background: #222;
  color: #fff;
  padding: 8px 10px;
  text-align: left;
  font-size: 10pt;
}
.items-table th:last-child { text-align: center; }
.totals-block {
  margin-top: 20px;
  text-align: right;
  font-size: 10.5pt;
}
.totals-block .line {
  display: flex;
  justify-content: flex-end;
  gap: 40px;
  padding: 3px 0;
}
.totals-block .total-final {
  font-size: 14pt;
  font-weight: 900;
  border-top: 2px solid #000;
  padding-top: 8px;
  margin-top: 8px;
}
.recibo-note {
  margin-top: 25px;
  font-size: 9pt;
  font-style: italic;
  color: #555;
}
.recibo-footer {
  margin-top: 40px;
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #999;
  padding-top: 10px;
  font-size: 9pt;
}
.recibo-sig {
  width: 42%;
  text-align: center;
  border-top: 1px solid #000;
  padding-top: 5px;
  margin-top: 50px;
  font-size: 9pt;
}

/* ===== PÁGINA 2: CONTRATO ===== */
.contrato-page {
  font-family: 'Times New Roman', Times, serif;
  font-size: 10.5pt;
  line-height: 1.55;
}
.contrato-page h2 {
  text-align: center;
  text-decoration: underline;
  font-size: 14pt;
  margin: 25px 0 18px 0;
}
.contrato-page p {
  text-align: justify;
  margin: 0 0 10px 0;
}
.checklist-item { margin: 5px 0; }
.contrato-assinaturas {
  display: flex;
  justify-content: space-between;
  margin-top: 60px;
}
.contrato-sig {
  width: 42%;
  text-align: center;
  border-top: 1px solid #000;
  padding-top: 5px;
  font-size: 9.5pt;
}
</style>
</head>
<body>

<!-- ===================== PÁGINA 1: RECIBO ===================== -->
<div class="page page-break">
  <div class="recibo-header">
    <h1>Enredo Janota Unp Lda</h1>
    <div class="doc-type">CONTRATO DE ALUGUER</div>
  </div>

  <div class="client-block">
    <h3>Dados do Cliente</h3>
    <div class="client-grid">
      <div><span class="label">Nome:</span> ${customerName}</div>
      <div><span class="label">Tlm:</span> ${customerPhone}</div>
      <div><span class="label">NIF:</span> ${customerNif}</div>
      <div><span class="label">Email:</span> ${customerEmail}</div>
    </div>
    <div style="margin-top:8px;padding:8px 10px;background:#f5f5f5;border-left:3px solid #000;"><span class="label">Morada da Obra / Entrega:</span> ${deliveryAddress}</div>
  </div>

  <div class="client-block">
    <h3>Detalhes do Aluguer</h3>
    <div class="client-grid">
      <div><span class="label">Data de Recolha:</span> ${startDate}</div>
      <div><span class="label">Data Prevista de Entrega:</span> ${endDate}</div>
    </div>
    <div style="margin-top:5px;"><span class="label">Estado do Pagamento:</span> ${rental.payment_status === 'paid' ? 'Pago' : 'Pendente'}</div>
  </div>

  <table class="items-table">
    <thead><tr><th>Material</th><th>Qtd</th></tr></thead>
    <tbody>${itemsRows || '<tr><td colspan="2" style="padding:8px;text-align:center;color:#999;">Sem itens</td></tr>'}</tbody>
  </table>

  <div class="totals-block">
    <div class="line"><span>Subtotal Materiais:</span> <strong>${materialsValue} €</strong></div>
    <div class="line"><span>IVA Materiais (${Number(materialsValue) > 0 ? Math.round((Number(ivaMats) / Number(materialsValue)) * 100) : 0}%):</span> <strong>${ivaMats} €</strong></div>
    <div style="margin: 5px 0; border-top: 0.5px dashed #ccc; width: 250px; margin-left: auto;"></div>
    <div class="line"><span>Subtotal Transporte:</span> <strong>${transportValue} €</strong></div>
    <div class="line"><span>IVA Transporte (${Number(transportValue) > 0 ? Math.round((Number(ivaTransp) / Number(transportValue)) * 100) : 0}%):</span> <strong>${ivaTransp} €</strong></div>
    <div style="margin: 5px 0; border-top: 0.5px dashed #ccc; width: 250px; margin-left: auto;"></div>
    <div class="line"><span>Caução (Garantia/Isento):</span> <strong>${depositValue} €</strong></div>
    <div class="total-final">
      <div class="line"><span>TOTAL A PAGAR:</span> <strong>${totalAmount} €</strong></div>
    </div>
  </div>

  <p class="recibo-note">* O valor de ${depositValue} € referente ao caução será restituído ao cliente após a conferência e devolução dos materiais em bom estado.</p>

  <p style="margin-top:30px;font-size:9pt;color:#666;">Documento emitido em: ${now}</p>

  <div style="display:flex;justify-content:space-between;margin-top:40px;">
    <div class="recibo-sig">Enredo Janota Unp Lda</div>
    <div class="recibo-sig">O(A) Cliente: ${customerName}</div>
  </div>
</div>

<!-- ===================== PÁGINA 2: CONTRATO JURÍDICO ===================== -->
<div class="page contrato-page">

  <div style="margin-bottom:20px;">
    <p><strong>Adicionais (Pranchas, Pés e Rodas, outros).</strong></p>
    <div class="checklist-item">( &nbsp;&nbsp; ) Pé nivelador ________________________</div>
    <div class="checklist-item">( &nbsp;&nbsp; ) Pranchas ________________________</div>
    <div class="checklist-item">( &nbsp;&nbsp; ) Rodas ________________________</div>
    <div class="checklist-item">( &nbsp;&nbsp; ) Outros ________________________</div>
  </div>

  <p style="font-style:italic;">Obs: Caso necessite de prolongar o período deve ser pago com antecedência. É necessário apresentação dos documentos.</p>

  <h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h2>

  <p><strong>Entre:</strong></p>

  <p><strong>PRIMEIRA OUTORGANTE:</strong> Enredo Janota Unipessoal, Lda., com sede na Rua Judiaria 14, Almada, 2800-125 Almada, Pessoa Coletiva 515 854 832, representada pelo gerente Gabriel Figueiredo Guimarães.</p>

  <p><strong>SEGUNDA OUTORGANTE:</strong> ${customerName}, NIF: ${customerNif}.</p>

  <p>É CELEBRADO O PRESENTE CONTRATO DE PRESTAÇÃO DE SERVIÇOS QUE SE REGE PELAS SEGUINTES CLÁUSULAS:</p>

  <p><strong>CLÁUSULA PRIMEIRA (Objeto):</strong><br>
  O Primeiro Outorgante cede ao Segundo Outorgante, a título de aluguer, os equipamentos detalhados neste documento, garantindo o seu bom estado de funcionamento no momento da entrega.</p>

  <p><strong>CLÁUSULA SEGUNDA (Prazo):</strong><br>
  O aluguer tem início na data de recolha (${startDate}) e término na data prevista de entrega (${endDate}), correspondendo a um período de <strong>${durationText}</strong>, podendo ser prorrogado mediante acordo prévio e pagamento antecipado.${hasDelivery ? ` A entrega e recolha do equipamento será efetuada na morada: <strong>${deliveryAddress}</strong>.` : ' A recolha e devolução do equipamento será efetuada nas instalações da Primeira Outorgante.'}</p>

  <p><strong>CLÁUSULA TERCEIRA:</strong><br>
  UM – Cedência de ${quantitySets} Conjuntos (2 laterais, 1 cruzeta, 1 travão, 1 prancha).<br>
  DOIS – Valor de ${materialsValue} € (Materiais) + ${transportValue} € (Transporte) + IVAs correspondentes + caução de ${depositValue} €.<br>
  TRÊS – Multa por atraso conforme acordado.</p>

  <p><strong>CLÁUSULA QUARTA (Responsabilidade e Manutenção):</strong><br>
  O Segundo Outorgante assume total responsabilidade pela guarda, conservação e correta utilização dos equipamentos, obrigando-se a restituí-los nas mesmas condições. Em caso de dano, furto ou extravio, o Segundo Outorgante indemnizará o Primeiro Outorgante no valor de substituição integral do material, perdendo imediatamente o direito ao valor da caução entregue.</p>

  <p><strong>CLÁUSULA QUINTA (Resolução):</strong><br>
  O incumprimento de qualquer obrigação estipulada constitui motivo de resolução imediata do presente contrato, reservando-se o Primeiro Outorgante o direito de recolher o equipamento de imediato, sem necessidade de aviso prévio ou indemnização.</p>

  <p><strong>CLÁUSULA SEXTA (Foro Competente):</strong><br>
  Para dirimir quaisquer litígios emergentes da interpretação ou execução deste contrato, as partes estipulam como competente o foro da Comarca de Almada, com expressa renúncia a qualquer outro foro legal.</p>

  <p style="margin-top:20px;">Data de recolha: <strong>${startDate}</strong> &nbsp;|&nbsp; Tendo a data da entrega: <strong>${endDate}</strong></p>

  <div class="contrato-assinaturas">
    <div class="contrato-sig">A PRIMEIRA OUTORGANTE</div>
    <div class="contrato-sig">A SEGUNDA OUTORGANTE</div>
  </div>

</div>

<script>
window.onload = function() {
  setTimeout(function() { window.print(); }, 600);
};
</script>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) {
        w.document.open();
        w.document.write(doc);
        w.document.close();
    } else {
        alert('Pop-up bloqueado. Permita pop-ups para imprimir o contrato.');
    }
}
