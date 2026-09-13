import { ChatMessage, DatasetProfile } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Simulate AI routing: RAG vs Code-gen
function routeQuestion(question: string, profile: DatasetProfile): 'rag' | 'code-gen' | 'general' {
  const q = question.toLowerCase();
  
  // Code-gen patterns: statistics, filtering, aggregation
  const codeGenPatterns = [
    'trung bình', 'mean', 'average', 'tổng', 'sum', 'đếm', 'count',
    'lớn nhất', 'max', 'nhỏ nhất', 'min', 'top', 'bottom',
    'phân bố', 'distribution', 'nhóm', 'group', 'lọc', 'filter',
    'so sánh', 'compare', 'tỷ lệ', 'percentage', 'ratio',
    'biểu đồ', 'chart', 'plot', 'vẽ', 'hiển thị',
    'bao nhiêu', 'how many', 'how much', 'what is',
  ];
  
  // RAG patterns: meaning, description, context
  const ragPatterns = [
    'ý nghĩa', 'nghĩa là', 'có nghĩa', 'giải thích', 'explain',
    'mô tả', 'describe', 'là gì', 'what is', 'tại sao', 'why',
    'context', 'bối cảnh', 'thông tin về', 'information about',
    'dataset này', 'dữ liệu này', 'nói về',
  ];
  
  const hasCodeGen = codeGenPatterns.some(p => q.includes(p));
  const hasRag = ragPatterns.some(p => q.includes(p));
  
  if (hasCodeGen && !hasRag) return 'code-gen';
  if (hasRag && !hasCodeGen) return 'rag';
  if (hasCodeGen && hasRag) return 'code-gen'; // prioritize code-gen
  return 'general';
}

function generatePandasCode(question: string, profile: DatasetProfile): { code: string; explanation: string } {
  const q = question.toLowerCase();
  const numericCols = profile.columns.filter(c => c.dtype === 'number');
  const stringCols = profile.columns.filter(c => c.dtype === 'string');
  const firstNumeric = numericCols[0]?.name || 'value';
  const firstString = stringCols[0]?.name || 'category';
  
  if (q.includes('trung bình') || q.includes('mean') || q.includes('average')) {
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\nresult = df['${firstNumeric}'].mean()\nprint(f"Trung bình: {result:.2f}")`,
      explanation: `Tính giá trị trung bình của cột '${firstNumeric}'`,
    };
  }
  
  if (q.includes('tổng') || q.includes('sum')) {
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\nresult = df['${firstNumeric}'].sum()\nprint(f"Tổng: {result:,.2f}")`,
      explanation: `Tính tổng giá trị cột '${firstNumeric}'`,
    };
  }
  
  if (q.includes('lớn nhất') || q.includes('max') || q.includes('top')) {
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\ntop_10 = df.nlargest(10, '${firstNumeric}')\nprint(top_10)`,
      explanation: `Lấy top 10 bản ghi có giá trị '${firstNumeric}' lớn nhất`,
    };
  }
  
  if (q.includes('nhỏ nhất') || q.includes('min') || q.includes('bottom')) {
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\nbottom_10 = df.nsmallest(10, '${firstNumeric}')\nprint(bottom_10)`,
      explanation: `Lấy 10 bản ghi có giá trị '${firstNumeric}' nhỏ nhất`,
    };
  }
  
  if (q.includes('nhóm') || q.includes('group') || q.includes('theo')) {
    const groupCol = firstString;
    const aggCol = firstNumeric;
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\ngrouped = df.groupby('${groupCol}')['${aggCol}'].agg(['mean', 'sum', 'count'])\ngrouped = grouped.sort_values('sum', ascending=False)\nprint(grouped)`,
      explanation: `Group by '${groupCol}' và tính mean, sum, count của '${aggCol}'`,
    };
  }
  
  if (q.includes('phân bố') || q.includes('distribution') || q.includes('tỷ lệ')) {
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\ndist = df['${firstString}'].value_counts()\ndist_pct = df['${firstString}'].value_counts(normalize=True) * 100\nresult = pd.DataFrame({'count': dist, 'percentage': dist_pct.round(2)})\nprint(result)`,
      explanation: `Phân bố giá trị của cột '${firstString}'`,
    };
  }
  
  if (q.includes('đếm') || q.includes('count') || q.includes('bao nhiêu')) {
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\ntotal_rows = len(df)\nunique_values = df['${firstString}'].nunique()\nnull_count = df['${firstString}'].isnull().sum()\nprint(f"Tổng số dòng: {total_rows}")\nprint(f"Giá trị unique: {unique_values}")\nprint(f"Giá trị null: {null_count}")`,
      explanation: `Đếm tổng số dòng, unique values, và null values`,
    };
  }
  
  if (q.includes('so sánh') || q.includes('compare')) {
    return {
      code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\ncomparison = df.groupby('${firstString}')['${firstNumeric}'].agg(['mean', 'median', 'std'])\ncomparison = comparison.sort_values('mean', ascending=False)\nprint(comparison)`,
      explanation: `So sánh giá trị trung bình của '${firstNumeric}' theo từng nhóm '${firstString}'`,
    };
  }
  
  // Default: describe
  return {
    code: `import pandas as pd\n\ndf = pd.read_csv('data.csv')\n# Tổng quan dataset\nprint(f"Shape: {df.shape}")\nprint(f"\\nColumns: {list(df.columns)}")\nprint(f"\\nDtypes:\\n{df.dtypes}")\nprint(f"\\nDescribe:\\n{df.describe()}")\nprint(f"\\nNull counts:\\n{df.isnull().sum()}")`,
    explanation: `Tổng quan dataset: shape, columns, dtypes, statistics, null counts`,
  };
}

function generateMockResult(question: string, profile: DatasetProfile): { tableData?: { headers: string[]; rows: string[][] }; chartData?: { labels: string[]; values: number[]; chartType: 'bar' | 'line' | 'pie' } } {
  const q = question.toLowerCase();
  const numericCols = profile.columns.filter(c => c.dtype === 'number');
  const stringCols = profile.columns.filter(c => c.dtype === 'string');
  
  if (q.includes('nhóm') || q.includes('group') || q.includes('phân bố') || q.includes('distribution') || q.includes('theo')) {
    const groupCol = stringCols[0]?.name || 'Category';
    const samples = stringCols[0]?.sampleValues || ['A', 'B', 'C', 'D', 'E'];
    const labels = samples.slice(0, 5);
    const values = labels.map(() => Math.floor(Math.random() * 1000) + 100);
    
    return {
      tableData: {
        headers: [groupCol, 'mean', 'sum', 'count'],
        rows: labels.map((label, i) => [
          label,
          (values[i] / (Math.floor(Math.random() * 20) + 5)).toFixed(2),
          values[i].toLocaleString(),
          String(Math.floor(Math.random() * 50) + 5),
        ]),
      },
      chartData: { labels, values, chartType: 'bar' },
    };
  }
  
  if (q.includes('top') || q.includes('lớn nhất') || q.includes('max')) {
    const numCol = numericCols[0]?.name || 'Value';
    const rows = Array.from({ length: 10 }, (_, i) => [
      String(i + 1),
      (Math.random() * 10000).toFixed(2),
      `Item_${Math.floor(Math.random() * 100)}`,
    ]);
    return {
      tableData: {
        headers: ['rank', numCol, 'label'],
        rows,
      },
      chartData: {
        labels: rows.map(r => r[2]),
        values: rows.map(r => parseFloat(r[1])),
        chartType: 'bar',
      },
    };
  }
  
  if (q.includes('so sánh') || q.includes('compare')) {
    const groupCol = stringCols[0]?.name || 'Category';
    const numCol = numericCols[0]?.name || 'Value';
    const samples = stringCols[0]?.sampleValues || ['A', 'B', 'C', 'D'];
    const labels = samples.slice(0, 4);
    const values = labels.map(() => Math.floor(Math.random() * 500) + 50);
    
    return {
      tableData: {
        headers: [groupCol, `${numCol}_mean`, `${numCol}_median`, `${numCol}_std`],
        rows: labels.map((label, i) => [
          label,
          values[i].toFixed(2),
          (values[i] * 0.9).toFixed(2),
          (values[i] * 0.2).toFixed(2),
        ]),
      },
      chartData: { labels, values, chartType: 'bar' },
    };
  }
  
  if (q.includes('tỷ lệ') || q.includes('percentage') || q.includes('pie')) {
    const samples = stringCols[0]?.sampleValues || ['A', 'B', 'C', 'D', 'E'];
    const labels = samples.slice(0, 5);
    const values = labels.map(() => Math.floor(Math.random() * 40) + 10);
    
    return {
      tableData: {
        headers: [stringCols[0]?.name || 'Category', 'count', 'percentage'],
        rows: labels.map((label, i) => [
          label,
          String(values[i] * 10),
          `${((values[i] / values.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%`,
        ]),
      },
      chartData: { labels, values, chartType: 'pie' },
    };
  }
  
  // Default: summary stats
  if (numericCols.length > 0) {
    return {
      tableData: {
        headers: ['statistic', ...numericCols.map(c => c.name)],
        rows: [
          ['count', ...numericCols.map(c => String(profile.rowCount - c.nullCount))],
          ['mean', ...numericCols.map(c => String(c.mean ?? '-'))],
          ['median', ...numericCols.map(c => String(c.median ?? '-'))],
          ['min', ...numericCols.map(c => String(c.min ?? '-'))],
          ['max', ...numericCols.map(c => String(c.max ?? '-'))],
        ],
      },
    };
  }
  
  return {};
}

function generateRAGResponse(question: string, profile: DatasetProfile): string {
  const q = question.toLowerCase();
  
  if (q.includes('dataset') || q.includes('dữ liệu') || q.includes('nói về')) {
    return `📊 **Tổng quan Dataset: ${profile.fileName}**\n\nDataset này chứa ${profile.rowCount.toLocaleString()} bản ghi với ${profile.columnCount} cột.\n\n**Các cột chính:**\n${profile.columns.map(c => `- \`${c.name}\` (${c.dtype}): ${c.uniqueCount} giá trị unique, ${c.nullPercent}% null`).join('\n')}\n\n**Phân tích tự động:**\n- Số cột numeric: ${profile.columns.filter(c => c.dtype === 'number').length}\n- Số cột categorical: ${profile.columns.filter(c => c.dtype === 'string').length}\n- Kích thước file: ${profile.fileSize}\n\n💡 *Thông tin này được suy luận từ schema và thống kê. Bạn có thể bổ sung context cho từng cột để có mô tả chính xác hơn.*`;
  }
  
  if (q.includes('ý nghĩa') || q.includes('giải thích') || q.includes('là gì')) {
    const mentionedCol = profile.columns.find(c => q.includes(c.name.toLowerCase()));
    if (mentionedCol) {
      return `📋 **Cột: \`${mentionedCol.name}\`**\n\n- **Kiểu dữ liệu:** ${mentionedCol.dtype}\n- **Giá trị unique:** ${mentionedCol.uniqueCount}\n- **Tỷ lệ null:** ${mentionedCol.nullPercent}%\n- **Sample values:** ${mentionedCol.sampleValues.join(', ')}\n${mentionedCol.dtype === 'number' ? `- **Range:** ${mentionedCol.min} → ${mentionedCol.max}\n- **Mean:** ${mentionedCol.mean}\n- **Median:** ${mentionedCol.median}` : ''}\n\n🔍 *Dựa trên tên cột và giá trị mẫu, cột này có thể liên quan đến ${mentionedCol.dtype === 'number' ? 'dữ liệu định lượng' : 'phân loại nhóm/danh mục'}.*\n\n⚠️ *Đây là suy đoán tự động. Bạn có thể chỉnh sửa mô tả trong phần Schema để cung cấp context chính xác hơn.*`;
    }
  }
  
  return `🤖 **Phân tích từ RAG Context:**\n\nDựa trên schema và metadata đã embed, dataset "${profile.fileName}" có các đặc điểm:\n\n1. **Quy mô:** ${profile.rowCount.toLocaleString()} rows × ${profile.columnCount} columns\n2. **Chất lượng dữ liệu:** ${profile.columns.filter(c => c.nullPercent < 5).length}/${profile.columnCount} cột có < 5% missing values\n3. **Đa dạng:** Tổng cộng ${profile.columns.reduce((sum, c) => sum + c.uniqueCount, 0).toLocaleString()} giá trị unique trên tất cả cột\n\n💡 *Hãy thử hỏi cụ thể hơn về một cột hoặc yêu cầu phân tích số liệu!*`;
}

export async function processQuestion(
  question: string,
  profile: DatasetProfile,
): Promise<ChatMessage> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
  
  const route = routeQuestion(question, profile);
  const id = uuidv4();
  
  if (route === 'code-gen') {
    const { code, explanation } = generatePandasCode(question, profile);
    const result = generateMockResult(question, profile);
    
    return {
      id,
      role: 'assistant',
      content: `🔧 **Text-to-Pandas Agent**\n\n${explanation}\n\n${result.tableData ? '✅ Query thực thi thành công. Kết quả:' : '✅ Code đã được sinh và sẵn sàng chạy.'}`,
      code,
      tableData: result.tableData,
      chartData: result.chartData,
      timestamp: new Date(),
      type: 'code-gen',
    };
  }
  
  if (route === 'rag') {
    return {
      id,
      role: 'assistant',
      content: generateRAGResponse(question, profile),
      timestamp: new Date(),
      type: 'rag',
    };
  }
  
  // General
  return {
    id,
    role: 'assistant',
    content: `🤔 Tôi hiểu câu hỏi của bạn. Bạn có thể:\n\n1. **Hỏi về ý nghĩa cột** → "Cột X có ý nghĩa gì?"\n2. **Yêu cầu phân tích số liệu** → "Tính trung bình cột Y", "Top 10 giá trị lớn nhất"\n3. **So sánh, phân nhóm** → "So sánh Z theo nhóm W"\n4. **Tổng quan dataset** → "Dataset này nói về gì?"\n\nHãy thử một trong các câu hỏi trên!`,
    timestamp: new Date(),
    type: 'general',
  };
}
