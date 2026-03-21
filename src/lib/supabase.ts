import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://znsktlbfngiatbedtfbj.supabase.co';
const supabaseKey = 'sb_publishable_7a9eVVqeVSf3doAILjrqEQ_EvrcHe6t';

if (!supabaseUrl || !supabaseKey) {
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
