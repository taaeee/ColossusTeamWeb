import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Sparkles, Terminal } from 'lucide-react';
import { createTeamChat, sendMessageToGemini } from '../services/geminiService';
import { ChatMessage } from '../types';

export const AiAnalyst: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'System initialized. I am Nexus. Ask me about Colossus performance, roster, or strategy.',
      timestamp: Date.now()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Ref to hold the chat instance so it persists across renders
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize chat on mount
    const chat = createTeamChat();
    if (chat) {
      chatRef.current = chat;
    }
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await sendMessageToGemini(chatRef.current, userMsg.text);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 p-4 bg-white text-black rounded-full shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:scale-105 transition-all duration-300 z-40 flex items-center justify-center ${isOpen ? 'hidden' : 'flex'}`}
      >
        <Bot size={24} />
      </button>

      {/* Chat Interface */}
      {isOpen && (
        <div className="fixed bottom-8 right-8 w-[350px] h-[500px] bg-obsidian border border-white/10 backdrop-blur-xl flex flex-col z-50 shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-white" />
              <span className="text-sm font-light tracking-widest uppercase">Nexus AI</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 text-sm font-light leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-white text-black'
                      : 'bg-zinc-900 border border-white/10 text-zinc-200'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-zinc-600 mt-1 uppercase tracking-wider">
                  {msg.role}
                </span>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-zinc-500 text-xs p-2">
                <Sparkles size={12} className="animate-pulse" />
                <span className="tracking-wider">PROCESSING...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10 bg-black/20">
            <div className="flex gap-2 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Query database..."
                className="w-full bg-zinc-900/50 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 placeholder:text-zinc-700"
              />
              <button
                onClick={handleSend}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
