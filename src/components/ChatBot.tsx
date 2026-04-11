import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateChatResponse } from '@/lib/gemini';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: "Hello! I am Mr Ballu, your ultra-advanced AI tutor from PM SHRI KV Bawana. How can I help you with Physics, Chemistry, Maths, or Computer Science today?",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const response = await generateChatResponse(input, history);
      
      const botMessage: Message = {
        role: 'model',
        text: response || "I'm sorry, I couldn't process that. Please try again.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: "Oops! Something went wrong. Please check your connection or try again later.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 p-4 rounded-full bg-primary text-white shadow-2xl hover:shadow-primary/40 transition-all",
          isOpen && "hidden"
        )}
      >
        <div className="relative">
          <MessageSquare className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
          </span>
        </div>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? '64px' : '600px',
              width: isMinimized ? '300px' : '400px'
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-6 right-6 z-50 bg-background border border-primary/20 shadow-2xl rounded-2xl overflow-hidden flex flex-col glass"
          >
            {/* Header */}
            <div className="p-4 bg-primary text-white flex items-center justify-between cursor-pointer" onClick={() => isMinimized && setIsMinimized(false)}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold leading-none">Mr Ballu</h3>
                  <p className="text-[10px] opacity-80 mt-1">Ultra-Advanced AI Tutor</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                  className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                  className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-primary/20"
                >
                  {messages.map((m, i) => (
                    <motion.div
                      initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={i}
                      className={cn(
                        "flex gap-3 max-w-[85%]",
                        m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg h-fit",
                        m.role === 'user' ? "bg-primary/10" : "bg-secondary/10"
                      )}>
                        {m.role === 'user' ? <User className="h-4 w-4 text-primary" /> : <Bot className="h-4 w-4 text-secondary" />}
                      </div>
                      <div className={cn(
                        "p-3 rounded-2xl text-sm",
                        m.role === 'user' 
                          ? "bg-primary text-white rounded-tr-none" 
                          : "bg-muted border border-border rounded-tl-none"
                      )}>
                        <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto">
                          <ReactMarkdown 
                            remarkPlugins={[remarkMath]} 
                            rehypePlugins={[rehypeKatex]}
                          >
                            {m.text}
                          </ReactMarkdown>
                        </div>
                        <p className={cn(
                          "text-[10px] mt-1 opacity-50",
                          m.role === 'user' ? "text-right" : "text-left"
                        )}>
                          {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 mr-auto max-w-[85%]">
                      <div className="p-2 rounded-lg bg-secondary/10">
                        <Bot className="h-4 w-4 text-secondary" />
                      </div>
                      <div className="bg-muted border border-border p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground italic">Mr Ballu is thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border bg-background/50">
                  <div className="relative flex items-center gap-2">
                    <Input
                      placeholder="Ask about Physics, CS, Maths..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      className="pr-12 h-12 rounded-xl glass border-primary/20 focus:border-primary/50"
                    />
                    <Button 
                      size="icon"
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-1 h-10 w-10 rounded-lg"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[9px] text-center text-muted-foreground mt-2">
                    Powered by Gemini 3.1 Pro • PM SHRI KV Bawana
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
