// utils/auth/getCurrentUser.ts - Get current authenticated user

import { createClient } from "@/utils/supabase/client";

export interface CurrentUser {
  id: string;
  email?: string;
  role?: string;
}

/**
 * Get the currently authenticated user
 * @returns Current user or null if not authenticated
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = createClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // Try to get the user's profile to include role information
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email,
      role: profile?.role || 'user'
    };
    
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}