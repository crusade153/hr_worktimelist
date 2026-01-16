'use server'

import bigqueryClient from '@/lib/bigquery';
import { WorkTime } from '@/types/work-time';

export async function getWorkTimeList() {
  // 쿼리 작성 (프로젝트ID.데이터셋.테이블)
  const query = `
    SELECT *
    FROM \`harimfood-361004.harim_sap_bi.HR_WorkTimeList\`
    LIMIT 100
  `;

  try {
    const [rows] = await bigqueryClient.query({ query });
    return rows as WorkTime[];
  } catch (error) {
    console.error('BigQuery Error:', error);
    return [];
  }
}