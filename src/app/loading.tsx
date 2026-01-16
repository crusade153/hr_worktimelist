// src/app/loading.tsx
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xl font-bold text-gray-600">데이터를 불러오는 중입니다...</p>
      <p className="text-sm text-gray-400">잠시만 기다려주세요.</p>
    </div>
  );
}