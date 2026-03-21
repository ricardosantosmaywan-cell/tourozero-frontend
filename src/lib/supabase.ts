import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'UNDEFINED VITE_SUPABASE_URL';
export const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'UNDEFINED_KEY';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    throw new Error('Faltam variáveis de ambiente do Supabase. Verifique o seu ficheiro .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
        fetch: (url: RequestInfo | URL, options?: RequestInit) => {
            const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : (url as Request).url;
            const separator = urlStr.includes('?') ? '&' : '?';
            const bustUrl = `${urlStr}${separator}_cb=${Date.now()}`;
            return fetch(bustUrl, options);
        }
    }
});
