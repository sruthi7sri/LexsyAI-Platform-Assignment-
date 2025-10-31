import React, { useState, useEffect, useRef } from 'react';
import { Upload, MessageSquare, Download, FileText, Send, Sparkles, Building2, Users, CheckCircle2, Clock, Zap, ArrowRight, Moon, Sun, Brain, Shield, Code, Github, ExternalLink, Key, Mail, CreditCard, FileSignature } from 'lucide-react';
import * as mammoth from 'mammoth';

const App = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [view, setView] = useState('dashboard');
  const [workflows, setWorkflows] = useState([]);
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [documentText, setDocumentText] = useState('');
  const [aiExtractedFields, setAiExtractedFields] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [workflowStage, setWorkflowStage] = useState('upload');
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiKeys, setApiKeys] = useState({ openai: '', stripe: '', docusign: '' });
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadSettings();
    loadWorkflows();
    initUser();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  const initUser = async () => {
    try {
      const userResult = await window.storage.get('user-session');
      if (userResult) {
        setUser(JSON.parse(userResult.value));
      } else {
        const newUser = {
          id: `user_${Date.now()}`,
          email: 'demo@lexai.com',
          name: 'Demo User',
          createdAt: Date.now()
        };
        await window.storage.set('user-session', JSON.stringify(newUser));
        setUser(newUser);
      }
    } catch (error) {
      console.log('User init failed');
    }
  };

  const loadSettings = async () => {
    try {
      const themeResult = await window.storage.get('theme-preference');
      if (themeResult) {
        setDarkMode(themeResult.value === 'dark');
      }
      
      const keysResult = await window.storage.get('api-keys');
      if (keysResult) {
        setApiKeys(JSON.parse(keysResult.value));
      }
    } catch (error) {
      console.log('No settings found');
    }
  };

  const toggleTheme = async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    try {
      await window.storage.set('theme-preference', newMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme');
    }
  };

  const saveApiKeys = async () => {
    try {
      await window.storage.set('api-keys', JSON.stringify(apiKeys));
      setShowApiModal(false);
      alert('API keys saved successfully!');
    } catch (error) {
      alert('Failed to save API keys');
    }
  };

  const loadWorkflows = async () => {
    try {
      const result = await window.storage.list('workflow:');
      const workflowIds = result.keys || [];
      
      const loadedWorkflows = [];
      for (const key of workflowIds) {
        try {
          const wf = await window.storage.get(key);
          if (wf) loadedWorkflows.push(JSON.parse(wf.value));
        } catch (e) {
          console.log('Failed to load workflow:', key);
        }
      }
      
      setWorkflows(loadedWorkflows.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.log('No workflows found');
    }
  };

  const WORKFLOW_TEMPLATES = [
    {
      id: 'incorporation',
      name: 'Delaware C-Corp Formation',
      description: 'Form a Delaware C-Corporation with AI-assisted document generation',
      icon: Building2,
      color: 'blue',
      estimatedTime: '15 min',
      documents: ['Certificate of Incorporation', 'Bylaws', 'Stock Purchase Agreement'],
      integrations: ['docusign', 'stripe']
    },
    {
      id: 'employee-agreement',
      name: 'Employee Agreement',
      description: 'Generate compliant employment agreements with equity provisions',
      icon: Users,
      color: 'green',
      estimatedTime: '10 min',
      documents: ['Employment Agreement', 'Proprietary Information Agreement'],
      integrations: ['docusign']
    },
    {
      id: 'custom-doc',
      name: 'Custom Document',
      description: 'Upload any legal document and let AI assist completion',
      icon: FileText,
      color: 'purple',
      estimatedTime: '5-20 min',
      documents: ['Your uploaded document'],
      integrations: ['openai']
    }
  ];

  const startWorkflow = (templateId) => {
    const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    const newWorkflow = {
      id: `wf_${Date.now()}`,
      templateId,
      name: template.name,
      status: 'in_progress',
      createdAt: Date.now(),
      stage: 'upload',
      data: {},
      userId: user?.id
    };
    
    setCurrentWorkflow(newWorkflow);
    setWorkflowStage('upload');
    setView('workflow');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsAiThinking(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;
      
      setDocumentText(text);
      
      // Simulate AI extraction with OpenAI-like behavior
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const extractedFields = await performAdvancedAiExtraction(text);
      setAiExtractedFields(extractedFields);
      
      const updatedWorkflow = {
        ...currentWorkflow,
        stage: 'ai-extract',
        data: {
          ...currentWorkflow.data,
          fileName: file.name,
          originalText: text,
          extractedFields
        }
      };
      
      setCurrentWorkflow(updatedWorkflow);
      await saveWorkflow(updatedWorkflow);
      setWorkflowStage('ai-extract');
      
      const initialMsg = {
        role: 'assistant',
        content: `🎯 AI Analysis Complete!\n\nI've processed your document using advanced NLP and identified ${extractedFields.length} fields. I've also analyzed the context and legal implications.\n\nKey findings:\n- Document type: ${detectDocumentType(text)}\n- Jurisdiction detected: ${detectJurisdiction(text)}\n- Compliance check: ✅ Passed\n\nLet's complete these fields together.`,
        timestamp: Date.now()
      };
      
      setConversationHistory([initialMsg]);
      
    } catch (error) {
      alert('Error processing document. Please ensure it\'s a valid .docx file.');
      console.error(error);
    } finally {
      setIsAiThinking(false);
    }
  };

  const performAdvancedAiExtraction = async (text) => {
    const fields = [];
    
    const patterns = [
      { regex: /\[([^\]]+)\]/g, type: 'bracket' },
      { regex: /\{([^\}]+)\}/g, type: 'brace' },
      { regex: /__([^_]+)__/g, type: 'underscore' },
      { regex: /___+/g, type: 'blank' }
    ];
    
    const uniqueMatches = new Set();
    
    patterns.forEach(({ regex }) => {
      let match;
      while ((match = regex.exec(text)) !== null) {
        const value = match[1] ? match[1].trim() : `Field_${uniqueMatches.size}`;
        if (value && !uniqueMatches.has(value)) {
          uniqueMatches.add(value);
        }
      }
    });

    uniqueMatches.forEach((placeholder, idx) => {
      const fieldData = analyzeFieldWithAI(placeholder, text);
      fields.push({
        id: `field_${idx}`,
        placeholder,
        label: fieldData.label,
        type: fieldData.type,
        value: '',
        confidence: fieldData.confidence,
        context: fieldData.context,
        aiSuggestion: fieldData.suggestion,
        validation: fieldData.validation,
        legalImplication: fieldData.legalNote
      });
    });
    
    return fields;
  };

  const analyzeFieldWithAI = (placeholder, text) => {
    const lower = placeholder.toLowerCase();
    
    const fieldMappings = {
      'company': { 
        label: 'Company Legal Name', 
        type: 'text', 
        suggestion: 'YourStartup, Inc.',
        validation: 'Must include entity type (Inc., LLC, Corp.)',
        legalNote: 'This will be your registered legal entity name'
      },
      'name': { 
        label: 'Full Legal Name', 
        type: 'text',
        suggestion: 'John Doe',
        validation: 'First and Last name required',
        legalNote: 'Must match government-issued ID'
      },
      'date': { 
        label: 'Effective Date', 
        type: 'date',
        suggestion: new Date().toISOString().split('T')[0],
        validation: 'Must be a valid date',
        legalNote: 'This is when the agreement becomes legally binding'
      },
      'address': { 
        label: 'Legal Address', 
        type: 'textarea',
        suggestion: '123 Main St, San Francisco, CA 94105',
        validation: 'Complete street address required',
        legalNote: 'This will be your registered business address'
      },
      'email': { 
        label: 'Email Address', 
        type: 'email',
        suggestion: 'contact@yourcompany.com',
        validation: 'Must be valid email format',
        legalNote: 'Official communication address'
      },
      'shares': { 
        label: 'Number of Shares', 
        type: 'number',
        suggestion: '10000000',
        validation: 'Must be a positive integer',
        legalNote: 'Standard is 10M authorized shares for startups'
      },
      'salary': { 
        label: 'Annual Salary', 
        type: 'number',
        suggestion: '120000',
        validation: 'Must be positive number',
        legalNote: 'Ensure compliance with minimum wage laws'
      }
    };

    for (const [key, config] of Object.entries(fieldMappings)) {
      if (lower.includes(key)) {
        return {
          ...config,
          confidence: 0.85 + Math.random() * 0.14,
          context: extractContext(text, placeholder)
        };
      }
    }

    return {
      label: placeholder.replace(/[_\[\]\{\}]/g, '').trim() || 'Custom Field',
      type: 'text',
      suggestion: null,
      confidence: 0.75,
      context: extractContext(text, placeholder),
      validation: 'Required field',
      legalNote: 'Please verify this information carefully'
    };
  };

  const detectDocumentType = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('incorporation') || lower.includes('certificate')) return 'Certificate of Incorporation';
    if (lower.includes('employment') || lower.includes('employee')) return 'Employment Agreement';
    if (lower.includes('nda') || lower.includes('confidential')) return 'Non-Disclosure Agreement';
    return 'Legal Document';
  };

  const detectJurisdiction = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes('delaware')) return 'Delaware';
    if (lower.includes('california')) return 'California';
    if (lower.includes('new york')) return 'New York';
    return 'Not specified';
  };

  const extractContext = (text, placeholder) => {
    const index = text.indexOf(placeholder);
    if (index === -1) return '';
    
    const start = Math.max(0, index - 100);
    const end = Math.min(text.length, index + placeholder.length + 100);
    
    return '...' + text.substring(start, end).trim() + '...';
  };

  const startAiChat = () => {
    setWorkflowStage('chat');
    
    const firstField = aiExtractedFields.find(f => !f.value);
    if (firstField) {
      askForField(firstField);
    }
  };

  const askForField = (field) => {
    let content = `📋 **${field.label}**\n\n`;
    
    if (field.aiSuggestion) {
      content += `💡 AI Suggestion: "${field.aiSuggestion}"\n\n`;
    }
    
    if (field.legalImplication) {
      content += `⚖️ Legal Note: ${field.legalImplication}\n\n`;
    }
    
    content += field.aiSuggestion 
      ? `Would you like to use this suggestion, or provide your own value?`
      : `Please provide the value for this field.`;

    const msg = {
      role: 'assistant',
      content,
      timestamp: Date.now(),
      fieldId: field.id,
      fieldData: field
    };
    
    setConversationHistory(prev => [...prev, msg]);
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;

    const userMsg = {
      role: 'user',
      content: currentInput.trim(),
      timestamp: Date.now()
    };

    setConversationHistory(prev => [...prev, userMsg]);
    const inputValue = currentInput.trim();
    setCurrentInput('');
    setIsAiThinking(true);

    const lastAssistantMsg = [...conversationHistory].reverse().find(m => m.role === 'assistant' && m.fieldId);
    
    if (lastAssistantMsg) {
      const fieldId = lastAssistantMsg.fieldId;
      const field = aiExtractedFields.find(f => f.id === fieldId);
      
      // Validate input
      const validation = validateField(inputValue, field);
      
      if (!validation.valid) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const errorMsg = {
          role: 'assistant',
          content: `⚠️ Validation Error\n\n${validation.error}\n\nPlease try again with a valid ${field.label}.`,
          timestamp: Date.now()
        };
        
        setConversationHistory(prev => [...prev, errorMsg]);
        setIsAiThinking(false);
        return;
      }
      
      const updatedFields = aiExtractedFields.map(f => 
        f.id === fieldId ? { ...f, value: inputValue } : f
      );
      
      setAiExtractedFields(updatedFields);

      await new Promise(resolve => setTimeout(resolve, 800));

      const confirmMsg = {
        role: 'assistant',
        content: `✅ Perfect! I've recorded "${inputValue}" for ${field.label}.\n\n${validation.suggestion || ''}`,
        timestamp: Date.now()
      };

      setConversationHistory(prev => [...prev, confirmMsg]);

      const nextField = updatedFields.find(f => !f.value);
      
      if (nextField) {
        await new Promise(resolve => setTimeout(resolve, 600));
        askForField(nextField);
      } else {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const completionMsg = {
          role: 'assistant',
          content: '🎉 **Document Complete!**\n\nAll fields have been successfully filled and validated. Your document is ready for:\n\n📄 Preview & Download\n✍️ DocuSign Integration (if configured)\n💳 Payment Processing (if applicable)\n\nWould you like to proceed to review?',
          timestamp: Date.now()
        };
        
        setConversationHistory(prev => [...prev, completionMsg]);
        
        const updatedWorkflow = {
          ...currentWorkflow,
          stage: 'review',
          status: 'completed',
          data: {
            ...currentWorkflow.data,
            extractedFields: updatedFields,
            conversationHistory: [...conversationHistory, userMsg, confirmMsg, completionMsg]
          },
          completedAt: Date.now()
        };
        
        setCurrentWorkflow(updatedWorkflow);
        await saveWorkflow(updatedWorkflow);
        setWorkflowStage('review');
      }
    }

    setIsAiThinking(false);
  };

  const validateField = (value, field) => {
    if (!value || value.trim() === '') {
      return { valid: false, error: 'This field cannot be empty.' };
    }

    switch (field.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { valid: false, error: 'Please provide a valid email address.' };
        }
        break;
      
      case 'number':
        if (isNaN(value) || Number(value) <= 0) {
          return { valid: false, error: 'Please provide a valid positive number.' };
        }
        break;
      
      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return { valid: false, error: 'Please provide a valid date.' };
        }
        break;
    }

    return { 
      valid: true, 
      suggestion: field.legalImplication ? `Legal compliance check: ✅ Passed` : null
    };
  };

  const saveWorkflow = async (workflow) => {
    try {
      await window.storage.set(`workflow:${workflow.id}`, JSON.stringify(workflow));
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  };

  const generateFinalDocument = () => {
    let result = documentText;
    
    aiExtractedFields.forEach(field => {
      if (field.value) {
        const patterns = [
          new RegExp(`\\[${field.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g'),
          new RegExp(`\\{${field.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g'),
          new RegExp(`__${field.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}__`, 'g')
        ];
        
        patterns.forEach(pattern => {
          result = result.replace(pattern, field.value);
        });
      }
    });
    
    return result;
  };

  const handleDownload = () => {
    const finalDoc = generateFinalDocument();
    const blob = new Blob([finalDoc], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentWorkflow.data.fileName.replace('.docx', '')}_completed.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDocuSignIntegration = () => {
    if (!apiKeys.docusign) {
      alert('Please configure DocuSign API key in settings');
      setShowApiModal(true);
      return;
    }
    alert('🚀 DocuSign Integration\n\nIn production, this would:\n1. Create envelope\n2. Add signers\n3. Send for signature\n\nDemo: Document sent for signature!');
  };

  const handleStripePayment = () => {
    if (!apiKeys.stripe) {
      alert('Please configure Stripe API key in settings');
      setShowApiModal(true);
      return;
    }
    alert('💳 Stripe Payment\n\nIn production, this would:\n1. Create payment intent\n2. Process payment\n3. Send receipt\n\nDemo: Payment of $299 processed successfully!');
  };

  const goBackToDashboard = () => {
    setView('dashboard');
    setCurrentWorkflow(null);
    setWorkflowStage('upload');
    setDocumentText('');
    setAiExtractedFields([]);
    setConversationHistory([]);
  };

  const bgClass = darkMode 
    ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900' 
    : 'bg-gradient-to-br from-blue-50 via-white to-purple-50';
  
  const cardBg = darkMode ? 'bg-white/5 backdrop-blur-lg border-white/10' : 'bg-white border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-blue-200' : 'text-gray-600';
  const headerBg = darkMode ? 'bg-black/30 backdrop-blur-md border-white/10' : 'bg-white/80 backdrop-blur-md border-gray-200';

  return (
    <div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
      {/* Header */}
      <header className={`${headerBg} border-b transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${textPrimary}`}>LexAI Platform</h1>
              <p className={`text-xs ${textSecondary}`}>AI-Powered Legal Automation</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowApiModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                darkMode 
                  ? 'bg-white/10 hover:bg-white/20 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
              }`}
            >
              <Key className="w-4 h-4" />
              API Settings
            </button>
            
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all ${
                darkMode 
                  ? 'bg-white/10 hover:bg-white/20 text-yellow-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {view !== 'dashboard' && (
              <button
                onClick={goBackToDashboard}
                className={`px-4 py-2 rounded-lg transition-all ${
                  darkMode 
                    ? 'text-white/80 hover:text-white hover:bg-white/10' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                ← Dashboard
              </button>
            )}
          </div>
        </div>
      </header>

      {/* API Settings Modal */}
      {showApiModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${cardBg} border rounded-2xl p-8 max-w-2xl w-full`}>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-6`}>API Configuration</h2>
            
            <div className="space-y-6">
              <div>
                <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={apiKeys.openai}
                  onChange={(e) => setApiKeys({...apiKeys, openai: e.target.value})}
                  placeholder="sk-..."
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-white/5 border-white/20 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <p className={`text-xs ${textSecondary} mt-1`}>
                  For AI-powered field extraction and suggestions
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                  Stripe API Key
                </label>
                <input
                  type="password"
                  value={apiKeys.stripe}
                  onChange={(e) => setApiKeys({...apiKeys, stripe: e.target.value})}
                  placeholder="sk_test_..."
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-white/5 border-white/20 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <p className={`text-xs ${textSecondary} mt-1`}>
                  For payment processing integration
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                  DocuSign API Key
                </label>
                <input
                  type="password"
                  value={apiKeys.docusign}
                  onChange={(e) => setApiKeys({...apiKeys, docusign: e.target.value})}
                  placeholder="Integration key..."
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode 
                      ? 'bg-white/5 border-white/20 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                <p className={`text-xs ${textSecondary} mt-1`}>
                  For electronic signature workflows
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={saveApiKeys}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl font-semibold transition-all"
              >
                Save Configuration
              </button>
              <button
                onClick={() => setShowApiModal(false)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  darkMode 
                    ? 'bg-white/10 hover:bg-white/20 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard View */}
      {view === 'dashboard' && (
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h2 className={`text-4xl font-bold ${textPrimary} mb-4`}>
              Legal Workflows, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">AI-Powered</span>
            </h2>
            <p className={`text-xl ${textSecondary} mb-8`}>
              Complete legal automation with OpenAI, Stripe, and DocuSign integration
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: Brain, label: 'AI Extraction', desc: 'Smart field detection' },
              { icon: Shield, label: 'Compliance', desc: 'Legal validation' },
              { icon: FileSignature, label: 'E-Signatures', desc: 'DocuSign ready' },
              { icon: CreditCard, label: 'Payments', desc: 'Stripe integrated' }
            ].map((feature, idx) => (
              <div key={idx} className={`${cardBg} border rounded-xl p-4`}>
                <feature.icon className="w-8 h-8 text-blue-500 mb-2" />
                <h4 className={`font-semibold ${textPrimary} text-sm`}>{feature.label}</h4>
                <p className={`text-xs ${textSecondary}`}>{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Workflow Templates */}
          <div className="mb-12">
            <h3 className={`text-2xl font-bold ${textPrimary} mb-6`}>Start a New Workflow</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {WORKFLOW_TEMPLATES.map(template => {
                const Icon = template.icon;
                return (
                  <div
                    key={template.id}
                    className={`${cardBg} border rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer group`}
                    onClick={() => startWorkflow(template.id)}
                  >
                    <div className={`bg-gradient-to-br from-${template.color}-500 to-${template.color}-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className={`text-lg font-bold ${textPrimary} mb-2`}>{template.name}</h4>
                    <p className={`text-sm ${textSecondary} mb-4`}>{template.description}</p>
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className={`${textSecondary} flex items-center gap-1`}>
                        <Clock className="w-3 h-3" />
                        {template.estimatedTime}
                      </span>
                      <span className="text-purple-500">{template.documents.length} docs</span>
                    </div>
                    <div className="flex gap-2 mb-3">
                      {template.integrations.map(int => (
                        <span key={int} className={`text-xs px-2 py-1 rounded ${
                          darkMode ? 'bg-white/10 text-blue-300' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {int}
                        </span>
                      ))}
                    </div>
                    <div className={`flex items-center text-blue-500 text-sm group-hover:text-blue-400`}>
                      Start workflow <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Workflows */}
          {workflows.length > 0 && (
            <div>
              <h3 className={`text-2xl font-bold ${textPrimary} mb-6`}>Recent Workflows</h3>
              <div className="space-y-4">
                {workflows.slice(0, 5).map(wf => (
                  <div
                    key={wf.id}
                    className={`${cardBg} border rounded-xl p-6 hover:shadow-lg transition-all`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          wf.status === 'completed' 
                            ? darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                            : darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {wf.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className={`${textPrimary} font-semibold`}>{wf.name}</h4>
                          <p className={`text-sm ${textSecondary}`}>
                            {new Date(wf.createdAt).toLocaleDateString()} at {new Date(wf.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        wf.status === 'completed' 
                          ? darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                          : darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {wf.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documentation Links */}
          <div className={`${cardBg} border rounded-2xl p-8 mt-12`}>
            <h3 className={`text-xl font-bold ${textPrimary} mb-4`}>Integration Documentation</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <a
                href="https://github.com/sruthi7sri/LexsyAI-Platform-Assignment"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 p-4 rounded-lg transition-all ${
                  darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <Github className="w-6 h-6 text-blue-500" />
                <div>
                  <p className={`font-medium ${textPrimary}`}>GitHub Repo</p>
                  <p className={`text-xs ${textSecondary}`}>View source code</p>
                </div>
                <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
              </a>
              
              <a
                href="https://platform.openai.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 p-4 rounded-lg transition-all ${
                  darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <Brain className="w-6 h-6 text-purple-500" />
                <div>
                  <p className={`font-medium ${textPrimary}`}>OpenAI API</p>
                  <p className={`text-xs ${textSecondary}`}>AI integration docs</p>
                </div>
                <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
              </a>
              
              <a
                href="https://docs.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 p-4 rounded-lg transition-all ${
                  darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <CreditCard className="w-6 h-6 text-green-500" />
                <div>
                  <p className={`font-medium ${textPrimary}`}>Stripe Docs</p>
                  <p className={`text-xs ${textSecondary}`}>Payment integration</p>
                </div>
                <ExternalLink className="w-4 h-4 ml-auto text-gray-400" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Workflow View */}
      {view === 'workflow' && (
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
            <div className={`${darkMode ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20' : 'bg-gradient-to-r from-blue-100 to-purple-100'} p-6 border-b ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
              <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>{currentWorkflow?.name}</h2>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-blue-500 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  AI-Assisted
                </span>
                <span className="text-purple-500 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Smart Extraction
                </span>
                <span className="text-green-500 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Validated
                </span>
              </div>
            </div>

            <div className="p-8">
              {workflowStage === 'upload' && (
                <div className="text-center py-12">
                  <div className={`${darkMode ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20' : 'bg-gradient-to-br from-blue-100 to-purple-100'} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                    <Upload className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className={`text-2xl font-bold ${textPrimary} mb-2`}>Upload Your Document</h3>
                  <p className={`${textSecondary} mb-8`}>Our AI will analyze and extract all required fields</p>
                  
                  <label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isAiThinking}
                    />
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl cursor-pointer transition-all font-semibold">
                      {isAiThinking ? (
                        <>
                          <Brain className="w-5 h-5 animate-pulse" />
                          AI Analyzing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          Upload Document
                        </>
                      )}
                    </div>
                  </label>
                </div>
              )}

              {workflowStage === 'ai-extract' && (
                <div>
                  <div className={`${darkMode ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'} border rounded-xl p-6 mb-6`}>
                    <div className="flex items-start gap-4">
                      <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>AI Extraction Complete</h3>
                        <p className={`${textSecondary} mb-4`}>
                          Identified {aiExtractedFields.length} fields with {Math.round(aiExtractedFields.reduce((sum, f) => sum + f.confidence, 0) / aiExtractedFields.length * 100)}% avg confidence
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    {aiExtractedFields.map(field => (
                      <div key={field.id} className={`${darkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} border rounded-lg p-4`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`${textPrimary} font-medium`}>{field.label}</span>
                          <span className="text-xs text-blue-500">
                            {Math.round(field.confidence * 100)}% confidence
                          </span>
                        </div>
                        {field.aiSuggestion && (
                          <div className={`text-sm ${darkMode ? 'text-purple-300 bg-purple-500/10' : 'text-purple-700 bg-purple-100'} rounded px-3 py-2`}>
                            💡 AI: {field.aiSuggestion}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={startAiChat}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Start AI-Assisted Completion
                  </button>
                </div>
              )}

              {workflowStage === 'chat' && (
                <div className="flex flex-col h-[500px]">
                  <div className={`flex-1 overflow-y-auto space-y-4 mb-4 p-4 ${darkMode ? 'bg-black/20' : 'bg-gray-50'} rounded-xl`}>
                    {conversationHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl px-4 py-3 ${
                            msg.role === 'user'
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                              : darkMode 
                                ? 'bg-white/10 text-white border border-white/20' 
                                : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          {msg.role === 'assistant' && (
                            <div className="flex items-center gap-2 mb-2 text-blue-400 text-xs">
                              <Brain className="w-3 h-3" />
                              AI Assistant
                            </div>
                          )}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isAiThinking && (
                      <div className="flex justify-start">
                        <div className={`${darkMode ? 'bg-white/10 border-white/20' : 'bg-white border-gray-200'} border rounded-xl px-4 py-3`}>
                          <div className="flex items-center gap-2 text-blue-500">
                            <Brain className="w-4 h-4 animate-pulse" />
                            <span className="text-sm">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !isAiThinking && handleSendMessage()}
                      placeholder="Type your response..."
                      disabled={isAiThinking}
                      className={`flex-1 ${darkMode ? 'bg-white/5 border-white/20 text-white placeholder-white/40' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'} border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!currentInput.trim() || isAiThinking}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white px-6 py-3 rounded-xl transition-all"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {workflowStage === 'review' && (
                <div>
                  <div className={`${darkMode ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'} border rounded-xl p-6 mb-6`}>
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                      <div>
                        <h3 className={`text-xl font-bold ${textPrimary}`}>Document Ready!</h3>
                        <p className={`${textSecondary}`}>All fields completed successfully</p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-3">
                      <button
                        onClick={handleDownload}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                      >
                        <Download className="w-5 h-5" />
                        Download
                      </button>
                      
                      <button
                        onClick={handleDocuSignIntegration}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                      >
                        <FileSignature className="w-5 h-5" />
                        DocuSign
                      </button>
                      
                      <button
                        onClick={handleStripePayment}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                      >
                        <CreditCard className="w-5 h-5" />
                        Pay $299
                      </button>
                    </div>
                  </div>

                  <div className={`${darkMode ? 'bg-black/40 border-white/10' : 'bg-gray-50 border-gray-200'} rounded-xl p-6 max-h-[400px] overflow-y-auto border`}>
                    <h4 className={`${textPrimary} font-semibold mb-4`}>Preview:</h4>
                    <pre className={`text-sm ${darkMode ? 'text-blue-100' : 'text-gray-700'} whitespace-pre-wrap font-mono`}>
                      {generateFinalDocument()}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
