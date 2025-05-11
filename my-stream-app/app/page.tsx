// app/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { StreamProvider } from '../context/StreamContext';
import StreamPlayer from '../components/StreamPlayer';
import { CCTVInfo } from '@/model/cctv';
import { getListCCTV } from '@/services/cctv';

export default function HomePage() {
  const [cctvs, setCctvs] = useState<CCTVInfo[]>([]);
  const [selected, setSelected] = useState<CCTVInfo | null>(null);

  useEffect(() => {
    getListCCTV(1, 50)
      .then((res) => setCctvs(res))
      .catch((err) => console.error('getListCCTV 에러:', err));
  }, []);

  return (
    <StreamProvider>
      <div className="flex flex-col h-screen p-4 overflow-hidden">
        <div>
          <select
            className="border p-2 w-full"
            value={selected?.id || ''}
            onChange={(e) => {
              const found = cctvs.find(c => c.id === e.target.value) || null;
              setSelected(found);
            }}
          >
            <option value="">— 카메라 선택 —</option>
            {cctvs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.latitude}, {c.longitude})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 flex flex-col justify-start items-stretch">
          {selected && selected.streamUrl ? (
            <div className="w-full h-full">
              <StreamPlayer streamUrl={selected.streamUrl.rtsp} />
            </div>
          ) : (
            <p className="text-center text-gray-500">카메라를 선택하세요</p>
          )}
        </div>
      </div>
    </StreamProvider>
  );
}
