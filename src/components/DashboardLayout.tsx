'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkTime } from '@/types/work-time';
import { analyzeData } from '@/utils/analytics';
import { 
  Users, CheckCircle2, CalendarOff, AlertCircle, XCircle, Briefcase,
  LayoutDashboard, Building2, Clock, Search, ChevronLeft, ChevronRight,
  User, Calendar, Home, FileText, Download, Save, X, PenLine, 
  List // 아이콘 임포트
} from 'lucide-react';

// --- 하위 컴포넌트: KPI 카드 ---
function KpiCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${color} hover:shadow-md transition-all relative z-10`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          <h3 className="text-xl font-extrabold text-gray-800">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg bg-opacity-10 ${color.replace('border-', 'bg-')}`}>
          <Icon className={`w-4 h-4 ${color.replace('border-', 'text-')}`} />
        </div>
      </div>
    </div>
  );
}

// --- 하위 컴포넌트: 소명서 작성 모달 ---
function ExplanationModal({ isOpen, onClose, onSave, targetRow, initialValue }: any) {
  const [text, setText] = useState(initialValue || '미입력 사유 : ');

  useEffect(() => {
    if (isOpen) setText(initialValue || '미입력 사유 : ');
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <PenLine className="w-5 h-5 text-[#E53935]" /> 사유소명서 작성
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg space-y-1">
          <p><strong>이름:</strong> {targetRow?.NAMEKO} ({targetRow?.ORGTXT})</p>
          <p><strong>일자:</strong> {targetRow?.TMDATE} ({targetRow?.WEEKTX})</p>
          <p className="text-red-500"><strong>상태:</strong> {!targetRow?.BETIME && !targetRow?.EDTIME ? '무단결근' : '출퇴근 누락'}</p>
        </div>

        <textarea 
          className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-100 focus:border-[#E53935] outline-none resize-none text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="사유를 입력하세요..."
        />

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">취소</button>
          <button 
            onClick={() => onSave(targetRow, text)}
            className="px-4 py-2 text-sm font-medium text-white bg-[#E53935] rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> 저장하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ rawData, currentMonth }: { rawData: WorkTime[], currentMonth: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // 상태 관리
  const [currentView, setCurrentView] = useState<'company' | 'dept'>('company');
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeptMenuOpen, setIsDeptMenuOpen] = useState(true);

  // 사유소명서 데이터 (임시 저장)
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  
  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<WorkTime | null>(null);

  const deptList = useMemo(() => {
    return Array.from(new Set(rawData.map(item => item.ORGTXT || '미지정'))).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [rawData]);

  useEffect(() => {
    if (deptList.length > 0 && !selectedDept) setSelectedDept(deptList[0]);
  }, [deptList, selectedDept]);

  const filteredData = useMemo(() => {
    let data = rawData;
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(item => (item.NAMEKO?.toLowerCase().includes(lower)) || (item.ORGTXT?.toLowerCase().includes(lower)));
    }
    if (currentView === 'dept' && selectedDept) {
      data = data.filter(item => item.ORGTXT === selectedDept);
    }
    return data;
  }, [rawData, searchTerm, currentView, selectedDept]);

  const stats = analyzeData(filteredData);

  // 날짜 변경 (Drill-down)
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    if (!newMonth) return;
    startTransition(() => {
      router.push(`/?month=${newMonth}`);
    });
  };

  const changeMonth = (offset: number) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    startTransition(() => {
      router.push(`/?month=${newMonthStr}`);
    });
  };

  const handleSaveExplanation = (row: WorkTime, text: string) => {
    const key = `${row.EMPNUM}-${row.TMDATE}`;
    setExplanations(prev => ({ ...prev, [key]: text }));
    setModalOpen(false);
  };

  // CSV 다운로드 (현재 필터링된 모든 누락/무단 데이터 대상)
  const handleDownloadCSV = () => {
    if (stats.missingList.length === 0 && stats.absentList.length === 0) {
      alert("다운로드할 누락/무단결근 데이터가 없습니다.");
      return;
    }

    let csvContent = "\uFEFF"; // 한글 깨짐 방지
    csvContent += "날짜,요일,부서,사번,이름,직책,출근시간,퇴근시간,누락유형,소명상태,소명내용\n";

    // 누락 리스트와 무단결근 리스트 합쳐서 다운로드
    const allTargets = [...stats.missingList, ...stats.absentList];

    allTargets.forEach(row => {
      const key = `${row.EMPNUM}-${row.TMDATE}`;
      const explanation = explanations[key] || '';
      const status = explanation ? '작성완료' : '미작성';
      const type = !row.BETIME && !row.EDTIME ? '무단결근' : '체크누락';

      // CSV 포맷팅 (따옴표 처리 등)
      csvContent += `${row.TMDATE},${row.WEEKTX},${row.ORGTXT},${row.EMPNUM},${row.NAMEKO},${row.TITEXT},${row.BETIME || ''},${row.EDTIME || ''},${type},${status},"${explanation.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `근태소명서_${currentMonth}_${new Date().getTime()}.csv`;
    link.click();
  };

  const openModal = (row: WorkTime) => {
    setModalTarget(row);
    setModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-[#FAFAFA] font-sans text-[#212121] overflow-hidden relative">
      
      {/* 🔴 사이드바 */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg z-20 flex-shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="w-8 h-8 bg-[#E53935] rounded-lg flex items-center justify-center text-white font-bold shadow-sm">H</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Harim Group</h1>
            <p className="text-xs text-gray-400">Workforce Analytics</p>
          </div>
        </div>

        {/* 기간 컨트롤러 (Drill-down Picker) */}
        <div className="p-5 pb-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block tracking-wider">Target Period</label>
          <div className="relative flex items-center">
            {/* 좌우 버튼으로도 이동 가능 */}
            <button onClick={() => changeMonth(-1)} className="absolute left-1 p-1.5 text-gray-400 hover:text-[#E53935] z-10"><ChevronLeft className="w-4 h-4"/></button>
            
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-8 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-[#E53935]" />
              </div>
              <input 
                type="month"
                value={currentMonth}
                onChange={handleMonthChange}
                className="block w-full pl-8 pr-8 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E53935] focus:border-transparent cursor-pointer hover:bg-white transition-all text-center"
              />
            </div>

            <button onClick={() => changeMonth(1)} className="absolute right-1 p-1.5 text-gray-400 hover:text-[#E53935] z-10"><ChevronRight className="w-4 h-4"/></button>
          </div>
        </div>

        <div className="px-5 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="직원명 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#E53935] focus:ring-2 focus:ring-red-100 outline-none transition-all"
            />
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          <div className="px-2 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dashboard Views</div>
          
          <button onClick={() => { setCurrentView('company'); setSelectedDept(''); setActiveTab('daily'); setSearchTerm(''); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${currentView === 'company' ? 'bg-[#E53935] text-white shadow-md shadow-red-200' : 'text-gray-600 hover:bg-gray-100'}`}>
            <LayoutDashboard className="w-5 h-5" /> 전사 현황
          </button>

          <div className="pt-2">
            <button onClick={() => setIsDeptMenuOpen(!isDeptMenuOpen)} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-gray-50 ${currentView === 'dept' ? 'text-[#E53935]' : 'text-gray-600'}`}>
              <div className="flex items-center gap-3"><Building2 className="w-5 h-5" /> 부서별 상세</div>
            </button>
            {isDeptMenuOpen && (
              <div className="mt-1 space-y-0.5 pl-4 relative before:absolute before:left-8 before:top-0 before:bottom-0 before:w-px before:bg-gray-200">
                {deptList.map((dept) => (
                  <button key={dept} onClick={() => { setCurrentView('dept'); setSelectedDept(dept); setActiveTab('work_log'); setSearchTerm(''); }} className={`w-full flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-all relative z-10 ${selectedDept === dept && currentView === 'dept' ? 'bg-red-50 text-[#E53935] font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedDept === dept && currentView === 'dept' ? 'bg-[#E53935]' : 'bg-gray-300'}`}></span> {dept}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
      </aside>

      {/* 🟢 메인 컨텐츠 */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#FAFAFA]">
        {isPending && <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center backdrop-blur-sm"><div className="flex flex-col items-center gap-2"><div className="w-10 h-10 border-4 border-[#E53935] border-t-transparent rounded-full animate-spin"></div><span className="text-sm font-bold text-[#E53935] animate-pulse">데이터 로딩 중...</span></div></div>}

        {/* 헤더 */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-gray-400" /><ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="font-bold text-gray-800 text-lg">{currentView === 'company' ? '전사 종합 현황' : selectedDept}</span>
            {currentView === 'dept' && <span className="bg-red-50 text-[#E53935] text-xs px-2 py-1 rounded border border-red-100 font-bold">Department View</span>}
          </div>

          {/* [NEW] 글로벌 액션 버튼 (CSV 다운로드) */}
          <div className="flex items-center gap-2">
            {/* 누락이나 무단결근 데이터가 있을 때만 다운로드 버튼 표시 */}
            {(stats.missingList.length > 0 || stats.absentList.length > 0) && (
              <button 
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all shadow-sm hover:shadow-md"
              >
                <Download className="w-4 h-4" /> 사유소명서 일괄 다운로드
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <KpiCard label="총 인원" value={stats.totalEmp.size} icon={Users} color="border-gray-500" />
            <KpiCard label="실근무" value={stats.working.toLocaleString()} icon={CheckCircle2} color="border-[#4A90E2]" />
            <KpiCard label="휴무" value={stats.offDuty.toLocaleString()} icon={CalendarOff} color="border-purple-400" />
            <KpiCard label="근태누락" value={stats.missing.toLocaleString()} icon={AlertCircle} color="border-orange-400" />
            <KpiCard label="무단결근" value={stats.absent} icon={XCircle} color="border-[#E53935]" />
            <KpiCard label="주간과다" value={stats.longWorkList.length} icon={Clock} color="border-pink-500" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
            <div className="border-b border-gray-100 px-6 flex gap-6 overflow-x-auto bg-white sticky top-0 z-10">
              {currentView === 'company' ? (
                <>
                  <TabButton id="daily" label="일자별 현황" icon={Calendar} active={activeTab} onClick={setActiveTab} />
                  <TabButton id="dept_summary" label="부서별 요약" icon={Building2} active={activeTab} onClick={setActiveTab} />
                  <TabButton id="missing_all" label="전체 누락" icon={AlertCircle} active={activeTab} onClick={setActiveTab} count={stats.missingList.length} />
                  <TabButton id="long_all" label="전체 장시간" icon={Clock} active={activeTab} onClick={setActiveTab} count={stats.longWorkList.length} />
                </>
              ) : (
                <>
                  <TabButton id="work_log" label="인별 근무 현황" icon={List} active={activeTab} onClick={setActiveTab} />
                  <TabButton id="missing_dept" label="부서 누락 현황" icon={AlertCircle} active={activeTab} onClick={setActiveTab} count={stats.missingList.length} />
                  <TabButton id="long_dept" label="부서 장시간 근무" icon={Clock} active={activeTab} onClick={setActiveTab} count={stats.longWorkList.length} />
                  <TabButton id="weekend" label="주말 근무" icon={Briefcase} active={activeTab} onClick={setActiveTab} />
                </>
              )}
            </div>

            <div className="flex-1 bg-white p-0">
              {currentView === 'company' && activeTab === 'daily' && <DailyTable data={stats.daily} />}
              {currentView === 'company' && activeTab === 'dept_summary' && <DeptSummaryTable data={stats.dept} />}
              {currentView === 'company' && activeTab === 'missing_all' && <MissingTable data={stats.missingList} onOpenModal={openModal} explanations={explanations} />}
              {currentView === 'company' && activeTab === 'long_all' && <LongWorkTable data={stats.longWorkList} />}

              {currentView === 'dept' && activeTab === 'work_log' && <IndividualTable data={stats.individualRecords} />}
              {currentView === 'dept' && activeTab === 'missing_dept' && <MissingTable data={stats.missingList} onOpenModal={openModal} explanations={explanations} />}
              {currentView === 'dept' && activeTab === 'long_dept' && <LongWorkTable data={stats.longWorkList} />}
              {currentView === 'dept' && activeTab === 'weekend' && <WeekendTable data={stats.weekendList} />}
            </div>
          </div>
        </div>

        {/* ✨ 워터마크 (배경에 고정) */}
        <div className="fixed bottom-6 right-8 pointer-events-none select-none z-0">
          <p className="text-4xl font-black text-gray-200/50 tracking-tighter transform -rotate-12">
            Powered by kdyu
          </p>
        </div>

      </main>

      {/* 모달 */}
      <ExplanationModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSave={handleSaveExplanation} 
        targetRow={modalTarget} 
        initialValue={modalTarget ? explanations[`${modalTarget.EMPNUM}-${modalTarget.TMDATE}`] : ''}
      />
    </div>
  );
}

// === 하위 컴포넌트 ===
// (기존 테이블 컴포넌트들 그대로 유지 - 변경 없음)
function TabButton({ id, label, icon: Icon, active, onClick, count }: any) {
  return (
    <button onClick={() => onClick(id)} className={`py-4 px-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${active === id ? 'border-[#E53935] text-[#E53935] font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
      <Icon className="w-4 h-4" /> {label}
      {count > 0 && <span className="bg-red-100 text-[#E53935] text-[10px] px-1.5 py-0.5 rounded-full">{count}</span>}
    </button>
  );
}

function MissingTable({ data, onOpenModal, explanations }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-orange-50 text-orange-800 border-b border-orange-100">
          <tr>
            <th className="px-6 py-3">날짜</th>
            <th className="px-6 py-3">이름</th>
            <th className="px-6 py-3">부서</th>
            <th className="px-6 py-3">출근</th>
            <th className="px-6 py-3">퇴근</th>
            <th className="px-6 py-3">소명 상태</th>
            <th className="px-6 py-3">사유소명서</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-orange-50">
          {data.map((row: any, idx: number) => {
            const key = `${row.EMPNUM}-${row.TMDATE}`;
            const hasExplanation = !!explanations[key];
            return (
              <tr key={idx} className="hover:bg-orange-50/50">
                <td className="px-6 py-3 text-gray-600">{row.TMDATE}</td>
                <td className="px-6 py-3 font-bold text-gray-900">{row.NAMEKO}</td>
                <td className="px-6 py-3 text-gray-500">{row.ORGTXT}</td>
                <td className="px-6 py-3 text-red-500">{row.BETIME || '-'}</td>
                <td className="px-6 py-3 text-red-500">{row.EDTIME || '-'}</td>
                <td className="px-6 py-3">
                   <span className={`px-2 py-1 rounded text-xs font-bold ${hasExplanation ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                     {hasExplanation ? '작성완료' : '미작성'}
                   </span>
                </td>
                <td className="px-6 py-3">
                  <button 
                    onClick={() => onOpenModal(row)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {hasExplanation ? '수정' : '작성'}
                  </button>
                </td>
              </tr>
            );
          })}
          {data.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-gray-400">데이터가 없습니다.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function DailyTable({ data }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-500 border-b">
          <tr>
            <th className="px-6 py-3">날짜</th>
            <th className="px-6 py-3">요일</th>
            <th className="px-6 py-3">전체</th>
            <th className="px-6 py-3 text-[#4A90E2]">실근무</th>
            <th className="px-6 py-3 text-orange-500">누락</th>
            <th className="px-6 py-3 text-[#E53935]">무단</th>
            <th className="px-6 py-3">출근율</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {Object.values(data).sort((a: any, b: any) => b.date.localeCompare(a.date)).map((row: any, idx) => (
            <tr key={idx} className={`hover:bg-gray-50 ${row.isWeekend ? 'bg-slate-50/50' : ''}`}>
              <td className="px-6 py-3 text-gray-700">{row.date}</td>
              <td className={`px-6 py-3 ${row.weekday === '일' ? 'text-red-500' : row.weekday === '토' ? 'text-blue-500' : 'text-gray-500'}`}>{row.weekday}</td>
              <td className="px-6 py-3">{row.total}</td>
              <td className="px-6 py-3 font-bold text-[#4A90E2]">{row.working}</td>
              <td className="px-6 py-3 text-orange-500">{row.missing}</td>
              <td className="px-6 py-3 text-[#E53935]">{row.absent || '-'}</td>
              <td className="px-6 py-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">{row.total > 0 ? ((row.working/row.total)*100).toFixed(0) : 0}%</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeptSummaryTable({ data }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-500 border-b">
          <tr>
            <th className="px-6 py-3">부서명</th>
            <th className="px-6 py-3">인원</th>
            <th className="px-6 py-3">이행률 (정상/전체)</th>
            <th className="px-6 py-3">평균근무</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {Object.values(data).sort((a: any, b: any) => b.total - a.total).map((dept: any, idx) => (
            <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
              <td className="px-6 py-4 font-bold text-gray-800">{dept.name}</td>
              <td className="px-6 py-4">{dept.empCount.size}명</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${(dept.normal/dept.total) < 0.9 ? 'bg-orange-400' : 'bg-[#4A90E2]'}`} style={{ width: `${(dept.normal/dept.total)*100}%` }}></div>
                  </div>
                  <span className="text-xs font-bold">{((dept.normal/dept.total)*100).toFixed(0)}%</span>
                </div>
              </td>
              <td className="px-6 py-4 font-medium text-gray-600">{dept.normal > 0 ? (dept.workSum/dept.normal).toFixed(1) : 0}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IndividualTable({ data }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-500 border-b">
          <tr>
            <th className="px-6 py-3">이름</th>
            <th className="px-6 py-3">직급</th>
            <th className="px-6 py-3">날짜</th>
            <th className="px-6 py-3">출근</th>
            <th className="px-6 py-3">퇴근</th>
            <th className="px-6 py-3">근무시간</th>
            <th className="px-6 py-3">상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row: any, idx: number) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-6 py-3 font-bold text-gray-900">{row.NAMEKO}</td>
              <td className="px-6 py-3 text-gray-500">{row.LETEXT}</td>
              <td className="px-6 py-3">{row.TMDATE} <span className={`text-xs ${row.WEEKTX === '토' ? 'text-blue-500' : row.WEEKTX === '일' ? 'text-red-500' : 'text-gray-400'}`}>({row.WEEKTX})</span></td>
              <td className="px-6 py-3">{row.BETIME || '-'}</td>
              <td className="px-6 py-3">{row.EDTIME || '-'}</td>
              <td className="px-6 py-3 font-medium text-blue-600">{row.hours > 0 ? `${row.hours}h` : '-'}</td>
              <td className="px-6 py-3">
                <span className={`px-2 py-1 rounded text-xs ${row.status === '정상' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>{row.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LongWorkTable({ data }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-pink-50 text-pink-800 border-b border-pink-100">
          <tr>
            <th className="px-6 py-3">이름</th>
            <th className="px-6 py-3">부서</th>
            <th className="px-6 py-3">주차</th>
            <th className="px-6 py-3">누적시간</th>
            <th className="px-6 py-3">상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-pink-50">
          {data.map((row: any, idx: number) => (
            <tr key={idx} className="hover:bg-pink-50/50">
              <td className="px-6 py-3 font-bold text-gray-900">{row.name}</td>
              <td className="px-6 py-3 text-gray-500">{row.dept}</td>
              <td className="px-6 py-3">{row.week}</td>
              <td className="px-6 py-3 font-bold text-pink-600">{row.hours.toFixed(1)}h</td>
              <td className="px-6 py-3"><span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs">초과근무</span></td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-400">데이터가 없습니다.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function WeekendTable({ data }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-blue-50 text-blue-800 border-b border-blue-100">
          <tr>
            <th className="px-6 py-3">날짜</th>
            <th className="px-6 py-3">이름</th>
            <th className="px-6 py-3">출근</th>
            <th className="px-6 py-3">퇴근</th>
            <th className="px-6 py-3">근무시간</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">
          {data.map((row: any, idx: number) => (
            <tr key={idx} className="hover:bg-blue-50/30">
              <td className="px-6 py-3 text-gray-600">{row.TMDATE} <span className="text-blue-500 font-bold">({row.WEEKTX})</span></td>
              <td className="px-6 py-3 font-bold text-gray-900">{row.NAMEKO}</td>
              <td className="px-6 py-3">{row.BETIME}</td>
              <td className="px-6 py-3">{row.EDTIME}</td>
              <td className="px-6 py-3 font-bold text-blue-600">{row.hours}h</td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-400">주말 근무 내역이 없습니다.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}