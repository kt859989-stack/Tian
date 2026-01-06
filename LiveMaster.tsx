
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { encodePCM, decodePCM, convertPCMToBuffer } from './geminiService';

interface LiveMasterProps {
  apiReady: boolean;
  onRetry: () => void;
}

const LiveMaster: React.FC<LiveMasterProps> = ({ apiReady, onRetry }) => {
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const startSession = async () => {
    if (!apiReady) { onRetry(); return; }
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputContext = new AudioContext({ sampleRate: 16000 });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: '你是一位隐居山林的周易命理大师。你说话深奥、充满智慧且慈祥。你现在正在和一位缘主进行实时语音对话，请直接回答他的困惑。',
        },
        callbacks: {
          onopen: () => {
            setConnected(true);
            const source = inputContext.createMediaStreamSource(stream);
            const processor = inputContext.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm = encodePCM(inputData);
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: pcm, mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(processor);
            processor.connect(inputContext.destination);
          },
          onmessage: async (msg) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              setIsSpeaking(true);
              const ctx = audioContextRef.current;
              const buffer = await convertPCMToBuffer(decodePCM(audioData), ctx);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
              source.start(startTime);
              nextStartTimeRef.current = startTime + buffer.duration;
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsSpeaking(false);
              };
              sourcesRef.current.add(source);
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setConnected(false),
          onerror: (e: any) => {
            if (e.message?.includes('Requested entity was not found')) onRetry();
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      alert("请允许麦克风权限以开启连线。");
    }
  };

  const stopSession = () => {
    sessionRef.current?.close();
    setConnected(false);
  };

  return (
    <div className="chinese-card p-12 flex flex-col items-center justify-center min-h-[500px] text-center">
      {!connected ? (
        <div className="animate-in fade-in zoom-in duration-500">
          <div className="mb-10 opacity-10">
            <i className="fa-solid fa-microphone-slash text-[10rem]"></i>
          </div>
          <h3 className="title-font text-5xl mb-6 text-[#a61b1f]">实时开示 · 禅师指路</h3>
          <p className="text-sm opacity-60 mb-10 max-w-sm mx-auto leading-relaxed">
            {apiReady ? '静心冥想您的困惑，开启灵犀连线，与大师直接语音对话。' : '天机连接尚未开启，请先点击底部连接。'}
          </p>
          <button onClick={startSession} className="action-btn px-16 py-6 text-3xl title-font shadow-2xl scale-110 active:scale-95 transition-transform">
            开启 灵犀 连线
          </button>
        </div>
      ) : (
        <div className="w-full">
          <div className="relative mb-16">
            <div className={`w-64 h-64 mx-auto rounded-full border-8 border-[#a61b1f]/20 flex items-center justify-center bg-white shadow-2xl transition-all duration-700 ${isSpeaking ? 'scale-110 border-[#a61b1f]' : ''}`}>
              <i className={`fa-solid fa-yin-yang text-[8rem] text-black ${isSpeaking ? 'animate-spin-slow' : 'animate-pulse'}`}></i>
            </div>
            {isSpeaking && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-80 h-80 border-4 border-[#a61b1f]/10 rounded-full animate-ping"></div>
              </div>
            )}
          </div>
          <p className="title-font text-4xl text-[#a61b1f] mb-2">{isSpeaking ? '大师正在开示...' : '缘主请讲，老衲洗耳恭听'}</p>
          <p className="text-xs opacity-40 font-bold uppercase tracking-widest mt-4">实时灵力交互中</p>
          <div className="mt-12">
            <button onClick={stopSession} className="border-2 border-black px-12 py-3 text-sm font-black hover:bg-black hover:text-white transition-all uppercase tracking-widest">
              结束 连线
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMaster;
