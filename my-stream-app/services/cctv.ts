// services/cctv.ts

import { CCTVInfo } from "@/model/cctv";


const BASE_URL = 'https://api.odcloud.kr/api';
const DATA_ID  = '15063717';
const UDDI_ID  = 'fd7b941f-734e-4c1d-9155-975be33fc19c';

// (1) 환경변수에 발급받은 서비스키 입력
const SERVICE_KEY = process.env.NEXT_PUBLIC_ODCLOUD_SERVICE_KEY || '';

interface RawResponse {
  page:          number;
  perPage:       number;
  totalCount:    number;
  currentCount:  number;
  matchCount:    number;
  data: Array<Record<string, any>>;
}

/**
 * CCTV 목록을 불러와 CCTVInfo[] 로 리턴
 */
export async function getListCCTV(
  page: number = 1,
  perPage: number = 100
): Promise<CCTVInfo[]> {
  const params = new URLSearchParams({
    page:       page.toString(),
    perPage:    perPage.toString(),
    returnType: 'JSON',
    serviceKey: SERVICE_KEY, // decoding된 raw값을 넣음, URLSearchParams가 알아서 퍼센트 인코딩 시킴
  });

  const url = `${BASE_URL}/${DATA_ID}/v1/uddi:${UDDI_ID}?${params}`;
  const res = await fetch(url);

  
  if (!res.ok) {
    throw new Error(`CCTV 목록 조회 실패: ${res.status}`);
  }

  const json = (await res.json()) as RawResponse;

  return json.data.map((item) => ({
    id:        item['CCTV관리번호'],
    name:      item['설치위치명'],
    longitude: item['경도'],
    latitude:  item['위도'],
    // 브라우저에서 바로 재생 가능한 HTTP 우선, 없으면 RTMP, RTSP 순으로 fallback
    streamUrl: {
      http: item['스트리밍 프로토콜(HTTP)주소'] || '',
      rtmp: item['스트리밍 프로토콜(RTMP)주소'] || '',
      rtsp: item['스트리밍 프로토콜(RTSP)주소'] || '',
    },
  }));
}
