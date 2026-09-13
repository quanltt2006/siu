export interface ColumnProfile {
  name: string;
  dtype: 'string' | 'number' | 'date' | 'boolean' | 'mixed';
  nullCount: number;
  nullPercent: number;
  uniqueCount: number;
  sampleValues: string[];
  min?: string | number;
  max?: string | number;
  mean?: number;
  median?: number;
  description?: string;
}

export interface DatasetProfile {
  fileName: string;
  rowCount: number;
  columnCount: number;
  fileSize: string;
  columns: ColumnProfile[];
  inferredDescription?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  code?: string;
  tableData?: { headers: string[]; rows: string[][] };
  chartData?: { labels: string[]; values: number[]; chartType: 'bar' | 'line' | 'pie' };
  timestamp: Date;
  type?: 'rag' | 'code-gen' | 'general';
}

export interface ColumnContext {
  name: string;
  userDescription: string;
}
