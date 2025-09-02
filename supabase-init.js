// Load the Supabase UMD build first
// This file will then use the global 'window.supabase' object

const supabaseUrl = 'https://vxvmgttaoffqsseikifz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4dm1ndHRhb2ZmcXNzZWlraWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODcxODgsImV4cCI6MjA3MjM2MzE4OH0.2XUlJZRYtLVZ8IcO2aFKXtbryHvN7lGkqRbqk-R6TVk';

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// No export needed, as 'supabase' will be a global variable after this script runs.