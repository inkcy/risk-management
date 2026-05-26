interface BarChartProps {
  data: { label: string; value: number }[];
}

export function BarChart({ data }: BarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bar-chart">
      {data.map((d, i) => {
        const pct = Math.round((d.value / max) * 80);
        const isHigh = d.value >= max * 0.85;
        return (
          <div key={i} className="bar-col">
            <div className="bar-num">{d.value}</div>
            <div className="bar-fill" style={{
              height: pct,
              background: isHigh ? 'rgba(226,81,74,0.6)' : 'rgba(79,142,247,0.45)',
            }} />
            <div className="bar-month">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}
