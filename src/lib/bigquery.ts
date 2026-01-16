import { BigQuery } from '@google-cloud/bigquery';

// 환경 변수 가져오기
const projectId = process.env.GOOGLE_PROJECT_ID;
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
let privateKey = process.env.GOOGLE_PRIVATE_KEY;

// [🚨 핵심] Vercel 환경변수 줄바꿈(\n) 자동 보정 로직
if (privateKey) {
  // 1. 실수로 입력했을 수 있는 양쪽 따옴표(") 제거
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  
  // 2. 문자열로 된 '\n'을 실제 엔터(줄바꿈)로 변환 (이게 제일 중요합니다!)
  privateKey = privateKey.replace(/\\n/g, '\n');
}

// [디버깅용] 배포 로그에서 키가 잘 들어왔는지 확인 (보안상 앞부분만 출력)
if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ [BigQuery Error] 환경 변수가 누락되었습니다.");
} else {
  console.log("✅ [BigQuery Config] Project ID:", projectId);
  console.log("✅ [BigQuery Config] Email:", clientEmail);
  // 키의 앞부분만 살짝 보여줘서 잘 읽혔는지 확인
  console.log("✅ [BigQuery Config] Private Key Check:", privateKey.substring(0, 25) + "...");
}

const credentials = {
  projectId: projectId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
};

const bigqueryClient = new BigQuery(credentials);

export default bigqueryClient;