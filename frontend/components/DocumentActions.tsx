'use client';
import { useState } from 'react';
import { 
  DocumentArrowDownIcon, 
  EyeIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Button } from './ui/Button';
import { API_BASE } from '../lib/api';

interface DocumentActionsProps {
  documentId: number;
  documentTitle: string;
}

export default function DocumentActions({ documentId, documentTitle }: DocumentActionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handlePDFDownload = async () => {
    if (!documentId) return;
    
    setIsExporting(true);
    setExportStatus('idle');
    
    try {
      const response = await fetch(`${API_BASE}/export/pdf/${documentId}`, {
        credentials: 'include',
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${documentTitle}-autodoc.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setExportStatus('success');
      setTimeout(() => setExportStatus('idle'), 3000);
      
    } catch (error) {
      console.error('PDF export error:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePDFPreview = async () => {
    if (!documentId) return;
    
    try {
      const response = await fetch(`${API_BASE}/export/preview/${documentId}`, {
        credentials: 'include',
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Preview failed: ${response.status}`);
      }

      // Get the PDF blob and open in new tab
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
    } catch (error) {
      console.error('PDF preview error:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 3000);
    }
  };

  const getDownloadButtonContent = () => {
    if (isExporting) {
      return (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          <span>Exporting...</span>
        </>
      );
    }
    
    if (exportStatus === 'success') {
      return (
        <>
          <CheckIcon className="w-4 h-4" />
          <span>Downloaded!</span>
        </>
      );
    }
    
    if (exportStatus === 'error') {
      return (
        <>
          <ExclamationTriangleIcon className="w-4 h-4" />
          <span>Export Failed</span>
        </>
      );
    }
    
    return (
      <>
        <DocumentArrowDownIcon className="w-4 h-4" />
        <span>Export PDF</span>
      </>
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePDFPreview}
        className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
        disabled={isExporting}
      >
        <EyeIcon className="w-4 h-4" />
        <span className="hidden md:inline">Preview PDF</span>
      </Button>
      
      <Button
        variant="primary"
        size="sm"
        onClick={handlePDFDownload}
        disabled={isExporting}
        className={`flex items-center gap-2 transition-all duration-200 ${
          exportStatus === 'success' 
            ? 'bg-green-500 hover:bg-green-600' 
            : exportStatus === 'error'
            ? 'bg-red-500 hover:bg-red-600'
            : ''
        }`}
      >
        {getDownloadButtonContent()}
      </Button>
    </div>
  );
}