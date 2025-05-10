'use client';
import React, { useContext, useEffect, useRef } from 'react';
import { StreamContext } from '../context/StreamContext';

interface StreamPlayerProps {
  streamUrl: string;
}

export default function StreamPlayer({ streamUrl }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { startStream, stopStream, latency } = useContext(StreamContext);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
  
    const ms = new MediaSource();
    const objectUrl = URL.createObjectURL(ms);
    video.src = objectUrl;
  
    console.log(
      '▶ isTypeSupported(mp2t):',
      MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')
    );
  
    const onOpen = () => {
      console.log('▶ MediaSource opened, readyState=', ms.readyState);
      if (ms.sourceBuffers.length > 0) {
        console.log('▶ SourceBuffer already added, skipping');
        return;
      }

      const mime = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';  // TS 대신 MP4
      
      let sb: SourceBuffer;
      try {
        sb = ms.addSourceBuffer(mime);
        sb.mode = 'segments';
        console.log('▶ SourceBuffer added, mode=', sb.mode);
      } catch (e) {
        console.error('addSourceBuffer failed:', e);
        return;
      }
  
      sb.addEventListener('updateend', () => {
        console.log('updateend, video.buffered=', video.buffered);
        console.log('video.readyState=', video.readyState);

        if (video.paused) {
          video.play().catch(err => console.error('▶ play error:', err));
        }
      });
  
      startStream(streamUrl, sb);
    };
  
    ms.addEventListener('sourceopen', onOpen);
    ms.addEventListener('error', e => console.error('✖️ MediaSource error', e));
  
    return () => {
      ms.removeEventListener('sourceopen', onOpen);
      stopStream();
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
    };
  }, [streamUrl, startStream, stopStream]);

  return (
    <div style={{ position: 'relative' }}>
      <video
        id="video-player"
        ref={videoRef}
        controls
        autoPlay
        muted
        playsInline
        style={{ width: '100%', background: 'black' }}
      />
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
