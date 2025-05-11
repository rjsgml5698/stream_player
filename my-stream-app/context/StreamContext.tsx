import { createContext, useCallback, useEffect, useRef, useState } from "react";

// Context에 start/stop 스트림 함수 노출
interface StreamContextValue {
  // 스트림 시작: WebSocket 연결 및 SourceBuffer 설정
  startStream: (streamUrl: string, sb: SourceBuffer) => void;
  // 스트림 종료: WebSocket 정리
  stopStream: () => void;
}

// 기본값은 빈 함수로 초기화
export const StreamContext = createContext<StreamContextValue>({
  startStream: () => {},
  stopStream: () => {},
});

// Provider 컴포넌트: 자식에게 start/stop 함수 제공
export const StreamProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  // WebSocket 인스턴스 참조
  const wsRef = useRef<WebSocket | null>(null);
  // SourceBuffer 참조
  const sourceBufferRef = useRef<SourceBuffer | null>(null);

  // 스트림 시작 함수: WebSocket 열고, 수신 데이터 SourceBuffer에 append
  const startStream = useCallback((streamUrl: string, sb: SourceBuffer) => {
    // 기존 WebSocket 연결 닫기
    wsRef.current?.close();
    sourceBufferRef.current = sb;

    // WebSocket 생성 (arraybuffer 모드)
    const ws = new WebSocket(`ws://localhost:9999/?streamUrl=${encodeURIComponent(streamUrl)}`);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    // 메시지 수신(on) 시 SourceBuffer에 appendBuffer
    ws.onmessage = (ev) => {
      const buf = new Uint8Array(ev.data);
      const chunk = buf.slice(8);

      const vid = document.getElementById('video-player') as HTMLVideoElement;
      if (vid?.error) {
        console.error(
          '[VIDEO ERROR] code=', vid.error.code,
          'message=', vid.error.message
        );
      }

      const sb = sourceBufferRef.current;
      if (!sb) {
        console.warn('no SourceBuffer yet, skipping chunk');
        return;
      }

      // SourceBuffer 작업 중이면 드롭
      if (sb.updating) {
        console.warn('SourceBuffer busy, dropping chunk');
        return;
      }

      try {
        // 실제 버퍼 삽입
        sb.appendBuffer(chunk);

      } catch (err) {
        console.error('appendBuffer failed, dropping chunk', err);
      }
    };
  }, []);

  // 스트림 종료 함수: WebSocket 닫고 ref 해제
  const stopStream = useCallback(() => {
    console.log('stopStream called; closing ws', wsRef.current?.readyState);
    wsRef.current?.close();
    sourceBufferRef.current = null;
    wsRef.current = null;
  }, []);

  
  // 언마운트 시 자동 호출: stopStream 실행
  useEffect(() => () => stopStream(), [stopStream]);

  return (
    <StreamContext.Provider value={{ startStream, stopStream }}>
      {children}
    </StreamContext.Provider>
  );
};
