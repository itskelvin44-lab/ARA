// js/supabase-client.js
// Single source of truth for the Supabase client.
// All other JS files access it via window.sb

const SUPABASE_URL  = 'https://ihhukqeslvdnonpjueai.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloaHVrcWVzbHZkbm9ucGp1ZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNTc0OTgsImV4cCI6MjA5NDkzMzQ5OH0.xgShit2U0WgYeVg8CbJxCFK-KWz5v7gBmq2fvbXeSKY'

window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON)
