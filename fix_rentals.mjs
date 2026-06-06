import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not found in env variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const getEffectiveReturnDate = (rental) => {
    const exts = Array.isArray(rental.extensions_history) ? rental.extensions_history : [];
    if (exts.length > 0) {
        const lastExt = exts[exts.length - 1];
        if (lastExt.new_return_date) {
            return lastExt.new_return_date;
        }
    }
    return rental.return_date;
};

async function run() {
    console.log('Fetching active rentals...');
    const { data: rentals, error } = await supabase
        .from('rentals')
        .select('*')
        .eq('status', 'active');

    if (error) {
        console.error('Error fetching rentals:', error);
        return;
    }

    console.log(`Found ${rentals.length} active rentals.`);
    const cutoffDate = new Date('2026-06-01T00:00:00Z');

    const toUpdate = rentals.filter(r => {
        const effDateStr = getEffectiveReturnDate(r);
        if (!effDateStr) return false;
        
        // Parse date
        const effDate = new Date(effDateStr);
        return effDate < cutoffDate;
    });

    console.log(`Found ${toUpdate.length} rentals with effective return date before 2026-06-01.`);

    let success = 0;
    for (const rental of toUpdate) {
        const { error: updErr } = await supabase
            .from('rentals')
            .update({ status: 'completed' })
            .eq('id', rental.id);

        if (updErr) {
            console.error(`Error updating rental ${rental.id}:`, updErr);
        } else {
            console.log(`Updated rental ${rental.id} (Client: ${rental.customers?.full_name || rental.customer_id}) to completed.`);
            success++;
        }
    }

    console.log(`\n✅ Successfully completed ${success} rentals.`);
}

run();
