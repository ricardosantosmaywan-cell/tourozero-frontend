import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: rentals } = await supabase
        .from('rentals')
        .select('*, customers!inner (full_name)')
        .in('customers.full_name', [
            'José Palas',
            'Rui Filipe Miranda Pereira ',
            'Fernando Luís de Mendonça Arruda'
        ]);
        
    for (const r of rentals) {
        console.log(`Cliente: ${r.customers.full_name}`);
        console.log(`total_amount: ${r.total_amount}`);
        console.log(`transport: ${r.transport_value}, deposit: ${r.deposit_value}`);
        console.log(`observacoes: ${r.observacoes}`);
        console.log('---');
    }
}
run();
