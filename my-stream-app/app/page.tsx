// app/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { StreamProvider } from '../context/StreamContext';
import StreamPlayer from '../components/StreamPlayer';
import { CCTVInfo } from '@/model/cctv';
import { getListCCTV } from '@/services/cctv';

export default function HomePage() {
  const [cctvs, setCctvs]     = useState<CCTVInfo[]>([]);
  const [selected, setSelected] = useState<CCTVInfo | null>(null);

  useEffect(() => {
    getListCCTV(1, 50)
      .then((res) => {
        console.log('getListCCTV 반환값:', res);
        setCctvs(res);
      })
      .catch((err) => {
        console.error('getListCCTV 에러:', err);
      });
  }, []);

  return (
    <StreamProvider>
      <div className="p-4">
        <select
          className="border p-2 mb-6"
          value={selected?.id || ''}
          onChange={(e) => {
            const found = cctvs.find(c => c.id === e.target.value) || null;
            setSelected(found);
          }}
        >
          <option value="">— 카메라 선택 —</option>
          {cctvs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.latitude},{c.longitude})
            </option>
          ))}
        </select>

        {selected && selected.streamUrl && (
          <StreamPlayer streamUrl={selected.streamUrl.rtsp} />
        )}
      </div>
    </StreamProvider>
  );
}
