
import React, { useState, useRef } from 'react';
import { TabType, UserInfo } from './types';
import { getDailyFortune, getCompatibility, speakProphecy } from './geminiService';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('fortune');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [u1, setU1] = useState<UserInfo>({ name: '', birthDate: '', birthTime: '', birthPlace: '', gender: '男' });
  const [u2, setU2] = useState<UserInfo>({ name: '', birthDate: '', birthTime: '', birthPlace: '', gender: '女' });

  const handleAction = async (type: TabType) => {
    if (!u1.name || !u1.birthDate) {
      setAlertMsg("航海士，我们需要你的名字和诞生之日！");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const targetDate = new Date().toISOString().split('T')[0];
      const data = type === 'fortune' ? await getDailyFortune(u1, targetDate) : await getCompatibility(u1, u2);
      setResult({ type, data });
    } catch (err: any) {
      setAlertMsg(err.message || "遇到海王类袭击，连接中断了！");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!cardRef.current) return;
    html2canvas(cardRef.current, { backgroundColor: '#f4e4bc', useCORS: true, scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.download = `WANTED-MEME-${new Date().getTime()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  const playAudio = async (base64Data: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 min-h-screen text-[#2c1e11]">
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-white">
          <div className="relative w-32 h-32 mb-8">
            <i className="fa-solid fa-skull-crossbones text-8xl text-yellow-500 animate-pulse"></i>
          </div>
          <p className="text-3xl font-black italic tracking-widest animate-bounce">正在绘制你的悬赏令...</p>
        </div>
      )}

      {alertMsg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#f4e4bc] border-8 border-[#5d2e0a] p-8 max-w-sm text-center shadow-[10px_10px_0px_#000]">
            <h3 className="text-3xl font-black text-[#a61b1f] mb-4">海军本部警告</h3>
            <p className="font-bold text-lg mb-8">{alertMsg}</p>
            <button onClick={() => setAlertMsg(null)} className="w-full bg-[#5d2e0a] text-white py-4 font-black uppercase text-xl hover:opacity-90 active:scale-95 transition-all">收到！</button>
          </div>
        </div>
      )}

      <header className="text-center mb-16">
        <h1 className="text-7xl font-black uppercase tracking-tighter text-[#5d2e0a] drop-shadow-[4px_4px_0px_#fff] mb-4">GRAND LINE AGENT</h1>
        <div className="inline-block px-4 py-1 bg-[#a61b1f] text-white font-black italic transform -rotate-1">寻找你的 ONE PIECE 命运</div>
      </header>

      <div className="flex justify-center gap-6 mb-12">
        <button onClick={() => setActiveTab('fortune')} className={`px-8 py-4 text-xl font-black uppercase tracking-widest border-4 border-[#5d2e0a] transition-all transform ${activeTab === 'fortune' ? 'bg-[#5d2e0a] text-white -translate-y-1 shadow-[4px_4px_0px_#000]' : 'bg-white/50'}`}>今日运势</button>
        <button onClick={() => setActiveTab('compatibility')} className={`px-8 py-4 text-xl font-black uppercase tracking-widest border-4 border-[#5d2e0a] transition-all transform ${activeTab === 'compatibility' ? 'bg-[#5d2e0a] text-white -translate-y-1 shadow-[4px_4px_0px_#000]' : 'bg-white/50'}`}>伙伴羁绊</button>
      </div>

      <div className="bg-[#f4e4bc] border-8 border-[#5d2e0a] p-8 shadow-[15px_15px_0px_#5d2e0a] mb-16">
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-2xl font-black border-b-4 border-[#5d2e0a] pb-2">航海士信息</h3>
              <div>
                <label className="block text-xs font-black uppercase mb-1">姓名 / 称号</label>
                <input type="text" placeholder="例如：草帽路飞" value={u1.name} onChange={e => setU1({...u1, name: e.target.value})} className="w-full p-4 border-4 border-[#5d2e0a] bg-white font-black text-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase mb-1">诞生日</label>
                  <input type="date" value={u1.birthDate} onChange={e => setU1({...u1, birthDate: e.target.value})} className="w-full p-3 border-4 border-[#5d2e0a] font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">出身海域</label>
                  <input type="text" placeholder="东海" value={u1.birthPlace} onChange={e => setU1({...u1, birthPlace: e.target.value})} className="w-full p-3 border-4 border-[#5d2e0a] font-bold" />
                </div>
              </div>
            </div>
            {activeTab === 'compatibility' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black border-b-4 border-[#5d2e0a] pb-2">伙伴信息</h3>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">姓名 / 称号</label>
                  <input type="text" placeholder="例如：索隆" value={u2.name} onChange={e => setU2({...u2, name: e.target.value})} className="w-full p-4 border-4 border-[#5d2e0a] bg-white font-black text-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">诞生日</label>
                    <input type="date" value={u2.birthDate} onChange={e => setU2({...u2, birthDate: e.target.value})} className="w-full p-3 border-4 border-[#5d2e0a] font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">出身海域</label>
                    <input type="text" placeholder="北海" value={u2.birthPlace} onChange={e => setU2({...u2, birthPlace: e.target.value})} className="w-full p-3 border-4 border-[#5d2e0a] font-bold" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => handleAction(activeTab)} className="w-full bg-[#a61b1f] text-white py-6 text-4xl font-black uppercase italic hover:bg-[#c02428] active:scale-95 transition-all shadow-[8px_8px_0px_#000]">
            {loading ? "冒险进行中..." : "开启航海日志！"}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-12 animate-in slide-in-from-bottom duration-700 pb-24">
          <div ref={cardRef} className="bg-[#f4e4bc] border-[16px] border-[#5d2e0a] p-12 relative overflow-hidden flex flex-col items-center shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")'}}></div>
            <h2 className="text-9xl font-black text-center mb-12 text-[#5d2e0a] uppercase tracking-tighter border-b-[12px] border-[#5d2e0a] w-full">WANTED</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 w-full">
              <div className="flex flex-col items-center">
                <div className="border-[10px] border-[#5d2e0a] bg-white p-3 shadow-2xl transform -rotate-1 mb-8">
                  <img src={result.data.imageUrl || 'https://via.placeholder.com/400x533'} className="w-full max-w-[360px] aspect-[3/4] object-cover grayscale-[0.1]" />
                </div>
                <div className="text-center bg-[#5d2e0a] text-[#f4e4bc] px-8 py-4 transform rotate-1">
                  <p className="text-sm font-black uppercase opacity-60">Dead or Alive</p>
                  <p className="text-5xl font-black uppercase">{result.data.summary || result.data.dynamic}</p>
                </div>
              </div>

              <div className="space-y-10">
                <div className="bg-white/40 p-8 border-l-[12px] border-[#a61b1f] shadow-inner">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black uppercase tracking-widest text-[#5d2e0a]">Captain's Log</h3>
                    <button onClick={async () => {
                      if(speaking) return;
                      setSpeaking(true);
                      const audio = await speakProphecy(result.data.insight || result.data.matchAnalysis);
                      if(audio) await playAudio(audio);
                      setSpeaking(false);
                    }} className={`w-14 h-14 rounded-full border-4 border-[#5d2e0a] flex items-center justify-center transition-all ${speaking ? 'bg-[#5d2e0a] text-white animate-pulse' : 'hover:bg-[#5d2e0a]/10'}`}>
                      <i className={`fa-solid ${speaking ? 'fa-waveform' : 'fa-play'} text-xl`}></i>
                    </button>
                  </div>
                  <p className="text-lg leading-relaxed font-bold italic text-justify text-[#2c1e11]">
                    {result.data.insight || result.data.matchAnalysis}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-green-600/10 p-6 border-4 border-green-800 transform -rotate-1">
                    <h4 className="text-sm font-black mb-3 text-green-900 uppercase">宜 · LUCK</h4>
                    <ul className="text-sm space-y-3 font-black text-green-900">{result.data.todo?.map((t:any, i:any) => <li key={i}>● {t}</li>)}</ul>
                  </div>
                  <div className="bg-red-600/10 p-6 border-4 border-red-800 transform rotate-1">
                    <h4 className="text-sm font-black mb-3 text-red-900 uppercase">忌 · TABOO</h4>
                    <ul className="text-sm space-y-3 font-black text-red-900">{result.data.notodo?.map((t:any, i:any) => <li key={i}>✕ {t}</li>)}</ul>
                  </div>
                </div>

                <div className="flex items-center justify-center p-8 bg-[#5d2e0a] text-[#f4e4bc] shadow-xl">
                   <div className="text-center">
                     <p className="text-xs uppercase font-black opacity-60 tracking-[0.5em] mb-2">Bounty Score / 悬赏评分</p>
                     <p className="text-8xl font-black tracking-tighter">
                       <span className="text-yellow-500 mr-2">฿</span>{result.data.score}
                       <span className="text-3xl ml-2 opacity-50">,000,000-</span>
                     </p>
                   </div>
                </div>
              </div>
            </div>

            <div className="mt-16 text-center opacity-30 text-xs font-black uppercase tracking-[0.8em] border-t-8 border-[#5d2e0a]/10 pt-8 w-full">
              Marine Headquarters Document #88-2025
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <button onClick={downloadImage} className="flex-1 bg-[#5d2e0a] text-white py-6 text-2xl font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-[10px_10px_0px_#000]">
              <i className="fa-solid fa-camera-retro mr-3"></i> 一键生成表情包 (保存)
            </button>
            <button onClick={() => setResult(null)} className="px-12 py-6 border-8 border-[#5d2e0a] font-black uppercase text-xl hover:bg-white transition-all shadow-[8px_8px_0px_#000]">
              再次起航
            </button>
          </div>
        </div>
      )}

      <footer className="text-center opacity-50 text-sm font-black py-20 uppercase tracking-widest">
        &copy; 2025 Grand Line Agent · Join the Pirate King Quest
      </footer>
    </div>
  );
};

export default App;
