import { createClient } from '@supabase/supabase-js'

// Variables publiques autorisees cote navigateur pour le client Supabase standard.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client Supabase public utilise par les composants client et les lectures non admin.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Forme historique d'un professeur dans l'ancienne UI.
export interface TeacherData {
  id: string;
  name: string;
  subject: string;
  email: string;
  created_at: string;
}
