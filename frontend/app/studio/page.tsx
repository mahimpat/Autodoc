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
  ChartBarIcon,
  ScaleIcon,
  HeartIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  BuildingLibraryIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Progress } from '../../components/ui/Progress';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { API_BASE } from '../../lib/api';
import { SSEStream } from '../../lib/sse';
import Header from '../../components/Header';
import { EmptyState } from '../../components/EmptyState';
import { useWorkspace } from '../../lib/workspace-context';
import { TeamManagement } from '../../components/TeamManagement';
import { SharedDocumentLibrary } from '../../components/SharedDocumentLibrary';
import { GenerationContextInfo } from '../../components/GenerationContextInfo';
import StreamingRichTextEditor from '../../components/StreamingRichTextEditor';

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
  uploaded: [
    {
      id: 'content_driven_docs',
      name: 'Content-Driven Documentation',
      description: 'Generate documentation based entirely on your uploaded content - lets your files determine the structure',
      icon: <CloudArrowUpIcon className="w-6 h-6" />,
      color: 'from-indigo-500 to-purple-500',
      badge: 'NEW',
      sections: ['Content Overview', 'Key Information', 'Procedures', 'Technical Details', 'Data & Measurements', 'Decisions', 'Additional Context', 'Source Summary']
    },
    {
      id: 'uploaded_content_docs',
      name: 'Uploaded Content Documentation',
      description: 'Flexible documentation template that adapts to any type of uploaded content',
      icon: <DocumentTextIcon className="w-6 h-6" />,
      color: 'from-blue-500 to-indigo-500',
      badge: 'FLEX',
      sections: ['Executive Summary', 'Background & Context', 'Key Information', 'Detailed Analysis', 'Procedures', 'Requirements', 'Conclusions', 'References']
    },
    {
      id: 'uploaded_contract_analysis',
      name: 'Contract Analysis (Upload-Based)',
      description: 'Analyze uploaded contracts - extracts actual terms, conditions, and obligations from your contract files',
      icon: <DocumentTextIcon className="w-6 h-6" />,
      color: 'from-slate-500 to-gray-600',
      badge: 'CONTRACT',
      sections: ['Contract Overview', 'Terms Found', 'Obligations', 'Payment Terms', 'Timeline', 'Rights & Benefits', 'Termination', 'Additional Provisions']
    }
  ],
  technical: [
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
      id: 'technical_documentation',
      name: 'Technical Documentation',
      description: 'Professional technical docs from uploaded specs, guides, and technical content',
      icon: <CogIcon className="w-6 h-6" />,
      color: 'from-cyan-500 to-blue-500',
      badge: 'TECH',
      sections: ['Overview', 'Requirements', 'Architecture', 'Installation', 'Configuration', 'Usage', 'API Reference', 'Troubleshooting']
    },
    {
      id: 'api_library_docs',
      name: 'API & Library Documentation',
      description: 'Complete API reference with endpoints, examples, and integration guides',
      icon: <DocumentTextIcon className="w-6 h-6" />,
      color: 'from-orange-500 to-red-500',
      badge: 'API',
      sections: ['Overview', 'Authentication', 'Endpoints', 'Examples', 'SDKs', 'Troubleshooting']
    },
    {
      id: 'readme_changelog',
      name: 'README + Changelog',
      description: 'Project documentation with installation guide, usage examples, and version history',
      icon: <BookOpenIcon className="w-6 h-6" />,
      color: 'from-emerald-500 to-teal-500',
      badge: 'OSS',
      sections: ['Introduction', 'Installation', 'Usage', 'Configuration', 'Contributing', 'Changelog']
    }
  ],
  project: [
    {
      id: 'project_documentation',
      name: 'Project Documentation',
      description: 'Comprehensive project docs from uploaded planning materials, meeting notes, and requirements',
      icon: <FolderIcon className="w-6 h-6" />,
      color: 'from-green-500 to-emerald-500',
      badge: 'PROJ',
      sections: ['Project Overview', 'Requirements', 'Timeline & Milestones', 'Team & Responsibilities', 'Technical Implementation', 'Risk Management', 'Progress & Status', 'Next Steps']
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
      id: 'experiment_record',
      name: 'Experiment Record',
      description: 'Scientific experiment documentation with procedures, data, and analysis',
      icon: <BeakerIcon className="w-6 h-6" />,
      color: 'from-violet-500 to-purple-500',
      badge: 'EXP',
      sections: ['Experiment Overview', 'Hypothesis', 'Materials & Methods', 'Data Collection', 'Results', 'Analysis', 'Conclusions']
    }
  ],
  legal: [
    {
      id: 'legal_contract_analysis',
      name: 'Contract Analysis (Classic)',
      description: 'Traditional legal contract analysis with standard legal sections and frameworks',
      icon: <ScaleIcon className="w-6 h-6" />,
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
      icon: <DocumentTextIcon className="w-6 h-6" />,
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
      icon: <HeartIcon className="w-6 h-6" />,
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
      icon: <BanknotesIcon className="w-6 h-6" />,
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

type TabType = 'generate' | 'team' | 'documents';

export default function Studio() {
  const router = useRouter();
  const { addToast } = useToast();
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  const [selectedCategory, setSelectedCategory] = useState('uploaded');
  const [selectedTemplate, setSelectedTemplate] = useState(templateCategories.uploaded[0]);
  const [smartTemplates, setSmartTemplates] = useState<any[]>([]);
  const [selectedSmartTemplate, setSelectedSmartTemplate] = useState<any>(null);
  const [showSmartTemplates, setShowSmartTemplates] = useState(false);
  const [templateVariables, setTemplateVariables] = useState<{[key: string]: any}>({});
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
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [contentAnalysis, setContentAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [documentSynthesis, setDocumentSynthesis] = useState<any>(null);
  const [contentGaps, setContentGaps] = useState<any>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'analysis' | 'synthesis' | 'gaps'>('analysis');

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
    
    const loadSmartTemplates = async () => {
      try {
        // Load user's templates (private + organization + public)
        const [privateResponse, orgResponse, publicResponse] = await Promise.all([
          fetch(`${API_BASE}/templates/search?visibility=private&limit=20`, { credentials: 'include' }),
          fetch(`${API_BASE}/templates/search?visibility=organization&limit=20`, { credentials: 'include' }),
          fetch(`${API_BASE}/templates/search?visibility=public&limit=10`, { credentials: 'include' })
        ]);
        
        const allTemplates = [];
        
        if (privateResponse.ok) {
          const privateTemplates = await privateResponse.json();
          allTemplates.push(...privateTemplates);
        }
        
        if (orgResponse.ok) {
          const orgTemplates = await orgResponse.json();
          allTemplates.push(...orgTemplates);
        }
        
        if (publicResponse.ok) {
          const publicTemplates = await publicResponse.json();
          allTemplates.push(...publicTemplates);
        }
        
        // Remove duplicates and sort by created date
        const uniqueTemplates = allTemplates.filter((template, index, self) => 
          index === self.findIndex(t => t.id === template.id)
        ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        setSmartTemplates(uniqueTemplates);
        console.log(`Loaded ${uniqueTemplates.length} smart templates`);
      } catch (error) {
        console.error('Failed to load smart templates:', error);
      }
    };

    loadModels();
    loadSmartTemplates();
    
    // Check for smart_templates query parameter
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('smart_templates') === 'true') {
      setShowSmartTemplates(true);
      // Clean up the URL
      window.history.replaceState({}, '', '/studio');
    }
  }, []);

  // Refresh templates when window regains focus (user returns from template creation)
  useEffect(() => {
    const handleFocus = () => {
      console.log('Window focused, refreshing smart templates');
      loadSmartTemplates();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Analyze content when files are uploaded
  const analyzeUploadedContent = async () => {
    const uploadedFiles = files.filter(f => f.status === 'uploaded');
    if (uploadedFiles.length === 0) {
      setContentAnalysis(null);
      setDocumentSynthesis(null);
      setContentGaps(null);
      return;
    }

    setIsAnalyzing(true);
    setIsSynthesizing(true);
    
    try {
      // Run all analyses in parallel
      const [analysisResponse, synthesisResponse, gapsResponse] = await Promise.all([
        fetch(`${API_BASE}/intelligence/analyze_content`, {
          method: 'POST',
          credentials: 'include'
        }),
        uploadedFiles.length > 1 ? fetch(`${API_BASE}/intelligence/synthesize_documents`, {
          method: 'POST',
          credentials: 'include'
        }) : Promise.resolve(null),
        uploadedFiles.length > 1 ? fetch(`${API_BASE}/intelligence/content_gaps`, {
          credentials: 'include'
        }) : Promise.resolve(null)
      ]);

      // Process analysis response
      if (analysisResponse.ok) {
        const analysis = await analysisResponse.json();
        setContentAnalysis(analysis);
        
        // Auto-suggest best template if confidence is high
        if (analysis.template_recommendations && analysis.template_recommendations.length > 0) {
          const bestTemplate = analysis.template_recommendations[0];
          if (bestTemplate.confidence > 0.7) {
            // Find the template in our categories
            for (const [categoryKey, templates] of Object.entries(templateCategories)) {
              const foundTemplate = templates.find(t => t.id === bestTemplate.template_id);
              if (foundTemplate) {
                setSelectedCategory(categoryKey);
                setSelectedTemplate(foundTemplate);
                break;
              }
            }
          }
        }
      }

      // Process synthesis response (only for multiple files)
      if (synthesisResponse && synthesisResponse.ok) {
        const synthesis = await synthesisResponse.json();
        setDocumentSynthesis(synthesis);
      } else if (uploadedFiles.length === 1) {
        setDocumentSynthesis({ 
          status: "single_file", 
          message: "Upload multiple files to see document synthesis analysis" 
        });
      }

      // Process gaps response (only for multiple files)
      if (gapsResponse && gapsResponse.ok) {
        const gaps = await gapsResponse.json();
        setContentGaps(gaps);
      } else if (uploadedFiles.length === 1) {
        setContentGaps({ 
          status: "single_file", 
          message: "Upload multiple files to see content gap analysis" 
        });
      }

    } catch (error) {
      console.error('Content intelligence analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
      setIsSynthesizing(false);
    }
  };

  // Trigger analysis when uploaded files change
  useEffect(() => {
    const uploadedFiles = files.filter(f => f.status === 'uploaded');
    if (uploadedFiles.length > 0 && !isAnalyzing) {
      // Delay analysis slightly to ensure all files are processed
      const timer = setTimeout(() => {
        analyzeUploadedContent();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [files.filter(f => f.status === 'uploaded').length]);

  const handleFileUpload = useCallback(async (fileList: FileList) => {
    const acceptedFiles = Array.from(fileList);
    await onDrop(acceptedFiles);
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

  const pauseGeneration = () => {
    if (sseStream) {
      sseStream.stop();
      setSseStream(null);
    }
    setIsStreamPaused(true);
  };

  const resumeGeneration = () => {
    // Note: True stream resume would require backend support
    // For now, we'll just allow editing
    setIsStreamPaused(false);
    setIsEditing(true);
  };

  const stopGeneration = () => {
    if (sseStream) {
      sseStream.stop();
      setSseStream(null);
    }
    setIsGenerating(false);
    setGenerationProgress(null);
    setIsStreamPaused(false);
  };

  const handleContentChange = (content: string) => {
    setGeneratedContent(content);
    // Auto-save after a short delay to avoid too frequent saves
    if (currentDocId) {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      const newTimeout = setTimeout(() => {
        saveDocument();
      }, 2000); // Save 2 seconds after last edit
      setSaveTimeout(newTimeout);
    }
  };

  const startGeneration = async () => {
    if (!title.trim()) {
      addToast({
        title: 'Title Required',
        description: 'Please enter a title for your document',
        variant: 'warning'
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(''); // Clear previous content
    setCurrentDocId(null);
    setGenerationProgress({ stage: 'Initializing', progress: 0, message: 'Starting document generation...' });

    const url = new URL(`${API_BASE}/ingest/stream_generate`);
    url.searchParams.set('project', 'default');
    url.searchParams.set('title', title);
    // Use smart template if selected, otherwise use classic template
    if (selectedSmartTemplate) {
      url.searchParams.set('smart_template_id', selectedSmartTemplate.id);
      // Add template variables if any
      if (Object.keys(templateVariables).length > 0) {
        url.searchParams.set('template_variables', JSON.stringify(templateVariables));
      }
    } else {
      url.searchParams.set('template', selectedTemplate.id);
    }
    if (description) url.searchParams.set('description', description);
    if (model) url.searchParams.set('model', model);
    if (systemPrompt) url.searchParams.set('system', systemPrompt);

    let startTime = Date.now();
    let tokenCount = 0;
    let totalSections = selectedSmartTemplate ? 
      selectedSmartTemplate.template_data.sections.length : 
      selectedTemplate.sections.length;
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
        addToast({
          title: 'Document Generated',
          description: 'Your document has been generated successfully',
          variant: 'success'
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
        addToast({
          title: 'Generation Failed',
          description: event.message || 'Unknown error occurred',
          variant: 'destructive'
        });
      }
    });

    setSseStream(stream);
    stream.start();
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="premium-bg" />
      <Header />
      
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-6 space-y-6 animate-fade-in-up">
        {/* Studio Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-6 animate-gradient-x bg-300% leading-tight">
            Document Generation Studio
          </h1>
          <p className="text-muted-foreground text-xl max-w-3xl mx-auto leading-relaxed opacity-90">
            Transform your ideas into beautiful documentation with AI-powered generation and premium templates
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 bg-card/60 p-3 rounded-2xl border border-border backdrop-blur-xl shadow-2xl animate-scale-in">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-medium transition-all duration-300 ${
              activeTab === 'generate'
                ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/30 transform -translate-y-1 scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:shadow-lg hover:-translate-y-0.5'
            }`}
          >
            <SparklesIcon className="w-4 h-4" />
            Generate
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-medium transition-all duration-300 ${
              activeTab === 'documents'
                ? 'bg-violet-500 text-white shadow-xl shadow-violet-500/30 transform -translate-y-1 scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:shadow-lg hover:-translate-y-0.5'
            }`}
          >
            <BuildingLibraryIcon className="w-4 h-4" />
            Library
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-medium transition-all duration-300 ${
              activeTab === 'team'
                ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 transform -translate-y-1 scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:shadow-lg hover:-translate-y-0.5'
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            Team
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'generate' && (
          <>
            {/* Generation Context Info */}
            <div className="mb-8">
              <GenerationContextInfo 
                uploadedFilesCount={files.filter(f => f.status === 'uploaded').length}
                isGenerating={isGenerating}
              />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Templates & Configuration */}
          <div className="lg:col-span-1 space-y-6">
            {/* Template Selection */}
            <Card className="card animate-fade-in-up">
              <CardHeader className="p-6">
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <SparklesIcon className="w-5 h-5" />
                  Choose Template
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Select template type and document format
                </CardDescription>
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant={showSmartTemplates ? "outline" : "default"}
                    size="sm"
                    onClick={() => {
                      setShowSmartTemplates(false);
                      setSelectedSmartTemplate(null);
                    }}
                  >
                    Classic Templates
                  </Button>
                  <Button
                    variant={showSmartTemplates ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowSmartTemplates(true)}
                  >
                    <SparklesIcon className="w-4 h-4 mr-2" />
                    Smart Templates ({smartTemplates.length})
                  </Button>
                  {showSmartTemplates && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadSmartTemplates()}
                      className="ml-2"
                    >
                      🔄 Refresh
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showSmartTemplates ? (
                  /* Smart Templates Selection */
                  <div className="space-y-4">
                    {smartTemplates.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <SparklesIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No smart templates available</p>
                        <p className="text-sm">Create your first smart template to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {smartTemplates.map((template) => (
                          <div
                            key={template.id}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              selectedSmartTemplate?.id === template.id
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-slate-600 hover:border-slate-500'
                            }`}
                            onClick={() => setSelectedSmartTemplate(template)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-slate-100 mb-1">
                                  {template.name}
                                </h3>
                                <p className="text-sm text-slate-400 mb-2">
                                  {template.description}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {template.tags.slice(0, 3).map((tag: string, index: number) => (
                                    <Badge key={index} variant="secondary" size="sm">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {template.avg_rating > 0 && (
                                    <div className="flex items-center gap-1">
                                      <StarIcon className="w-3 h-3 text-yellow-400" />
                                      <span className="text-xs text-slate-400">
                                        {template.avg_rating.toFixed(1)}
                                      </span>
                                    </div>
                                  )}
                                  <span className="text-xs text-slate-500">
                                    {template.total_uses} uses
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Classic Templates Selection */
                  <>
                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Template Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(templateCategories).map(([categoryKey, templates]) => {
                      const categoryLabels = {
                        uploaded: 'Upload-Based',
                        technical: 'Technical',
                        project: 'Project & Research',
                        legal: 'Legal',
                        medical: 'Medical',
                        finance: 'Finance'
                      };
                      
                      return (
                        <button
                          key={categoryKey}
                          onClick={() => {
                            setSelectedCategory(categoryKey);
                            setSelectedTemplate(templates[0]);
                          }}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            selectedCategory === categoryKey
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <div className="font-medium text-slate-100">
                            {categoryLabels[categoryKey as keyof typeof categoryLabels] || categoryKey}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {templates.length} templates
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Template</label>
                  <div className="space-y-3">
                    {templateCategories[selectedCategory as keyof typeof templateCategories].map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedTemplate.id === template.id
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-r ${template.color} flex items-center justify-center text-white`}>
                            {template.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-slate-100 mb-1">
                              {template.name}
                            </h3>
                            <p className="text-sm text-slate-400">
                              {template.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card className="card animate-fade-in-up">
              <CardHeader className="p-6">
                <CardTitle className="flex items-center gap-2 text-card-foreground">
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
            <Card className="card animate-fade-in-up">
              <CardHeader className="p-6">
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <div className={`w-6 h-6 rounded bg-gradient-to-r ${selectedTemplate.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {selectedTemplate.badge}
                  </div>
                  {selectedTemplate.name}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
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

                {/* Template Variables (Smart Templates Only) */}
                {showSmartTemplates && selectedSmartTemplate && selectedSmartTemplate.variables && selectedSmartTemplate.variables.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Template Variables</label>
                    <div className="space-y-3">
                      {selectedSmartTemplate.variables
                        .sort((a: any, b: any) => a.order_index - b.order_index)
                        .map((variable: any) => (
                        <div key={variable.id}>
                          <label className="block text-sm font-medium mb-1">
                            {variable.name}
                            {variable.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {variable.description && (
                            <p className="text-xs text-gray-500 mb-2">{variable.description}</p>
                          )}
                          {variable.type === 'textarea' ? (
                            <textarea
                              value={templateVariables[variable.name] || variable.default_value || ''}
                              onChange={(e) => setTemplateVariables(prev => ({
                                ...prev,
                                [variable.name]: e.target.value
                              }))}
                              placeholder={variable.placeholder || `Enter ${variable.name}`}
                              className="w-full border border-white/40 dark:border-white/10 rounded-xl px-3 py-2 bg-white/70 dark:bg-white/5 backdrop-blur-md focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                              rows={2}
                            />
                          ) : variable.type === 'boolean' ? (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={templateVariables[variable.name] === 'true' || templateVariables[variable.name] === true}
                                onChange={(e) => setTemplateVariables(prev => ({
                                  ...prev,
                                  [variable.name]: e.target.checked
                                }))}
                                className="rounded"
                              />
                              <span className="text-sm">{variable.placeholder || `Enable ${variable.name}`}</span>
                            </label>
                          ) : (
                            <Input
                              type={variable.type === 'email' ? 'email' : variable.type === 'url' ? 'url' : variable.type === 'number' ? 'number' : 'text'}
                              value={templateVariables[variable.name] || variable.default_value || ''}
                              onChange={(e) => setTemplateVariables(prev => ({
                                ...prev,
                                [variable.name]: e.target.value
                              }))}
                              placeholder={variable.placeholder || `Enter ${variable.name}`}
                              className="border border-white/40 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/5 backdrop-blur-md focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Template Sections Preview */}
                <div>
                  <label className="block text-sm font-medium mb-2">Document Structure</label>
                  <div className="flex flex-wrap gap-2">
                    {showSmartTemplates && selectedSmartTemplate ? (
                      selectedSmartTemplate.template_data.sections.map((section: any, index: number) => (
                        <Badge key={index} variant="outline">
                          {section.title}
                        </Badge>
                      ))
                    ) : (
                      selectedTemplate.sections.map((section) => (
                        <Badge key={section} variant="outline">
                          {section}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card className="card animate-fade-in-up">
              <CardHeader className="p-6">
                <CardTitle className="flex items-center gap-2 text-card-foreground">
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
                  {selectedCategory === 'uploaded' && (
                    <span className="text-green-600 dark:text-green-400 font-medium block mt-2">
                      ✨ Using upload-based template - your content will drive the documentation structure!
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
                    isDragActive
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <input {...getInputProps()} />
                  <CloudArrowUpIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-300 mb-2">
                    {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to browse'}
                  </p>
                  <p className="text-sm text-slate-400">
                    Supports PDF, DOC, TXT, MD, images, and more
                  </p>
                </div>

                {/* Uploaded Files */}
                {files.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="font-medium text-slate-100">
                      Uploaded Files ({files.length})
                    </h4>
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30">
                        <div className="text-slate-400">
                          {getFileIcon(file.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-100 truncate">
                            {file.name}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-slate-400">
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
              <Card className="bg-slate-800/50 border-blue-500/50 rounded-2xl">
                <CardHeader className="p-6">
                  <CardTitle className="flex items-center gap-2 text-card-foreground">
                    <SparklesIcon className="w-5 h-5 animate-pulse text-blue-500" />
                    Generating Document
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
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
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  className="border-slate-600 hover:border-slate-500"
                >
                  <EyeIcon className="w-5 h-5" />
                  {showAnalysis ? 'Hide' : 'Show'} Content Analysis
                </Button>
              )}
            </div>

            {/* Content Intelligence Panel */}
            {showAnalysis && (contentAnalysis || documentSynthesis || contentGaps || isAnalyzing || isSynthesizing) && (
              <Card variant="glass" className="border-blue-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-blue-500" />
                    Content Intelligence Analysis
                    {(isAnalyzing || isSynthesizing) && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    )}
                  </CardTitle>
                  <CardDescription>
                    AI-powered analysis of your uploaded content with smart recommendations and synthesis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Analysis Tabs */}
                  <div className="mb-6">
                    <div className="flex space-x-1 bg-white/10 dark:bg-black/10 rounded-lg p-1">
                      <button
                        onClick={() => setActiveAnalysisTab('analysis')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                          activeAnalysisTab === 'analysis'
                            ? 'bg-white/80 dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        📄 Content Analysis
                      </button>
                      <button
                        onClick={() => setActiveAnalysisTab('synthesis')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                          activeAnalysisTab === 'synthesis'
                            ? 'bg-white/80 dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                        disabled={files.filter(f => f.status === 'uploaded').length < 2}
                      >
                        🔗 Document Synthesis
                        {files.filter(f => f.status === 'uploaded').length < 2 && (
                          <span className="ml-1 text-xs opacity-60">(2+ files)</span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveAnalysisTab('gaps')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                          activeAnalysisTab === 'gaps'
                            ? 'bg-white/80 dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                        disabled={files.filter(f => f.status === 'uploaded').length < 2}
                      >
                        🔍 Gap Analysis
                        {files.filter(f => f.status === 'uploaded').length < 2 && (
                          <span className="ml-1 text-xs opacity-60">(2+ files)</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="min-h-[300px]">
                    {activeAnalysisTab === 'analysis' && (
                      <div>
                        {isAnalyzing ? (
                          <div className="space-y-4">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <div className="grid grid-cols-2 gap-4">
                              <Skeleton className="h-20" />
                              <Skeleton className="h-20" />
                            </div>
                            <div className="flex space-x-2">
                              <Skeleton className="h-6 w-16" />
                              <Skeleton className="h-6 w-20" />
                              <Skeleton className="h-6 w-14" />
                            </div>
                          </div>
                        ) : contentAnalysis && (
                          <div className="space-y-6">
                      {/* Template Recommendations */}
                      {contentAnalysis.template_recommendations && (
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                            🎯 Recommended Templates
                          </h4>
                          <div className="space-y-2">
                            {contentAnalysis.template_recommendations.slice(0, 3).map((rec: any, index: number) => (
                              <div key={rec.template_id} className="flex items-center justify-between p-3 rounded-lg bg-white/30 dark:bg-white/5">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={index === 0 ? "default" : "outline"} size="sm">
                                      {Math.round(rec.confidence * 100)}% match
                                    </Badge>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {templateCategories[Object.keys(templateCategories).find(cat => 
                                        templateCategories[cat as keyof typeof templateCategories].some(t => t.id === rec.template_id)
                                      ) as keyof typeof templateCategories]?.find(t => t.id === rec.template_id)?.name || rec.template_id}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {rec.reason}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    for (const [categoryKey, templates] of Object.entries(templateCategories)) {
                                      const foundTemplate = templates.find(t => t.id === rec.template_id);
                                      if (foundTemplate) {
                                        setSelectedCategory(categoryKey);
                                        setSelectedTemplate(foundTemplate);
                                        break;
                                      }
                                    }
                                  }}
                                >
                                  Use Template
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Content Analysis */}
                      {contentAnalysis.analysis && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                              📄 Document Analysis
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Document Type:</span>
                                <Badge variant="outline">
                                  {contentAnalysis.analysis.document_type.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                                <span className="font-medium">
                                  {Math.round(contentAnalysis.analysis.confidence * 100)}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Word Count:</span>
                                <span className="font-medium">
                                  {contentAnalysis.analysis.metadata.word_count?.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Reading Time:</span>
                                <span className="font-medium">
                                  {contentAnalysis.analysis.metadata.estimated_reading_time} min
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                              🏗️ Content Structure
                            </h4>
                            <div className="space-y-2 text-sm">
                              {contentAnalysis.analysis.content_structure.has_headings && (
                                <Badge variant="success" size="sm">✓ Has Headings</Badge>
                              )}
                              {contentAnalysis.analysis.content_structure.has_lists && (
                                <Badge variant="success" size="sm">✓ Has Lists</Badge>
                              )}
                              {contentAnalysis.analysis.content_structure.has_tables && (
                                <Badge variant="success" size="sm">✓ Has Tables</Badge>
                              )}
                              {contentAnalysis.analysis.content_structure.has_code && (
                                <Badge variant="success" size="sm">✓ Has Code</Badge>
                              )}
                              {contentAnalysis.analysis.content_structure.has_dates && (
                                <Badge variant="success" size="sm">✓ Has Dates</Badge>
                              )}
                              {contentAnalysis.analysis.content_structure.has_numbers && (
                                <Badge variant="success" size="sm">✓ Has Numbers</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Key Themes */}
                      {contentAnalysis.analysis?.key_themes && contentAnalysis.analysis.key_themes.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                            🔑 Key Themes
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {contentAnalysis.analysis.key_themes.slice(0, 8).map((theme: string, index: number) => (
                              <Badge key={index} variant="outline" size="sm">
                                {theme}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Insights */}
                      {contentAnalysis.insights && contentAnalysis.insights.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                            💡 AI Insights
                          </h4>
                          <div className="space-y-2">
                            {contentAnalysis.insights.map((insight: string, index: number) => (
                              <div key={index} className="flex items-start gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                                <span className="text-gray-700 dark:text-gray-300">{insight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Content Stats */}
                      {contentAnalysis.content_stats && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            📊 Upload Statistics
                          </h4>
                          <div className="grid grid-cols-3 gap-4 text-sm text-center">
                            <div>
                              <div className="font-bold text-lg text-blue-600">
                                {contentAnalysis.content_stats.total_files}
                              </div>
                              <div className="text-gray-600 dark:text-gray-400">Files</div>
                            </div>
                            <div>
                              <div className="font-bold text-lg text-green-600">
                                {contentAnalysis.content_stats.total_snippets}
                              </div>
                              <div className="text-gray-600 dark:text-gray-400">Chunks</div>
                            </div>
                            <div>
                              <div className="font-bold text-lg text-purple-600">
                                {contentAnalysis.content_stats.estimated_documents}
                              </div>
                              <div className="text-gray-600 dark:text-gray-400">Documents</div>
                            </div>
                          </div>
                            {/* Template Recommendations */}
                            {contentAnalysis.template_recommendations && (
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                  🎯 Recommended Templates
                                </h4>
                                <div className="space-y-2">
                                  {contentAnalysis.template_recommendations.slice(0, 3).map((rec: any, index: number) => (
                                    <div key={rec.template_id} className="flex items-center justify-between p-3 rounded-lg bg-white/30 dark:bg-white/5">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <Badge variant={index === 0 ? "default" : "outline"} size="sm">
                                            {Math.round(rec.confidence * 100)}% match
                                          </Badge>
                                          <span className="font-medium text-gray-900 dark:text-white">
                                            {templateCategories[Object.keys(templateCategories).find(cat => 
                                              templateCategories[cat as keyof typeof templateCategories].some(t => t.id === rec.template_id)
                                            ) as keyof typeof templateCategories]?.find(t => t.id === rec.template_id)?.name || rec.template_id}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                          {rec.reason}
                                        </p>
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          for (const [categoryKey, templates] of Object.entries(templateCategories)) {
                                            const foundTemplate = templates.find(t => t.id === rec.template_id);
                                            if (foundTemplate) {
                                              setSelectedCategory(categoryKey);
                                              setSelectedTemplate(foundTemplate);
                                              break;
                                            }
                                          }
                                        }}
                                      >
                                        Use Template
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Content Analysis Details */}
                            {contentAnalysis.analysis && (
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                    📄 Document Analysis
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Document Type:</span>
                                      <Badge variant="outline">
                                        {contentAnalysis.analysis.document_type.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                                      <span className="font-medium">
                                        {Math.round(contentAnalysis.analysis.confidence * 100)}%
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 dark:text-gray-400">Word Count:</span>
                                      <span className="font-medium">
                                        {contentAnalysis.analysis.metadata.word_count?.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                    🏗️ Content Structure
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {contentAnalysis.analysis.content_structure.has_headings && (
                                      <Badge variant="success" size="sm">✓ Headings</Badge>
                                    )}
                                    {contentAnalysis.analysis.content_structure.has_lists && (
                                      <Badge variant="success" size="sm">✓ Lists</Badge>
                                    )}
                                    {contentAnalysis.analysis.content_structure.has_tables && (
                                      <Badge variant="success" size="sm">✓ Tables</Badge>
                                    )}
                                    {contentAnalysis.analysis.content_structure.has_code && (
                                      <Badge variant="success" size="sm">✓ Code</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Key Themes */}
                            {contentAnalysis.analysis?.key_themes && contentAnalysis.analysis.key_themes.length > 0 && (
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                  🔑 Key Themes
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {contentAnalysis.analysis.key_themes.slice(0, 8).map((theme: string, index: number) => (
                                    <Badge key={index} variant="outline" size="sm">
                                      {theme}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Document Synthesis Tab */}
                    {activeAnalysisTab === 'synthesis' && (
                      <div>
                        {isSynthesizing ? (
                          <div className="space-y-4">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-16 w-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-12" />
                              <Skeleton className="h-12" />
                              <Skeleton className="h-12" />
                            </div>
                          </div>
                        ) : documentSynthesis ? (
                          <div className="space-y-6">
                            {documentSynthesis.status === 'single_file' ? (
                              <div className="text-center py-8">
                                <div className="text-gray-400 mb-4">
                                  <SparklesIcon className="w-12 h-12 mx-auto" />
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">{documentSynthesis.message}</p>
                              </div>
                            ) : (
                              <>
                                {/* Synthesis Summary */}
                                {documentSynthesis.synthesis?.summary && (
                                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                                      📊 Synthesis Summary
                                    </h4>
                                    <p className="text-green-800 dark:text-green-200 text-sm">
                                      {documentSynthesis.synthesis.summary}
                                    </p>
                                  </div>
                                )}

                                {/* Document Clusters */}
                                {documentSynthesis.synthesis?.document_clusters && (
                                  <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                      🔗 Content Clusters
                                    </h4>
                                    <div className="space-y-3">
                                      {documentSynthesis.synthesis.document_clusters.map((cluster: any, index: number) => (
                                        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                          <div className="flex items-center justify-between mb-2">
                                            <h5 className="font-medium text-gray-900 dark:text-white">
                                              {cluster.theme}
                                            </h5>
                                            <Badge variant={cluster.confidence > 0.7 ? "success" : cluster.confidence > 0.4 ? "warning" : "outline"} size="sm">
                                              {Math.round(cluster.confidence * 100)}% confidence
                                            </Badge>
                                          </div>
                                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            <span className="font-medium">{cluster.content_pieces}</span> pieces from{' '}
                                            <span className="font-medium">{cluster.source_files.length}</span> files
                                          </div>
                                          <div className="flex flex-wrap gap-1 mb-2">
                                            {cluster.source_files.map((file: string, idx: number) => (
                                              <Badge key={idx} variant="outline" size="sm">
                                                {file}
                                              </Badge>
                                            ))}
                                          </div>
                                          {cluster.relationships.length > 0 && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                              Relationships: {cluster.relationships.join(', ')}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <EmptyState
                            icon={SparklesIcon}
                            title="No Synthesis Data"
                            description="Upload multiple files to see document synthesis analysis"
                          />
                        )}
                      </div>
                    )}

                    {/* Content Gaps Tab */}
                    {activeAnalysisTab === 'gaps' && (
                      <div>
                        {isSynthesizing ? (
                          <div className="space-y-4">
                            <Skeleton className="h-4 w-1/2" />
                            <div className="space-y-3">
                              <Skeleton className="h-10" />
                              <Skeleton className="h-10" />
                              <Skeleton className="h-10" />
                            </div>
                            <Skeleton className="h-8 w-3/4" />
                          </div>
                        ) : contentGaps ? (
                          <div className="space-y-6">
                            {contentGaps.status === 'single_file' ? (
                              <div className="text-center py-8">
                                <div className="text-gray-400 mb-4">
                                  <SparklesIcon className="w-12 h-12 mx-auto" />
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">{contentGaps.message}</p>
                              </div>
                            ) : (
                              <>
                                {/* Content Gaps */}
                                {contentGaps.gaps?.content_gaps && contentGaps.gaps.content_gaps.length > 0 && (
                                  <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                      🚨 Identified Gaps
                                    </h4>
                                    <div className="space-y-2">
                                      {contentGaps.gaps.content_gaps.map((gap: string, index: number) => (
                                        <div key={index} className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                          <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 flex-shrink-0"></div>
                                          <span className="text-amber-800 dark:text-amber-200 text-sm">{gap}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Missing Content Types */}
                                {contentGaps.gaps?.missing_content_types && contentGaps.gaps.missing_content_types.length > 0 && (
                                  <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                      📋 Missing Content Types
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {contentGaps.gaps.missing_content_types.map((type: string, index: number) => (
                                        <Badge key={index} variant="destructive" size="sm">
                                          Missing: {type}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Recommendations */}
                                {contentGaps.gaps?.recommendations && contentGaps.gaps.recommendations.length > 0 && (
                                  <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                      💡 Recommendations
                                    </h4>
                                    <div className="space-y-2">
                                      {contentGaps.gaps.recommendations.map((rec: string, index: number) => (
                                        <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                                          <span className="text-blue-800 dark:text-blue-200 text-sm">{rec}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Improvement Suggestions */}
                                {contentGaps.gaps?.improvement_suggestions && contentGaps.gaps.improvement_suggestions.length > 0 && (
                                  <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                      🔧 Improvement Suggestions
                                    </h4>
                                    <div className="space-y-2">
                                      {contentGaps.gaps.improvement_suggestions.map((suggestion: string, index: number) => (
                                        <div key={index} className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                          <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                                          <span className="text-green-800 dark:text-green-200 text-sm">{suggestion}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <EmptyState
                            icon={MagnifyingGlassIcon}
                            title="No Gap Analysis"
                            description="Upload multiple files to see content gap analysis"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Streaming Visual Editor */}
            {(generatedContent || isGenerating) && (
              <div className="mt-6">
                <StreamingRichTextEditor
                  content={generatedContent}
                  onChange={handleContentChange}
                  isStreaming={isGenerating && !isStreamPaused}
                  onPauseStream={pauseGeneration}
                  onResumeStream={resumeGeneration}
                  onStopStream={stopGeneration}
                  streamingEnabled={true}
                  placeholder={isGenerating ? "Document content will appear here as it's generated..." : "Start generating a document to see content here..."}
                  title={title || "Untitled Document"}
                />
                {currentDocId && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/doc/${currentDocId}`)}
                    >
                      Open in Advanced Editor
                    </Button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
          </>
        )}

        {/* Team Management Tab */}
        {activeTab === 'team' && (
          <TeamManagement />
        )}

        {/* Shared Documents Tab */}
        {activeTab === 'documents' && (
          <SharedDocumentLibrary />
        )}
      </main>
    </div>
  );
}