import type { Rental } from '../data/mockDatabase';

export function printRentalContractHTML(rental: Rental) {
    if (!rental) return;

    const c = rental.customers;
    const customerName = c?.full_name || '________________________';
    const customerNif = c?.tax_id || '________________________';
    const startDate = new Date(rental.pickup_date).toLocaleDateString('pt-PT');
    const endDate = new Date(rental.return_date).toLocaleDateString('pt-PT');
    const depositValue = Number(rental.deposit_value || 0).toFixed(2);
    const totalPrice = (Number(rental.total_amount || 0) - Number(rental.deposit_value || 0) - Number(rental.transport_value || 0)).toFixed(2);

    // Conjuntos de andaimes
    let quantitySets: number = 0;
    const andaimeItem = rental.items?.find((i: any) => i.name?.toLowerCase().includes('andaime'));
    if (andaimeItem) {
        quantitySets = andaimeItem.quantity;
    } else {
        quantitySets = rental.items?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) || 0;
    }

    const doc = `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<title>Contrato Juridico - ${customerName}</title>
<style>
@media print {
  @page { size: A4; margin: 18mm; }
  body { margin: 0; padding: 0; }
}
body {
  font-family: 'Times New Roman', Times, serif;
  font-size: 12pt;
  line-height: 1.6;
  color: #000;
  background: #fff;
  max-width: 210mm;
  margin: 0 auto;
  padding: 20mm;
}
h2 {
  text-align: center;
  text-decoration: underline;
  font-size: 15pt;
  margin: 30px 0 20px 0;
}
p { text-align: justify; margin: 0 0 12px 0; }
.checklist { margin: 0 0 25px 0; }
.checklist-item { margin: 6px 0; }
.obs { margin: 0 0 30px 0; font-style: italic; }
.assinaturas {
  display: flex;
  justify-content: space-between;
  margin-top: 80px;
}
.assinatura {
  width: 42%;
  text-align: center;
  border-top: 1px solid #000;
  padding-top: 8px;
  font-size: 11pt;
}
</style>
</head>
<body>

<div class="checklist">
<p><strong>Adicionais (Pranchas, P\u00e9s e Rodas, outros).</strong></p>
<div class="checklist-item">( &nbsp;&nbsp; ) P\u00e9 nivelador ________________________</div>
<div class="checklist-item">( &nbsp;&nbsp; ) Pranchas ________________________</div>
<div class="checklist-item">( &nbsp;&nbsp; ) Rodas ________________________</div>
<div class="checklist-item">( &nbsp;&nbsp; ) Outros ________________________</div>
</div>

<p class="obs">Obs: Caso necessite de prolongar o per\u00edodo deve ser pago com anteced\u00eancia. \u00c9 necess\u00e1rio apresenta\u00e7\u00e3o dos documentos.</p>

<h2>CONTRATO DE PRESTA\u00c7\u00c3O DE SERVI\u00c7OS</h2>

<p><strong>Entre:</strong></p>

<p><strong>PRIMEIRA OUTORGANTE:</strong> Enredo Janota Unipessoal, Lda., com sede na Rua Judiaria 14, Almada, 2800-125 Almada, Pessoa Coletiva 515 854 832, representada pelo gerente Gabriel Figueiredo Guimar\u00e3es.</p>

<p><strong>SEGUNDA OUTORGANTE:</strong> ${customerName}, NIF: ${customerNif}.</p>

<p>\u00c9 CELEBRADO O PRESENTE CONTRATO DE PRESTA\u00c7\u00c3O DE SERVI\u00c7OS QUE SE REGE PELAS SEGUINTES CL\u00c1USULAS:</p>

<p><strong>CL\u00c1USULA PRIMEIRA (Objeto):</strong><br>
O Primeiro Outorgante cede ao Segundo Outorgante, a t\u00edtulo de aluguer, os equipamentos detalhados neste documento, garantindo o seu bom estado de funcionamento no momento da entrega.</p>

<p><strong>CL\u00c1USULA SEGUNDA (Prazo):</strong><br>
O aluguer tem in\u00edcio na data de recolha (${startDate}) e t\u00e9rmino na data prevista de entrega (${endDate}), podendo ser prorrogado mediante acordo pr\u00e9vio e pagamento antecipado.</p>

<p><strong>CL\u00c1USULA TERCEIRA:</strong><br>
UM \u2013 Ced\u00eancia de ${quantitySets} Conjuntos (2 laterais, 1 cruzeta, 1 trav\u00e3o, 1 prancha).<br>
DOIS \u2013 Valor de ${totalPrice} \u20ac + IVA + cau\u00e7\u00e3o de ${depositValue} \u20ac.<br>
TR\u00caS \u2013 Multa por atraso conforme acordado.</p>

<p><strong>CL\u00c1USULA QUARTA (Responsabilidade e Manuten\u00e7\u00e3o):</strong><br>
O Segundo Outorgante assume total responsabilidade pela guarda, conserva\u00e7\u00e3o e correta utiliza\u00e7\u00e3o dos equipamentos, obrigando-se a restitu\u00ed-los nas mesmas condi\u00e7\u00f5es. Em caso de dano, furto ou extravio, o Segundo Outorgante indemnizar\u00e1 o Primeiro Outorgante no valor de substitui\u00e7\u00e3o integral do material, perdendo imediatamente o direito ao valor da cau\u00e7\u00e3o entregue.</p>

<p><strong>CL\u00c1USULA QUINTA (Resolu\u00e7\u00e3o):</strong><br>
O incumprimento de qualquer obriga\u00e7\u00e3o estipulada constitui motivo de resolu\u00e7\u00e3o imediata do presente contrato, reservando-se o Primeiro Outorgante o direito de recolher o equipamento de imediato, sem necessidade de aviso pr\u00e9vio ou indemniza\u00e7\u00e3o.</p>

<p><strong>CL\u00c1USULA SEXTA (Foro Competente):</strong><br>
Para dirimir quaisquer lit\u00edgios emergentes da interpreta\u00e7\u00e3o ou execu\u00e7\u00e3o deste contrato, as partes estipulam como competente o foro da Comarca de Almada, com expressa ren\u00fancia a qualquer outro foro legal.</p>

<p>Data de recolha: <strong>${startDate}</strong> &nbsp; | &nbsp; Tendo a data da entrega: <strong>${endDate}</strong></p>

<div class="assinaturas">
<div class="assinatura">A PRIMEIRA OUTORGANTE</div>
<div class="assinatura">A SEGUNDA OUTORGANTE</div>
</div>

</body>
</html>`;

    const w = window.open('', '_blank');
    if (w) {
        w.document.open();
        w.document.write(doc);
        w.document.close();
        w.onload = () => {
            setTimeout(() => {
                w.print();
            }, 400);
        };
    } else {
        alert('Pop-up bloqueado. Permita pop-ups para imprimir o contrato.');
    }
}
