import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: rentals, error } = await supabase
        .from('rentals')
        .select(`
            *,
            customers:customer_id (full_name),
            items:rental_items (*, products:product_id (*))
        `)
        .eq('status', 'active');
        
    if (error) {
        console.error("DB Error:", error);
        return;
    }
    console.log(`Total active rentals in DB: ${rentals.length}`);
    
    let rentedItemsCount = 0;
    for (const r of rentals) {
        let count = 0;
        if (r.items) {
            for (const item of r.items) {
                const prodName = Array.isArray(item.products) ? item.products[0]?.name : item.products?.name;
                if (prodName && prodName.toLowerCase().includes('andaime')) {
                    count += parseInt(item.quantity || 0, 10);
                }
            }
        }
        console.log(`- Rental ${r.id} | Client: ${r.customers?.full_name} | Return Date: ${r.return_date} | Andaimes Rented: ${count}`);
        rentedItemsCount += count;
    }
    console.log(`Total andaimes rented out: ${rentedItemsCount}`);
}

run();
