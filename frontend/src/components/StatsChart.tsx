import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { StatRow } from '../types';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981'];

export function CategoryBarChart({ stats }: { stats: StatRow[] }) {
  const data = stats.map((s) => ({ category: s.category, sessions: s.sessions_count }));
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <XAxis dataKey="category" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="sessions" fill="#6366f1" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function WinLossPie({ victoires, defaites, nuls }: { victoires: number; defaites: number; nuls: number }) {
  const data = [
    { name: 'Victoires', value: victoires },
    { name: 'Défaites', value: defaites },
    { name: 'Nuls', value: nuls },
  ].filter((d) => d.value > 0);

  if (data.length === 0) return <p>Pas encore de données.</p>;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Legend />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
