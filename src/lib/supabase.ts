import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Ensure we have the environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://clcoyrkrqzehvjivjdub.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsY295cmtycXplaHZqaXZqZHViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjkyMDIsImV4cCI6MjA1OTIwNTIwMn0.q0ZXAjm9UuJbucm1xsAQDQ_SP1v84SsUd-8A8hhV4sA';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
