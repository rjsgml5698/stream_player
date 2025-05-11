'use client';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { StreamContext } from '../context/StreamContext';

interface StreamPlayerProps {
  streamUrl: string;
}

export default function StreamPlayer({ streamUrl }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null); // 비디오 엘리먼트 참조
  const { startStream, stopStream } = useContext(StreamContext); // 스트림 시작, 중지 함수
  const [latency, setLatency] = useState(0); // 레이턴시 관리

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return; // videoRef 초기화 전엔 아무 작업 안함
    
    // Media Source 생성 및 video.src에 바인딩
    const ms = new MediaSource();
    const objectUrl = URL.createObjectURL(ms);
    video.src = objectUrl;
    
    // 지원 여부 체크
    console.log(
      '▶ isTypeSupported(mp2t):',
      MediaSource.isTypeSupported('video/mp2t; codecs="avc1.42E01E"')
    );
    
    // 미디어 소스 열릴 때 SourceBuffer 설정
    const onOpen = () => {
      console.log('MediaSource opened, readyState=', ms.readyState);

      // 이미 SourceBuffer가 추가된 경우 중복 실행 방지
      if (ms.sourceBuffers.length > 0) {
        console.log('SourceBuffer already added, skipping');
        return;
      }

      // 사용할 MIME 타입 정의 (TS 컨테이너 + H.264)
      const mime = 'video/mp2t; codecs="avc1.42E01E"';
      
      let sb: SourceBuffer;
      try {
        // SourceBuffer 생성 및 mode 설정
        sb = ms.addSourceBuffer(mime);
        sb.mode = 'segments';
        console.log('▶ SourceBuffer added, mode=', sb.mode);

      } catch (e) {
        console.error('addSourceBuffer failed:', e);

        return;
      }
      
      // 버퍼 갱신 후 실행되는 이벤트
      sb.addEventListener('updateend', () => {
        // console.log('updateend, video.buffered=', video.buffered);
        // console.log('video.readyState=', video.readyState);

        // 버퍼된 범위가 없으면 무시
        if (!video.buffered.length) return;

        // 라이브 엣지 끝 시간 계산
        const live = video.buffered.end(video.buffered.length - 1);
        // 현재 재생 위치
        const now = video.currentTime;
        // 지연(초 단위)
        const gapSec = live - now;

        // ms 단위로 latency 업데이트
        setLatency(Math.max(0, gapSec * 1000));

        // 지연이 0.5초 이상이면 라이브 엣지로 시킹
        if (gapSec > 0.5) {
          video.currentTime = live;
        }

        // video가 멈춰있으면 자동 재생
        if (video.paused) video.play().catch(() => {});
      });
      
      // 스트림 시작: WebSocket 연결 후 데이터 처리
      startStream(streamUrl, sb);
    };
    
    // MediaSource 이벤트 바인딩
    ms.addEventListener('sourceopen', onOpen);
    ms.addEventListener('error', e => console.error('✖️ MediaSource error', e));
    
    // 컴포넌트 언마운트 시 정리 작업
    return () => {
      ms.removeEventListener('sourceopen', onOpen);
      // WebSocket 연결 닫기
      stopStream();
      // object URL 해제
      URL.revokeObjectURL(objectUrl);

      video.removeAttribute('src');
    };
  }, [streamUrl, startStream, stopStream]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Video 플레이어 */}
      <video
        ref={videoRef}
        controls
        autoPlay
        muted
        playsInline
        style={{ width: '100%', background: 'black' }}
      />
      {/* 지연 표시 레이어 */}
      <div style={{
        position: 'absolute',
        top: 8,
        left: 8,
        padding: '4px 8px',
        background: 'rgba(0,0,0,0.6)',
        color: '#fff',
        borderRadius: 4,
        fontSize: 12,
      }}>
        Latency: {latency.toFixed(0)} ms
      </div>
    </div>
  );
}
