import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, Upload, RotateCw, Trash2 } from 'lucide-react';
import { useGlobalCustomers } from '../data/api';
import type { Customer } from '../data/api';
import { supabase } from '../lib/supabase';

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerToEdit?: Customer | null;
}

export function ClientModal({ isOpen, onClose, customerToEdit }: ClientModalProps) {
    const { customers, addCustomer, updateCustomer } = useGlobalCustomers();

    const [formData, setFormData] = useState<Partial<Customer>>({});
    const [formError, setFormError] = useState('');
    const [uploadingFront, setUploadingFront] = useState(false);
    const [uploadingBack, setUploadingBack] = useState(false);
    const [rotationFront, setRotationFront] = useState(0);
    const [rotationBack, setRotationBack] = useState(0);
    const frontInputRef = useRef<HTMLInputElement>(null);
    const backInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        if (customerToEdit) {
            setFormData(customerToEdit);
        } else {
            setFormData({});
        }
        setFormError('');
        setRotationFront(0);
        setRotationBack(0);
    }, [isOpen, customerToEdit]);

    async function uploadPhoto(file: File): Promise<string> {
        const ext = file.name.split('.').pop();
        const fileName = `doc_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('documents').upload(fileName, file, { upsert: true });
        if (error) throw new Error(error.message);
        const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
        return data.publicUrl;
    }

    async function handlePhotoUpload(side: 'front' | 'back', file: File) {
        if (side === 'front') setUploadingFront(true);
        else setUploadingBack(true);
        try {
            const url = await uploadPhoto(file);
            if (side === 'front') {
                setFormData(prev => ({ ...prev, document_photo_url: url }));
            } else {
                setFormData(prev => ({ ...prev, document_photo_back_url: url }));
            }
        } catch (err: any) {
            setFormError('Erro ao fazer upload da foto: ' + err.message);
        } finally {
            if (side === 'front') setUploadingFront(false);
            else setUploadingBack(false);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setFormError('');
        try {
            if (customerToEdit && formData.id) {
                await updateCustomer(formData.id, formData);
            } else {
                if (formData.tax_id) {
                    const existing = customers.find(c => c.tax_id === formData.tax_id);
                    if (existing) throw new Error('Já existe um cliente com este NIF (Contribuinte).');
                }
                await addCustomer(formData as Omit<Customer, 'id'>);
            }
            onClose();
        } catch (err: any) {
            setFormError(err.message || 'Erro ao salvar cliente.');
        }
    }

    if (!isOpen) return null;
    const isEditing = !!customerToEdit;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    {formError && (
                        <div className="rounded-md bg-red-500/10 p-3 border border-red-500/20 text-sm text-red-500">
                            {formError}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Nome Completo</label>
                            <Input
                                required
                                value={formData.full_name || ''}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Telefone</label>
                            <Input
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                            <Input
                                type="email"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">NIF (Contribuinte)</label>
                            <Input
                                required
                                value={formData.tax_id || ''}
                                onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">CC / Passaporte</label>
                            <Input
                                value={formData.document_id || ''}
                                onChange={e => setFormData({ ...formData, document_id: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Morada</label>
                            <Input
                                value={formData.address || ''}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-300">Moradas da Obra</label>
                                <button
                                    type="button"
                                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                                    onClick={() => setFormData(prev => ({
                                        ...prev,
                                        work_address: prev.work_address ? prev.work_address + ' | ' : ''
                                    }))}
                                >
                                    + Adicionar outra
                                </button>
                            </div>
                            {(formData.work_address || '').split(' | ').map((addr, idx, arr) => (
                                <div key={idx} className="flex gap-2 mb-2">
                                    <Input
                                        placeholder={`Morada da obra ${idx + 1}`}
                                        value={addr}
                                        onChange={e => {
                                            const parts = (formData.work_address || '').split(' | ');
                                            parts[idx] = e.target.value;
                                            setFormData({ ...formData, work_address: parts.join(' | ') });
                                        }}
                                    />
                                    {arr.length > 1 && (
                                        <button
                                            type="button"
                                            className="text-red-400 hover:text-red-300 px-2"
                                            onClick={() => {
                                                const parts = (formData.work_address || '').split(' | ').filter((_, i) => i !== idx);
                                                setFormData({ ...formData, work_address: parts.join(' | ') });
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Fotos do Documento */}
                    <div className="pt-4 border-t border-slate-800 space-y-4">
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Fotos do Documento</p>

                        {/* Frente */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-400">Frente do Documento</span>
                                <div className="flex gap-2">
                                    {formData.document_photo_url && (
                                        <>
                                            <Button type="button" variant="outline" size="sm"
                                                className="h-7 text-xs px-2 text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                                                onClick={() => setRotationFront(r => r + 90)}>
                                                <RotateCw className="w-3.5 h-3.5 mr-1" /> Girar
                                            </Button>
                                            <Button type="button" variant="outline" size="sm"
                                                className="h-7 text-xs px-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                                                onClick={() => setFormData(prev => ({ ...prev, document_photo_url: '' }))}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </>
                                    )}
                                    <Button type="button" variant="outline" size="sm"
                                        className="h-7 text-xs px-2 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                                        onClick={() => frontInputRef.current?.click()}
                                        disabled={uploadingFront}>
                                        <Upload className="w-3.5 h-3.5 mr-1" />
                                        {uploadingFront ? 'A enviar...' : formData.document_photo_url ? 'Substituir' : 'Carregar'}
                                    </Button>
                                </div>
                            </div>
                            <input ref={frontInputRef} type="file" accept="image/*" className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload('front', f); e.target.value = ''; }} />
                            {formData.document_photo_url ? (
                                <div className="rounded-lg overflow-hidden border border-slate-700 bg-black flex justify-center items-center p-2 min-h-[140px]">
                                    <img src={formData.document_photo_url} alt="Frente"
                                        className="max-h-[200px] w-auto object-contain rounded transition-transform duration-300"
                                        style={{ transform: `rotate(${rotationFront}deg)` }} />
                                </div>
                            ) : (
                                <div onClick={() => frontInputRef.current?.click()}
                                    className="rounded-lg border border-dashed border-slate-700 bg-slate-800/30 flex flex-col justify-center items-center p-6 min-h-[100px] cursor-pointer hover:bg-slate-800/60 transition-colors">
                                    <Upload className="w-6 h-6 text-slate-500 mb-2" />
                                    <span className="text-xs text-slate-500">Clique para carregar a frente</span>
                                </div>
                            )}
                        </div>

                        {/* Verso */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-400">Verso do Documento</span>
                                <div className="flex gap-2">
                                    {formData.document_photo_back_url && (
                                        <>
                                            <Button type="button" variant="outline" size="sm"
                                                className="h-7 text-xs px-2 text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                                                onClick={() => setRotationBack(r => r + 90)}>
                                                <RotateCw className="w-3.5 h-3.5 mr-1" /> Girar
                                            </Button>
                                            <Button type="button" variant="outline" size="sm"
                                                className="h-7 text-xs px-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                                                onClick={() => setFormData(prev => ({ ...prev, document_photo_back_url: '' }))}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </>
                                    )}
                                    <Button type="button" variant="outline" size="sm"
                                        className="h-7 text-xs px-2 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                                        onClick={() => backInputRef.current?.click()}
                                        disabled={uploadingBack}>
                                        <Upload className="w-3.5 h-3.5 mr-1" />
                                        {uploadingBack ? 'A enviar...' : formData.document_photo_back_url ? 'Substituir' : 'Carregar'}
                                    </Button>
                                </div>
                            </div>
                            <input ref={backInputRef} type="file" accept="image/*" className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload('back', f); e.target.value = ''; }} />
                            {formData.document_photo_back_url ? (
                                <div className="rounded-lg overflow-hidden border border-slate-700 bg-black flex justify-center items-center p-2 min-h-[140px]">
                                    <img src={formData.document_photo_back_url} alt="Verso"
                                        className="max-h-[200px] w-auto object-contain rounded transition-transform duration-300"
                                        style={{ transform: `rotate(${rotationBack}deg)` }} />
                                </div>
                            ) : (
                                <div onClick={() => backInputRef.current?.click()}
                                    className="rounded-lg border border-dashed border-slate-700 bg-slate-800/30 flex flex-col justify-center items-center p-6 min-h-[100px] cursor-pointer hover:bg-slate-800/60 transition-colors">
                                    <Upload className="w-6 h-6 text-slate-500 mb-2" />
                                    <span className="text-xs text-slate-500">Clique para carregar o verso</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">Guardar</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
