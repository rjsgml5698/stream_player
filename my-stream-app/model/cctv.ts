interface StreamProtocol {
    http: string;
    rtmp: string;
    rtsp: string;
}

export interface CCTVInfo {
    id: string;        // CCTV관리번호
    name: string;      // 설치위치명
    streamUrl: StreamProtocol; // HTTP 또는 RTMP 또는 RTSP 주소 중 우선순위로 채택
    longitude: string; // 경도
    latitude: string;  // 위도
}