import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: rentals, error } = await supabase
        .from('rentals')
        .select(`
            *,
            customers:customer_id (full_name)
        `)
        .order('created_at', { ascending: true })
        .limit(10);
        
    for (const r of rentals) {
        console.log(`Cliente: ${r.customers?.full_name} | total_amount: ${r.total_amount} | materials_value: ${r.materials_value} | transport_fee: ${r.transport_fee} | transport_value: ${r.transport_value} | has_iva: ${r.has_iva}`);
    }
}

run();
