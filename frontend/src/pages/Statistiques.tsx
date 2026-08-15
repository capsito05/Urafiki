import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CategoryBarChart, WinLossPie } from '../components/StatsChart';
import type { ContentItem, StatRow } from '../types';

interface StatistiquesProps {
  userId: string;
  coupleId: string | null;
}

export function Statistiques({ userId, coupleId }: StatistiquesProps) {
  const [tab, setTab] = useState<'perso' | 'couple' | 'favoris'>('perso');
  const [personalStats, setPersonalStats] = useState<StatRow[]>([]);
  const [coupleStats, setCoupleStats] = useState<StatRow[]>([]);
  const [favoris, setFavoris] = useState<ContentItem[]>([]);

  useEffect(() => {
    supabase
      .from('stats')
      .select('*')
      .eq('user_id', userId)
      .is('couple_id', null)
      .then(({ data }) => setPersonalStats((data ?? []) as StatRow[]));

    if (coupleId) {
      supabase
        .from('stats')
        .select('*')
        .eq('couple_id', coupleId)
        .then(({ data }) => setCoupleStats((data ?? []) as StatRow[]));
    }

    supabase
      .from('favoris')
      .select('content_id, content_items(*)')
      .eq('user_id', userId)
      .then(({ data }) => {
        setFavoris((data ?? []).map((f: any) => f.content_items).filter(Boolean));
      });
  }, [userId, coupleId]);

  const totals = (rows: StatRow[]) =>
    rows.reduce(
      (acc, r) => ({
        victoires: acc.victoires + r.victoires,
        defaites: acc.defaites + r.defaites,
        nuls: acc.nuls + r.nuls,
      }),
      { victoires: 0, defaites: 0, nuls: 0 }
    );

  return (
    <div className="statistiques-page">
      <h1>Statistiques</h1>
      <div className="tabs">
        <button className={tab === 'perso' ? 'active' : ''} onClick={() => setTab('perso')}>Mes stats</button>
        {coupleId && (
          <button className={tab === 'couple' ? 'active' : ''} onClick={() => setTab('couple')}>Stats couple/amis</button>
        )}
        <button className={tab === 'favoris' ? 'active' : ''} onClick={() => setTab('favoris')}>Favoris</button>
      </div>

      {tab === 'perso' && (
        <>
          <CategoryBarChart stats={personalStats} />
          <WinLossPie {...totals(personalStats)} />
        </>
      )}

      {tab === 'couple' && coupleId && (
        <>
          <CategoryBarChart stats={coupleStats} />
          <WinLossPie {...totals(coupleStats)} />
        </>
      )}

      {tab === 'favoris' && (
        <ul className="favoris-list">
          {favoris.length === 0 && <p>Aucun favori pour l'instant.</p>}
          {favoris.map((f) => (
            <li key={f.id}>{f.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
