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

/** How many wrong guesses your daily wins took. Bars are blue; the red bar is games not solved. */
export function GuessDistributionChart({ stats }: { stats: DailyStats }) {
  const data = distributionBuckets(stats);
  const summary = data.map((b) => `${b.detail}: ${b.count}`).join('. ');

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="font-display text-lg text-ink">
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
              axisLine={{ stroke: '#1b2236', strokeWidth: 2 }}
              tick={{ fill: '#4a5570', fontSize: 13, fontWeight: 600 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#4a5570', fontSize: 12, fontWeight: 600 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(27,34,54,0.06)' }}
              contentStyle={{
                background: '#ffffff',
                border: '2px solid #1b2236',
                borderRadius: 12,
                color: '#1b2236',
              }}
              formatter={(value) => [value, 'Games']}
              labelFormatter={(_label, payload) =>
                (payload?.[0]?.payload as DistributionBucket | undefined)?.detail ?? ''
              }
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {data.map((b) => (
                <Cell
                  key={b.label}
                  fill={b.unsolved ? '#d3202b' : '#2f9bff'}
                  stroke="#1b2236"
                  strokeWidth={2}
                />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                fill="#1b2236"
                fontSize={13}
                fontWeight={700}
                formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* The hidden class goes on a wrapper: a table ignores the 1px size and would stretch the page. */}
      <div className="sr-only">
        <table>
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
      </div>
    </figure>
  );
}
