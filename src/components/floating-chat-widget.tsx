'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, User, Volume2, VolumeX, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

type Message = {
  role: 'user' | 'model';
  content: string;
  inputType?: 'text' | 'voice';
};

export function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hi! I'm the ZipSMA AI Assistant. I know everything about the app. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const hasSentRef = useRef<boolean>(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const speakText = async (text: string) => {
    // If currently playing, stop it
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    try {
      setIsPlaying(true);

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (!res.ok) throw new Error('Failed to fetch audio');
      
      const data = await res.json();
      if (!data.audioContent) return;

      const audioPlayer = new Audio();
      
      audioRef.current = {
        pause: () => {
          audioPlayer.pause();
          audioPlayer.currentTime = 0;
        },
        currentTime: 0
      } as any;

      await new Promise<void>((resolve) => {
        audioPlayer.src = `data:audio/mp3;base64,${data.audioContent}`;
        audioPlayer.onended = () => resolve();
        audioPlayer.onerror = () => resolve();
        audioPlayer.play().catch((e) => {
          console.error('Play error', e);
          resolve();
        });
      });

    } catch (error) {
      console.error('Error playing TTS:', error);
    } finally {
      setIsPlaying(false);
      audioRef.current = null;
    }
  };

  const speakLatestMessage = () => {
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    
    // Find the last model message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'model') {
        speakText(messages[i].content);
        break;
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please try Chrome or Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = true; 
    recognition.interimResults = true; 
    recognition.maxAlternatives = 1;

    let currentTranscript = '';

    const resetSilenceTimeout = () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(() => {
        // If 2 seconds pass with no new speech, auto-stop and send
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 2000);
    };

    recognition.onstart = () => {
      setIsListening(true);
      hasSentRef.current = false;
      setInput(''); // Clear input box when starting a new voice message
      resetSilenceTimeout(); // Start the silence timer immediately
    };
    
    recognition.onresult = (event: any) => {
      let temp = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        temp += event.results[i][0].transcript;
      }
      currentTranscript = temp;
      // Intentionally NOT setting input state here to keep the text hidden while speaking
      resetSilenceTimeout(); // Reset the 2-second timer every time a new word is heard
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

      // Auto-send the message when they manually stop the microphone or the 2-sec pause hits
      if (currentTranscript.trim() && !hasSentRef.current) {
        hasSentRef.current = true;
        handleSend(currentTranscript, 'voice');
      }
    };

    recognition.start();
  };

  const handleSend = async (overrideText?: string, overrideType?: 'text' | 'voice') => {
    // If the user clicks Send while the mic is still listening, stop the mic
    if (isListening && recognitionRef.current) {
      hasSentRef.current = true; // Prevent the mic's onend event from sending a duplicate
      recognitionRef.current.stop();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    }

    const textToSend = typeof overrideText === 'string' ? overrideText : input;
    const isVoiceInput = overrideType === 'voice';

    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: textToSend, inputType: isVoiceInput ? 'voice' : 'text' };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    if (typeof overrideText !== 'string') {
      setInput('');
    }
    setIsLoading(true);

    try {
      // Format history for genkit (it expects content to be an array of parts)
      const genkitHistory = messages.map(msg => ({
        role: msg.role,
        content: [{ text: msg.content }]
      }));

      const res = await fetch('/api/chat/landing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: genkitHistory
        }),
      });

      if (!res.ok) throw new Error('Failed to send message');
      
      const data = await res.json();
      const aiResponse = data.text;
      setMessages([...newMessages, { role: 'model', content: aiResponse, inputType: isVoiceInput ? 'voice' : 'text' }]);

      if (isVoiceInput) {
        // Delay slightly to allow state to settle before playing
        setTimeout(() => speakText(aiResponse), 100);
      }
    } catch (error: any) {
      console.error(error);
      setMessages([...newMessages, { role: 'model', content: `I'm sorry, I encountered an error. Details: ${error.message || String(error)}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            drag
            dragConstraints={{ left: 0, right: 0, top: -500, bottom: 0 }}
            className="fixed bottom-6 right-6 z-50 cursor-grab active:cursor-grabbing"
            onClick={() => setIsOpen(true)}
          >
            <div className="bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/30 rounded-full px-5 py-3 flex items-center gap-3 transition-colors">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-sm tracking-wide">LET&apos;S CHAT</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-full max-w-[380px] origin-bottom-right"
          >
            <Card className="border shadow-2xl overflow-hidden flex flex-col h-[550px] max-h-[85vh]">
              <CardHeader className="bg-primary text-white p-4 flex flex-row items-center justify-between shrink-0 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">ZipSMA Assistant</CardTitle>
                    <p className="text-xs text-white/80">Always here to help</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20 hover:text-white rounded-full h-8 w-8"
                    onClick={speakLatestMessage}
                    title={isPlaying ? "Stop Speaking" : "Listen to latest response"}
                  >
                    {isPlaying ? <VolumeX className="w-4 h-4 animate-pulse text-emerald-200" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/20 hover:text-white rounded-full h-8 w-8"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50"
              >
                {messages.filter(msg => msg.inputType !== 'voice').map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "flex gap-3 max-w-[85%]",
                      msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      msg.role === 'user' ? "bg-primary text-white" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={cn(
                      "rounded-2xl p-3 text-sm shadow-sm",
                      msg.role === 'user' 
                        ? "bg-primary text-white rounded-tr-none" 
                        : "bg-white border rounded-tl-none text-gray-800"
                    )}>
                      <ReactMarkdown className="prose prose-sm prose-p:leading-relaxed prose-pre:bg-gray-100 prose-pre:text-gray-800 break-words max-w-full">
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white border rounded-2xl rounded-tl-none p-4 shadow-sm flex gap-1 items-center">
                      <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>

              <CardFooter className="p-3 bg-white border-t shrink-0">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex w-full items-center gap-2"
                >
                  <Button 
                    type="button" 
                    size="icon" 
                    onClick={toggleListening}
                    disabled={isLoading}
                    className={cn(
                      "rounded-full h-10 w-10 shrink-0 transition-all", 
                      isListening ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                    )}
                    title={isListening ? "Listening..." : "Speak"}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Input 
                    placeholder={isListening ? "Listening..." : "Ask me anything..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading || isListening}
                    className="flex-1 rounded-full border-gray-300 bg-gray-50 focus-visible:ring-primary h-10 px-4"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={isLoading || !input.trim()}
                    className="rounded-full h-10 w-10 shrink-0 bg-primary hover:bg-primary/90"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
