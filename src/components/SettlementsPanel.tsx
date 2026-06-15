import React, { useState, useMemo } from 'react';
import { syncRecordToCloud } from '../lib/firestore-sync';

import { 
  User, 
  Check, 
  X, 
  Search, 
  Calendar, 
  DollarSign, 
  Coins, 
  Wallet, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PatientRecord {
  id: string;
  patientName: string;
  totalAmount: number;
  procedureType: string;
  procedureTypes?: string[];
  date: string;
  doctorName: string;
  doctorNames?: string[];
  nurses?: string[];
  notes?: string;
  anesthesiaDoctor?: string;
  anesthesiaDoctors?: string[];
  anesthesiaStaff?: string;
  anesthesiaStaffs?: string[];
  customSplitsOverrides?: Record<string, { mode: 'default' | 'manual'; value: number; deductStage?: number; deductType?: 'first' | 'concurrent' }>;
  manualAnesthesiaDocAmount?: number;
  manualAnesthesiaStaffAmount?: number;
  settledShares?: Record<string, boolean>;
}

interface SettlementsPanelProps {
  records: PatientRecord[];
  setRecords: React.Dispatch<React.SetStateAction<PatientRecord[]>>;
  individualEarnings: Record<string, { 
    name: string; 
    role: string; 
    count: number; 
    amount: number; 
    paidAmount: number; 
    dueAmount: number; 
  }>;
  empDetails: Record<string, {
    name: string;
    role: string;
    total: number;
    rows: any[];
  }>;
  deptDetails: any;
  customDetailsBreakdown: any;
  user?: any;
}

export const SettlementsPanel: React.FC<SettlementsPanelProps> = ({ 
  records, 
  setRecords,
  individualEarnings,
  empDetails,
  deptDetails,
  customDetailsBreakdown,
  user
}) => {
  const [selectedEmpKey, setSelectedEmpKey] = useState<string>('');
  const [empSearchQuery, setEmpSearchQuery] = useState<string>('');
  const [caseSearchQuery, setCaseSearchQuery] = useState<string>('');
  const [settleStartDate, setSettleStartDate] = useState<string>('');
  const [settleEndDate, setSettleEndDate] = useState<string>('');
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [filterPaidStatus, setFilterPaidStatus] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [activeRole, setActiveRole] = useState<string | null>(null);

  // Clean and normalize titles helper
  const cleanTitle = (t: string) => {
    if (!t) return '';
    let cleaned = t.trim().replace(/\s+/g, ' ');
    // Normalize casing for Latin terms (e.g., Maintenance vs maintenance vs MAINTENANCE)
    if (/[a-zA-Z]/.test(cleaned)) {
      cleaned = cleaned.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    return cleaned;
  };

  // Generate lumped entities list (Staff + Clinic + Custom)
  const entitiesList = useMemo(() => {
    const list: any[] = [];
    
    // 1. Staff from individualEarnings
    const vals = Object.values(individualEarnings) as any[];
    vals.forEach(emp => {
      list.push({ ...emp });
    });

    // 2. Clinic from deptDetails.clinic
    if (deptDetails?.clinic?.rows && deptDetails.clinic.rows.length > 0) {
       let total = 0, settled = 0, due = 0, count = 0;
       deptDetails.clinic.rows.forEach(r => {
         count++;
         total += r.calculatedShare;
         if (r.isSettled) settled += r.calculatedShare;
         else due += r.calculatedShare;
       });
       list.push({
         name: 'سەنتەر / کلینیک',
         role: 'بەشی کلینیک',
         count,
         amount: total,
         paidAmount: settled,
         dueAmount: due
       });
    }

    // 3. Custom from customDetailsBreakdown
    Object.keys(customDetailsBreakdown || {}).forEach(customName => {
       const cd = customDetailsBreakdown[customName];
       let total = 0, settled = 0, due = 0, count = 0;
       cd.rows.forEach(r => {
         count++;
         total += r.calculatedShare;
         if (r.isSettled) settled += r.calculatedShare;
         else due += r.calculatedShare;
       });
       if (count > 0) {
         list.push({
           name: customName, // Could be recipient if set, or just "پشکی زیادە"
           role: 'بەشە زیادەکان (Custom)',
           count,
           amount: total,
           paidAmount: settled,
           dueAmount: due,
           // Keep track if it has a real recipientName
           isGeneralCustom: true
         });
       }
    });

    return list.sort((a, b) => b.dueAmount - a.dueAmount);
  }, [individualEarnings, deptDetails, customDetailsBreakdown]);

  // Generate grouped roles list
  const rolesList = useMemo(() => {
    const rolesMap: Record<string, { role: string; count: number; totalAmount: number; settledAmount: number; dueAmount: number }> = {};
    
    entitiesList.forEach(emp => {
      if (!rolesMap[emp.role]) {
        rolesMap[emp.role] = { role: emp.role, count: 0, totalAmount: 0, settledAmount: 0, dueAmount: 0 };
      }
      rolesMap[emp.role].count += 1;
      rolesMap[emp.role].totalAmount += emp.amount;
      rolesMap[emp.role].settledAmount += emp.paidAmount;
      rolesMap[emp.role].dueAmount += emp.dueAmount;
    });
    
    return Object.values(rolesMap).sort((a, b) => b.dueAmount - a.dueAmount);
  }, [entitiesList]);

  // Find currently selected employee info
  const selectedEmployee = useMemo(() => {
    if (!selectedEmpKey) return null;
    return entitiesList.find(emp => `${emp.role}_${emp.name}` === selectedEmpKey) || null;
  }, [selectedEmpKey, entitiesList]);

  // Extract all cases/records that the selected employee participated in
  const employeeCases = useMemo(() => {
    if (!selectedEmployee) return [];

    const targetName = selectedEmployee.name;
    const targetRole = selectedEmployee.role;
    let targetKey = `${targetRole}_${targetName}`;

    let sourceRows: any[] = [];

    if (targetRole === 'بەشی کلینیک') {
      sourceRows = deptDetails.clinic?.rows || [];
    } else if (targetRole === 'بەشە زیادەکان (Custom)') {
      sourceRows = customDetailsBreakdown[targetName]?.rows || [];
    } else {
      sourceRows = empDetails[targetKey]?.rows || [];
    }

    return sourceRows
      .filter(row => row.calculatedShare > 0)
      .map(row => {
        let settleKey = `${targetRole}_${row.recipientName || targetName}`;
      if (targetRole === 'بەشی کلینیک') {
         settleKey = 'سەنتەر / کلینیک';
      } else if (targetRole === 'بەشە زیادەکان (Custom)') {
         settleKey = row.recipientName ? `${targetName}_${cleanTitle(row.recipientName)}` : `پشکی زیادە_${targetName}`;
      } else if (row.settleKey) {
         settleKey = row.settleKey;
      }

      return {
        recordId: row.recordId,
        patientName: row.patientName,
        date: row.date,
        procedures: row.procedures,
        grossAmount: row.grossAmount,
        calculatedShare: row.calculatedShare,
        isSettled: row.isSettled === true,
        settleKey
      };
    });
  }, [selectedEmployee, empDetails, deptDetails, customDetailsBreakdown]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    employeeCases.forEach(record => {
      if (!record.date) return;
      const y = record.date.substring(0, 4);
      if (y) years.add(y);
    });
    return Array.from(years).sort((a,b) => b.localeCompare(a));
  }, [employeeCases]);

  // Filter cases based on search and status
  const filteredCases = useMemo(() => {
    return employeeCases.filter(c => {
      const matchesSearch = !caseSearchQuery || 
        c.patientName.toLowerCase().includes(caseSearchQuery.toLowerCase()) ||
        c.procedures.toLowerCase().includes(caseSearchQuery.toLowerCase());
      
      const matchesStatus = 
        filterPaidStatus === 'all' ? true :
        filterPaidStatus === 'paid' ? c.isSettled : !c.isSettled;

      const matchesDate = (!settleStartDate || c.date >= settleStartDate) && 
                          (!settleEndDate || c.date <= settleEndDate);

      let matchesYearMonth = true;
      if (c.date && (selectedYears.length > 0 || selectedMonths.length > 0)) {
         const y = c.date.substring(0, 4);
         const m = c.date.substring(5, 7);
         const yMatch = selectedYears.length === 0 || selectedYears.includes(y);
         const mMatch = selectedMonths.length === 0 || selectedMonths.includes(m);
         matchesYearMonth = yMatch && mMatch;
      }

      return matchesSearch && matchesStatus && matchesDate && matchesYearMonth;
    });
  }, [employeeCases, caseSearchQuery, filterPaidStatus, settleStartDate, settleEndDate, selectedYears, selectedMonths]);

  // Aggregate stats for the selected employee
  const selectedEmpStats = useMemo(() => {
    let total = 0;
    let settled = 0;
    let due = 0;
    let dueInPeriod = 0;

    employeeCases.forEach(c => {
      total += c.calculatedShare;
      if (c.isSettled) settled += c.calculatedShare;
      else {
        due += c.calculatedShare;
        
        // Match dates for the specific period due
        const matchStart = !settleStartDate || c.date >= settleStartDate;
        const matchEnd = !settleEndDate || c.date <= settleEndDate;
        let matchesYearMonth = true;
        if (c.date && (selectedYears.length > 0 || selectedMonths.length > 0)) {
           const y = c.date.substring(0, 4);
           const m = c.date.substring(5, 7);
           const yMatch = selectedYears.length === 0 || selectedYears.includes(y);
           const mMatch = selectedMonths.length === 0 || selectedMonths.includes(m);
           matchesYearMonth = yMatch && mMatch;
        }

        if (matchStart && matchEnd && matchesYearMonth) {
          dueInPeriod++;
        }
      }
    });

    return { total, settled, due, dueInPeriod };
  }, [employeeCases, settleStartDate, settleEndDate, selectedYears, selectedMonths]);

  // Settle a single case share locally
  const handleSettleCase = async (recordId: string, settleStatus: boolean, specificSettleKey: string) => {
    if (!selectedEmployee) return;
    setProcessingId(recordId);

    const originalRecord = records.find(r => r.id === recordId);
    if (!originalRecord) {
      setProcessingId(null);
      return;
    }

    const currentSettledShares = originalRecord.settledShares || {};
    const updatedSettledShares = {
      ...currentSettledShares,
      [specificSettleKey]: settleStatus
    };

    const updatedRecord = {
      ...originalRecord,
      settledShares: updatedSettledShares
    };

    try {
      const updatedRecords = records.map(r => r.id === recordId ? updatedRecord : r);
      setRecords(updatedRecords);
      localStorage.setItem('clinic_patient_records', JSON.stringify(updatedRecords));
      if (user) {
        await syncRecordToCloud(user.uid, updatedRecord);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" dir="rtl" id="settlements-panel-container">
      {/* Sidebar: List of Employees by Role */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-3xs p-5 space-y-4">
        {/* Header */}
        <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-3 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <span>{activeRole ? `شایستەکانی: ${activeRole}` : 'بەشەکانی کلینیک'}</span>
          </div>
          {activeRole && (
            <button
              type="button"
              onClick={() => {
                setActiveRole(null);
                setSelectedEmpKey('');
                setEmpSearchQuery('');
                setCaseSearchQuery('');
              }}
              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-all"
            >
              گەڕانەوە
            </button>
          )}
        </h3>

        {!activeRole ? (
          /* Sub-panel 1: List of Roles/Departments */
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-0.5 pl-1">
            {rolesList.map((r) => {
              let roleColor = 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100';
              if (r.role === 'پزیشکی نەشتەرگەری') roleColor = 'bg-emerald-50 text-emerald-900 border-emerald-100 hover:bg-emerald-100';
              else if (r.role === 'پزیشکی بەنج') roleColor = 'bg-indigo-50 text-indigo-900 border-indigo-100 hover:bg-indigo-100';
              else if (r.role === 'کارمەندی بەنج') roleColor = 'bg-sky-50 text-sky-900 border-sky-100 hover:bg-sky-100';
              else if (r.role === 'کارمەندی نێرس') roleColor = 'bg-purple-50 text-purple-900 border-purple-100 hover:bg-purple-100';
              else if (r.role === 'بەشی کلینیک') roleColor = 'bg-slate-800 text-white border-slate-700 hover:bg-slate-900';
              else if (r.role.includes('بەشە زیادەکان')) roleColor = 'bg-amber-50 text-amber-900 border-amber-100 hover:bg-amber-100';

              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => {
                    setActiveRole(r.role);
                    const firstEmpInRole = entitiesList.find(e => e.role === r.role);
                    if (firstEmpInRole) {
                      setSelectedEmpKey(`${firstEmpInRole.role}_${firstEmpInRole.name}`);
                    }
                  }}
                  className={`w-full text-right p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${roleColor}`}
                >
                  <div className="space-y-1 pr-1 flex-1">
                    <span className="font-black text-sm block">
                      {r.role}
                    </span>
                    <span className="text-[10px] font-bold opacity-80 inline-block">
                      {r.count} کارمەند / دکتۆر
                    </span>
                  </div>

                  <div className="text-left shrink-0 pl-1">
                    <span className="font-extrabold text-xs block opacity-90">
                      {Math.round(r.dueAmount).toLocaleString()} <span className="text-[9px] font-bold">د.ع ماوە</span>
                    </span>
                    <span className="text-[10px] font-semibold opacity-70 block">
                      کۆی گشتی: {Math.round(r.totalAmount).toLocaleString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Sub-panel 2: List of Employees in active role */
          <>
            {/* Small Search for Employees */}
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input 
                type="text"
                placeholder="گەڕان بەدوای ناودا..."
                value={empSearchQuery}
                onChange={(e) => setEmpSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded-lg pr-9 pl-3 py-2 text-xs md:text-sm focus:outline-none transition-all text-slate-800 font-semibold"
              />
            </div>

            {/* Employees Loop */}
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-0.5 pl-1">
              {entitiesList
                .filter(emp => emp.role === activeRole)
                .filter(emp => !empSearchQuery || emp.name.toLowerCase().includes(empSearchQuery.toLowerCase()))
                .map((emp) => {
                  const key = `${emp.role}_${emp.name}`;
                  const isSelected = selectedEmpKey === key;
                  
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedEmpKey(key)}
                      className={`w-full text-right p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center group ${
                        isSelected 
                          ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-500/20' 
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-1 pr-1 min-w-0 flex-1">
                        <span className={`font-black text-xs block transition-colors ${isSelected ? 'text-emerald-900 font-extrabold' : 'text-slate-800'}`}>
                          {emp.name}
                        </span>
                      </div>

                      <div className="text-left shrink-0 pl-1">
                        <span className="font-extrabold text-xs block text-slate-900">
                          {Math.round(emp.dueAmount).toLocaleString()} <span className="text-[9px] text-slate-400 font-bold">د.ع ماوە</span>
                        </span>
                        <span className="text-[9px] text-slate-400 block font-semibold">
                          کۆی گشتی: {Math.round(emp.amount).toLocaleString()}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </>
        )}
      </div>

      {/* Main Panel: Ledgers & Cases of the Selected Employee */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-6">
        {selectedEmployee ? (
          <>
            {/* Header with Stats cards */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  <span>کارنامەی واسڵکردنی شایستە داراییەکانی</span>
                  <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                    {selectedEmployee.name}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-semibold mt-1">تکایە لێرەوە پارەی بەش و نیسبەی کارمەند واسڵ بکە و بڕی ماوەی سفر بکەرەوە</p>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Stat 1: Total Share */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex justify-between items-center text-right shadow-3xs">
                <div className="space-y-1">
                  <span className="text-slate-400 font-bold text-[10px] block">کۆی گشتی شایستەکان (Total Share)</span>
                  <span className="font-mono text-base font-black text-slate-800">
                    {Math.round(selectedEmpStats.total).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 font-extrabold block">دیناری عێراقی</span>
                </div>
                <div className="bg-slate-100 text-slate-500 p-2.5 rounded-lg border border-slate-200">
                  <Coins className="w-5 h-5" />
                </div>
              </div>

              {/* Stat 2: Settled Paid Amount */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex justify-between items-center text-right shadow-3xs">
                <div className="space-y-1">
                  <span className="text-emerald-600 font-bold text-[10px] block">بڕی وەرگیراو / واسڵکراو (Paid)</span>
                  <span className="font-mono text-base font-black text-emerald-700">
                    {Math.round(selectedEmpStats.settled).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-extrabold block">دیناری عێراقی</span>
                </div>
                <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-lg border border-emerald-200">
                  <Check className="w-5 h-5" />
                </div>
              </div>

              {/* Stat 3: Due Remaining Amount */}
              <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 flex justify-between items-center text-right shadow-3xs">
                <div className="space-y-1">
                  <span className="text-rose-600 font-bold text-[10px] block">بڕی ماوەی شایستە (Due)</span>
                  <span className="font-mono text-base font-black text-rose-700">
                    {Math.round(selectedEmpStats.due).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-rose-400 font-extrabold block">پێویستە واسڵ بێت</span>
                </div>
                <div className="bg-rose-100 text-rose-600 p-2.5 rounded-lg border border-rose-200">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Filter controls and Search inside cases */}
            <div className="flex flex-col gap-4 items-stretch justify-between pt-2 w-full">
               <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                 <div className="flex flex-col md:flex-row gap-4 items-center">
                   {/* Paid Status Filter Tabs */}
                   <div className="bg-slate-100 p-1 rounded-xl flex gap-1.5 w-full md:w-auto border border-slate-200">
                     <button
                       onClick={() => setFilterPaidStatus('all')}
                       className={`flex-1 md:flex-initial text-xs font-bold px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                         filterPaidStatus === 'all' ? 'bg-white text-slate-800 shadow-3xs' : 'text-slate-500 hover:text-slate-700'
                       }`}
                     >
                       سەرجەم کەیسەکان
                     </button>
                     <button
                       onClick={() => setFilterPaidStatus('unpaid')}
                       className={`flex-1 md:flex-initial text-xs font-bold px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                         filterPaidStatus === 'unpaid' ? 'bg-rose-600 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-700'
                       }`}
                     >
                       واسڵنەکراو (ماوە)
                     </button>
                     <button
                       onClick={() => setFilterPaidStatus('paid')}
                       className={`flex-1 md:flex-initial text-xs font-bold px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                         filterPaidStatus === 'paid' ? 'bg-emerald-600 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-700'
                       }`}
                     >
                       واسڵکراو (وەرگیراو)
                     </button>
                   </div>
                   
                   {/* Case Search & Date Filter */}
                   <div className="flex items-center gap-2 w-full md:w-auto">
                     <div className="relative flex-1 md:w-48">
                       <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                         <Search className="w-3.5 h-3.5" />
                       </span>
                       <input 
                         type="text"
                         placeholder="گەڕان..."
                         value={caseSearchQuery}
                         onChange={(e) => setCaseSearchQuery(e.target.value)}
                         className="w-full bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded-xl pr-9 pl-3 py-1.5 text-xs focus:outline-none transition-all text-slate-800 font-semibold"
                       />
                     </div>
                     
                     <div className="flex flex-wrap items-center gap-2">
                       <div className="relative flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 w-full sm:w-auto">
                         <span className="text-[10px] text-slate-400 font-bold shrink-0">لە:</span>
                         <input 
                           type="date"
                           value={settleStartDate}
                           onChange={(e) => setSettleStartDate(e.target.value)}
                           className="bg-transparent text-xs focus:outline-none transition-all text-slate-800 font-bold w-full sm:w-auto"
                         />
                       </div>
                       <div className="relative flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 w-full sm:w-auto">
                         <span className="text-[10px] text-slate-400 font-bold shrink-0">تا:</span>
                         <input 
                           type="date"
                           value={settleEndDate}
                           onChange={(e) => setSettleEndDate(e.target.value)}
                           className="bg-transparent text-xs focus:outline-none transition-all text-slate-800 font-bold w-full sm:w-auto"
                         />
                       </div>
                       {(settleStartDate || settleEndDate) && (
                         <button 
                           onClick={() => { setSettleStartDate(''); setSettleEndDate(''); }}
                           className="text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 text-[10px] hover:bg-rose-100 font-bold transition-colors shrink-0"
                         >
                           سڕینەوە
                         </button>
                       )}
                     </div>
                   </div>
                 </div>

                 <div className="text-xs text-slate-400 font-semibold whitespace-nowrap hidden md:block">
                   ({filteredCases.length}) بەشداری
                 </div>
               </div>

               {/* Year and Month filters block */}
               <div className="flex flex-col gap-2 bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 w-full">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full gap-3">
                     <div className="flex items-center gap-2 justify-end lg:order-2 flex-wrap min-w-fit">
                        {availableYears.map(y => {
                           const isSelected = selectedYears.includes(y);
                           return (
                              <button key={y} onClick={() => {
                                 if (isSelected) setSelectedYears(selectedYears.filter(sy => sy !== y));
                                 else setSelectedYears([...selectedYears, y]);
                              }} className={`px-3 py-1 rounded-md text-xs font-bold border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>{y}</button>
                           );
                        })}
                        <span className="text-[11px] font-bold text-slate-500 ml-1">ساڵ:</span>
                     </div>
                     <div className="flex items-center gap-1.5 justify-end lg:order-1 flex-wrap w-full">
                        {Array.from({length: 12}, (_, i) => 12 - i).map(m => {
                           const mStr = m.toString().padStart(2, '0');
                           const isSelected = selectedMonths.includes(mStr);
                           return <button key={mStr} onClick={() => {
                              if (isSelected) setSelectedMonths(selectedMonths.filter(sm => sm !== mStr));
                              else setSelectedMonths([...selectedMonths, mStr]);
                           }} className={`w-8 h-7 flex justify-center items-center rounded-md text-xs font-bold border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>{m}</button>
                        })}
                        <button onClick={() => setSelectedMonths([])} className={`px-3 h-7 flex justify-center items-center rounded-md text-xs font-bold border transition-all ${selectedMonths.length === 0 ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>هەموو</button>
                        <span className="text-[11px] font-bold text-slate-500 ml-1">مانگ:</span>
                     </div>
                  </div>
               </div>

               <div className="text-xs text-slate-400 font-semibold whitespace-nowrap block md:hidden text-center">
                 ({filteredCases.length}) بەشداری
               </div>
            </div>

            {/* Cases Table list */}
            {filteredCases.length === 0 ? (
              <div className="text-center py-20 bg-slate-50/50 border border-slate-150 rounded-2xl">
                <AlertCircle className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-extrabold">تۆمارێک نەدۆزرایەوە بەگوێرەی ئەم فلتەرانە</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
                <table className="w-full text-right border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4 font-black">بەروار و نەخۆش</th>
                      <th className="py-3 px-4 font-black">پڕۆسیجەری پزیشکی</th>
                      <th className="py-3 px-4 font-black text-left">بەش و پارەی شایستە</th>
                      <th className="py-3 px-4 font-black">حاڵەتی پێدان</th>
                      <th className="py-3 px-4 font-black text-center">کردار</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredCases.map((c) => {
                      const isLedgerSettled = c.isSettled;
                      
                      return (
                        <tr 
                          key={c.recordId + "_" + c.settleKey}
                          className={`hover:bg-slate-50/60 transition-colors ${
                            isLedgerSettled ? 'bg-emerald-50/10' : ''
                          }`}
                        >
                          {/* Date and Patient */}
                          <td className="py-3.5 px-4 space-y-1">
                            <span className="font-extrabold text-slate-900 block leading-tight">{c.patientName}</span>
                            <span className="text-[10px] text-slate-400 font-mono block font-bold">{c.date}</span>
                          </td>

                          {/* Procedures */}
                          <td className="py-3.5 px-4 font-semibold text-slate-600 max-w-[200px] leading-relaxed truncate">
                            {c.procedures}
                          </td>

                          {/* Share Amount */}
                          <td className="py-3.5 px-4 text-left font-mono shrink-0">
                            <span className={`font-black text-xs md:text-sm block ${isLedgerSettled ? 'text-emerald-700 underline decoration-emerald-300' : 'text-slate-800'}`}>
                              {Math.round(c.calculatedShare).toLocaleString()}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-bold">دیناری عێراقی</span>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 shrink-0">
                            {isLedgerSettled ? (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-lg">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                <span>پارەی وەرگرتوە</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-lg animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                                <span>شایستەی ماوە (نەدراوە)</span>
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-4 text-center shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSettleCase(c.recordId, !isLedgerSettled, c.settleKey)}
                              disabled={processingId !== null}
                              className={`text-[10px] font-black px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                isLedgerSettled 
                                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600' 
                                  : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white shadow-3xs'
                              }`}
                            >
                              {isLedgerSettled ? 'گەڕاندنەوە بۆ ماوە' : 'واسڵکردن'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24 text-slate-400 font-semibold leading-relaxed">
            تکایە سەرەتا دکتۆر یان کارمەندێک لە لیستەکەی لای ڕاستەوە دیاری بکە بۆ واسڵکردنی پارەکان.
          </div>
        )}
      </div>
    </div>
  );
};
