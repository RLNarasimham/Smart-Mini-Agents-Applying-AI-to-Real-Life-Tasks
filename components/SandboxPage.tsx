import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { LoginPage } from './LoginPage';
// @ts-ignore
import { createSession, executeCode } from "./api";

import {
  Search,
  Play,
  Download,
  Share,
  Copy,
  Code,
  Square,
  CheckCircle,
  Clock,
  Terminal,
  FileCheck,
  Package,
  Settings,
  Monitor,
  ChevronDown,
  Loader2
} from 'lucide-react';

interface SandboxPageProps {
  autoRun?: boolean;
}

interface Step {
  id: number;
  title: string;
  status: 'pending' | 'running' | 'completed';
  timestamp: string;
  icon: React.ElementType;
  description: string[];
}

export function SandboxPage({ autoRun = false }: SandboxPageProps) {
  const [prompt, setPrompt] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [typedContent, setTypedContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showCode, setShowCode] = useState(true);
  const [showEnvironmentSelector, setShowEnvironmentSelector] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Smaller, simpler code example
  const finalCode = `import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center">Welcome Back</h2>
        
        <form className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}`;

  // 7 steps with 3-line descriptions
  const [steps, setSteps] = useState<Step[]>([
    {
      id: 1,
      title: "Initializing AI workspace",
      status: 'pending',
      timestamp: "",
      icon: Settings,
      description: [
        "Setting up secure development environment",
        "Configuring project structure and dependencies",
        "Preparing AI code generation pipeline"
      ]
    },
    {
      id: 2,
      title: "Analyzing prompt requirements",
      status: 'pending',
      timestamp: "",
      icon: Terminal,
      description: [
        "Processing natural language instructions",
        "Identifying UI components and functionality needed",
        "Mapping requirements to React patterns"
      ]
    },
    {
      id: 3,
      title: "Installing dependencies",
      status: 'pending',
      timestamp: "",
      icon: Package,
      description: [
        "Installing React and TypeScript packages",
        "Adding Lucide icons and Tailwind CSS",
        "Configuring build tools and linting"
      ]
    },
    {
      id: 4,
      title: "Generating component structure",
      status: 'pending',
      timestamp: "",
      icon: Code,
      description: [
        "Creating LoginForm component with hooks",
        "Implementing form validation and state management",
        "Adding responsive design and accessibility"
      ]
    },
    {
      id: 5,
      title: "Applying modern styling",
      status: 'pending',
      timestamp: "",
      icon: CheckCircle,
      description: [
        "Implementing glassmorphism and gradient effects",
        "Adding hover states and smooth animations",
        "Ensuring dark mode compatibility"
      ]
    },
    {
      id: 6,
      title: "Testing and optimization",
      status: 'pending',
      timestamp: "",
      icon: Monitor,
      description: [
        "Running component tests and validation",
        "Optimizing bundle size and performance",
        "Checking cross-browser compatibility"
      ]
    },
    {
      id: 7,
      title: "Deployment ready!",
      status: 'pending',
      timestamp: "",
      icon: CheckCircle,
      description: [
        "Component successfully generated and tested",
        "Code is production-ready and optimized",
        "Ready for preview and customization"
      ]
    }
  ]);

  // Auto-start generation when component mounts or autoRun is true
  useEffect(() => {
    if (autoRun) {
      startGeneration();
    }
  }, [autoRun]);

  // Step progression animation
  useEffect(() => {
    if (isGenerating && currentStep < steps.length) {
      const timer = setTimeout(() => {
        setSteps(prev => prev.map((step, index) => {
          if (index === currentStep) {
            return { ...step, status: 'running', timestamp: 'Running...' };
          }
          return step;
        }));

        const completeTimer = setTimeout(() => {
          setSteps(prev => prev.map((step, index) => {
            if (index === currentStep) {
              return { ...step, status: 'completed', timestamp: `${Math.floor(Math.random() * 3) + 1}s ago` };
            }
            return step;
          }));

          setCurrentStep(prev => prev + 1);
        }, 1500 + Math.random() * 1000);

        return () => clearTimeout(completeTimer);
      }, 500);

      return () => clearTimeout(timer);
    } else if (isGenerating && currentStep >= steps.length) {
      // Start typing code
      setIsGenerating(false);
      setEditorContent(finalCode);
      startTyping();
    }
  }, [isGenerating, currentStep, steps.length]);

  // Typing animation for code
  const startTyping = () => {
    let index = 0;
    const typeInterval = setInterval(() => {
      if (index < finalCode.length) {
        setTypedContent(finalCode.slice(0, index + 1));
        index++;
      } else {
        clearInterval(typeInterval);
      }
    }, 20);
  };

  const startGeneration = () => {
    setIsGenerating(true);
    setCurrentStep(0);
    setTypedContent('');
    setShowCode(true);
    setShowPreview(false);
    // Reset all steps to pending
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', timestamp: '' })));
  };

  const handlePlayClick = () => {
    setShowEnvironmentSelector(true);
  };

  const handleEnvironmentSelect = (environment: 'vscode' | 'browser') => {
    setShowEnvironmentSelector(false);
    setShowPreview(true);
    setIsRunning(true);
    setShowCode(false);
  };

  const handleStopClick = () => {
    setShowPreview(false);
    setIsRunning(false);
    setShowCode(true);
  };

  const handleShowCode = () => {
    setShowCode(true);
    setShowPreview(false);
    setIsRunning(false);
  };

  const handleGenerate = async () => {
  if (!prompt.trim()) return;
  setIsGenerating(true);
  setSteps(prev => prev.map(step => ({ ...step, status: 'pending', timestamp: '' })));

  try {
    // Step 1: create sandbox session
    const sessionData = await createSession();
    const sessionId = sessionData.session_id;

    // Step 2: execute code in sandbox (AI agent simulation)
    const execData = await executeCode(
      sessionId,
      `print("Running sandbox for: ${prompt}")`,
      "python"
    );

    setTypedContent(execData.result?.data?.stdout || "// No output");
    setSteps(prev =>
      prev.map((s, i) => (i < prev.length ? { ...s, status: "completed" } : s))
    );
  } catch (error) {
    console.error("Sandbox error:", error);
  } finally {
    setIsGenerating(false);
  }
};


  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl mb-1">Sandbox</h1>
            <p className="text-muted-foreground">Experiment, test, and refine your AI prompts here</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" className="">
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" className="">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Left panel - Steps and Prompt */}
        <div className="w-1/2 flex flex-col">
          {/* Steps header */}
          <div className="p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center">
                <Clock className="w-4 h-4 mr-2 text-[#7B61FF]" />
                Generation Steps
              </h3>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-[#7B61FF]" />
                    <span>Generating...</span>
                  </>
                ) : currentStep >= steps.length && steps.some(s => s.status === 'completed') ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span>Completed</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <span>Ready</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Steps content */}
          <div className="flex-1 p-6">
            <div className="h-full backdrop-blur-xl bg-card/80 rounded-xl p-6">
              <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                {steps.map((step, index) => {
                  const IconComponent = step.icon;
                  const isVisible = index <= currentStep || step.status !== 'pending';

                  return (
                    <div
                      key={step.id}
                      className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-2'
                        }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${step.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : step.status === 'running'
                                ? 'bg-blue-100 dark:bg-blue-900/30'
                                : 'bg-gray-100 dark:bg-gray-900/30'
                            }`}>
                            {step.status === 'running' ? (
                              <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                            ) : (
                              <IconComponent className={`w-4 h-4 transition-colors duration-300 ${step.status === 'completed'
                                  ? 'text-green-600 dark:text-green-400'
                                  : step.status === 'pending'
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-400'
                                }`} />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{step.title}</p>
                            {step.timestamp && (
                              <span className="text-xs text-muted-foreground">{step.timestamp}</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            {step.description.map((line, i) => (
                              <div key={i}>• {line}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Completion status */}
              {currentStep >= steps.length && steps.some(s => s.status === 'completed') && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-800 dark:text-green-300">Generation Complete!</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                    Your AI-generated login component is ready to preview and customize.
                  </p>
                </div>
              )}

              {/* Prompt bar integrated within steps */}
              <div className="mt-6 pt-4 border-t border-border/30">
                <div className="flex items-center space-x-3 p-3 bg-muted/30 backdrop-blur-sm border border-border/30 rounded-lg">
                  <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to generate..."
                    className="flex-1 bg-transparent border-none p-0 focus:ring-0 placeholder:text-muted-foreground/70 text-sm"
                  />
                  <Button
                    onClick={handleGenerate}
                    size="sm"
                    className="bg-gradient-to-r from-[#7B61FF] to-[#9F7AEA] hover:from-[#6B51E5] hover:to-[#8F6ADA] text-white px-4 py-1.5 rounded-md transition-all duration-200"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Generate
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel - Code/Preview */}
        <div className="w-1/2 flex flex-col">
          {/* Code/Preview header */}
          <div className="p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center">
                {showPreview ? (
                  <>
                    <Monitor className="w-4 h-4 mr-2 text-[#7B61FF]" />
                    Preview
                  </>
                ) : (
                  <>
                    <Code className="w-4 h-4 mr-2 text-[#7B61FF]" />
                    Code
                  </>
                )}
              </h3>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                  <span>{isRunning ? 'Running' : 'Ready'}</span>
                </div>
                {!showPreview && typedContent.length > 0 ? (
                  <DropdownMenu open={showEnvironmentSelector} onOpenChange={setShowEnvironmentSelector}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        onClick={handlePlayClick}
                        size="sm"
                        className="bg-gradient-to-r from-[#7B61FF] to-[#9F7AEA] hover:from-[#6B51E5] hover:to-[#8F6ADA] text-white"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem onClick={() => handleEnvironmentSelect('vscode')}>
                        <Code className="w-4 h-4 mr-2" />
                        VS Code
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEnvironmentSelect('browser')}>
                        <Monitor className="w-4 h-4 mr-2" />
                        Browser
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : showPreview ? (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowCode}
                      className="border-border/50"
                    >
                      <Code className="w-3 h-3 mr-1" />
                      Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStopClick}
                      className="border-border/50"
                    >
                      <Square className="w-3 h-3 mr-1" />
                      Stop
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Code/Preview content */}
          <div className="flex-1 p-6">
            <div className="h-full backdrop-blur-xl bg-card/80 rounded-xl overflow-hidden">
              {showPreview ? (
                <div className="h-full">
                  <LoginPage onLogin={() => { }} onNavigateToSignUp={() => { }} />
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-auto">
                    <Textarea
                      value={typedContent}
                      readOnly
                      className="w-full h-full resize-none border-none bg-transparent p-6 font-mono text-sm leading-relaxed focus:ring-0"
                      placeholder="Generated code will appear here as it's being created..."
                    />
                  </div>
                  {typedContent.length > 0 && (
                    <div className="p-4 border-t border-border/30">
                      <Button variant="outline" size="sm" className="border-border/50">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}