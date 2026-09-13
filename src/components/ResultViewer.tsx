import { useState } from 'react';
import { Code2, Table2, BarChart3, Copy, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface Props {
  code: string;
  tableData?: { headers: string[]; rows: string[][] };
  chartData?: { labels: string[]; values: number[]; chartType: 'bar' | 'line' | 'pie' };
}

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

export default function ResultViewer({ code, tableData, chartData }: Props) {
  const [activeTab, setActiveTab] = useState<'code' | 'table' | 'chart'>('code');
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'code' as const, label: 'Code', icon: Code2, available: true },
    { id: 'table' as const, label: 'Table', icon: Table2, available: !!tableData },
    { id: 'chart' as const, label: 'Chart', icon: BarChart3, available: !!chartData },
  ];

  const chartDataFormatted = chartData?.labels.map((label, i) => ({
    name: label,
    value: chartData.values[i],
  })) || [];

  return (
    <div className="mt-2 rounded-xl border border-slate-600/50 bg-slate-900/80 overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center border-b border-slate-700/50 bg-slate-800/50">
        {tabs.filter(t => t.available).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? 'text-indigo-300 border-indigo-400 bg-indigo-500/5'
                : 'text-slate-400 border-transparent hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3">
        {activeTab === 'code' && (
          <div className="relative">
            <button
              onClick={copyCode}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white transition-all"
              title="Copy code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre className="text-xs text-slate-300 font-mono overflow-x-auto pr-10 leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        )}

        {activeTab === 'table' && tableData && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {tableData.headers.map(h => (
                    <th key={h} className="text-left px-3 py-2 text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-1.5 text-slate-300 font-mono">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'chart' && chartData && (
          <div className="h-48 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartData.chartType === 'pie' ? (
                <PieChart>
                  <Pie
                    data={chartDataFormatted}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {chartDataFormatted.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              ) : (
                <BarChart data={chartDataFormatted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="value" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
