import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
    return (
        <div className="flex h-screen w-full bg-slate-950 text-slate-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-8 relative">
                {/* Fundo com leve gradiente para elegância extra (opcional) */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 to-slate-900 -z-10" />

                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
