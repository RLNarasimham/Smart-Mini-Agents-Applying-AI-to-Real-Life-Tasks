import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Image, 
  Globe, 
  BarChart3, 
  PieChart,
  MoreHorizontal,
  Presentation,
  Upload,
  Paperclip,
  Sparkles,
  Mic,
  ChevronDown
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { VoiceModal } from './VoiceModal';
import { AnimatedSphere } from './AnimatedSphere';
import { ChatMessage, ChatSession } from '../App';

interface HomePageProps {
  onNavigateToSandbox?: () => void;
  continueSession?: ChatSession | null;
}

export function HomePage({ onNavigateToSandbox, continueSession }: HomePageProps) {
  const [prompt, setPrompt] = useState('');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('Nava ai');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState(() => Date.now().toString());
  const [showOptions, setShowOptions] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const aiModels = [
    "GPT-4",
    "GPT-4o",
    "Claude 3.5 Sonnet",
    "Claude 3 Opus",
    "Gemini 1.5 Pro",
    "Gemini Nano",
    "Perplexity",
    "Mistral 7B",
    "Mixtral 8x7B",
    "LLaMA 3",
    "Cohere Command R+",
    "Groq LPU",
    "DeepSeek V3",
    "OpenHermes",
    "Falcon 180B"
  ];

  const options = [
    { icon: Image, label: 'Image' },
    { icon: Presentation, label: 'Slides' },
    { icon: Globe, label: 'Webpage' },
    { icon: BarChart3, label: 'Spreadsheet' },
    { icon: PieChart, label: 'Visualization' },
    { icon: MoreHorizontal, label: 'More' },
  ];

  // Load continue session when provided
  useEffect(() => {
    if (continueSession) {
      setChatMessages(continueSession.messages);
      setCurrentSessionId(continueSession.id);
    }
  }, [continueSession]);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Save chat to history when messages change
  React.useEffect(() => {
    if (chatMessages.length > 0) {
      const existingHistory = JSON.parse(localStorage.getItem('nava-ai-chat-history') || '[]');
      const sessionIndex = existingHistory.findIndex((session: any) => session.id === currentSessionId);
      
      const sessionTitle = chatMessages[0]?.content.slice(0, 50) + (chatMessages[0]?.content.length > 50 ? '...' : '');
      
      const session = {
        id: currentSessionId,
        title: sessionTitle,
        messages: chatMessages,
        createdAt: chatMessages[0]?.timestamp || new Date(),
        lastUpdated: new Date()
      };
      
      if (sessionIndex >= 0) {
        existingHistory[sessionIndex] = session;
      } else {
        existingHistory.unshift(session);
      }
      
      // Keep only last 50 sessions
      const limitedHistory = existingHistory.slice(0, 50);
      localStorage.setItem('nava-ai-chat-history', JSON.stringify(limitedHistory));
    }
  }, [chatMessages, currentSessionId]);

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = () => {
    imageInputRef.current?.click();
  };

  const handleVoiceChat = () => {
    setIsVoiceModalOpen(true);
  };

  const handleVoiceTranscript = (text: string) => {
    setPrompt(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const generateResponse = (userInput: string): string => {
    const input = userInput.toLowerCase().trim();
    
    // Basic greetings
    if (input === 'hi' || input === 'hey') {
      return 'Hi Yeswanth Kosuri! How can I help you today?';
    }
    
    if (input === 'hello' || input.startsWith('hello')) {
      return 'Hello Yeswanth Kosuri! What would you like me to create for you?';
    }
    
    // Mathematical operations
    if (input.includes('add') || input.includes('+')) {
      const numbers = userInput.match(/\d+(\.\d+)?/g);
      if (numbers && numbers.length >= 2) {
        const sum = numbers.reduce((acc, num) => acc + parseFloat(num), 0);
        return `The sum of ${numbers.join(' + ')} = ${sum}`;
      }
      return "I can help with addition! Try something like 'add 15 and 25' or '15 + 25'";
    }
    
    if (input.includes('subtract') || input.includes('-')) {
      const numbers = userInput.match(/\d+(\.\d+)?/g);
      if (numbers && numbers.length >= 2) {
        const result = parseFloat(numbers[0]) - parseFloat(numbers[1]);
        return `${numbers[0]} - ${numbers[1]} = ${result}`;
      }
      return "I can help with subtraction! Try something like 'subtract 25 from 50' or '50 - 25'";
    }
    
    if (input.includes('multiply') || input.includes('*') || input.includes('×')) {
      const numbers = userInput.match(/\d+(\.\d+)?/g);
      if (numbers && numbers.length >= 2) {
        const result = numbers.reduce((acc, num) => acc * parseFloat(num), 1);
        return `${numbers.join(' × ')} = ${result}`;
      }
      return "I can help with multiplication! Try something like 'multiply 8 by 7' or '8 * 7'";
    }
    
    if (input.includes('divide') || input.includes('/') || input.includes('÷')) {
      const numbers = userInput.match(/\d+(\.\d+)?/g);
      if (numbers && numbers.length >= 2) {
        const result = parseFloat(numbers[0]) / parseFloat(numbers[1]);
        return `${numbers[0]} ÷ ${numbers[1]} = ${result}`;
      }
      return "I can help with division! Try something like 'divide 100 by 4' or '100 / 4'";
    }
    
    // Other basic responses
    if (input.includes('how are you')) {
      return "I'm doing great! Ready to help you create amazing things with AI. What project are you working on?";
    }
    
    if (input.includes('what can you do')) {
      return "I can help you:\n• Create presentations, websites, and apps\n• Write and debug code\n• Solve math problems\n• Generate images and content\n• Analyze data and much more!\n\nJust tell me what you need!";
    }
    
    if (input.includes('thank you') || input.includes('thanks')) {
      return "You're welcome, Yeswanth! Happy to help. Is there anything else you'd like to create?";
    }
    
    // Time and date
    if (input.includes('time') || input.includes('date')) {
      const now = new Date();
      return `Current time: ${now.toLocaleTimeString()}\nToday's date: ${now.toLocaleDateString()}`;
    }
    
    // Fun responses
    if (input.includes('joke')) {
      const jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
        "Why did the AI go to therapy? It had too many deep learning issues! 🤖",
        "How many programmers does it take to change a light bulb? None, that's a hardware problem! 💡"
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }
    
    // Default response for other inputs
    return `I understand you want to "${userInput}". Let me help you with that! For more complex tasks, try using keywords like 'code', 'website', 'presentation', or ask me math questions!`;
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: prompt,
      isUser: true,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    
    // Check if user wants code generation
    if (prompt.toLowerCase().includes('code')) {
      // Add a response message
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I'll help you with that code! Opening the sandbox to generate and test your code...",
        isUser: false,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessage]);
      
      // Navigate to sandbox after a brief delay
      setTimeout(() => {
        if (onNavigateToSandbox) {
          onNavigateToSandbox();
        }
      }, 1500);
    } else {
      // Generate regular response
      const response = generateResponse(prompt);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date()
      };
      
      setTimeout(() => {
        setChatMessages(prev => [...prev, aiMessage]);
      }, 500);
    }
    
    setPrompt('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scrollable Chat Messages Area - Now takes full height */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-8 scrollbar-thin">
        {chatMessages.length === 0 ? (
          // Initial greeting state with 3D sphere
          <div className="flex items-center justify-center min-h-full">
            <div className="text-center max-w-2xl">
              {/* 3D Sphere for initial state */}
              <div className="mb-8 flex justify-center">
                <AnimatedSphere size="small" />
              </div>
              <h1 className="text-4xl mb-4 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                Hello Yeswanth Kosuri
              </h1>
              <p className="text-muted-foreground text-xl mb-8">What can I create for you today?</p>
              <div className="flex items-center justify-center space-x-2 px-4 py-2 bg-orange-400/10 rounded-xl inline-flex">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-orange-600 dark:text-orange-400">Draft</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">Private</span>
              </div>
            </div>
          </div>
        ) : (
          // Chat messages state
          <div className="max-w-4xl mx-auto w-full py-4">
            <div className="space-y-3 pb-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start items-start space-x-2'}`}
                >
                  {/* AI Avatar - 3D Sphere for AI messages only */}
                  {!message.isUser && (
                    <div className="flex-shrink-0 self-start">
                      <div className="w-6 h-6 flex items-center justify-center mt-0.5 mb-1">
                        <div className="scale-[0.25] transform-gpu">
                          <AnimatedSphere size="small" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[75%] p-3 rounded-xl ${
                      message.isUser
                        ? 'bg-gradient-to-r from-[#7B61FF] to-[#9F7AEA] text-white ml-2'
                        : 'bg-card border border-border'
                    }`}
                  >
                    <p className="text-xs leading-relaxed">{message.content}</p>
                    <div className={`text-[10px] mt-1 opacity-70 ${message.isUser ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Fixed Footer - Input Area */}
      <div className={`flex-shrink-0 bg-background border-t border-border transition-all duration-300 ${!showOptions && chatMessages.length > 0 ? 'p-3 pb-4' : 'p-4 pb-6'}`}>
        <div className="max-w-4xl mx-auto">
          {/* Enhanced glassmorphic card with 3D effects */}
          <div className="relative group">
            {/* 3D shadow layers - hidden when options are collapsed */}
            {(chatMessages.length === 0 || showOptions) && (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-[#7B61FF]/10 via-transparent to-[#9F7AEA]/10 blur-2xl rounded-3xl transform translate-y-4 group-hover:translate-y-2 transition-transform duration-500"></div>
                <div className="absolute inset-0 bg-card/40 blur-xl rounded-3xl transform translate-y-2 group-hover:translate-y-1 transition-transform duration-500"></div>
              </>
            )}
            
            {/* Main card - sleeker when options hidden */}
            <div className={`relative bg-card border border-border shadow-lg hover:shadow-xl transition-all duration-500 ${!showOptions && chatMessages.length > 0 ? 'rounded-2xl p-2 hover:scale-[1.005]' : 'rounded-3xl p-6 hover:scale-[1.01]'}`}>

              {/* Enhanced Search/Prompt bar with 3D design */}
              <div className={`relative transition-all duration-300 ${!showOptions && chatMessages.length > 0 ? 'mb-0' : 'mb-6'}`}>
            <div className="group relative">
              {/* 3D Shadow layers - hidden when options are collapsed */}
              {(chatMessages.length === 0 || showOptions) && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#7B61FF]/20 to-[#9F7AEA]/20 blur-xl rounded-2xl transform translate-y-2 group-hover:translate-y-1 transition-transform duration-300"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#7B61FF]/10 to-[#9F7AEA]/10 blur-lg rounded-2xl transform translate-y-1 group-hover:translate-y-0.5 transition-transform duration-300"></div>
                </>
              )}
              
              {/* Main search bar - sleeker when options hidden */}
              <div className={`relative bg-card border border-border shadow-md hover:shadow-lg transition-all duration-300 ${!showOptions && chatMessages.length > 0 ? 'rounded-xl hover:scale-[1.005]' : 'rounded-2xl hover:scale-[1.02]'}`}>
                {/* Single row with all controls */}
                <div className={`flex items-center space-x-3 transition-all duration-300 ${!showOptions && chatMessages.length > 0 ? 'p-2' : 'p-5'}`}>
                  {/* Star button for model selection */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={`bg-gradient-to-r from-[#7B61FF]/10 to-[#9F7AEA]/10 hover:from-[#7B61FF]/20 hover:to-[#9F7AEA]/20 rounded-xl transition-all duration-200 hover:scale-105 group/star ${!showOptions && chatMessages.length > 0 ? 'p-1.5' : 'p-2'}`}>
                        <Sparkles className={`text-[#7B61FF] group-hover/star:text-[#6B51E5] transition-colors ${!showOptions && chatMessages.length > 0 ? 'w-4 h-4' : 'w-5 h-5'}`} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 bg-card/95 backdrop-blur-xl">
                      {aiModels.map((model) => (
                        <DropdownMenuItem 
                          key={model}
                          onClick={() => setSelectedModel(model)}
                          className={`cursor-pointer ${selectedModel === model ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{model}</span>
                            {selectedModel === model && (
                              <Sparkles className="w-4 h-4 text-primary" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask Nava ai anything... Try: 'Create a 3-slide pitch on my project'"
                    className={`flex-1 bg-transparent border-none p-0 focus:ring-0 placeholder:text-muted-foreground/70 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20 ${!showOptions && chatMessages.length > 0 ? 'text-base min-h-[2rem]' : 'text-lg min-h-[3rem]'}`}
                    aria-label="Ask Nava AI anything"
                  />
                  
                  {/* Action buttons with icons only */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={handleFileUpload}
                      className={`hover:bg-muted/50 rounded-lg transition-all duration-200 hover:scale-105 group/btn ${!showOptions && chatMessages.length > 0 ? 'p-1.5' : 'p-2'}`}
                      title="Attach file"
                    >
                      <Paperclip className={`text-muted-foreground group-hover/btn:text-[#7B61FF] transition-colors ${!showOptions && chatMessages.length > 0 ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                    </button>
                    <button
                      onClick={handleImageUpload}
                      className={`hover:bg-muted/50 rounded-lg transition-all duration-200 hover:scale-105 group/btn ${!showOptions && chatMessages.length > 0 ? 'p-1.5' : 'p-2'}`}
                      title="Upload image"
                    >
                      <Upload className={`text-muted-foreground group-hover/btn:text-[#7B61FF] transition-colors ${!showOptions && chatMessages.length > 0 ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                    </button>
                    <button
                      onClick={handleVoiceChat}
                      className={`hover:bg-muted/50 rounded-lg transition-all duration-200 hover:scale-105 group/btn ${!showOptions && chatMessages.length > 0 ? 'p-1.5' : 'p-2'}`}
                      title="Voice chat"
                    >
                      <Mic className={`text-muted-foreground group-hover/btn:text-[#7B61FF] transition-colors ${!showOptions && chatMessages.length > 0 ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                    </button>
                    
                    {/* Options toggle button - only show when chatting */}
                    {chatMessages.length > 0 && (
                      <button
                        onClick={() => setShowOptions(!showOptions)}
                        className={`hover:bg-muted/50 rounded-lg transition-all duration-200 hover:scale-105 group/btn ${!showOptions && chatMessages.length > 0 ? 'p-1.5' : 'p-2'}`}
                        title={showOptions ? "Hide options" : "Show options"}
                      >
                        <ChevronDown className={`text-muted-foreground group-hover/btn:text-[#7B61FF] transition-all duration-200 ${showOptions ? 'rotate-180' : ''} ${!showOptions && chatMessages.length > 0 ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                      </button>
                    )}
                  </div>
                  
                  {/* Enhanced Generate button */}
                  <Button 
                    onClick={handleGenerate}
                    className={`relative overflow-hidden bg-gradient-to-r from-[#7B61FF] via-[#8B71FF] to-[#9F7AEA] hover:from-[#6B51E5] hover:via-[#7B61F5] hover:to-[#8F6ADA] text-white rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-lg group/gen ${!showOptions && chatMessages.length > 0 ? 'px-5 py-2' : 'px-8 py-4'}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover/gen:opacity-100 transition-opacity duration-300"></div>
                    <span className={`relative flex items-center transition-all duration-300 ${!showOptions && chatMessages.length > 0 ? 'space-x-1.5' : 'space-x-2'}`}>
                     <Sparkles className={`text-white group-hover/gen:text-gray-200 transition-all duration-300 ${!showOptions && chatMessages.length > 0 ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                      <span className={!showOptions && chatMessages.length > 0 ? 'text-sm' : ''}>Generate</span>
                    </span>
                  </Button>
                </div>
                
                {/* Bottom status row - hide when options are hidden */}
                {(chatMessages.length === 0 || showOptions) && (
                  <div className="flex justify-center px-5 pb-3">
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Sparkles className="w-3 h-3 text-[#7B61FF]" />
                      <span>{selectedModel}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
              onChange={(e) => {
                // Handle file upload
                console.log('File selected:', e.target.files?.[0]);
              }}
            />
            <input
              type="file"
              ref={imageInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                // Handle image upload
                console.log('Image selected:', e.target.files?.[0]);
              }}
            />
              </div>

              {/* Enhanced Option chips with 3D effect - Single line */}
              {(chatMessages.length === 0 || showOptions) && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {options.map((option, index) => {
                    const IconComponent = option.icon;
                    return (
                      <button
                        key={index}
                        className="group relative flex items-center space-x-2 px-4 py-2.5 bg-card/80 hover:bg-card rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg backdrop-blur-sm whitespace-nowrap flex-shrink-0"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/3 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity duration-300"></div>
                        <div className="relative p-1 bg-muted/30 group-hover:bg-primary/10 rounded-md transition-colors duration-300">
                          <IconComponent className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                        </div>
                        <span className="relative text-xs font-medium group-hover:text-primary transition-colors duration-300">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Voice Modal */}
      <VoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onTranscript={handleVoiceTranscript}
      />

    </div>
  );
}