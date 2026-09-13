import { useState } from 'react';
import { DatasetProfile, ColumnContext } from '../types';
import { Table2, Hash, Type, Calendar, ToggleLeft, Edit3, Check, X, Info } from 'lucide-react';

interface Props {
  profile: DatasetProfile;
  onContextUpdate: (contexts: ColumnContext[]) => void;
  columnContexts: ColumnContext[];
}

function DtypeIcon({ dtype }: { dtype: string }) {
  switch (dtype) {
    case 'number': return <Hash className="w-3.5 h-3.5 text-emerald-400" />;
    case 'string': return <Type className="w-3.5 h-3.5 text-blue-400" />;
    case 'date': return <Calendar className="w-3.5 h-3.5 text-amber-400" />;
    case 'boolean': return <ToggleLeft className="w-3.5 h-3.5 text-purple-400" />;
    default: return <Table2 className="w-3.5 h-3.5 text-slate-400" />;
  }
}

function dtypeColor(dtype: string): string {
  switch (dtype) {
    case 'number': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    case 'string': return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
    case 'date': return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    case 'boolean': return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
    default: return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
  }
}

export default function SchemaPreview({ profile, onContextUpdate, columnContexts }: Props) {
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (colName: string) => {
    const existing = columnContexts.find(c => c.name === colName);
    setEditValue(existing?.userDescription || '');
    setEditingCol(colName);
  };

  const saveEdit = () => {
    if (!editingCol) return;
    const updated = columnContexts.filter(c => c.name !== editingCol);
    if (editValue.trim()) {
      updated.push({ name: editingCol, userDescription: editValue.trim() });
    }
    onContextUpdate(updated);
    setEditingCol(null);
  };

  const cancelEdit = () => {
    setEditingCol(null);
    setEditValue('');
  };

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/50 bg-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Table2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{profile.fileName}</h3>
              <p className="text-xs text-slate-400">
                {profile.rowCount.toLocaleString()} rows × {profile.columnCount} cols • {profile.fileSize}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
              Tier 1: In-Memory
            </span>
          </div>
        </div>
      </div>

      {/* Inferred Description */}
      {profile.inferredDescription && (
        <div className="px-5 py-3 border-b border-slate-700/50 bg-indigo-500/5">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-indigo-200/80 whitespace-pre-line">{profile.inferredDescription}</p>
          </div>
        </div>
      )}

      {/* Column Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Column</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Unique</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Null %</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Range / Sample</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Context</th>
            </tr>
          </thead>
          <tbody>
            {profile.columns.map((col) => (
              <tr key={col.name} className="group border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                <td className="px-5 py-2.5">
                  <code className="text-indigo-300 font-mono text-xs">{col.name}</code>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${dtypeColor(col.dtype)}`}>
                    <DtypeIcon dtype={col.dtype} />
                    {col.dtype}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-300 text-xs">{col.uniqueCount.toLocaleString()}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs font-medium ${col.nullPercent > 10 ? 'text-red-400' : col.nullPercent > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                    {col.nullPercent}%
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {col.dtype === 'number' ? (
                    <span className="text-xs text-slate-300">
                      {col.min} → {col.max} (μ={col.mean})
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {col.sampleValues.slice(0, 3).join(', ')}{col.sampleValues.length > 3 ? '...' : ''}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {editingCol === col.name ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Mô tả cột..."
                        className="w-32 px-2 py-1 rounded-md bg-slate-700 border border-slate-600 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      />
                      <button onClick={saveEdit} className="p-1 rounded hover:bg-green-500/20 text-green-400">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={cancelEdit} className="p-1 rounded hover:bg-red-500/20 text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400 max-w-[120px] truncate">
                        {columnContexts.find(c => c.name === col.name)?.userDescription || '—'}
                      </span>
                      <button
                        onClick={() => startEdit(col.name)}
                        className="p-1 rounded hover:bg-indigo-500/20 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Bổ sung context"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
