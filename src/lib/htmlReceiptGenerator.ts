import type { Rental } from '../data/api';

const escapeHtml = (value: unknown): string =>
    String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));

const money = (value: number): string => `${value.toFixed(2)} €`;
const round2 = (value: number): number => Math.round(value * 100) / 100;

function buildReceiptDocument(rental: Rental): string {
    const c = rental.customers;
    const customerName = escapeHtml(c?.full_name || '________________________');
    const customerNif = escapeHtml(c?.tax_id || '---');
    const customerPhone = escapeHtml(c?.phone || '---');
    const customerEmail = escapeHtml(c?.email || '---');

    // A data de fim efetiva é a do último prolongamento, se existir
    const exts = Array.isArray(rental.extensions_history) ? rental.extensions_history : [];
    const lastExt = exts.length > 0 ? exts[exts.length - 1] : null;
    const endDateRaw = lastExt?.new_return_date || rental.return_date;
    const startDate = new Date(rental.pickup_date).toLocaleDateString('pt-PT');
    const endDate = new Date(endDateRaw).toLocaleDateString('pt-PT');

    const total = Number(rental.total_amount || 0);
    const deposit = Number(rental.deposit_value || 0);
    const transport = Number(rental.transport_value || 0);
    const ivaMats = Number(rental.iva_materials || 0);
    const ivaTransp = Number(rental.iva_transport || 0);
    const materials = round2(total - deposit - transport - ivaMats - ivaTransp);
    // A caução é uma garantia restituível: não faz parte do valor recebido pelo serviço
    const totalReceived = round2(materials + ivaMats + transport + ivaTransp);

    const items = rental.items || [];
    const itemRows = items.map((item: any) => {
        const itemName = item.name || (Array.isArray(item.products) ? item.products[0]?.name : item.products?.name) || 'Item';
        const lineValue = round2(Number(item.price_unit || 0) * Number(item.quantity || 0));
        return { name: itemName, quantity: Number(item.quantity || 0), value: lineValue };
    });
    const itemsSum = round2(itemRows.reduce((sum, row) => sum + row.value, 0));

    // Diferença entre o subtotal e as linhas: prolongamentos, ajustes ou contratos antigos sem valor por item
    const remainder = round2(materials - itemsSum);
    const rowsHtml = itemRows.map(row =>
        `<tr><td>${escapeHtml(row.name)}</td><td class="c">${row.quantity}</td><td class="r">${row.value > 0 ? money(row.value) : '—'}</td></tr>`
    );
    if (remainder > 0.005) {
        const label = itemsSum > 0 ? 'Prolongamentos / ajustes' : 'Aluguer de materiais (valor global)';
        rowsHtml.push(`<tr><td>${label}</td><td class="c">—</td><td class="r">${money(remainder)}</td></tr>`);
    }

    const pct = (part: number, base: number) => (base > 0 ? Math.round((part / base) * 100) : 0);
    const reference = escapeHtml(String(rental.id || '').slice(0, 8).toUpperCase());
    const now = new Date().toLocaleString('pt-PT');
    const receivedBy = rental.received_by && rental.received_by !== 'Não definido' ? escapeHtml(rental.received_by) : '';

    return `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<title>Recibo - ${customerName}</title>
<style>
@media print { @page { size: A4; margin: 15mm; } body { margin: 0; } }
body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.4; color: #000; background: #fff; margin: 0; }
.page { max-width: 210mm; margin: 0 auto; padding: 15mm; box-sizing: border-box; }
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
.header h1 { font-size: 18pt; margin: 0; font-weight: 900; letter-spacing: -1px; }
.header .doc { text-align: right; }
.header .doc strong { display: block; font-size: 16pt; }
.header .doc span { font-size: 9pt; color: #555; }
h3 { font-size: 11pt; margin: 0 0 8px 0; text-transform: uppercase; }
.block { margin-bottom: 20px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; font-size: 10pt; }
.label { font-weight: bold; }
.declaration { margin: 0 0 20px 0; padding: 10px 12px; background: #f5f5f5; border-left: 3px solid #000; font-size: 10.5pt; }
table { width: 100%; border-collapse: collapse; margin: 10px 0; }
th { border-bottom: 2px solid #000; padding: 8px 10px; text-align: left; font-size: 10pt; }
td { padding: 6px 10px; border-bottom: 1px solid #ddd; }
th.c, td.c { text-align: center; }
th.r, td.r { text-align: right; white-space: nowrap; }
.totals { margin-top: 20px; text-align: right; font-size: 10.5pt; }
.totals .line { display: flex; justify-content: flex-end; gap: 40px; padding: 3px 0; }
.totals .final { font-size: 14pt; font-weight: 900; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
.note { margin-top: 20px; font-size: 9pt; font-style: italic; color: #555; }
.sig { width: 42%; text-align: center; border-top: 1px solid #000; padding-top: 5px; margin: 50px 0 0 auto; font-size: 9pt; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>Enredo Janota Unp Lda</h1>
    <div class="doc"><strong>RECIBO</strong><span>Ref. ${reference}</span></div>
  </div>

  <div class="block">
    <h3>Dados do Cliente</h3>
    <div class="grid">
      <div><span class="label">Nome:</span> ${customerName}</div>
      <div><span class="label">Tlm:</span> ${customerPhone}</div>
      <div><span class="label">NIF:</span> ${customerNif}</div>
      <div><span class="label">Email:</span> ${customerEmail}</div>
    </div>
  </div>

  <div class="declaration">
    Recebemos de <strong>${customerName}</strong> a quantia de <strong>${money(totalReceived)}</strong>
    referente ao aluguer de material no período de <strong>${startDate}</strong> a <strong>${endDate}</strong>.
  </div>

  <table>
    <thead><tr><th>Material</th><th class="c">Qtd</th><th class="r">Valor</th></tr></thead>
    <tbody>${rowsHtml.join('') || '<tr><td colspan="3" style="text-align:center;color:#999;">Sem itens</td></tr>'}</tbody>
  </table>

  <div class="totals">
    <div class="line"><span>Subtotal Materiais:</span> <strong>${money(materials)}</strong></div>
    <div class="line"><span>IVA Materiais (${pct(ivaMats, materials)}%):</span> <strong>${money(ivaMats)}</strong></div>
    ${transport > 0 ? `
    <div class="line"><span>Transporte:</span> <strong>${money(transport)}</strong></div>
    <div class="line"><span>IVA Transporte (${pct(ivaTransp, transport)}%):</span> <strong>${money(ivaTransp)}</strong></div>` : ''}
    <div class="final"><div class="line"><span>TOTAL PAGO:</span> <strong>${money(totalReceived)}</strong></div></div>
  </div>

  ${deposit > 0 ? `<p class="note">* A caução de ${money(deposit)} é uma garantia restituível e não está incluída no valor deste recibo.</p>` : ''}
  <p class="note">Documento emitido em: ${now}${receivedBy ? ` &nbsp;|&nbsp; Recebido por: ${receivedBy}` : ''}</p>

  <div class="sig">Enredo Janota Unp Lda</div>
</div>
</body>
</html>`;
}

/**
 * Abre o diálogo de impressão / "Guardar como PDF" do recibo.
 * Usa um iframe oculto (em vez de window.open) para não ser bloqueado como pop-up
 * quando chamado depois de operações assíncronas.
 */
export function printRentalReceiptHTML(rental: Rental) {
    if (!rental) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const cleanup = () => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
        cleanup();
        alert('Não foi possível preparar o recibo para impressão.');
        return;
    }

    doc.open();
    doc.write(buildReceiptDocument(rental));
    doc.close();

    win.onafterprint = cleanup;
    // Pequena espera para o iframe renderizar antes de imprimir
    setTimeout(() => {
        win.focus();
        win.print();
        // Fallback caso o navegador não dispare onafterprint
        setTimeout(cleanup, 60_000);
    }, 300);
}
