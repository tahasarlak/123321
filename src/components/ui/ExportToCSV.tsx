// src/components/ui/ExportToCSV/index.tsx 
'use client'; 

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic'; // برای lazy-load Papa (server-safe)
import { FiDownload, FiLoader } from 'react-icons/fi';
import { cn } from '@/lib/utils/cn'; // فرض: Tailwind cn utility

// Dynamic import برای PapaParse (فقط client-side لود می‌شه)
const Papa = dynamic(() => import('papaparse'), { ssr: false });

export interface ExportToCSVProps<T = any> {
  data: T[]; // Generic: برای هر type (instructors, users, etc.)
  filename: string;
  className?: string; // Custom styling
  columns?: (keyof T)[]; // Optional: فیلدهای خاص برای export
  onExport?: (csvData: string) => void; // Callback برای integration
}

export function ExportToCSV<T>({
  data,
  filename,
  className,
  columns = [], // Default: همه فیلدها
  onExport,
}: ExportToCSVProps<T>) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!data?.length) {
      // UX: Toast error (react-hot-toast یا sonner استفاده کن)
      console.warn('هیچ داده‌ای برای اکسپورت وجود ندارد!');
      return;
    }

    if (!Papa) {
      console.error('PapaParse لود نشد!');
      return;
    }

    setIsExporting(true);
    try {
      // Map داده‌ها (generic-safe)
      const csvData = data.map((item) => {
        const row: Record<string, any> = {};
        if (columns.length) {
          // فقط columns مشخص
          columns.forEach((col) => {
            row[String(col)] = item[col] ?? '';
          });
        } else {
          // همه فیلدها (fallback)
          Object.entries(item).forEach(([key, value]) => {
            row[key] = value ?? '';
          });
        }
        return row;
      });

      const csv = Papa.unparse(csvData, { 
        header: true, 
        quotes: true, // برای RTL/Persian safe
        delimiter: ',', 
      });
      
      if (onExport) onExport(csv); // Callback اگر لازم

      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Memory cleanup

      // UX: Success toast
      console.log(`اکسپورت موفق: ${data.length} رکورد`);
    } catch (error) {
      console.error('خطا در اکسپورت:', error);
      // UX: Error toast
    } finally {
      setIsExporting(false);
    }
  }, [data, filename, columns, onExport]);

  return (
    <div className={cn("relative group", className)}>
      <button
        onClick={handleExport}
        disabled={isExporting || !data?.length}
        className={cn(
          "px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 font-medium",
          isExporting
            ? "bg-gray-400 text-gray-500 cursor-not-allowed"
            : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95",
          !data?.length && "opacity-50 cursor-not-allowed bg-gray-300 text-gray-500"
        )}
        aria-label={`اکسپورت ${data.length || 0} رکورد به CSV`}
      >
        {isExporting ? (
          <>
            <FiLoader className="w-4 h-4 animate-spin" />
            در حال اکسپورت...
          </>
        ) : (
          <>
            <FiDownload className="w-4 h-4" />
            اکسپورت CSV ({data.length} رکورد)
          </>
        )}
      </button>
      {/* Tooltip برای UX جهانی */}
      <div className="absolute -top-2 right-full mr-2 bg-gray-800 text-white px-3 py-1 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-10">
        دانلود به فرمت CSV
      </div>
    </div>
  );
}