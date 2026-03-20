import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CheckCircle2, Loader2, UploadCloud, ShieldCheck } from 'lucide-react';

export default function PublicRegistration() {
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        tax_id: '',
        document_id: '',
        address: ''
    });
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.full_name || !formData.phone || !formData.tax_id || !formData.document_id || !formData.address || !file) {
            setError('Todos os campos são obrigatórios, incluindo a foto do documento.');
            return;
        }

        setIsSubmitting(true);

        try {
            // 0. Ensure bucket exists (best effort)
            try {
                const { data: buckets } = await supabase.storage.listBuckets();
                if (buckets && !buckets.find(b => b.name === 'documents')) {
                    await supabase.storage.createBucket('documents', { public: true });
                }
            } catch (e) {
                console.warn('Could not check or create bucket, assuming it exists:', e);
            }

            // 1. Upload File to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `public/uploads/docs/${fileName}`;

            // Assumes a 'documents' bucket exists and is publicly accessible or allows anon uploads
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw new Error('Falha ao fazer upload do documento. Tente novamente.');
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);

            // 2. Insert into Database
            const { error: insertError } = await supabase
                .from('customers')
                .insert([{
                    full_name: formData.full_name,
                    phone: formData.phone,
                    tax_id: formData.tax_id,
                    document_id: formData.document_id,
                    address: formData.address,
                    document_photo_url: publicUrl
                }]);

            if (insertError) {
                console.error('Insert error:', insertError);
                if (insertError.code === '23505' || insertError.message.includes('unique constraint') || insertError.message.includes('tax_id')) {
                    throw new Error('Já existe um cliente cadastrado com este NIF (Contribuinte).');
                }
                throw new Error('Erro ao salvar os dados. Tente novamente.');
            }

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro inesperado.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-50 mb-2">Formulário Enviado!</h2>
                        <p className="text-slate-400">
                            Dados enviados com sucesso! Entraremos em contacto em breve para formalizar o aluguer.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {/* Banner Header */}
            <header className="bg-slate-900 border-b border-slate-800 p-6 sm:p-8 text-center sticky top-0 z-10">
                <h1 className="text-3xl font-extrabold text-slate-50 tracking-tight flex items-center justify-center gap-3">
                    <ShieldCheck className="text-amber-500 w-8 h-8" />
                    Ficha do Cliente
                </h1>
                <p className="text-slate-400 mt-3 max-w-lg mx-auto text-sm sm:text-base">
                    Preencha seus dados para formalizar o aluguer de equipamentos. Suas informações estão seguras.
                </p>
            </header>

            {/* Form Container */}
            <main className="flex-1 w-full max-w-2xl mx-auto p-4 sm:p-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-sm">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-800 pb-2">Informações Pessoais</h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="text-sm font-medium text-slate-300">Nome Completo *</label>
                                    <Input
                                        name="full_name"
                                        placeholder="Ex: João da Silva"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        required
                                        className="bg-slate-950/50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-300">Telefone / WhatsApp *</label>
                                    <Input
                                        name="phone"
                                        placeholder="Ex: +351 900 000 000"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        required
                                        className="bg-slate-950/50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-300">Contribuinte (NIF) *</label>
                                    <Input
                                        name="tax_id"
                                        placeholder="Ex: 123456789"
                                        value={formData.tax_id}
                                        onChange={handleChange}
                                        required
                                        className="bg-slate-950/50"
                                    />
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="text-sm font-medium text-slate-300">C. Cidadão / Passaporte *</label>
                                    <Input
                                        name="document_id"
                                        placeholder="Número do documento"
                                        value={formData.document_id}
                                        onChange={handleChange}
                                        required
                                        className="bg-slate-950/50"
                                    />
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="text-sm font-medium text-slate-300">Morada Completa *</label>
                                    <Input
                                        name="address"
                                        placeholder="Rua, Número, Código Postal, Cidade"
                                        value={formData.address}
                                        onChange={handleChange}
                                        required
                                        className="bg-slate-950/50"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-800 pb-2">Documentação</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-300 block mb-1">Foto do C. Cidadão / Passaporte *</label>
                                    <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-md flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 shrink-0" />
                                        Por favor, tire a foto com o telemóvel na horizontal (deitado) para capturar o documento inteiro.
                                    </p>
                                </div>
                                <div className="flex items-center justify-center w-full">
                                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-900/40 hover:bg-slate-800/50 hover:border-amber-500/50 transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <UploadCloud className="w-8 h-8 mb-2 text-slate-400" />
                                            {file ? (
                                                <p className="text-sm font-medium text-emerald-400">{file.name}</p>
                                            ) : (
                                                <>
                                                    <p className="mb-2 text-sm text-slate-400"><span className="font-semibold text-amber-500">Clique para selecionar</span></p>
                                                    <p className="text-xs text-slate-500">PNG, JPG ou PDF (Máx. 5MB)</p>
                                                </>
                                            )}
                                        </div>
                                        <input 
                                            id="dropzone-file" 
                                            type="file" 
                                            accept="image/*,.pdf"
                                            className="hidden" 
                                            onChange={handleFileChange}
                                            required 
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-800">
                            <Button 
                                type="submit" 
                                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-6 text-lg transition-transform hover:scale-[1.02] active:scale-95"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                        A enviar...
                                    </>
                                ) : (
                                    'Enviar Dados de Cadastro'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
