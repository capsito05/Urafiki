import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CategoryBarChart, WinLossPie } from '../components/StatsChart';
import { useCoupleMembers } from '../hooks/useCoupleMembers';
import type { ContentItem, StatRow } from '../types';

interface StatistiquesProps {
  userId: string;
  coupleId: string | null;
}

interface DefiStat {
  user_id: string;
  statut: string;
  total: number;
}

interface RankingRow {
  user_id: string;
  pseudo: string;
  victoires: number;
  defaites: number;
  nuls: number;
  sessions: number;
  winRate: number;
}

export function Statistiques({ userId, coupleId }: StatistiquesProps) {
  const [tab, setTab] = useState<'perso' | 'couple' | 'favoris'>('perso');
  const [personalStats, setPersonalStats] = useState<StatRow[]>([]);
  const [coupleStats, setCoupleStats] = useState<StatRow[]>([]);
  const [favoris, setFavoris] = useState<ContentItem[]>([]);
  const [defiStats, setDefiStats] = useState<DefiStat[]>([]);
  const { pseudos } = useCoupleMembers(coupleId);

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

      supabase
        .from('defi_completion_stats')
        .select('user_id, statut, total')
        .eq('couple_id', coupleId)
        .then(({ data }) => setDefiStats((data ?? []) as DefiStat[]));
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

  const ranking: RankingRow[] = Object.entries(
    coupleStats.reduce<Record<string, RankingRow>>((acc, r) => {
      const existing = acc[r.user_id] ?? {
        user_id: r.user_id,
        pseudo: pseudos[r.user_id] ?? (r.user_id === userId ? 'Toi' : 'Joueur'),
        victoires: 0,
        defaites: 0,
        nuls: 0,
        sessions: 0,
        winRate: 0,
      };
      existing.victoires += r.victoires;
      existing.defaites += r.defaites;
      existing.nuls += r.nuls;
      existing.sessions += r.sessions_count;
      acc[r.user_id] = existing;
      return acc;
    }, {})
  )
    .map(([, row]) => ({ ...row, winRate: row.sessions > 0 ? Math.round((row.victoires / row.sessions) * 100) : 0 }))
    .sort((a, b) => b.victoires - a.victoires || b.winRate - a.winRate);

  const defiSummary = (userIdFilter?: string) => {
    const rows = userIdFilter ? defiStats.filter((d) => d.user_id === userIdFilter) : defiStats;
    const fait = rows.filter((r) => r.statut === 'Fait').reduce((s, r) => s + r.total, 0);
    const pasFait = rows.filter((r) => r.statut === 'Pas fait').reduce((s, r) => s + r.total, 0);
    return { fait, pasFait };
  };

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
          {coupleId && (
            <div className="defi-stats-block">
              <h3>Défis / gages</h3>
              <p>✅ {defiSummary(userId).fait} fait(s) · ❌ {defiSummary(userId).pasFait} pas fait(s)</p>
            </div>
          )}
        </>
      )}

      {tab === 'couple' && coupleId && (
        <>
          <CategoryBarChart stats={coupleStats} />
          <WinLossPie {...totals(coupleStats)} />

          <div className="ranking-block">
            <h3>🏆 Classement du groupe</h3>
            <ol className="ranking-list">
              {ranking.map((r) => (
                <li key={r.user_id} className={r.user_id === userId ? 'is-self' : ''}>
                  <span>{r.pseudo}</span>
                  <span>{r.victoires} victoire(s) · {r.winRate}% de réussite</span>
                </li>
              ))}
              {ranking.length === 0 && <p className="hint">Aucune partie jouée pour l'instant.</p>}
            </ol>
          </div>

          <div className="defi-stats-block">
            <h3>Défis / gages du groupe</h3>
            <p>✅ {defiSummary().fait} fait(s) · ❌ {defiSummary().pasFait} pas fait(s)</p>
          </div>
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
