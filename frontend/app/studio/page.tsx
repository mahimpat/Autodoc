'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  CogIcon,
  BookOpenIcon,
  EyeIcon,
  BeakerIcon,
  CodeBracketIcon,
  SparklesIcon,
  FolderIcon,
  PhotoIcon,
  FilmIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import Header from '../../components/Header';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Badge, Progress } from '../../components/ui';
import { API_BASE } from '../../lib/api';
import { SSEStream } from '../../lib/sse';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadProgress: number;
  status: 'uploading' | 'extracting' | 'chunking' | 'embedding' | 'uploaded' | 'error';
  statusMessage?: string;
  snippetCount?: number;
}

interface GenerationProgress {
  stage: string;
  progress: number;
  message: string;
}

const templateCategories = {
  general: [
    {
      id: 'tdd',
      name: 'Technical Design Document',
      description: 'Comprehensive technical specification with architecture, requirements, and implementation details',
      icon: <CodeBracketIcon className="w-6 h-6" />,
      color: 'from-blue-500 to-indigo-500',
      badge: 'TDD',
      sections: ['Problem Statement', 'Goals & Objectives', 'Architecture', 'Implementation', 'Testing', 'Deployment']
    },
    {
      id: 'research_report',
      name: 'Research Report',
      description: 'Academic-style research document with methodology, analysis, and conclusions',
      icon: <BeakerIcon className="w-6 h-6" />,
      color: 'from-purple-500 to-pink-500',
      badge: 'RPT',
      sections: ['Abstract', 'Introduction', 'Methodology', 'Results', 'Discussion', 'References']
    },
    {
      id: 'readme_changelog',
      name: 'README + Changelog',
      description: 'Project documentation with installation guide, usage examples, and version history',
      icon: <BookOpenIcon className="w-6 h-6" />,
      color: 'from-emerald-500 to-teal-500',
      badge: 'OSS',
      sections: ['Introduction', 'Installation', 'Usage', 'Configuration', 'Contributing', 'Changelog']
    },
    {
      id: 'api_library_docs',
      name: 'API & Library Documentation',
      description: 'Complete API reference with endpoints, examples, and integration guides',
      icon: <DocumentTextIcon className="w-6 h-6" />,
      color: 'from-orange-500 to-red-500',
      badge: 'API',
      sections: ['Overview', 'Authentication', 'Endpoints', 'Examples', 'SDKs', 'Troubleshooting']
    }
  ],
  legal: [
    {
      id: 'legal_contract_analysis',
      name: 'Contract Analysis',
      description: 'Detailed contract review with risk assessment and recommendations',
      icon: <DocumentTextIcon className="w-6 h-6" />,
      color: 'from-slate-600 to-slate-800',
      badge: 'LEG',
      sections: ['Executive Summary', 'Parties & Background', 'Key Terms', 'Risk Assessment', 'Recommendations']
    },
    {
      id: 'legal_case_brief',
      name: 'Case Brief',
      description: 'Legal case analysis with facts, issues, and strategic considerations',
      icon: <BookOpenIcon className="w-6 h-6" />,
      color: 'from-stone-600 to-stone-800',
      badge: 'CASE',
      sections: ['Case Overview', 'Facts', 'Legal Issues', 'Arguments', 'Conclusion']
    },
    {
      id: 'legal_compliance_audit',
      name: 'Compliance Audit',
      description: 'Regulatory compliance assessment with gap analysis and remediation plan',
      icon: <SparklesIcon className="w-6 h-6" />,
      color: 'from-gray-600 to-gray-800',
      badge: 'COMP',
      sections: ['Audit Scope', 'Regulatory Framework', 'Gap Analysis', 'Recommendations']
    }
  ],
  medical: [
    {
      id: 'medical_clinical_study',
      name: 'Clinical Study Report',
      description: 'Comprehensive clinical trial documentation with results and analysis',
      icon: <BeakerIcon className="w-6 h-6" />,
      color: 'from-red-500 to-pink-600',
      badge: 'CLN',
      sections: ['Study Synopsis', 'Objectives', 'Methods', 'Results', 'Safety', 'Conclusions']
    },
    {
      id: 'medical_case_report',
      name: 'Medical Case Report',
      description: 'Patient case documentation with clinical findings and treatment outcomes',
      icon: <DocumentTextIcon className="w-6 h-6" />,
      color: 'from-rose-500 to-red-600',
      badge: 'CASE',
      sections: ['Case Presentation', 'Patient History', 'Examination', 'Treatment', 'Outcomes']
    },
    {
      id: 'medical_protocol',
      name: 'Medical Protocol',
      description: 'Clinical protocol with procedures, guidelines, and safety considerations',
      icon: <BookOpenIcon className="w-6 h-6" />,
      color: 'from-pink-500 to-rose-600',
      badge: 'PROT',
      sections: ['Protocol Overview', 'Clinical Background', 'Procedures', 'Safety', 'Implementation']
    }
  ],
  finance: [
    {
      id: 'finance_risk_assessment',
      name: 'Risk Assessment',
      description: 'Financial risk analysis with market, credit, and operational risk evaluation',
      icon: <ChartBarIcon className="w-6 h-6" />,
      color: 'from-green-600 to-emerald-700',
      badge: 'RISK',
      sections: ['Executive Summary', 'Risk Framework', 'Market Risk', 'Credit Risk', 'Mitigation']
    },
    {
      id: 'finance_investment_analysis',
      name: 'Investment Analysis',
      description: 'Investment evaluation with financial analysis, valuation, and recommendations',
      icon: <SparklesIcon className="w-6 h-6" />,
      color: 'from-emerald-600 to-green-700',
      badge: 'INV',
      sections: ['Investment Thesis', 'Financial Analysis', 'Valuation', 'Risk Analysis', 'Recommendation']
    },
    {
      id: 'finance_audit_report',
      name: 'Audit Report',
      description: 'Financial audit documentation with findings, controls, and recommendations',
      icon: <DocumentTextIcon className="w-6 h-6" />,
      color: 'from-teal-600 to-green-700',
      badge: 'AUD',
      sections: ['Audit Opinion', 'Scope', 'Key Matters', 'Findings', 'Recommendations']
    }
  ]
};

export default function Studio() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [selectedTemplate, setSelectedTemplate] = useState(templateCategories.general[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model, setModel] = useState('phi3:mini');
  const [availableModels, setAvailableModels] = useState<any>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [sseStream, setSseStream] = useState<SSEStream | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load available models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch(`${API_BASE}/models/available`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableModels(data);
          // Set default model if current model isn't available
          if (data.default && !model) {
            setModel(data.default);
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };
    loadModels();
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadProgress: 0,
      status: 'uploading' as const
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Upload files to backend with detailed progress tracking
    for (const newFile of newFiles) {
      const uploadFile = async (fileData: UploadedFile) => {
        const file = acceptedFiles.find(f => f.name === fileData.name);
        if (!file) return;
        
        const formData = new FormData();
        formData.append('files', file);
        
        try {
          // Stage 1: Uploading
          setFiles(prev => prev.map(f => 
            f.id === fileData.id 
              ? { ...f, uploadProgress: 10, status: 'uploading', statusMessage: 'Uploading file...' }
              : f
          ));

          const response = await fetch(`${API_BASE}/ingest/upload`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }

          // Stage 2: Extracting text
          setFiles(prev => prev.map(f => 
            f.id === fileData.id 
              ? { ...f, uploadProgress: 30, status: 'extracting', statusMessage: 'Extracting text content...' }
              : f
          ));

          // Stage 3: Chunking
          setFiles(prev => prev.map(f => 
            f.id === fileData.id 
              ? { ...f, uploadProgress: 60, status: 'chunking', statusMessage: 'Breaking into searchable chunks...' }
              : f
          ));

          // Stage 4: Embedding
          setFiles(prev => prev.map(f => 
            f.id === fileData.id 
              ? { ...f, uploadProgress: 85, status: 'embedding', statusMessage: 'Creating vector embeddings...' }
              : f
          ));

          const result = await response.json();
          console.log('Upload successful:', result);
          
          // Get file processing results
          const fileResult = result.files?.find((f: any) => f.name === file.name);
          const snippetCount = fileResult?.snippets || 0;
          const contentAnalysis = fileResult?.status_message || fileResult?.content_type || '';
          
          // Stage 5: Complete
          setFiles(prev => prev.map(f => 
            f.id === fileData.id 
              ? { 
                  ...f, 
                  uploadProgress: 100, 
                  status: 'uploaded',
                  statusMessage: contentAnalysis ? `${contentAnalysis} • ${snippetCount} chunks` : `${snippetCount} chunks created`,
                  snippetCount
                }
              : f
          ));
        } catch (error) {
          console.error('Upload error:', error);
          setFiles(prev => prev.map(f => 
            f.id === fileData.id 
              ? { 
                  ...f, 
                  status: 'error', 
                  uploadProgress: 0,
                  statusMessage: error instanceof Error ? error.message : 'Upload failed'
                }
              : f
          ));
        }
      };

      uploadFile(newFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt', '.md'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
      'application/json': ['.json'],
      'text/markdown': ['.md']
    }
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const startGeneration = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your document');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(''); // Clear previous content
    setCurrentDocId(null);
    setGenerationProgress({ stage: 'Initializing', progress: 0, message: 'Starting document generation...' });

    const url = new URL(`${API_BASE}/ingest/stream_generate`);
    url.searchParams.set('project', 'default');
    url.searchParams.set('title', title);
    url.searchParams.set('template', selectedTemplate.id);
    if (description) url.searchParams.set('description', description);
    if (model) url.searchParams.set('model', model);
    if (systemPrompt) url.searchParams.set('system', systemPrompt);

    let startTime = Date.now();
    let tokenCount = 0;
    let totalSections = selectedTemplate.sections.length;
    let completedSections = 0;

    const stream = new SSEStream(url.toString(), (event) => {
      console.log('SSE Event:', event);
      
      if (event.event === 'start') {
        setGenerationProgress({
          stage: 'Starting',
          progress: 5,
          message: 'Document generation started...'
        });
      } else if (event.event === 'section_begin') {
        completedSections = event.index || 0;
        const progress = 10 + (completedSections / totalSections) * 70;
        setGenerationProgress({
          stage: 'Generating',
          progress: Math.round(progress),
          message: `Writing section: ${event.heading || 'Unknown'}`
        });
      } else if (event.event === 'token') {
        tokenCount++;
        // Accumulate content as we receive tokens
        setGeneratedContent(prev => prev + (event.text || ''));
        if (tokenCount % 20 === 0) { // Update every 20 tokens for studio
          const elapsed = (Date.now() - startTime) / 1000;
          setGenerationProgress(prev => prev ? {
            ...prev,
            message: `Writing content... (${tokenCount} tokens, ${elapsed.toFixed(0)}s)`
          } : null);
        }
      } else if (event.event === 'section_end') {
        completedSections++;
        const progress = 10 + (completedSections / totalSections) * 70;
        setGenerationProgress(prev => prev ? {
          ...prev,
          progress: Math.round(progress),
          message: `Completed section ${completedSections} of ${totalSections}`
        } : null);
      } else if (event.event === 'saved' && event.doc_id) {
        setCurrentDocId(event.doc_id);
        if (event.content) {
          setGeneratedContent(event.content);
        }
        setGenerationProgress({
          stage: 'Complete',
          progress: 100,
          message: 'Document generated successfully!'
        });
        setTimeout(() => {
          setIsGenerating(false);
          setGenerationProgress(null);
          stream.stop();
        }, 1000);
      } else if (event.event === 'payment_required') {
        setGenerationProgress({
          stage: 'Error',
          progress: 0,
          message: 'Payment required - please upgrade your account'
        });
        setTimeout(() => {
          setIsGenerating(false);
          setGenerationProgress(null);
          stream.stop();
        }, 3000);
      } else if (event.event === 'error') {
        setIsGenerating(false);
        setGenerationProgress(null);
        stream.stop();
        alert('Generation failed: ' + (event.message || 'Unknown error'));
      }
    });

    setSseStream(stream);
    stream.start();
  };

  const stopGeneration = () => {
    if (sseStream) {
      sseStream.stop();
      setSseStream(null);
    }
    setIsGenerating(false);
    setGenerationProgress(null);
  };

  const saveDocument = async () => {
    if (!currentDocId || !generatedContent.trim()) return;
    
    try {
      const response = await fetch(`${API_BASE}/documents/${currentDocId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: generatedContent }),
        credentials: 'include'
      });
      
      if (response.ok) {
        console.log('Document saved successfully');
      } else {
        console.error('Failed to save document');
      }
    } catch (error) {
      console.error('Error saving document:', error);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <PhotoIcon className="w-5 h-5" />;
    if (type.startsWith('video/')) return <FilmIcon className="w-5 h-5" />;
    if (type.includes('pdf')) return <DocumentTextIcon className="w-5 h-5" />;
    return <FolderIcon className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen relative">
      <div className="aurora fixed inset-0 pointer-events-none" />
      <Header />
      
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 dark:from-white dark:via-purple-300 dark:to-white bg-clip-text text-transparent mb-4">
            Document Generation Studio
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Upload your sources, choose a template, and generate professional documentation powered by AI
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Templates & Configuration */}
          <div className="lg:col-span-1 space-y-6">
            {/* Template Selection */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5" />
                  Choose Template
                </CardTitle>
                <CardDescription>
                  Select industry and document type
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Industry</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(templateCategories).map(([categoryKey, templates]) => (
                      <button
                        key={categoryKey}
                        onClick={() => {
                          setSelectedCategory(categoryKey);
                          setSelectedTemplate(templates[0]);
                        }}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedCategory === categoryKey
                            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/50'
                            : 'border-white/20 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-700'
                        }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-white capitalize">
                          {categoryKey}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {templates.length} templates
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Template</label>
                  <div className="space-y-3">
                    {templateCategories[selectedCategory as keyof typeof templateCategories].map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedTemplate.id === template.id
                            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/50'
                            : 'border-white/20 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-700'
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-r ${template.color} flex items-center justify-center text-white`}>
                            {template.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                              {template.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {template.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CogIcon className="w-5 h-5" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">AI Model</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full border border-white/40 dark:border-white/10 rounded-xl px-3 py-2 bg-white/70 dark:bg-white/5 backdrop-blur-md focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  >
                    {availableModels ? (
                      <>
                        {/* Local Models */}
                        {Object.keys(availableModels.models.local).length > 0 && (
                          <optgroup label="🏠 Local Models">
                            {Object.entries(availableModels.models.local).map(([modelId, modelInfo]: [string, any]) => (
                              <option key={modelId} value={modelId}>
                                {modelInfo.name} - {modelInfo.description}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        
                        {/* Cloud Models */}
                        {Object.keys(availableModels.models.cloud).length > 0 && (
                          <optgroup label="☁️ Cloud Models">
                            {Object.entries(availableModels.models.cloud).map(([modelId, modelInfo]: [string, any]) => (
                              <option key={modelId} value={modelId}>
                                {modelInfo.name} - {modelInfo.description}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    ) : (
                      // Fallback options while loading
                      <>
                        <option value="phi3:mini">Phi-3 Mini (Fast)</option>
                        <option value="mistral:7b">Mistral 7B</option>
                        <option value="llama3:instruct">Llama3 Instruct</option>
                      </>
                    )}
                  </select>
                  {availableModels && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {availableModels.total_count} models available
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Custom Instructions</label>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Additional instructions for the AI..."
                    className="w-full border border-white/40 dark:border-white/10 rounded-xl px-3 py-2 bg-white/70 dark:bg-white/5 backdrop-blur-md focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Document Setup & Files */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document Details */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded bg-gradient-to-r ${selectedTemplate.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {selectedTemplate.badge}
                  </div>
                  {selectedTemplate.name}
                </CardTitle>
                <CardDescription>
                  Configure your document details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Document Title *</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a descriptive title..."
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the document content and purpose..."
                    className="w-full border border-white/40 dark:border-white/10 rounded-xl px-3 py-2 bg-white/70 dark:bg-white/5 backdrop-blur-md focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    rows={3}
                  />
                </div>

                {/* Template Sections Preview */}
                <div>
                  <label className="block text-sm font-medium mb-2">Document Structure</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.sections.map((section) => (
                      <Badge key={section} variant="outline">
                        {section}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CloudArrowUpIcon className="w-5 h-5" />
                  Source Files
                </CardTitle>
                <CardDescription>
                  Upload your rough notes, handwritten notes, PDFs, images, or other source materials. 
                  {files.filter(f => f.status === 'uploaded').length === 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {' '}Upload source files to generate documentation based on your actual content.
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                    isDragActive
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/50'
                      : 'border-white/30 dark:border-white/20 hover:border-brand-300 dark:hover:border-brand-700'
                  }`}
                >
                  <input {...getInputProps()} />
                  <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to browse'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports PDF, DOC, TXT, MD, images, and more
                  </p>
                </div>

                {/* Uploaded Files */}
                {files.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Uploaded Files ({files.length})
                    </h4>
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/30 dark:bg-white/5">
                        <div className="text-gray-600 dark:text-gray-400">
                          {getFileIcon(file.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {file.name}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>{formatFileSize(file.size)}</span>
                            <Badge
                              variant={
                                file.status === 'uploaded' ? 'success' :
                                file.status === 'error' ? 'destructive' : 'warning'
                              }
                              size="sm"
                            >
                              {file.status === 'uploaded' ? 'Ready' :
                               file.status === 'uploading' ? 'Uploading' :
                               file.status === 'extracting' ? 'Extracting' :
                               file.status === 'chunking' ? 'Chunking' :
                               file.status === 'embedding' ? 'Embedding' :
                               file.status === 'error' ? 'Error' : file.status}
                            </Badge>
                          </div>
                          {file.status !== 'uploaded' && file.status !== 'error' && (
                            <div className="mt-2 space-y-1">
                              <Progress
                                value={file.uploadProgress}
                                max={100}
                                size="sm"
                              />
                              {file.statusMessage && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {file.statusMessage}
                                </p>
                              )}
                            </div>
                          )}
                          {file.status === 'uploaded' && (
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                              ✓ {file.snippetCount} searchable chunks created
                              {file.statusMessage && (
                                <div className="text-gray-600 dark:text-gray-400 mt-1">
                                  {file.statusMessage}
                                </div>
                              )}
                            </div>
                          )}
                          {file.status === 'error' && file.statusMessage && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              ✗ {file.statusMessage}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generation Progress */}
            {isGenerating && generationProgress && (
              <Card variant="glass" className="border-brand-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 animate-pulse text-brand-500" />
                    Generating Document
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{generationProgress.stage}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {generationProgress.progress}%
                      </span>
                    </div>
                    <Progress
                      value={generationProgress.progress}
                      max={100}
                      variant="default"
                    />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {generationProgress.message}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              {!isGenerating ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={startGeneration}
                  disabled={!title.trim()}
                  className="flex-1"
                >
                  <PlayIcon className="w-5 h-5" />
                  {files.filter(f => f.status === 'uploaded').length > 0 
                    ? `Generate from ${files.filter(f => f.status === 'uploaded').length} Sources`
                    : 'Generate Document'
                  }
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={stopGeneration}
                  className="flex-1"
                >
                  <StopIcon className="w-5 h-5" />
                  Stop Generation
                </Button>
              )}
              
              {files.filter(f => f.status === 'uploaded').length > 0 && (
                <Button variant="outline" size="lg">
                  <EyeIcon className="w-5 h-5" />
                  Preview Sources
                </Button>
              )}
            </div>

            {/* Generated Document Editor */}
            {generatedContent && (
              <Card variant="glass" className="mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <DocumentTextIcon className="w-5 h-5" />
                      Generated Document
                      {currentDocId && (
                        <Badge variant="success" size="sm">
                          Saved (ID: {currentDocId})
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                      >
                        {isEditing ? (
                          <>
                            <EyeIcon className="w-4 h-4" />
                            Preview
                          </>
                        ) : (
                          <>
                            <CodeBracketIcon className="w-4 h-4" />
                            Edit
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(generatedContent)}
                      >
                        Copy
                      </Button>
                      {isEditing && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={saveDocument}
                          disabled={!currentDocId}
                        >
                          Save
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {isEditing ? 'Edit the generated content in markdown format' : 'Preview of your generated document'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <textarea
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      className="w-full h-96 border border-white/40 dark:border-white/10 rounded-xl px-4 py-3 bg-white/70 dark:bg-white/5 backdrop-blur-md focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 font-mono text-sm"
                      placeholder="Generated content will appear here..."
                    />
                  ) : (
                    <div className="prose prose-gray dark:prose-invert max-w-none">
                      <div className="bg-white/50 dark:bg-white/5 rounded-xl p-6 border border-white/40 dark:border-white/10">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-900 dark:text-gray-100">
                          {generatedContent}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}