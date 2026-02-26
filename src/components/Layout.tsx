import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';

export default function Layout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen w-full bg-slate-950 text-slate-50 overflow-hidden relative">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950 absolute top-0 w-full z-20">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-amber-500">Touro</span>zero
                </h1>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 text-slate-400 hover:text-slate-50 transition-colors"
                >
                    {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 relative w-full">
                {/* Fundo com leve gradiente para elegância extra (opcional) */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 to-slate-900 -z-10" />

                <div className="max-w-7xl mx-auto w-full">
                    <Outlet />
                </div>
            </main>

            {/* Overlay Mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
}
