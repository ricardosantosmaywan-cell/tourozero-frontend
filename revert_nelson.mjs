import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // Buscar todos os alugueres finalizados
    const { data: rentals, error } = await supabase
        .from('rentals')
        .select(`
            id, status, return_date, 
            customers:customer_id (full_name)
        `)
        .eq('status', 'completed')
        .order('return_date', { ascending: false })
        .limit(20);
        
    if (error) {
        console.error("DB Error:", error);
        return;
    }
    
    console.log("Últimos 20 alugueres finalizados:");
    for (const r of rentals) {
        const clientName = r.customers?.full_name || 'Desconhecido';
        if (clientName.toLowerCase().includes('nelson')) {
            console.log(`ACHADO NELSON! ID: ${r.id} | Cliente: ${clientName} | Return Date: ${r.return_date}`);
            
            // Reverter para active
            const { error: updErr } = await supabase
                .from('rentals')
                .update({ status: 'active' })
                .eq('id', r.id);
                
            if (updErr) {
                console.error("Erro ao reverter:", updErr);
            } else {
                console.log("✅ Nelson revertido para 'active'!");
            }
        }
    }
}

run();
