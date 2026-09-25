import * as XLSX from 'xlsx';

/**
 * Universal browser-safe file downloader for Android Chrome, iOS Safari, and Desktop browsers.
 * Uses Blob and ObjectURL with a temporary anchor element.
 */
export function triggerBrowserDownload(blob: Blob, filename: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    
    // Required for Firefox and some mobile Android browsers
    document.body.appendChild(link);
    link.click();
    
    // Cleanup with a slight delay to allow mobile browsers to process the download intent
    setTimeout(() => {
      try {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (cleanupErr) {
        console.warn('Download cleanup non-fatal warning:', cleanupErr);
      }
    }, 1000);
    
    return true;
  } catch (err) {
    console.error('triggerBrowserDownload error:', err);
    return false;
  }
}

export interface ExportSpreadsheetOptions {
  filename: string;
  sheetName?: string;
  format?: 'xlsx' | 'csv';
}

/**
 * Export tabular data as a real Excel .xlsx or formatted UTF-8 CSV spreadsheet.
 * Automatically converts raw values, numbers, and dates to proper cell types.
 */
export function exportToSpreadsheet<T extends Record<string, any>>(
  data: T[],
  options: ExportSpreadsheetOptions
): { success: boolean; message?: string } {
  if (!data || data.length === 0) {
    return {
      success: false,
      message: 'No data available for the selected filters.'
    };
  }

  const {
    filename,
    sheetName = 'Report',
    format = 'xlsx'
  } = options;

  try {
    // Generate clean filename
    const cleanExt = format === 'csv' ? '.csv' : '.xlsx';
    const finalFilename = filename.toLowerCase().endsWith(cleanExt)
      ? filename
      : `${filename}${cleanExt}`;

    if (format === 'csv') {
      // Generate standard CSV with UTF-8 BOM (\uFEFF) for Excel compatibility
      const headers = Object.keys(data[0]);
      const csvRows: string[] = [];
      
      // Header row
      csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));
      
      // Data rows
      for (const row of data) {
        const values = headers.map(header => {
          const val = row[header];
          if (val === null || val === undefined) return '""';
          if (typeof val === 'number') return String(val);
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      }

      const csvContent = '\uFEFF' + csvRows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const downloaded = triggerBrowserDownload(blob, finalFilename);
      
      if (!downloaded) {
        throw new Error('Failed to trigger browser download');
      }
      return { success: true };
    }

    // Default: Generate real binary Excel (.xlsx) workbook using XLSX library
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-fit column widths based on content
    const colWidths = Object.keys(data[0]).map(key => {
      let maxLen = key.length;
      for (let i = 0; i < Math.min(data.length, 100); i++) {
        const cellValue = data[i][key];
        const strVal = cellValue !== null && cellValue !== undefined ? String(cellValue) : '';
        if (strVal.length > maxLen) {
          maxLen = strVal.length;
        }
      }
      return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

    // Write to binary array
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const downloaded = triggerBrowserDownload(blob, finalFilename);
    if (!downloaded) {
      throw new Error('Failed to trigger browser download');
    }

    return { success: true };
  } catch (err) {
    console.error('Export failed:', err);
    return {
      success: false,
      message: 'Export failed. Please try again.'
    };
  }
}
