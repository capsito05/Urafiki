import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { UserProfile } from '../types';

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setProfile(data as UserProfile | null);
        setLoading(false);
      });
  }, [userId]);

  return { profile, loading };
}
