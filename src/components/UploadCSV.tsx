import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { parseCSV } from '../utils/csvParser';
import { DatasetProfile } from '../types';

interface Props {
  onDataLoaded: (profile: DatasetProfile) => void;
}

export default function UploadCSV({ onDataLoaded }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Vui lòng chọn file CSV');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File quá lớn (>50MB). MVP hỗ trợ tối đa 50MB.');
      return;
    }
    
    setError(null);
    setIsLoading(true);
    try {
      const profile = await parseCSV(file);
      onDataLoaded(profile);
    } catch {
      setError('Lỗi khi parse file CSV. Vui lòng kiểm tra format.');
    } finally {
      setIsLoading(false);
    }
  }, [onDataLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const loadSampleData = useCallback(() => {
    // Generate sample CSV data
    const headers = 'id,name,category,price,quantity,rating,city,date';
    const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Sports'];
    const cities = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];
    const names = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E', 'Widget X', 'Gadget Y', 'Item Z'];
    
    const rows = Array.from({ length: 200 }, (_, i) => {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      const name = names[Math.floor(Math.random() * names.length)];
      const price = (Math.random() * 1000 + 10).toFixed(2);
      const quantity = Math.floor(Math.random() * 500);
      const rating = (Math.random() * 4 + 1).toFixed(1);
      const date = `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
      return `${i + 1},${name},${cat},${price},${quantity},${rating},${city},${date}`;
    });
    
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const file = new File([blob], 'sample_sales_data.csv', { type: 'text/csv' });
    handleFile(file);
  }, [handleFile]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
            <FileSpreadsheet className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Upload CSV Data</h2>
          <p className="text-slate-400 text-sm">
            Kéo thả file CSV hoặc chọn file để bắt đầu phân tích
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Hỗ trợ ≤ 50MB • Auto-profiling • Schema inference
          </p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300
            ${isDragging 
              ? 'border-indigo-400 bg-indigo-500/10 scale-[1.02]' 
              : 'border-slate-600 hover:border-indigo-500/50 hover:bg-slate-800/50'
            }
            ${isLoading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isLoading}
          />
          
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-indigo-300 text-sm">Đang phân tích CSV...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-10 h-10 text-slate-500" />
              <div>
                <p className="text-slate-300 font-medium">
                  Kéo thả file CSV vào đây
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  hoặc click để chọn file
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-slate-500 text-xs mb-3">hoặc</p>
          <button
            onClick={loadSampleData}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
          >
            🚀 Load Sample Dataset (200 rows)
          </button>
        </div>
      </div>
    </div>
  );
}
