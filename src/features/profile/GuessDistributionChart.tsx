import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  distributionBuckets,
  type DailyStats,
  type DistributionBucket,
} from '../../domain/progression/stats.ts';

/** How many wrong guesses your daily wins took. Bars are cyan; the red bar is games not solved. */
export function GuessDistributionChart({ stats }: { stats: DailyStats }) {
  const data = distributionBuckets(stats);
  const summary = data.map((b) => `${b.detail}: ${b.count}`).join('. ');

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-semibold text-white">
        Wrong guesses before solving
      </figcaption>
      <div role="img" aria-label={`Guess distribution. ${summary}.`} className="h-52 w-full">
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 360, height: 208 }}
        >
          <BarChart data={data} margin={{ top: 18, right: 8, bottom: 0, left: -24 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tick={{ fill: '#c4b5fd', fontSize: 13 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#c4b5fd', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.06)' }}
              contentStyle={{
                background: '#14123a',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                color: '#fff',
              }}
              formatter={(value) => [value, 'Games']}
              labelFormatter={(_label, payload) =>
                (payload?.[0]?.payload as DistributionBucket | undefined)?.detail ?? ''
              }
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {data.map((b) => (
                <Cell key={b.label} fill={b.unsolved ? '#f87171' : '#22d3ee'} />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                fill="#fff"
                fontSize={12}
                formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Wrong guesses before solving</caption>
        <thead>
          <tr>
            <th scope="col">Result</th>
            <th scope="col">Games</th>
          </tr>
        </thead>
        <tbody>
          {data.map((b) => (
            <tr key={b.label}>
              <th scope="row">{b.detail}</th>
              <td>{b.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
