import { useState, useCallback } from 'react';
import { DatasetProfile, ColumnContext } from './types';
import { inferDatasetDescription } from './utils/csvParser';
import Header from './components/Header';
import UploadCSV from './components/UploadCSV';
import SchemaPreview from './components/SchemaPreview';
import ChatPanel from './components/ChatPanel';
import { RotateCcw, Layers, Zap, Shield } from 'lucide-react';

export default function App() {
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [columnContexts, setColumnContexts] = useState<ColumnContext[]>([]);
  const [showSchema, setShowSchema] = useState(true);

  const handleDataLoaded = useCallback((data: DatasetProfile) => {
    const description = inferDatasetDescription(data);
    setProfile({ ...data, inferredDescription: description });
    setColumnContexts([]);
  }, []);

  const handleReset = () => {
    setProfile(null);
    setColumnContexts([]);
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Header />
        <UploadCSV onDataLoaded={handleDataLoaded} />
        
        {/* Feature Cards */}
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-3">
                <Layers className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Schema-Aware RAG</h3>
              <p className="text-xs text-slate-400">Embed metadata + context vào vector store để trả lời câu hỏi về ý nghĩa cột và dataset.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Text-to-Pandas Agent</h3>
              <p className="text-xs text-slate-400">LLM sinh code pandas từ câu hỏi tự nhiên, chạy sandbox và trả kết quả + visualization.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center mb-3">
                <Shield className="w-4 h-4 text-green-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Safe Execution</h3>
              <p className="text-xs text-slate-400">Code được chạy trong sandbox an toàn với resource limits và whitelist thư viện.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      
      {/* Toolbar */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSchema(!showSchema)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showSchema 
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                : 'bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:text-slate-300'
            }`}
          >
            📊 Schema ({profile.columnCount} cols)
          </button>
          <span className="text-xs text-slate-500">
            {profile.rowCount.toLocaleString()} rows • {profile.fileSize}
          </span>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:text-red-300 hover:border-red-500/30 transition-all"
        >
          <RotateCcw className="w-3 h-3" />
          New Dataset
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Schema Panel */}
        {showSchema && (
          <div className="lg:w-[55%] p-4 overflow-y-auto animate-fade-in border-b lg:border-b-0 lg:border-r border-slate-800">
            <SchemaPreview 
              profile={profile} 
              onContextUpdate={setColumnContexts}
              columnContexts={columnContexts}
            />
            
            {/* Architecture Info */}
            <div className="mt-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">🏗️ Architecture Pipeline</h4>
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">CSV Upload</span>
                <span className="text-slate-600">→</span>
                <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Auto-Profile</span>
                <span className="text-slate-600">→</span>
                <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">LLM Infer Schema</span>
                <span className="text-slate-600">→</span>
                <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">User Context</span>
                <span className="text-slate-600">→</span>
                <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Embed → Vector Store</span>
                <span className="text-slate-600">→</span>
                <span className="px-2 py-1 rounded bg-pink-500/10 text-pink-300 border border-pink-500/20">Router (RAG/Code)</span>
              </div>
            </div>
          </div>
        )}

        {/* Chat Panel */}
        <div className={`flex-1 p-4 overflow-hidden flex flex-col ${showSchema ? 'lg:w-[45%]' : 'w-full'}`}>
          <ChatPanel profile={profile} />
        </div>
      </div>
    </div>
  );
}
