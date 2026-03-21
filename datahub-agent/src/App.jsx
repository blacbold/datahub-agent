import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Send, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Terminal, 
  BookOpen, 
  ShieldCheck,
  Cpu,
  Volume2,
  Wand2,
  LayoutTemplate,
  X,
  Play,
  Hash,
  MessageSquareShare,
  Zap,
  ImageIcon,
  Loader2
} from 'lucide-react';

// --- CONFIGURATION ---
// The execution environment provides the key at runtime.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; 
const appId = typeof __app_id !== 'undefined' ? __app_id : 'datahub-agent-demo';

// --- UTILS: PCM to WAV for Gemini TTS ---
function pcm16ToWav(pcmData, sampleRate) {
  const dataSize = pcmData.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // Total file size minus 8
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // Mono
  view.setUint16(22, 1, true); // Channels
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(44 + i * 2, pcmData[i], true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// --- SUB-COMPONENTS ---
const StatusItem = ({ icon, label, status, color }) => (
  <div className="flex items-center justify-between text-[11px] p-3 rounded-xl bg-slate-800/20 border border-transparent hover:border-slate-800 transition-all">
    <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider">
      {icon}
      <span>{label}</span>
    </div>
    <span className={`${color} font-black`}>{status}</span>
  </div>
);

const SidebarBtn = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 text-xs font-bold bg-indigo-600/5 hover:bg-indigo-600/10 text-indigo-400 p-4 rounded-2xl border border-indigo-500/10 transition-all hover:scale-[1.02] active:scale-95">
    {icon}
    <span>{label}</span>
  </button>
);

const ControlBtn = ({ icon, title, onClick }) => (
  <button 
    onClick={onClick}
    className="p-3 bg-slate-800 hover:bg-indigo-600 rounded-2xl text-slate-400 hover:text-white transition-all shadow-xl border border-slate-700/50"
    title={title}
  >
    {icon}
  </button>
);

const Badge = ({ text }) => (
  <span className="text-[10px] text-slate-600 uppercase tracking-widest font-black flex items-center gap-1.5">
    <div className="w-1 h-1 rounded-full bg-indigo-500" />
    {text}
  </span>
);

// --- MAIN APP ---
const App = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Welcome to the DataHub Command Center. I have processed 3,119 chunks of documentation. How can I assist your metadata journey today?', status: 'ready' }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [currentTool, setCurrentTool] = useState(null);
  const [showArchitect, setShowArchitect] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking, currentTool, generatedImage]);

  // --- GEMINI API HELPERS ---
  const safeJsonParse = async (response) => {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      return null;
    }
  };

  const callGemini = async (prompt, systemPrompt = "") => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined
      })
    });

    const data = await safeJsonParse(response);
    if (!response.ok) {
      throw new Error(data?.error?.message || `API Error: ${response.status}`);
    }
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "The AI returned an empty response.";
  };

  const generateImagen = async (prompt) => {
    if (!prompt) return;
    setCurrentTool('✨ Generating Visual Topology...');
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: { prompt: `Cyberpunk blueprint 3D isometric diagram of: ${prompt}. Glowing lines, data nodes, professional technical art style, dark background.` },
          parameters: { sampleCount: 1 }
        })
      });
      const result = await safeJsonParse(response);
      const b64 = result?.predictions?.[0]?.bytesBase64Encoded;
      if (b64) setGeneratedImage(`data:image/png;base64,${b64}`);
    } catch (e) {
      console.error("Imagen error", e);
    } finally {
      setCurrentTool(null);
    }
  };

  const speakResponse = async (text) => {
    if (!text) return;
    setCurrentTool('✨ Synthesizing Voice...');
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Read professionally: ${text.slice(0, 500)}` }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } }
          },
          model: "gemini-2.5-flash-preview-tts"
        })
      });
      const data = await safeJsonParse(response);
      const base64Audio = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      if (base64Audio) {
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Int16Array(len / 2);
        for (let i = 0; i < len; i += 2) {
          bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
        }
        const wavBlob = pcm16ToWav(bytes, 24000);
        const audio = new Audio(URL.createObjectURL(wavBlob));
        audio.play();
      }
    } catch (e) {
      console.error("TTS error", e);
    } finally {
      setCurrentTool(null);
    }
  };

  const summarizeMessage = async (index) => {
    setCurrentTool('✨ Condensing Knowledge...');
    try {
      const summary = await callGemini(`Summarize the following technical advice into 3 bullet points for a business stakeholder: \n\n${messages[index].text}`);
      setMessages(prev => [...prev, { role: 'assistant', text: `✨ **TL;DR Summary:**\n${summary}` }]);
    } catch (e) {
      console.error("Summary error", e);
    } finally {
      setCurrentTool(null);
    }
  };

  const draftAnnouncement = async (index) => {
    setCurrentTool('✨ Drafting Team Update...');
    try {
      const draft = await callGemini(`Draft a celebratory Slack announcement message based on this technical achievement: \n\n${messages[index].text}. Include emojis and a link to documentation.`);
      setMessages(prev => [...prev, { role: 'assistant', text: `✨ **Team Announcement Draft:**\n\n${draft}` }]);
    } catch (e) {
      console.error("Announcement error", e);
    } finally {
      setCurrentTool(null);
    }
  };

  const architectProject = async (goals) => {
    if (!goals) return;
    setIsThinking(true);
    setCurrentTool('✨ Designing Architecture...');
    try {
      const plan = await callGemini(
        `Draft a comprehensive DataHub deployment plan for: ${goals}. Include recommended sources, scheduling strategy, and user adoption milestones.`,
        "You are a Chief Data Architect."
      );
      setMessages(prev => [...prev, { role: 'assistant', text: plan }]);
      setShowArchitect(false);
    } catch (e) {
      console.error("Architect Error", e);
    } finally {
      setIsThinking(false);
      setCurrentTool(null);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsThinking(true);
    try {
      setCurrentTool('Consulting Knowledge Layer...');
      const aiText = await callGemini(userMsg, "You are a DataHub Expert. Use your 3,119 documentation chunks. Always provide YAML for recipes.");
      setMessages(prev => [...prev, { role: 'assistant', text: aiText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ Error: ${error.message}`, isError: true }]);
    } finally {
      setIsThinking(false);
      setCurrentTool(null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col p-6 hidden lg:flex">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <Database className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">DataHub <span className="text-indigo-400">AI</span></h1>
        </div>

        <div className="space-y-6 flex-1 overflow-y-auto pr-2">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Knowledge Core</label>
            <div className="flex items-center gap-2 text-xs bg-slate-950/50 p-3 rounded-xl border border-slate-800">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>3,119 Documentation Chunks</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Active Modules</label>
            <div className="space-y-2">
              <StatusItem icon={<Cpu className="w-4 h-4" />} label="LLM Reasoning" status="Gemini 2.5" color="text-emerald-400" />
              <StatusItem icon={<Volume2 className="w-4 h-4" />} label="Voice Synthesis" status="Active" color="text-indigo-400" />
              <StatusItem icon={<ImageIcon className="w-4 h-4" />} label="Topology Agent" status="Imagen 4.0" color="text-pink-400" />
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Specialty Tasks</label>
            <SidebarBtn icon={<LayoutTemplate className="w-4 h-4" />} label="✨ Ingestion Architect" onClick={() => setShowArchitect(true)} />
            <SidebarBtn icon={<ImageIcon className="w-4 h-4" />} label="✨ Visualize Current Topic" onClick={() => {
              const lastMsg = messages[messages.length - 1];
              if (lastMsg) generateImagen(lastMsg.text);
            }} />
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between">
           <span className="text-[10px] text-slate-500 font-mono">SYS_OK_v1.4</span>
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">Agentic Metadata Engine</span>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-3xl group relative">
                <div className={`p-6 rounded-3xl ${
                  m.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none shadow-xl' 
                  : 'bg-slate-900/80 border border-slate-800 rounded-tl-none shadow-2xl backdrop-blur-sm'
                }`}>
                  <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap leading-relaxed font-medium">
                    {m.text}
                  </div>
                </div>

                {/* Assistant Controls */}
                {m.role === 'assistant' && !m.isError && (
                  <div className="absolute top-0 right-0 -mr-14 opacity-0 group-hover:opacity-100 transition-all flex flex-col gap-2 scale-90 origin-left">
                    <ControlBtn icon={<Volume2 className="w-4 h-4" />} title="✨ Listen" onClick={() => speakResponse(m.text)} />
                    <ControlBtn icon={<Hash className="w-4 h-4" />} title="✨ TL;DR" onClick={() => summarizeMessage(i)} />
                    <ControlBtn icon={<MessageSquareShare className="w-4 h-4" />} title="✨ Draft Update" onClick={() => draftAnnouncement(i)} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {generatedImage && (
            <div className="flex justify-start">
              <div className="bg-slate-900 border border-slate-800 p-2 rounded-3xl shadow-2xl overflow-hidden max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                <img src={generatedImage} alt="Topology" className="rounded-2xl" />
                <div className="p-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">✨ AI Topology Preview</span>
                  <button onClick={() => setGeneratedImage(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          )}

          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                <span className="text-sm font-bold tracking-tight text-slate-400 italic">{currentTool || "Thinking..."}</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-8 bg-slate-950/80 border-t border-slate-800 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Query the DataHub Agent..."
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-5 pl-8 pr-16 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-lg shadow-2xl"
            />
            <button 
              onClick={handleSend}
              disabled={isThinking || !input.trim()}
              className="absolute right-4 top-4 p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition-all text-white shadow-lg"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
          <div className="flex justify-center items-center gap-6 mt-6">
            <Badge text="Gemini 2.5 Intelligence" />
            <Badge text="RAG Document Engine" />
            <Badge text="✨ Agentic Validation" />
          </div>
        </div>
      </div>

      {/* Architect Modal */}
      {showArchitect && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-2xl p-10 shadow-2xl border-indigo-500/20">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20">
                  <LayoutTemplate className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">✨ Ingestion Architect</h2>
              </div>
              <button onClick={() => setShowArchitect(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            <textarea 
              autoFocus
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 text-sm focus:outline-none focus:border-indigo-500 transition-all h-40 mb-8 font-medium leading-relaxed"
              placeholder="Describe your goals (e.g. 'Build a metadata lake for our Snowflake and dbt environment with automated weekly updates')..."
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); architectProject(e.target.value); } }}
            />
            <button 
              onClick={() => {
                const el = document.querySelector('textarea');
                if (el && el.value) architectProject(el.value);
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30"
            >
              <Play className="w-5 h-5 fill-current" /> GENERATE DEPLOYMENT PLAN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;