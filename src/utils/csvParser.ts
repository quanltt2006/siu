import Papa from 'papaparse';
import { ColumnProfile, DatasetProfile } from '../types';

function detectDtype(values: string[]): ColumnProfile['dtype'] {
  const nonNull = values.filter(v => v !== '' && v !== null && v !== undefined);
  if (nonNull.length === 0) return 'string';

  const numberCount = nonNull.filter(v => !isNaN(Number(v)) && v.trim() !== '').length;
  const boolCount = nonNull.filter(v => ['true', 'false', '0', '1', 'yes', 'no'].includes(v.toLowerCase())).length;
  const dateCount = nonNull.filter(v => !isNaN(Date.parse(v)) && v.length > 4).length;

  const total = nonNull.length;
  if (numberCount / total > 0.8) return 'number';
  if (boolCount / total > 0.8) return 'boolean';
  if (dateCount / total > 0.8) return 'date';
  if (numberCount / total > 0.5 && dateCount / total > 0.3) return 'mixed';
  return 'string';
}

function getSampleValues(values: string[], count: number = 5): string[] {
  const unique = [...new Set(values.filter(v => v !== '' && v !== null))];
  return unique.slice(0, count);
}

function computeStats(values: string[], dtype: ColumnProfile['dtype']): Partial<ColumnProfile> {
  const stats: Partial<ColumnProfile> = {};
  
  if (dtype === 'number') {
    const nums = values.filter(v => v !== '' && !isNaN(Number(v))).map(Number);
    if (nums.length > 0) {
      const sorted = [...nums].sort((a, b) => a - b);
      stats.min = Math.min(...nums);
      stats.max = Math.max(...nums);
      stats.mean = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
      stats.median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    }
  } else {
    const nonEmpty = values.filter(v => v !== '' && v !== null);
    if (nonEmpty.length > 0) {
      const sorted = [...nonEmpty].sort();
      stats.min = sorted[0];
      stats.max = sorted[sorted.length - 1];
    }
  }
  
  return stats;
}

export function parseCSV(file: File): Promise<DatasetProfile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        const headers = results.meta.fields || [];
        
        const columns: ColumnProfile[] = headers.map(header => {
          const values = data.map(row => row[header] || '');
          const nullCount = values.filter(v => v === '' || v === null || v === undefined).length;
          const dtype = detectDtype(values);
          const uniqueValues = [...new Set(values.filter(v => v !== '' && v !== null))];
          const stats = computeStats(values, dtype);
          
          return {
            name: header,
            dtype,
            nullCount,
            nullPercent: Math.round((nullCount / values.length) * 10000) / 100,
            uniqueCount: uniqueValues.length,
            sampleValues: getSampleValues(values),
            ...stats,
          };
        });

        const fileSizeBytes = file.size;
        let fileSize: string;
        if (fileSizeBytes < 1024) fileSize = `${fileSizeBytes} B`;
        else if (fileSizeBytes < 1024 * 1024) fileSize = `${(fileSizeBytes / 1024).toFixed(1)} KB`;
        else fileSize = `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;

        resolve({
          fileName: file.name,
          rowCount: data.length,
          columnCount: headers.length,
          fileSize,
          columns,
        });
      },
      error: (error) => reject(error),
    });
  });
}

export function inferDatasetDescription(profile: DatasetProfile): string {
  const colNames = profile.columns.map(c => c.name).join(', ');
  const numericCols = profile.columns.filter(c => c.dtype === 'number');
  const stringCols = profile.columns.filter(c => c.dtype === 'string');
  
  let desc = `Dataset chứa ${profile.rowCount.toLocaleString()} bản ghi với ${profile.columnCount} cột (${colNames}).`;
  
  if (numericCols.length > 0) {
    desc += ` Các cột số: ${numericCols.map(c => c.name).join(', ')}.`;
  }
  if (stringCols.length > 0) {
    desc += ` Các cột phân loại: ${stringCols.map(c => c.name).join(', ')}.`;
  }
  
  desc += `\n\n⚠️ Đây là mô tả suy đoán tự động. Vui lòng xác nhận hoặc bổ sung context cho từng cột.`;
  
  return desc;
}
