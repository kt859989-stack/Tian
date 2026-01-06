
import React, { useState, useEffect, useRef } from 'react';
import { TabType, UserInfo } from './types';
import { getDailyFortune, getCompatibility, speakProphecy } from './geminiService';
import { GoogleGenAI } from "@google/genai";
import LiveMaster from './LiveMaster';
import html2canvas from 'html2canvas';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // Making this optional to resolve "identical modifiers" error if already defined as optional in environment
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType | 'live'>('fortune');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null); // 演算错误提示状态
  const [apiStatus, setApiStatus] = useState<{ok: boolean | null, msg: string}>({ok: null, msg: '正在感应天机...'});
  const [showKeySetup, setShowKeySetup] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const [u1, setU1] = useState<UserInfo>({ name: '', birthDate: '', birthTime: '', birthPlace: '', gender: '男' });
  const [u2, setU2] = useState<UserInfo>({ name: '', birthDate: '', birthTime: '', birthPlace: '', gender: '女' });

  const checkApi = async () => {
    // Safely check if key is selected using optional chaining
    const hasKey = await window.aistudio?.hasSelectedApiKey();
    if (!hasKey && (!process.env.API_KEY || process.env.API_KEY.length < 10)) {
      setApiStatus({ ok: false, msg: '尚未建立天机连接' });
      setShowKeySetup(true);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "ping",
        config: { maxOutputTokens: 10, thinkingConfig: { thinkingBudget: 0 } }
      });
      if (response.text) {
        setApiStatus({ ok: true, msg: '灵力充盈' });
        setShowKeySetup(false);
      }
    } catch (err: any) {
      if (err.message?.includes('Requested entity was not found')) {
        setApiStatus({ ok: false, msg: 'API Key 失效，请重新连接' });
        setShowKeySetup(true);
      } else {
        setApiStatus({ ok: false, msg: '连接不稳定，请检查网络或重新连接' });
      }
    }
  };

  useEffect(() => { checkApi(); }, []);

  const handleConnect = async () => {
    // Safely open key selection dialog
    await window.aistudio?.openSelectKey();
    setApiStatus({ ok: true, msg: '灵力连接中...' });
    setShowKeySetup(false);
    checkApi();
  };

  const handleCalculate = async () => {
    if (!apiStatus.ok) { setShowKeySetup(true); return; }
    if (!u1.name || !u1.birthDate || !u1.birthPlace) {
      setError("【起卦须知】请务必填入缘主的姓名、出生日期及精确的出生地点（省市区）。");
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = activeTab === 'fortune' 
        ? await getDailyFortune(u1, today) 
        : await getCompatibility(u1, u2);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('safety')) {
        setError("【天机屏蔽】因触及命理禁忌或内容被系统拦截，本次起卦失败，请更换措辞后再试。");
      } else if (err.message?.includes('quota')) {
        setError("【灵力枯竭】当前 API 配额已耗尽（429 Error），请稍后再试或更换密钥。");
      } else {
        setError(`【演算中断】天机紊乱，原因：${err.message || '网络连接失败'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = async () => {
    if (!scrollRef.current) return;
    const canvas = await html2canvas(scrollRef.current, { backgroundColor: '#fdf5e6', scale: 2 });
    const link = document.createElement('a');
    link.download = `天机算-${u1.name}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const playAudio = async (text: string) => {
    setSpeaking(true);
    try {
      const base64 = await speakProphecy(text);
      if (base64) {
        const ctx = new AudioContext({ sampleRate: 24000 });
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setSpeaking(false);
        source.start();
      } else {
        setSpeaking(false);
      }
    } catch {
      setSpeaking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 pb-24">
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#fdf5e6]/95 backdrop-blur-md">
          <div className="relative w-64 h-64 mb-10">
            <div className="absolute inset-0 border-8 border-black rounded-full opacity-10"></div>
            <i className="fa-solid fa-yin-yang text-[12rem] text-black animate-spin-slow"></i>
          </div>
          <p className="title-font text-5xl animate-pulse tracking-widest">正在拨动乾坤...</p>
          <p className="mt-4 text-xs font-bold opacity-40">正在结合生辰方位推演天机</p>
        </div>
      )}

      {showKeySetup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="chinese-card max-w-md w-full p-10 text-center bg-[#fdf5e6]">
            <h2 className="title-font text-5xl text-[#a61b1f] mb-6">建立天机连接</h2>
            <p className="text-sm mb-8 leading-relaxed opacity-80">
              提示：浏览器环境下由于安全策略限制，需要通过官方接口手动建立连接。建议使用开启计费的 API Key 以获得完整功能。
            </p>
            <button onClick={handleConnect} className="w-full action-btn py-5 text-2xl title-font shadow-xl">
              连 接 灵 力
            </button>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="block mt-6 text-[10px] text-blue-800 underline opacity-50">
              了解为什么需要计费项目 (Quota Unavailable 补救措施)
            </a>
          </div>
        </div>
      )}

      <header className="text-center mb-16">
        <h1 className="title-font text-8xl text-[#a61b1f] mb-4 drop-shadow-sm">天 机 算</h1>
        <div className="flex items-center justify-center gap-4">
          <div className="h-0.5 w-12 bg-black/20"></div>
          <p className="tracking-[0.8em] text-xs font-black opacity-60 uppercase">AI Destiny Oracle</p>
          <div className="h-0.5 w-12 bg-black/20"></div>
        </div>
      </header>

      <div className="flex flex-wrap justify-center gap-3 mb-12">
        <button onClick={() => {setActiveTab('fortune'); setError(null);}} className={`px-8 md:px-12 py-4 font-bold border-2 border-black transition-all ${activeTab === 'fortune' ? 'bg-black text-white shadow-lg scale-105' : 'bg-white/50'}`}>今日运势</button>
        <button onClick={() => {setActiveTab('compatibility'); setError(null);}} className={`px-8 md:px-12 py-4 font-bold border-2 border-black transition-all ${activeTab === 'compatibility' ? 'bg-black text-white shadow-lg scale-105' : 'bg-white/50'}`}>缘分测算</button>
        <button onClick={() => {setActiveTab('live'); setError(null);}} className={`px-8 md:px-12 py-4 font-bold border-2 border-[#a61b1f] transition-all ${activeTab === 'live' ? 'bg-[#a61b1f] text-white shadow-lg scale-105' : 'bg-white/50 text-[#a61b1f]'}`}>
          <i className="fa-solid fa-microphone-lines mr-2"></i>连线大师
        </button>
      </div>

      {activeTab === 'live' ? (
        <LiveMaster apiReady={apiStatus.ok === true} onRetry={handleConnect} />
      ) : (
        <div className="animate-in fade-in duration-500">
          <div className="chinese-card p-8 md:p-12 mb-16">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold block opacity-60 uppercase tracking-tighter">—— 缘主信息 ——</label>
                    <span className="text-[10px] opacity-40 italic">※ 请确保信息真实以保推演准确</span>
                  </div>
                  <input type="text" value={u1.name} onChange={e => setU1({...u1, name: e.target.value})} className="w-full p-4 font-bold text-lg" placeholder="请输入俗世姓名（如：张三）" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] opacity-40 font-bold ml-1">出生日期</span>
                      <input type="date" value={u1.birthDate} onChange={e => setU1({...u1, birthDate: e.target.value})} className="w-full p-4" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] opacity-40 font-bold ml-1">出生时分 (选填)</span>
                      <input type="time" value={u1.birthTime} onChange={e => setU1({...u1, birthTime: e.target.value})} className="w-full p-4" />
                    </div>
                  </div>
                  <input type="text" value={u1.birthPlace} onChange={e => setU1({...u1, birthPlace: e.target.value})} className="w-full p-4" placeholder="出生地点（示例：四川省成都市武侯区）" />
                  <select value={u1.gender} onChange={e => setU1({...u1, gender: e.target.value})} className="w-full p-4 font-bold">
                    <option value="男">乾造 (男)</option>
                    <option value="女">坤造 (女)</option>
                  </select>
                </div>

                {activeTab === 'compatibility' && (
                  <div className="space-y-4 md:border-l md:pl-8 border-black/10">
                    <label className="text-xs font-bold block opacity-60 uppercase tracking-tighter">—— 对方信息 ——</label>
                    <input type="text" value={u2.name} onChange={e => setU2({...u2, name: e.target.value})} className="w-full p-4 font-bold text-lg" placeholder="对方姓名" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] opacity-40 font-bold ml-1">对方出生日期</span>
                        <input type="date" value={u2.birthDate} onChange={e => setU2({...u2, birthDate: e.target.value})} className="w-full p-4" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] opacity-40 font-bold ml-1">对方出生时分</span>
                        <input type="time" value={u2.birthTime} onChange={e => setU2({...u2, birthTime: e.target.value})} className="w-full p-4" />
                      </div>
                    </div>
                    <input type="text" value={u2.birthPlace} onChange={e => setU2({...u2, birthPlace: e.target.value})} className="w-full p-4" placeholder="对方出生地点" />
                    <select value={u2.gender} onChange={e => setU2({...u2, gender: e.target.value})} className="w-full p-4 font-bold">
                      <option value="女">坤造 (女)</option>
                      <option value="男">乾造 (男)</option>
                    </select>
                  </div>
                )}
              </div>
              
              {/* 错误提示展示区 */}
              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-900/20 text-red-900 animate-in slide-in-from-top-4 flex items-start gap-3">
                  <i className="fa-solid fa-circle-exclamation mt-1"></i>
                  <div className="text-sm">
                    <p className="font-bold">推演未果：</p>
                    <p>{error}</p>
                    <p className="text-[10px] mt-2 opacity-60 italic">建议：检查网络连接、API 密钥可用性，或稍候再重新拨动乾坤。</p>
                  </div>
                </div>
              )}

              <button onClick={handleCalculate} className="w-full action-btn py-8 text-4xl title-font tracking-[1em] mt-4">起卦演算</button>
            </div>
          </div>

          {result && (
            <div className="animate-in slide-in-from-bottom duration-1000">
              <div ref={scrollRef} className="scroll-bg border-[16px] border-double border-[#5d2e0a]/40 p-12 relative shadow-2xl overflow-hidden mb-10">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-b from-black/5 to-transparent"></div>
                
                <div className="text-center mb-12">
                  <h2 className="title-font text-6xl text-[#a61b1f] mb-4">{activeTab === 'fortune' ? '命理大运鉴' : '双人良缘鉴'}</h2>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">演算日期：{new Date().toLocaleDateString('zh-CN', {year:'numeric', month:'long', day:'numeric'})}</p>
                </div>

                <div className="flex flex-col md:flex-row gap-12">
                  <div className="w-full md:w-5/12 text-center">
                    {result.imageUrl && (
                      <div className="relative group mb-6">
                        <img src={result.imageUrl} className="w-full aspect-square object-cover border-8 border-white shadow-xl" />
                        <div className="absolute inset-0 border-2 border-black/5"></div>
                      </div>
                    )}
                    <p className="title-font text-5xl mb-2 gold-text">{result.summary || result.dynamic}</p>
                    {result.bazi && (
                      <div className="mt-4 p-2 border-y border-black/5 inline-block">
                        <p className="text-[10px] opacity-40 font-bold mb-1">【命盘八字】</p>
                        <p className="text-sm font-bold tracking-widest">{result.bazi}</p>
                      </div>
                    )}
                  </div>

                  <div className="w-full md:w-7/12 space-y-8">
                    <div className="p-6 bg-white/40 border-l-[6px] border-[#a61b1f] relative">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-black opacity-30 uppercase tracking-widest">大师详批</span>
                        <button onClick={() => playAudio(result.insight || result.matchAnalysis)} className={`text-3xl hover:scale-110 transition-transform ${speaking ? 'text-[#a61b1f] animate-pulse' : 'text-black/20'}`}>
                          <i className={`fa-solid ${speaking ? 'fa-volume-high' : 'fa-circle-play'}`}></i>
                        </button>
                      </div>
                      <p className="text-base leading-relaxed italic font-medium">{result.insight || result.matchAnalysis}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-green-50/50 p-4 border border-green-800/20">
                        <p className="text-[10px] font-bold text-green-900 mb-2 opacity-50 uppercase tracking-tighter">宜 · Recommendation</p>
                        <div className="flex flex-wrap gap-2">
                          {result.todo.map((t: string) => <span key={t} className="text-green-900 font-bold text-sm">#{t}</span>)}
                        </div>
                      </div>
                      <div className="bg-red-50/50 p-4 border border-red-800/20">
                        <p className="text-[10px] font-bold text-red-900 mb-2 opacity-50 uppercase tracking-tighter">忌 · Avoid</p>
                        <div className="flex flex-wrap gap-2">
                          {result.notodo.map((t: string) => <span key={t} className="text-red-900 font-bold text-sm">#{t}</span>)}
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 text-center border-t border-black/5">
                      <p className="text-[10px] opacity-40 uppercase font-bold tracking-widest">气运分值</p>
                      <p className="text-8xl title-font gold-text py-2">{result.score}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center gap-4">
                <button onClick={downloadResult} className="bg-black text-white px-10 py-4 font-bold shadow-lg hover:bg-black/80 flex items-center gap-2">
                  <i className="fa-solid fa-download"></i> 保存演算卷轴
                </button>
                <button onClick={() => {setResult(null); setError(null);}} className="border-2 border-black px-10 py-4 font-bold hover:bg-black hover:text-white transition-all">
                  重新起卦
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <footer className="fixed bottom-0 left-0 w-full bg-[#fdf5e6]/80 backdrop-blur-sm border-t border-black/5 py-3 px-6 text-center z-[50]">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/60 border border-black/5 text-[10px] font-bold shadow-sm">
          <div className={`w-2 h-2 rounded-full ${apiStatus.ok === null ? 'bg-orange-400 animate-pulse' : apiStatus.ok ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
          <span className="opacity-60 uppercase tracking-tighter">{apiStatus.msg}</span>
          {!apiStatus.ok && (
            <button onClick={handleConnect} className="ml-2 underline text-[#a61b1f] hover:text-red-700">重新建立连接</button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;
