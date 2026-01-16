import { BigQuery } from '@google-cloud/bigquery';

const credentials = {
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    // 줄바꿈 문자(\n) 처리
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
};

// 싱글톤 클라이언트 생성
const bigqueryClient = new BigQuery(credentials);

export default bigqueryClient;