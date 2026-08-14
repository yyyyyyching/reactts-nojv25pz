import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hcdeaeukkqmucrwzyrgn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZGVhZXVra3FtdWNyd3p5cmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MTk3NDgsImV4cCI6MjEwMjA5NTc0OH0.wOgn9evWGjV2iqoyj8cJdfZ5yxu7pIiy1TQ0PwfvQH0'; // 填入你的 anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // 強制將 Session 存入 LocalStorage
    autoRefreshToken: true,      // 自動刷新 Token
    detectSessionInUrl: true     // 強制從網址 Hash 解析 Access Token
  }
});