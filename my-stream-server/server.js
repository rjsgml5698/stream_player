// server.js
const WebSocket = require('ws');
const { spawn } = require('child_process');
const url = require('url');

const PORT = 9999;
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws, req) => {
  const { query } = url.parse(req.url, true);
  const streamUrl = query.streamUrl;
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
      '-rtsp_transport', 'tcp',
      '-fflags', '+nobuffer+genpts',
      '-flags', 'low_delay'
    );
  }

  args.push(
    // 입력 스트림
    '-i', streamUrl,

    // 무음 오디오 입력
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',

    // 매핑
    '-map', '0:v',
    '-map', '1:a',

    // PTS 그대로 패스스루
    '-vsync', '0',

    // 비디오 코덱 & 저지연
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-profile:v', 'baseline',
    '-level', '4.0',
    '-pix_fmt', 'yuv420p',
    '-g', '30',
    '-sc_threshold', '0',

    // 오디오 코덱
    '-c:a', 'aac',
    '-b:a', '64k',

    // → fMP4 (fragmented MP4) 출력
    '-f', 'mp4',
    '-movflags', 'empty_moov+default_base_moof+frag_keyframe+faststart',

    // pipe 출력
    'pipe:1'
  );
  // --- args 정의 끝 ---

  const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

  ffmpeg.stderr.on('data', (d) => {
    console.error('[ffmpeg]', d.toString().trim());
  });

  ffmpeg.on('error', (err) => {
    console.error('FFmpeg failed to start:', err);
    ws.close(1011, 'FFmpeg error');
  });

  ffmpeg.on('close', (code, signal) => {
    console.log(`FFmpeg exited (${code}/${signal})`);
    ws.close(1000);
  });

  ffmpeg.stdout.on('data', (tsChunk) => {
    const now = Date.now();
    const header = Buffer.alloc(8);
    header.writeDoubleBE(now, 0);
    ws.send(Buffer.concat([header, tsChunk]));
  });

  ws.on('close', () => {
    console.log('▶ Client disconnected, killing FFmpeg');
    ffmpeg.kill('SIGKILL');
  });
});

console.log(`WebSocket proxy server running on ws://0.0.0.0:${PORT}/`);
