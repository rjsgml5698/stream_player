// server.js
const WebSocket = require('ws');
const { spawn } = require('child_process');
const url = require('url');

const PORT = 9999;
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws, req) => {
  const { query } = url.parse(req.url, true);
  const streamUrl = query.streamUrl;
  // 필수 파라미터 없으면 연결 거부
  if (!streamUrl) {
    ws.close(1008, 'streamUrl query parameter required');
    return;
  }

  console.log(`▶ New connection, proxying stream: ${streamUrl}`);

  // --- 여기부터 args 정의 수정 ---
  const args = [];

  // RTSP일 때만 저지연 + PTS 생성 옵션
  if (streamUrl.startsWith('rtsp://')) {
    args.push(
      '-rtsp_transport', 'tcp',        // RTSP over TCP: 방화벽 통과 및 패킷 순서 보장
      '-fflags', '+nobuffer+genpts',    // 입력 버퍼링 최소화 & PTS(타임스탬프) 생성
      '-probesize', '500k',             // 최초 500KB 데이터로 스트림 포맷 안정적 추정
      '-analyzeduration', '1000000'     // 최대 1초 분석으로 초기 스트림 파싱 신뢰성↑
    );
  }

  args.push(
    // 입력 스트림
    '-i', streamUrl,
    '-an',                         // 오디오 제거
    '-preset', 'ultrafast',        // 인코딩 속도 최우선
    '-tune', 'zerolatency',        // x264 저지연 튜닝
    '-f', 'mpegts',                // MPEG-TS 컨테이너
    '-codec:v', 'libx264',         // H.264 인코딩
    '-muxdelay', '0.001',          // muxer 지연 1 ms
    '-'                            // stdout
  );
  // --- args 정의 끝 ---

  // FFmpeg 프로세스 시작
  const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

  // FFmpeg stderr 로그
  ffmpeg.stderr.on('data', (d) => {
    console.error('[ffmpeg]', d.toString().trim());
  });

  ffmpeg.on('error', (err) => {
    // 시작 실패 시 WebSocket 종료
    console.error('FFmpeg failed to start:', err);
    ws.close(1011, 'FFmpeg error');
  });

  ffmpeg.on('close', (code, signal) => {
    // FFmpeg 종료 시 WebSocket도 닫기
    console.log(`FFmpeg exited (${code}/${signal})`);
    ws.close(1000);
  });

  // FFmpeg stdout에서 TS 청크 수신 → WS로 전달
  ffmpeg.stdout.on('data', (tsChunk) => {
    const now = Date.now();
    const header = Buffer.alloc(8);
    header.writeDoubleBE(now, 0);
    ws.send(Buffer.concat([header, tsChunk]));
  });

  ws.on('close', () => {
    // 클라이언트 연결 해제 시 FFmpeg 강제 종료
    console.log('▶ Client disconnected, killing FFmpeg');
    ffmpeg.kill('SIGKILL');
  });
});

console.log(`WebSocket proxy server running on ws://0.0.0.0:${PORT}/`);
