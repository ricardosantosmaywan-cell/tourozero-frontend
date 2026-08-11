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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Assinatura de Retirada</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} disabled={submitting}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="rounded-lg bg-slate-800/50 border border-slate-800 p-3 mb-4 text-sm">
                    <p className="font-semibold text-slate-100">{clientName}</p>
                    <p className="text-slate-400 mt-1">{itemsList || 'Sem itens'}</p>
                </div>

                <p className="text-sm text-slate-400 mb-3">
                    Peça ao cliente para assinar abaixo com o dedo, confirmando a retirada do material e a aceitação do contrato de aluguer.
                </p>

                <SignaturePad ref={padRef} height={180} />

                <div className="flex justify-end mt-2 mb-4">
                    <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                        onClick={() => padRef.current?.clear()}
                        disabled={submitting}
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Limpar assinatura
                    </button>
                </div>

                {error && (
                    <div className="rounded-md bg-red-500/10 p-3 border border-red-500/20 text-sm text-red-500 mb-4">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
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
