import { useEffect, useRef } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
ChartJS.register(...registerables);

const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#8657C4';

// Sales line (₹, left axis) and orders bars (right axis).
export default function SalesChart({ labels, revenue, orders }) {
  const ref = useRef(null);
  useEffect(() => {
    const purple = css('--purple-500'), gold = css('--gold-500'), faint = css('--ink-faint');
    const short = labels.map(d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }));
    const chart = new ChartJS(ref.current, {
      data: { labels: short, datasets: [
        { type: 'bar', label: 'Orders', data: orders, yAxisID: 'y1', backgroundColor: gold + '66', borderRadius: 6, maxBarThickness: 26 },
        { type: 'line', label: 'Sales (₹)', data: revenue, yAxisID: 'y', borderColor: purple, backgroundColor: purple + '22', fill: true, tension: 0.35, pointRadius: 3, pointBackgroundColor: purple },
      ] },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, color: faint, font: { size: 11 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: faint, font: { size: 10 }, maxTicksLimit: 10 } },
          y: { beginAtZero: true, ticks: { color: faint, font: { size: 10 }, callback: v => '₹' + Number(v).toLocaleString('en-IN') }, grid: { color: 'rgba(120,120,140,.12)' } },
          y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { color: faint, font: { size: 10 }, precision: 0 } },
        },
      },
    });
    return () => chart.destroy();
  }, [labels, revenue, orders]);
  return <div className="chart-wrap"><canvas ref={ref} aria-label="Sales chart" role="img" /></div>;
}
