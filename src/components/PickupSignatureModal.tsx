import { useRef, useState } from 'react';
import { Button } from './ui/Button';
import { X, Loader2, Trash2, Share2, CheckCircle2 } from 'lucide-react';
import { SignaturePad, type SignaturePadHandle } from './SignaturePad';
import type { Rental } from '../data/api';
import { generateSignedContractPdf } from '../lib/htmlContractGenerator';
import { supabase } from '../lib/supabase';

interface PickupSignatureModalProps {
    isOpen: boolean;
    onClose: () => void;
    rental: Rental | null;
    confirmPickup: (id: string) => Promise<void>;
    updateRentalPartial: (id: string, data: any) => Promise<void>;
    refreshProducts: () => Promise<void>;
    onConfirmed?: () => void;
}

export function PickupSignatureModal({ isOpen, onClose, rental, confirmPickup, updateRentalPartial, refreshProducts, onConfirmed }: PickupSignatureModalProps) {
    const padRef = useRef<SignaturePadHandle>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen || !rental) return null;

    const clientName = rental.customers?.full_name || 'Cliente';
    const itemsList = (rental.items || []).map(it => `${it.quantity}x ${it.name}`).join(', ');

    async function handleConfirm() {
        setError('');
        if (!padRef.current || padRef.current.isEmpty()) {
            setError('O cliente precisa de assinar no campo acima antes de confirmar.');
            return;
        }
        if (!rental) return;

        setSubmitting(true);
        try {
            const signatureDataUrl = padRef.current.toDataURL();
            const pdfBlob = await generateSignedContractPdf(rental, signatureDataUrl);

            const fileName = `contracts/${rental.id}_${Date.now()}.pdf`;
            const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, pdfBlob, {
                contentType: 'application/pdf',
                upsert: true,
            });
            if (uploadError) throw new Error(uploadError.message);
            const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(fileName);
            const signedUrl = publicUrlData.publicUrl;

            await confirmPickup(rental.id);
            await updateRentalPartial(rental.id, { signature_url: signedUrl, signed_at: new Date().toISOString() });
            await refreshProducts();

            const fileTitle = `Contrato_${clientName.replace(/\s+/g, '_')}.pdf`;
            const pdfFile = new File([pdfBlob], fileTitle, { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                try {
                    await navigator.share({
                        files: [pdfFile],
                        title: 'Contrato de Aluguer',
                        text: `Contrato assinado - ${clientName}`,
                    });
                } catch {
                    // Utilizador cancelou o menu de partilha; o contrato já ficou guardado.
                }
            } else {
                const url = URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileTitle;
                a.click();
                URL.revokeObjectURL(url);
            }

            onConfirmed?.();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao confirmar a retirada com assinatura.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[70] flex flex-col bg-slate-900 sm:items-center sm:justify-center sm:bg-black/80 sm:p-4">
            <div className="flex h-full w-full flex-col bg-slate-900 sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:rounded-2xl sm:border sm:border-slate-800 sm:shadow-2xl">
                {/* Cabeçalho compacto */}
                <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-2 sm:p-6 sm:pb-4">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold sm:text-xl">Assinatura de Retirada</h2>
                        <p className="truncate text-xs text-slate-400 sm:text-sm">
                            {clientName} · {itemsList || 'Sem itens'}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} disabled={submitting} className="shrink-0">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Área de assinatura: ocupa todo o espaço disponível do ecrã */}
                <div className="relative mx-4 mb-3 flex-1 overflow-hidden rounded-xl border-2 border-dashed border-slate-700 sm:mx-6">
                    <SignaturePad ref={padRef} />

                    <button
                        type="button"
                        onClick={() => padRef.current?.clear()}
                        disabled={submitting}
                        className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-100 shadow-lg backdrop-blur border border-slate-700 active:scale-95 transition-transform"
                    >
                        <Trash2 className="w-4 h-4" /> Corrigir assinatura
                    </button>

                    <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-center text-xs text-slate-500 px-4">
                        Assine com o dedo no espaço acima
                    </p>
                </div>

                {error && (
                    <div className="mx-4 mb-3 rounded-md bg-red-500/10 p-3 border border-red-500/20 text-sm text-red-500 sm:mx-6">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3 border-t border-slate-800 px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-6 sm:py-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
                        onClick={handleConfirm}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> A processar...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar e Enviar
                                <Share2 className="w-3.5 h-3.5 ml-2" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
