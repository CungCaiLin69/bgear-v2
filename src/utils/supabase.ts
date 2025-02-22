import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nghoetjykivugqlccevs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5naG9ldGp5a2l2dWdxbGNjZXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5MjE4NzcsImV4cCI6MjA1NDQ5Nzg3N30.YRK6eBUKe6KdDSKehBOsl1b0wDQ7DGG17IHPtgH2RSk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}) 