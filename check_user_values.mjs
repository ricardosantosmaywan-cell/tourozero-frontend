import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const names = [
        'Luciano Cardoso da silva',
        'Nelson de jesus Mendes Rodrigues',
        'Gean Wendell Rocha Pereira',
        'José Palas',
        'Rui Filipe Miranda Pereira',
        'Fernando Luís de Mendonça Arruda'
    ];

    for (const name of names) {
        const { data: rentals, error } = await supabase
            .from('rentals')
            .select(`
                *,
                customers!inner (full_name)
            `)
            .ilike('customers.full_name', `%${name}%`)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error(error);
            continue;
        }

        if (rentals && rentals.length > 0) {
            const r = rentals[0];
            console.log(`\n===================`);
            console.log(`Cliente: ${r.customers.full_name}`);
            console.log(`total_amount: ${r.total_amount}`);
            console.log(`transport_value: ${r.transport_value}`);
            console.log(`deposit_value: ${r.deposit_value}`);
            console.log(`extensions:`, JSON.stringify(r.extensions_history, null, 2));
            
            const rawItems = await supabase.from('rental_items').select('*, products(name)').eq('rental_id', r.id);
            console.log(`Items:`, rawItems.data?.map(i => `${i.quantity}x ${i.products?.name} (unit: ${i.price_unit})`));
        }
    }
}

run();
