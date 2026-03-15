import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Ticket = {
  id: string;
  title: string;
  description: string;
  state_id: string;
  constituency: string;
  status: "open" | "in_progress" | "resolved";
  upvotes: number;
  created_by: string;
  created_at: string;
  user_email?: string;
  resolved_by?: string | null;
  resolve_note?: string | null;
  resolved_at?: string | null;
};

export type Profile = {
  id: string;
  email: string;
  role: "user" | "admin";
  full_name: string;
};
