import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Studio } from '../types/database';

export function useStudios() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudios() {
      try {
        const { data, error } = await supabase
          .from('studios')
          .select(`
            *,
            organization:organizations(name, logo_url),
            rooms(
              id,
              name,
              hourly_rate,
              room_type:room_types(name)
            )
          `)
          .order('name');

        if (error) throw error;
        setStudios(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchStudios();
  }, []);

  return { studios, loading, error };
}
