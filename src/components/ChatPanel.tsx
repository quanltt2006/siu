import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Code2, BookOpen } from 'lucide-react';
import { ChatMessage, DatasetProfile } from '../types';
import { processQuestion } from '../utils/mockAI';
import ResultViewer from './ResultViewer';

interface Props {
  profile: DatasetProfile;
}

export default function ChatPanel({ profile }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await processQuestion(input.trim(), profile);
      setMessages(prev => [...prev, response]);
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '❌ Có lỗi xảy ra khi xử lý câu hỏi. Vui lòng thử lại.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestedQuestions = [
    'Dataset này nói về gì?',
    'Tính trung bình các cột số',
    'Top 5 giá trị lớn nhất',
    'Phân bố theo nhóm',
    'So sánh giữa các category',
  ];

  return (
    <div className="flex flex-col h-full bg-slate-800/30 rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Chat Header */}
      <div className="px-5 py-3 border-b border-slate-700/50 bg-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Analyst</h3>
            <p className="text-[10px] text-slate-400">RAG + Text-to-Pandas Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-sm text-slate-300 mb-1">Xin chào! Tôi là AI Analyst</p>
            <p className="text-xs text-slate-500 mb-4">Hỏi tôi bất kỳ điều gì về dataset của bạn</p>
            
            <div className="w-full space-y-2">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Gợi ý câu hỏi:</p>
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-700/30 border border-slate-700/50 text-xs text-slate-300 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-200 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-first' : ''}`}>
              {/* Route Badge */}
              {msg.role === 'assistant' && msg.type && (
                <div className="flex items-center gap-1 mb-1">
                  {msg.type === 'code-gen' ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      <Code2 className="w-2.5 h-2.5" /> Text-to-Pandas
                    </span>
                  ) : msg.type === 'rag' ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      <BookOpen className="w-2.5 h-2.5" /> RAG Context
                    </span>
                  ) : null}
                </div>
              )}
              
              <div className={`rounded-xl px-4 py-2.5 ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-700/50 border border-slate-600/50 text-slate-200'
              }`}>
                <div className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</div>
              </div>
              
              {/* Result Viewer for code-gen responses */}
              {msg.code && (
                <ResultViewer code={msg.code} tableData={msg.tableData} chartData={msg.chartData} />
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-300" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/60">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
            placeholder="Hỏi về dataset... (VD: Tính trung bình cột price)"
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
