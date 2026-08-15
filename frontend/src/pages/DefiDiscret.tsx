import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { ContentItem } from '../types';

interface DefiDiscretProps {
  userId: string;
  coupleId: string | null;
}

export function DefiDiscret({ userId, coupleId }: DefiDiscretProps) {
  const [defi, setDefi] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(false);

  const tirerDefi = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('content_items')
      .select('*')
      .eq('content_type', 'defi')
      .eq('subcategory', 'defis_gages')
      .in('mode_scope', ['couple', 'tous'])
      .limit(20);
    if (data && data.length > 0) {
      const random = data[Math.floor(Math.random() * data.length)];
      setDefi(random as ContentItem);
      if (coupleId) {
        await supabase.from('defis_discrets').insert({
          couple_id: coupleId,
          content_id: random.id,
          lance_par: userId,
          statut: 'propose',
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    tirerDefi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="defi-discret-page">
      <h1>Défi discret 🤫</h1>
      {loading && <p>Recherche d'un défi...</p>}
      {defi && (
        <div className="defi-card">
          <p>{defi.text}</p>
        </div>
      )}
      <button onClick={tirerDefi}>Un autre défi</button>
    </div>
  );
}
