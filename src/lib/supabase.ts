import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://znsktlbfngiatbedtfbj.supabase.co';
export const supabaseKey = 'sb_publishable_7a9eVVqeVSf3doAILjrqEQ_EvrcHe6t';

export const supabase = createClient(supabaseUrl, supabaseKey);
