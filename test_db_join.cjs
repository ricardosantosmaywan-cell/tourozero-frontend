const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://znsktlbfngiatbedtfbj.supabase.co';
const supabaseKey = 'sb_publishable_7a9eVVqeVSf3doAILjrqEQ_EvrcHe6t';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDetails() {
  console.log('--- TESTING RENTALS JOIN ---');
  const { data: rData, error: rErr } = await supabase
            .from('rentals')
            .select(`
                *,
                customers (full_name, phone, email, tax_id),
                rental_items (*, products (name))
            `)
            .order('pickup_date', { ascending: false });
            
  if (rErr) {
    console.error("JOIN ERROR rentals:", rErr);
  } else {
    console.log(`JOIN SUCCESS, found ${rData.length} rentals.`);
  }
}

checkDetails();
