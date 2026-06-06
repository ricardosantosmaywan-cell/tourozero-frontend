import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: rentals } = await supabase
        .from('rentals')
        .select('*, customers!inner (full_name)');
        
    for (const r of rentals) {
        if (r.total_amount === 133 && r.customers?.full_name.includes('Luciano Cardoso')) {
            await supabase.from('rentals').update({ deposit_value: 70 }).eq('id', r.id);
        }
        if (r.total_amount === 680 && r.customers?.full_name.includes('José Palas')) {
            await supabase.from('rentals').update({ deposit_value: 100, transport_value: 90, iva_materials: 55 }).eq('id', r.id);
        }
        if (r.total_amount === 369 && r.customers?.full_name.includes('Fernando Luís')) {
            await supabase.from('rentals').update({ iva_materials: 69 }).eq('id', r.id);
        }
        if (r.total_amount === 250 && r.customers?.full_name.includes('Rui Filipe')) {
            await supabase.from('rentals').update({ deposit_value: 50 }).eq('id', r.id);
        }
    }
    console.log("DB Updated!");
}

run();
