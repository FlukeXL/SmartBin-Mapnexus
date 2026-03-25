/**
 * backend/config/supabase.js
 * Supabase Client Configuration
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase environment variables not found. Supabase features will be disabled.');
  module.exports = { supabase: null };
} else {
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized');
  module.exports = { supabase };
}
