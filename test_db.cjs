const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://znsktlbfngiatbedtfbj.supabase.co';
const supabaseKey = 'sb_publishable_7a9eVVqeVSf3doAILjrqEQ_EvrcHe6t';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- CHECKING PRODUCTS ---');
  const { data: pData, error: pErr } = await supabase.from('products').select('*');
  if (pErr) console.error("Error products:", pErr);
  else console.log(`Found ${pData.length} products.`, pData.length > 0 ? pData : '');

  console.log('--- CHECKING RENTALS ---');
  const { data: rData, error: rErr } = await supabase.from('rentals').select('*');
  if (rErr) console.error("Error rentals:", rErr);
  else console.log(`Found ${rData.length} rentals.`);
}

check();
