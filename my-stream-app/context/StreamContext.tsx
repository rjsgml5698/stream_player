import { createContext, useCallback, useEffect, useRef, useState } from "react";

interface StreamContextValue {
    startStream: (streamUrl: string, sb: SourceBuffer) => void;
    stopStream: () => void;
    latency: number;
  }
  
  export const StreamContext = createContext<StreamContextValue>({
    startStream: () => {},
    stopStream: () => {},
    latency: 0,
  });
  
  export const StreamProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const [latency, setLatency] = useState(0);
    const wsRef = useRef<WebSocket | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);
  
    const startStream = useCallback((streamUrl: string, sb: SourceBuffer) => {
      // 1) 기존 WS 있으면 닫고, SB 세팅
      wsRef.current?.close();
      sourceBufferRef.current = sb;
  
      // 2) 새 WS 열기
      const ws = new WebSocket(`ws://localhost:9999/?streamUrl=${encodeURIComponent(streamUrl)}`);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;
  
      ws.onmessage = (ev) => {
        const buf = new Uint8Array(ev.data);
        const pts = new DataView(buf.buffer).getFloat64(0);
        const chunk = buf.slice(8);
        
        setLatency(Date.now() - pts);
        
        // 비디오 오류 체크 (document.getElementById로 가져오기)
        // const vid = document.getElementById('video-player') as HTMLVideoElement | null;
        // if (vid?.error) {
        //   console.warn('⚠️ video.error detected, dropping chunk', vid.error);
        //   return;
        // }
      
        // SourceBuffer가 준비되지 않았거나 바쁘면 드롭
        const sb = sourceBufferRef.current;
        if (!sb) {
          console.warn('⚠️ no SourceBuffer yet, skipping chunk');
          return;
        }

        if (sb.updating) {
          console.warn('⚠️ SourceBuffer busy, dropping chunk');
          return;
        }
      
        // appendBuffer 시도 (실패해도 멈추지 않고 드롭)
        try {
        //   console.log("진입?", chunk)
          sb.appendBuffer(chunk);
        } catch (err) {
          console.error('❌ appendBuffer failed, dropping chunak', err);
        }
      };

    }, []);
  
    const stopStream = useCallback(() => {
    console.log('stopStream called; closing ws', wsRef.current?.readyState);
      wsRef.current?.close();
      sourceBufferRef.current = null;
      wsRef.current = null;
    }, []);
  
    useEffect(() => () => stopStream(), [stopStream]);
  
    return (
      <StreamContext.Provider value={{ startStream, stopStream, latency }}>
        {children}
      </StreamContext.Provider>
    );
  };
  