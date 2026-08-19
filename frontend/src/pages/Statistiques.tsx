import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CategoryBarChart, WinLossPie } from '../components/StatsChart';
import { useCouple } from '../hooks/useCouple';
import { useCoupleMembers } from '../hooks/useCoupleMembers';
import { useHeadToHead, type HeadToHeadResult } from '../hooks/useHeadToHead';
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
  byCategory: Record<string, { victoires: number; defaites: number; nuls: number; sessions: number }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Général',
  jeux_ensemble: 'Jeux ensemble',
  mieux_connaitre: 'Pour mieux se connaître',
  manga: 'Manga / Anime',
};

export function Statistiques({ userId, coupleId }: StatistiquesProps) {
  const [tab, setTab] = useState<'perso' | 'groupe' | 'favoris'>('perso');
  const [personalStats, setPersonalStats] = useState<StatRow[]>([]);
  const [groupStats, setGroupStats] = useState<StatRow[]>([]);
  const [favoris, setFavoris] = useState<ContentItem[]>([]);
  const [defiStats, setDefiStats] = useState<DefiStat[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string>('');
  const [headToHead, setHeadToHead] = useState<HeadToHeadResult | null>(null);
  const [loadingH2H, setLoadingH2H] = useState(false);

  const { groups } = useCouple(userId);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(coupleId);
  useEffect(() => {
    if (coupleId) setSelectedGroupId(coupleId);
  }, [coupleId]);

  const { pseudos, members } = useCoupleMembers(selectedGroupId);
  const { compute: computeHeadToHead } = useHeadToHead(selectedGroupId);
  const others = members.filter((m) => m.user_id !== userId);

  useEffect(() => {
    supabase
      .from('stats')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => setPersonalStats((data ?? []) as StatRow[]));

    supabase
      .from('favoris')
      .select('content_id, content_items(*)')
      .eq('user_id', userId)
      .then(({ data }) => {
        setFavoris((data ?? []).map((f: any) => f.content_items).filter(Boolean));
      });
  }, [userId]);

  useEffect(() => {
    if (!selectedGroupId) {
      setGroupStats([]);
      setDefiStats([]);
      return;
    }
    supabase
      .from('stats')
      .select('*')
      .eq('couple_id', selectedGroupId)
      .then(({ data }) => setGroupStats((data ?? []) as StatRow[]));

    supabase
      .from('defi_completion_stats')
      .select('user_id, statut, total')
      .eq('couple_id', selectedGroupId)
      .then(({ data }) => setDefiStats((data ?? []) as DefiStat[]));

    setOtherUserId('');
    setHeadToHead(null);
  }, [selectedGroupId]);

  const totals = (rows: StatRow[]) =>
    rows.reduce(
      (acc, r) => ({
        victoires: acc.victoires + r.victoires,
        defaites: acc.defaites + r.defaites,
        nuls: acc.nuls + r.nuls,
        sessions: acc.sessions + r.sessions_count,
      }),
      { victoires: 0, defaites: 0, nuls: 0, sessions: 0 }
    );

  const personalTotals = totals(personalStats);
  const personalWinRate =
    personalTotals.sessions > 0 ? Math.round((personalTotals.victoires / personalTotals.sessions) * 100) : 0;

  const ranking: RankingRow[] = useMemo(
    () =>
      Object.entries(
        groupStats.reduce<Record<string, RankingRow>>((acc, r) => {
          const existing =
            acc[r.user_id] ??
            ({
              user_id: r.user_id,
              pseudo: pseudos[r.user_id] ?? (r.user_id === userId ? 'Toi' : 'Joueur'),
              victoires: 0,
              defaites: 0,
              nuls: 0,
              sessions: 0,
              winRate: 0,
              byCategory: {},
            } as RankingRow);
          existing.victoires += r.victoires;
          existing.defaites += r.defaites;
          existing.nuls += r.nuls;
          existing.sessions += r.sessions_count;
          const cat = existing.byCategory[r.category] ?? { victoires: 0, defaites: 0, nuls: 0, sessions: 0 };
          cat.victoires += r.victoires;
          cat.defaites += r.defaites;
          cat.nuls += r.nuls;
          cat.sessions += r.sessions_count;
          existing.byCategory[r.category] = cat;
          acc[r.user_id] = existing;
          return acc;
        }, {})
      )
        .map(([, row]) => ({ ...row, winRate: row.sessions > 0 ? Math.round((row.victoires / row.sessions) * 100) : 0 }))
        .sort((a, b) => b.victoires - a.victoires || b.winRate - a.winRate),
    [groupStats, pseudos, userId]
  );

  const defiSummary = (userIdFilter?: string) => {
    const rows = userIdFilter ? defiStats.filter((d) => d.user_id === userIdFilter) : defiStats;
    const fait = rows.filter((r) => r.statut === 'Fait').reduce((s, r) => s + r.total, 0);
    const pasFait = rows.filter((r) => r.statut === 'Pas fait').reduce((s, r) => s + r.total, 0);
    return { fait, pasFait };
  };

  const handleRemoveFavori = async (contentId: string) => {
    await supabase.from('favoris').delete().eq('user_id', userId).eq('content_id', contentId);
    setFavoris((prev) => prev.filter((f) => f.id !== contentId));
  };

  const handlePickOther = async (otherId: string) => {
    setOtherUserId(otherId);
    setHeadToHead(null);
    if (!otherId) return;
    setLoadingH2H(true);
    const result = await computeHeadToHead(userId, otherId);
    setHeadToHead(result);
    setLoadingH2H(false);
  };

  return (
    <div className="statistiques-page">
      <h1>Statistiques</h1>
      <div className="tabs">
        <button className={tab === 'perso' ? 'active' : ''} onClick={() => setTab('perso')}>Mes stats</button>
        {groups.length > 0 && (
          <button className={tab === 'groupe' ? 'active' : ''} onClick={() => setTab('groupe')}>Stats groupe</button>
        )}
        <button className={tab === 'favoris' ? 'active' : ''} onClick={() => setTab('favoris')}>Favoris</button>
      </div>

      {tab === 'perso' && (
        <>
          <p className="hint">
            Toutes tes parties confondues (solo, couple, ami·e·s) : {personalTotals.sessions} partie(s) jouée(s),{' '}
            {personalWinRate}% de réussite.
          </p>
          <CategoryBarChart stats={personalStats} />
          <WinLossPie {...personalTotals} />
        </>
      )}

      {tab === 'groupe' && (
        <>
          {groups.length > 1 && (
            <label>
              Groupe
              <select value={selectedGroupId ?? ''} onChange={(e) => setSelectedGroupId(e.target.value || null)}>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.nom ?? (g.mode === 'couple' ? 'Couple' : 'Ami·e·s')}</option>
                ))}
              </select>
            </label>
          )}

          {selectedGroupId && (
            <>
              <CategoryBarChart stats={groupStats} />
              <WinLossPie {...totals(groupStats)} />

              <div className="ranking-block">
                <h3>🏆 Classement du groupe (total et par catégorie)</h3>
                <ol className="ranking-list">
                  {ranking.map((r) => (
                    <li key={r.user_id} className={r.user_id === userId ? 'is-self' : ''}>
                      <button className="ranking-row-toggle" onClick={() => setExpandedUser(expandedUser === r.user_id ? null : r.user_id)}>
                        <span>{r.pseudo}</span>
                        <span>{r.victoires} victoire(s) · {r.winRate}% de réussite sur {r.sessions} partie(s)</span>
                      </button>
                      {expandedUser === r.user_id && (
                        <ul className="ranking-category-detail">
                          {Object.entries(r.byCategory).map(([cat, c]) => (
                            <li key={cat}>
                              {CATEGORY_LABELS[cat] ?? cat} : {c.victoires}V · {c.defaites}D · {c.nuls}N ({c.sessions} partie(s))
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                  {ranking.length === 0 && <p className="hint">Aucune partie jouée pour l'instant.</p>}
                </ol>
              </div>

              {others.length > 0 && (
                <div className="head-to-head-block">
                  <h3>⚔️ Face à une personne</h3>
                  <label>
                    Comparer avec
                    <select value={otherUserId} onChange={(e) => handlePickOther(e.target.value)}>
                      <option value="">Choisir...</option>
                      {others.map((m) => (
                        <option key={m.user_id} value={m.user_id}>{m.pseudo}</option>
                      ))}
                    </select>
                  </label>
                  {loadingH2H && <p className="hint">Calcul en cours...</p>}
                  {!loadingH2H && headToHead && otherUserId && (
                    <>
                      {headToHead.totalSessions === 0 ? (
                        <p className="hint">Aucune partie jouée ensemble pour l'instant contre {pseudos[otherUserId]}.</p>
                      ) : (
                        <>
                          <p>
                            {headToHead.totalSessions} partie(s) jouée(s) contre {pseudos[otherUserId]} :{' '}
                            <strong>{headToHead.winsA}</strong> victoire(s) pour toi ·{' '}
                            <strong>{headToHead.winsB}</strong> pour {pseudos[otherUserId]} ·{' '}
                            {headToHead.draws} nul(s)
                          </p>
                          <ul className="ranking-category-detail">
                            {headToHead.byCategory.map((c) => (
                              <li key={c.category}>
                                {CATEGORY_LABELS[c.category] ?? c.category} : {c.winsA} - {c.winsB}
                                {c.draws > 0 ? ` (${c.draws} nul(s))` : ''}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="defi-stats-block">
                <h3>Défis / gages du groupe</h3>
                <p>✅ {defiSummary().fait} fait(s) · ❌ {defiSummary().pasFait} pas fait(s)</p>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'favoris' && (
        <ul className="favoris-list">
          {favoris.length === 0 && <p>Aucun favori pour l'instant. Clique sur ☆ pendant une partie pour en ajouter.</p>}
          {favoris.map((f) => (
            <li key={f.id}>
              <span>{f.text}</span>
              <button className="link" onClick={() => handleRemoveFavori(f.id)}>Retirer</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
