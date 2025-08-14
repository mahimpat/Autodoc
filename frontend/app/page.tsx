'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  DocumentTextIcon, 
  BeakerIcon, 
  CodeBracketIcon,
  SparklesIcon,
  ArrowRightIcon,
  BookOpenIcon,
  ChartBarIcon,
  UserGroupIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import Header from '../components/Header';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Badge, Progress } from '../components/ui';
import { API_BASE } from '../lib/api';
import { SSEStream } from '../lib/sse';

const templates = [
  {
    id: 'tdd',
    name: 'Technical Design Document',
    description: 'Problem, Goals, Architecture, Trade-offs, Rollout',
    icon: <CodeBracketIcon className="w-5 h-5" />,
    badge: 'TDD',
    color: 'from-blue-500 to-indigo-500'
  },
  {
    id: 'legal_contract_analysis',
    name: 'Legal Contract Analysis',
    description: 'Contract review, risk assessment, recommendations',
    icon: <DocumentTextIcon className="w-5 h-5" />,
    badge: 'LEG',
    color: 'from-slate-600 to-slate-800'
  },
  {
    id: 'medical_clinical_study',
    name: 'Clinical Study Report',
    description: 'Clinical trial documentation and analysis',
    icon: <BeakerIcon className="w-5 h-5" />,
    badge: 'MED',
    color: 'from-red-500 to-pink-600'
  },
  {
    id: 'finance_risk_assessment',
    name: 'Financial Risk Assessment',
    description: 'Market, credit, and operational risk analysis',
    icon: <ChartBarIcon className="w-5 h-5" />,
    badge: 'FIN',
    color: 'from-green-600 to-emerald-700'
  }
];

const features = [
  {
    name: 'AI-Powered Generation',
    description: 'Transform messy sources into structured documentation using advanced AI models',
    icon: <SparklesIcon className="w-6 h-6" />
  },
  {
    name: 'Multiple Templates',
    description: 'Choose from various professional document templates for different use cases',
    icon: <DocumentTextIcon className="w-6 h-6" />
  },
  {
    name: 'Real-time Collaboration',
    description: 'Work together with your team on documents with live editing and comments',
    icon: <UserGroupIcon className="w-6 h-6" />
  },
  {
    name: 'Analytics & Insights',
    description: 'Track document performance and engagement with detailed analytics',
    icon: <ChartBarIcon className="w-6 h-6" />
  }
];

export default function Home() {
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState('tdd');
  const [model, setModel] = useState('phi3:mini');
  const [availableModels, setAvailableModels] = useState<any>(null);
  const [system, setSystem] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const r = useRouter();

  // Load available models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch(`${API_BASE}/models/available`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableModels(data);
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

  const start = () => {
    if (!title.trim()) return;
    setBusy(true);
    setStatus('Initializing...');
    setProgress(0);
    
    const url = new URL(`${API_BASE}/ingest/stream_generate`);
    url.searchParams.set('project','default');
    url.searchParams.set('title', title);
    url.searchParams.set('template', template);
    if (desc) url.searchParams.set('description', desc);
    if (model) url.searchParams.set('model', model);
    if (system) url.searchParams.set('system', system);
    
    let startTime = Date.now();
    let tokenCount = 0;
    let totalSections = 1;
    let completedSections = 0;
    
    const sse = new SSEStream(url.toString(), (ev) => {
      console.log('SSE Event:', ev);
      
      if (ev.event === 'start') {
        setStatus('Starting document generation...');
        setProgress(5);
      } else if (ev.event === 'section_begin') {
        completedSections = ev.index || 0;
        setStatus(`Generating section: ${ev.heading || 'Unknown'}`);
        setProgress(10 + (completedSections / totalSections) * 70);
      } else if (ev.event === 'token') {
        tokenCount++;
        if (tokenCount % 10 === 0) { // Update every 10 tokens
          const elapsed = (Date.now() - startTime) / 1000;
          setStatus(`Writing content... (${tokenCount} tokens, ${elapsed.toFixed(0)}s)`);
        }
      } else if (ev.event === 'section_end') {
        completedSections++;
        setProgress(10 + (completedSections / totalSections) * 70);
      } else if (ev.event === 'saved' && ev.doc_id) {
        setStatus('Document saved! Redirecting...');
        setProgress(100);
        sse.stop();
        setTimeout(() => r.push(`/doc/${ev.doc_id}`), 500);
      } else if (ev.event === 'payment_required') {
        setStatus('Payment required - please upgrade your account');
        setBusy(false);
        sse.stop();
      }
    });
    
    // Add timeout handling
    const timeout = setTimeout(() => {
      setStatus('Generation is taking longer than usual... Please wait.');
    }, 10000);
    
    sse.start();
    
    // Cleanup timeout when done
    const originalStop = sse.stop;
    sse.stop = () => {
      clearTimeout(timeout);
      setBusy(false);
      setStatus('');
      setProgress(0);
      originalStop.call(sse);
    };
  };

  const selectedTemplate = templates.find(t => t.id === template) || templates[0];

  return (
    <div className="min-h-screen relative">
      {/* Aurora Background */}
      <div className="aurora fixed inset-0 pointer-events-none" />
      
      <Header />
      
      <main className="relative z-10">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 pt-16 pb-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 dark:from-white dark:via-purple-300 dark:to-white bg-clip-text text-transparent mb-6">
              Transform your rough notes into professional docs
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              Upload handwritten notes, sketches, PDFs, or any source material. AI transforms your content into polished, professional documentation using only your information.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                variant="primary" 
                className="group"
                onClick={() => document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Get Started
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Link href="/dashboard">
                <Button size="lg" variant="outline">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Everything you need to create professional documentation efficiently
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} variant="glass" hover className="p-6 text-center group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 mx-auto mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Document Generator Section */}
        <section id="generator" className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Generate Your Document
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Choose a template and create professional documentation in minutes
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Template Selection */}
            <div className="lg:col-span-1">
              <Card variant="glass" className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Choose Template</CardTitle>
                  <CardDescription>
                    Select the type of document you want to create
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {templates.map((tmpl) => (
                    <div 
                      key={tmpl.id}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        template === tmpl.id 
                          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/50' 
                          : 'border-white/20 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-700'
                      }`}
                      onClick={() => setTemplate(tmpl.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-r ${tmpl.color} flex items-center justify-center text-white`}>
                          {tmpl.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900 dark:text-white">{tmpl.name}</h3>
                            {template === tmpl.id && <CheckIcon className="w-4 h-4 text-brand-600" />}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{tmpl.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Document Form */}
            <div className="lg:col-span-2">
              <Card variant="glass" className="p-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className={`w-6 h-6 rounded bg-gradient-to-r ${selectedTemplate.color} flex items-center justify-center text-white text-xs font-bold`}>
                      {selectedTemplate.badge}
                    </div>
                    {selectedTemplate.name}
                  </CardTitle>
                  <CardDescription>
                    Fill in the details for your document
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Document Title</label>
                    <Input 
                      placeholder="Enter document title..." 
                      value={title} 
                      onChange={e => setTitle(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">AI Model</label>
                      <select 
                        className="w-full border border-white/40 dark:border-white/10 rounded-xl px-3 py-2 bg-white/70 dark:bg-white/5 backdrop-blur-md focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                        value={model} 
                        onChange={e => setModel(e.target.value)}
                      >
                        {availableModels ? (
                          <>
                            {Object.keys(availableModels.models.local).length > 0 && (
                              <optgroup label="🏠 Local Models">
                                {Object.entries(availableModels.models.local).map(([modelId, modelInfo]: [string, any]) => (
                                  <option key={modelId} value={modelId}>
                                    {modelInfo.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            
                            {Object.keys(availableModels.models.cloud).length > 0 && (
                              <optgroup label="☁️ Cloud Models">
                                {Object.entries(availableModels.models.cloud).map(([modelId, modelInfo]: [string, any]) => (
                                  <option key={modelId} value={modelId}>
                                    {modelInfo.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        ) : (
                          <>
                            <option value="phi3:mini">Phi-3 Mini (Fast)</option>
                            <option value="mistral:7b">Mistral 7B</option>
                            <option value="llama3:instruct">Llama3 Instruct</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                    <textarea 
                      className="w-full border border-white/40 dark:border-white/10 rounded-xl px-3 py-2 bg-white/70 dark:bg-white/5 backdrop-blur-md focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                      placeholder="Brief description of what you want to document..."
                      rows={3}
                      value={desc} 
                      onChange={e => setDesc(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">System Prompt (Optional)</label>
                    <Input 
                      placeholder="Custom instructions for the AI..." 
                      value={system} 
                      onChange={e => setSystem(e.target.value)}
                    />
                  </div>
                  
                  {busy && (
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {status || 'Initializing...'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-500">
                          {progress}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                  
                  <Button 
                    variant="primary" 
                    size="lg" 
                    className="w-full mt-6" 
                    onClick={start} 
                    disabled={busy || !title.trim()}
                    loading={busy}
                  >
                    {busy ? (status || 'Generating Document...') : 'Generate Document'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
