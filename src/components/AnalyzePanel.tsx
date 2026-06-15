import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, Legend } from 'recharts';
import { Activity, Users, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

interface PatientRecord {
  id: string;
  patientName: string;
  totalAmount: number;
  procedureType: string;
  procedureTypes?: string[];
  date: string;
  doctorName: string;
  doctorNames?: string[];
  // ... other fields are omitted for brevity if not used
}

interface AnalyzePanelProps {
  filteredRecords: any[];
  individualEarnings?: Record<string, { 
    name: string; 
    role: string; 
    count: number; 
    amount: number; 
    paidAmount: number; 
    dueAmount: number; 
  }>;
  deptDetails?: Record<string, { label: string; total: number; rows: any[] }>;
  startDateFilter?: string;
  endDateFilter?: string;
  setStartDateFilter?: (date: string) => void;
  setEndDateFilter?: (date: string) => void;
}

// Ensure color palette is engaging
const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6'];

export const AnalyzePanel: React.FC<AnalyzePanelProps> = ({ 
  filteredRecords,
  individualEarnings,
  deptDetails,
  startDateFilter, 
  endDateFilter, 
  setStartDateFilter, 
  setEndDateFilter 
}) => {
  const stats = useMemo(() => {
    const docStats: Record<string, { 
      casesCount: number; 
      totalRevenue: number;
      clinicRevenue: number;
      procedures: Record<string, number>;
      monthlyData: Record<string, { count: number; amount: number }>;
      yearlyData: Record<string, { count: number; amount: number }>;
    }> = {};

    filteredRecords.forEach(rec => {
      const docs = rec.doctorNames && rec.doctorNames.length > 0 ? rec.doctorNames : (rec.doctorName ? [rec.doctorName] : []);
      const procs = rec.procedureTypes && rec.procedureTypes.length > 0 ? rec.procedureTypes : (rec.procedureType ? [rec.procedureType] : []);
      
      const amountPerDoc = rec.totalAmount / (docs.length || 1);
      
      // Calculate clinic revenue generated per doctor for this record
      let clinicShareForRecord = 0;
      if (deptDetails?.clinic?.rows) {
         const clinicRow = deptDetails.clinic.rows.find(r => r.recordId === rec.id);
         if (clinicRow) {
            clinicShareForRecord = clinicRow.calculatedShare || 0;
         }
      }
      const clinicRevenuePerDoc = clinicShareForRecord / (docs.length || 1);

      const month = rec.date.substring(0, 7); // YYYY-MM
      const year = rec.date.substring(0, 4);  // YYYY
      
      docs.forEach((docGroup: string) => {
        const docName = docGroup.trim();
        if (!docName) return;
        
        if (!docStats[docName]) {
          docStats[docName] = { casesCount: 0, totalRevenue: 0, clinicRevenue: 0, procedures: {}, monthlyData: {}, yearlyData: {} };
        }
        
        docStats[docName].casesCount += 1;
        docStats[docName].totalRevenue += amountPerDoc;
        docStats[docName].clinicRevenue += clinicRevenuePerDoc;
        
        if (!docStats[docName].monthlyData[month]) {
          docStats[docName].monthlyData[month] = { count: 0, amount: 0 };
        }
        docStats[docName].monthlyData[month].count += 1;
        docStats[docName].monthlyData[month].amount += amountPerDoc;

        if (!docStats[docName].yearlyData[year]) {
          docStats[docName].yearlyData[year] = { count: 0, amount: 0 };
        }
        docStats[docName].yearlyData[year].count += 1;
        docStats[docName].yearlyData[year].amount += amountPerDoc;
        
        procs.forEach((p: string) => {
           const procName = p.trim();
           docStats[docName].procedures[procName] = (docStats[docName].procedures[procName] || 0) + 1;
        });
      });
    });

    if (individualEarnings) {
      Object.keys(docStats).forEach(docName => {
        const earningsValues = Object.values(individualEarnings) as Array<{name: string; role: string; count: number; amount: number; paidAmount: number; dueAmount: number;}>;
        const matchingEarning = earningsValues.find(
          (earning) => earning.name === docName && earning.role === 'پزیشکی نەشتەرگەری'
        );
        if (matchingEarning) {
          docStats[docName].totalRevenue = matchingEarning.amount;
        } else {
          docStats[docName].totalRevenue = 0; // If they have no earnings from the splits formula
        }
      });
    }

    return docStats;
  }, [filteredRecords, individualEarnings, deptDetails]);

  // Transform data for charts
  const doctorsList = Object.keys(stats);
  
  // 1. Comparison by Cases
  const comparativeCasesData = doctorsList.map(doc => ({
    name: doc,
    cases: stats[doc].casesCount,
    procedures: stats[doc].procedures,
  })).sort((a, b) => b.cases - a.cases);

  // 2. Comparison by Doctor's Own Revenue
  const comparativeDoctorRevenueData = doctorsList.map(doc => ({
    name: doc,
    revenue: Math.round(stats[doc].totalRevenue),
  })).sort((a, b) => b.revenue - a.revenue);

  // 3. Comparison by Clinic Revenue Generated
  const comparativeClinicRevenueData = doctorsList.map(doc => ({
    name: doc,
    clinicRevenue: Math.round(stats[doc].clinicRevenue),
  })).sort((a, b) => b.clinicRevenue - a.clinicRevenue);


  // Generate consistent colors for procedures
  const procedureColors: Record<string, { bg: string, border: string, text: string }> = {};
  const palette = [
    { bg: '#e0e7ff', border: '#8b5cf6', text: '#4338ca' }, // indigo/purple
    { bg: '#dcfce7', border: '#22c55e', text: '#15803d' }, // green
    { bg: '#ffedd5', border: '#f97316', text: '#c2410c' }, // orange
    { bg: '#e0f2fe', border: '#0ea5e9', text: '#0369a1' }, // sky
    { bg: '#fef08a', border: '#eab308', text: '#a16207' }, // yellow
    { bg: '#fce7f3', border: '#ec4899', text: '#be185d' }, // pink
    { bg: '#f3e8ff', border: '#a855f7', text: '#7e22ce' }, // purple
    { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c' }, // red
  ];
  
  let paletteIdx = 0;
  comparativeCasesData.forEach(doc => {
    Object.keys(doc.procedures).forEach(proc => {
       if (!procedureColors[proc]) {
          procedureColors[proc] = palette[paletteIdx % palette.length];
          paletteIdx++;
       }
    });
  });

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    filteredRecords.forEach(record => {
      if (!record.date) return;
      const y = record.date.substring(0, 4);
      if (y) years.add(y);
    });
    return Array.from(years).sort((a,b) => b.localeCompare(a));
  }, [filteredRecords]);

  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [compareMetric, setCompareMetric] = useState<'cases'|'revenue'|'clinicRevenue'|'doctorRevenue'>('cases');

  React.useEffect(() => {
    if (availableYears.length > 0 && selectedYears.length === 0) {
       setSelectedYears([availableYears[0]]);
    }
  }, [availableYears, selectedYears]);

  const periodComparisonDataList = useMemo(() => {
    if (selectedYears.length === 0) return { data: [], isComparing: false };
    
    let basePeriods: string[] = [];
    let comparePeriods: string[] = [];

    const sortedYears = [...selectedYears].sort();
    const sortedMonths = [...selectedMonths].sort();

    if (sortedYears.length === 2) { // 2 years selected
        if (sortedMonths.length > 0) {
            basePeriods = sortedMonths.map(m => `${sortedYears[0]}-${m}`);
            comparePeriods = sortedMonths.map(m => `${sortedYears[1]}-${m}`);
        } else {
            basePeriods = [sortedYears[0]];
            comparePeriods = [sortedYears[1]];
        }
    } else if (sortedYears.length === 1 && sortedMonths.length === 2) { // 1 year, 2 months
        basePeriods = [`${sortedYears[0]}-${sortedMonths[0]}`];
        comparePeriods = [`${sortedYears[0]}-${sortedMonths[1]}`];
    } else if (sortedYears.length === 1 && sortedMonths.length === 0) { // 1 year only
        comparePeriods = [sortedYears[0]];
    } else if (sortedYears.length === 1 && sortedMonths.length === 1) { // 1 year, 1 month
        comparePeriods = [`${sortedYears[0]}-${sortedMonths[0]}`];
    } else { // 3+ years or 3+ months or other combos -> just bundle everything as 'compare' without base
        if (sortedMonths.length > 0) {
            sortedYears.forEach(y => {
                sortedMonths.forEach(m => {
                    comparePeriods.push(`${y}-${m}`);
                });
            });
        } else {
            comparePeriods = [...sortedYears];
        }
    }
    
    const docsMap: Record<string, { baseCases: number, compareCases: number, procedures: Record<string, number>, baseClinic: number, compareClinic: number, baseRawRev: number, compareRawRev: number }> = {};
    doctorsList.forEach(d => {
        docsMap[d] = { baseCases: 0, compareCases: 0, procedures: {}, baseClinic: 0, compareClinic: 0, baseRawRev: 0, compareRawRev: 0 };
    });

    filteredRecords.forEach(record => {
        if (!record.date) return;
        const isBase = basePeriods.some(bp => record.date.startsWith(bp));
        const isCompare = comparePeriods.some(cp => record.date.startsWith(cp));
        if(!isBase && !isCompare) return;

        const amount = Number(record.totalAmount) || 0;
        let docs = record.doctorNames && Array.isArray(record.doctorNames) && record.doctorNames.length > 0 
                     ? record.doctorNames 
                     : (record.doctorName ? [record.doctorName] : []);
        
        const docCount = docs.length || 1;
        const revSplit = amount / docCount;

        // Calculate clinic share for this record
        let clinicShareForRecord = 0;
        if (deptDetails?.clinic?.rows) {
           const clinicRow = deptDetails.clinic.rows.find(r => r.recordId === record.id);
           if (clinicRow) {
              clinicShareForRecord = clinicRow.calculatedShare || 0;
           }
        }
        const clinicRevSplit = clinicShareForRecord / docCount;

        docs.forEach((dStr: string) => {
            const d = dStr.trim();
            if(!docsMap[d]) docsMap[d] = { baseCases: 0, compareCases: 0, procedures: {}, baseClinic: 0, compareClinic: 0, baseRawRev: 0, compareRawRev: 0 };

            if (isBase) {
                docsMap[d].baseCases += 1;
                docsMap[d].baseRawRev += revSplit;
                docsMap[d].baseClinic += clinicRevSplit;
            }
            if (isCompare) {
                docsMap[d].compareCases += 1;
                docsMap[d].compareRawRev += revSplit;
                docsMap[d].compareClinic += clinicRevSplit;
                if (record.procedureType) {
                   const proc = record.procedureType;
                   docsMap[d].procedures[proc] = (docsMap[d].procedures[proc] || 0) + 1;
                }
            }
        });
    });

    return {
       data: Object.keys(docsMap).map(doc => {
          const d = docsMap[doc];
          
          let bVal = d.baseCases;
          let cVal = d.compareCases;

          // Compute doctor ratio based on overall stats
          let ratio = 0;
          if (stats[doc] && stats[doc].totalRevenue > 0) {
              const rawTotal = Number(Object.values(stats[doc].monthlyData).reduce((sum: number, md: any) => sum + (md.amount || 0), 0)) || 1;
              ratio = stats[doc].totalRevenue / rawTotal;
          } else if (stats[doc]) {
              ratio = 0;
          }

          if (compareMetric === 'revenue') {
             bVal = d.baseRawRev;
             cVal = d.compareRawRev;
          } else if (compareMetric === 'clinicRevenue') {
             bVal = d.baseClinic;
             cVal = d.compareClinic;
          } else if (compareMetric === 'doctorRevenue') {
             bVal = d.baseRawRev * ratio;
             cVal = d.compareRawRev * ratio;
          }

          let diff = 0;
          let diffPct = 0;
          if (bVal === 0 && cVal > 0) diffPct = 100;
          else if (bVal > 0) {
              diff = cVal - bVal;
              diffPct = (diff / bVal) * 100;
          }
          return {
             name: doc,
             baseVal: compareMetric !== 'cases' ? Math.round(bVal) : bVal,
             compareVal: compareMetric !== 'cases' ? Math.round(cVal) : cVal,
             diff,
             diffPct: Math.round(diffPct),
             procedures: d.procedures
          };
       }).sort((a,b) => b.compareVal - a.compareVal),
       isComparing: basePeriods.length > 0
    };
  }, [selectedYears, selectedMonths, compareMetric, filteredRecords, doctorsList, stats, deptDetails]);

  return (
    <div className="space-y-6" id="analyze-dashboard">
      {/* Introduction Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl p-6 shadow-sm text-white flex justify-between items-center text-right">
         <div className="space-y-1.5 flex-1 pr-4">
           <h3 className="font-extrabold text-lg flex items-center gap-2 justify-end">
             <Activity className="w-5 h-5" />
             <span>شیکاری پێشکەوتووی داتاکان</span>
           </h3>
           <p className="text-emerald-50 text-sm">بەراوردکاری لە نێوان پزیشکان لە ڕووی ژمارەی کەیس، داهات، و جۆری پرۆسیجەرەکان.</p>
         </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
           <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
           <p className="font-bold">هیچ داتایەک نەدۆزرایەوە بۆ شیکاری لەم ماوەیەدا.</p>
        </div>
      ) : (
        <>
          {/* Period Comparison Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs mb-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-5">
                <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-xl w-full md:w-auto">
                   <button 
                      onClick={() => setCompareMetric('cases')}
                      className={`flex-1 md:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${compareMetric === 'cases' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     ژمارەی کەیس
                   </button>
                   <button 
                      onClick={() => setCompareMetric('revenue')}
                      className={`flex-1 md:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${compareMetric === 'revenue' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     سەرجەم داهات
                   </button>
                   <button 
                      onClick={() => setCompareMetric('clinicRevenue')}
                      className={`flex-1 md:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${compareMetric === 'clinicRevenue' ? 'bg-white shadow-sm text-sky-700' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     داهاتی کلینیک
                   </button>
                   <button 
                      onClick={() => setCompareMetric('doctorRevenue')}
                      className={`flex-1 md:flex-none px-4 py-2 text-xs font-black rounded-lg transition-all ${compareMetric === 'doctorRevenue' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     داهاتی پزیشک
                   </button>
                </div>

                <div className="flex flex-col items-end gap-3 flex-1 w-full md:w-auto">
                   <h4 className="font-extrabold text-slate-800 text-sm flex items-center justify-end gap-2">
                      <span>بەراوردکاری کاتی (نێوان ساڵ و مانگەکان)</span>
                      <Calendar className="w-5 h-5 text-indigo-500" />
                   </h4>
                   <div className="flex flex-col gap-3 justify-end w-full">
                     <div className="flex flex-col gap-2 bg-indigo-50/50 border border-indigo-100 rounded-lg p-3">
                        <div className="text-xs font-bold text-indigo-800 text-right">پاڵاوتن بەپێی کات (بۆ بەراوردکاری، زیاتر لە یەک ساڵ یان مانگ دیاری بکە)</div>
                        <div className="flex items-center gap-2 justify-end flex-wrap">
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
                        <div className="flex items-center gap-1.5 justify-end flex-wrap mt-1">
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
                </div>
             </div>

             {/* Legend for procedures */}
             {compareMetric === 'cases' && (
               <div className="flex flex-wrap gap-2.5 justify-end mb-4">
                  {Object.entries(procedureColors).map(([proc, colors]) => (
                     <div key={proc} className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-600">{proc}</span>
                        <div className="w-2.5 h-2.5 rounded shadow-2xs" style={{ backgroundColor: colors.border }}></div>
                     </div>
                  ))}
               </div>
             )}

             <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
                {periodComparisonDataList?.data?.map((doc, idx) => {
                   const maxVal = Math.max(...periodComparisonDataList.data.map(d => d.compareVal)) || 1;
                   const percentage = (doc.compareVal / maxVal) * 100;
                   const procTotal = Number(Object.values(doc.procedures).reduce((a: any, b: any) => Number(a) + Number(b), 0)) || 1;

                   return (
                      <div key={doc.name} className="relative flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden group hover:border-indigo-200 transition-colors h-[72px]">
                         {/* Right anchored visual background */}
                         <div 
                            className="absolute right-0 top-0 bottom-0 z-0 flex rounded-r-xl overflow-hidden transition-all duration-1000 ease-out rtl flex-row-reverse"
                            style={{ width: `${percentage}%` }}
                         >
                            {compareMetric === 'cases' ? (
                               Object.entries(doc.procedures).map(([procName, countStr]) => {
                                  let count = Number(countStr);
                                  const procPercentage = (count / procTotal) * 100;
                                  const colors = procedureColors[procName] || { bg: '#e0e7ff', border: '#8b5cf6', text: '#4338ca' };
                                  return (
                                     <div 
                                       key={procName}
                                       className="h-full flex items-center flex-col justify-center opacity-85 border-r-4 transition-all"
                                       style={{ 
                                         width: `${procPercentage}%`, 
                                         backgroundColor: colors.bg,
                                         borderRightColor: colors.border
                                       }}
                                       title={`${procName}: ${count}`}
                                     >
                                     </div>
                                  );
                               })
                            ) : (
                               <div className={`h-full w-full border-r-4 ${compareMetric === 'revenue' ? 'bg-emerald-100/70 border-emerald-400' : compareMetric === 'clinicRevenue' ? 'bg-sky-100/70 border-sky-400' : 'bg-amber-100/70 border-amber-400'}`}></div>
                            )}
                         </div>

                         {/* Content over background */}
                         <div className="flex justify-between w-full items-center z-10">
                            {/* Left Side: Rank, Current Value, Name */}
                            <div className="flex items-center gap-4">
                               <span className="font-mono text-sm font-bold text-indigo-600 bg-white shadow-2xs rounded-lg w-8 h-8 flex items-center justify-center border border-indigo-50 shrink-0">
                                  {idx + 1}
                               </span>
                               <span className="font-mono text-2xl font-black text-slate-800 tabular-nums">
                                  {doc.compareVal.toLocaleString()}
                               </span>
                               <div className="font-bold text-slate-700 text-sm md:text-base whitespace-nowrap">
                                  {doc.name}
                               </div>
                            </div>

                            {/* Right Side: Previous Value, Diff */}
                            {periodComparisonDataList?.isComparing && (
                               <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-2">
                                     <span className="font-mono font-bold text-slate-500 bg-white shadow-sm px-2 py-0.5 rounded-md text-[11px] border border-slate-100">
                                        ماوەی پێشوو: {doc.baseVal.toLocaleString()}
                                     </span>
                                  </div>
                                  <div className={`text-xs font-black shadow-sm px-2 py-0.5 rounded-md flex items-center gap-1 border ${doc.diffPct > 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : doc.diffPct < 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-500 bg-slate-50 border-slate-200'}`}>
                                     {doc.diffPct > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : (doc.diffPct < 0 ? <TrendingUp className="w-3.5 h-3.5 rotate-180" /> : <Activity className="w-3.5 h-3.5 opacity-50"/>)}
                                     {doc.diffPct > 0 ? '+' : ''}{doc.diffPct}%
                                  </div>
                               </div>
                            )}
                         </div>
                      </div>
                   );
                })}
             </div>
          </div>

      {/* Date Filter Section */}
      {setStartDateFilter && setEndDateFilter && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs text-right space-y-4">
           <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 justify-end">
              <span>فلتەرکردنی داتاکانی شیکاری بەپێی بەروار</span>
              <Calendar className="w-4.5 h-4.5 text-emerald-600" />
           </h4>
           <div className="flex flex-col sm:flex-row gap-4 items-center justify-end">
              {(startDateFilter || endDateFilter) && (
                 <button
                    onClick={() => {
                       setStartDateFilter('');
                       setEndDateFilter('');
                    }}
                    className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors"
                 >
                    سڕینەوەی بەروار
                 </button>
              )}
              <div className="flex items-center gap-3">
                 <div className="space-y-1.5">
                   <label className="text-[11px] font-black text-slate-700 block pr-1">بۆ بەرواری</label>
                   <input
                     type="date"
                     value={endDateFilter || ''}
                     onChange={(e) => setEndDateFilter(e.target.value)}
                     className="bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl px-4 py-2 text-xs md:text-sm font-bold focus:outline-none transition-all text-slate-800"
                   />
                 </div>
                 <div className="text-slate-400 font-bold self-end mb-2 text-xs">تاوەکو</div>
                 <div className="space-y-1.5">
                   <label className="text-[11px] font-black text-slate-700 block pr-1">لە بەرواری</label>
                   <input
                     type="date"
                     value={startDateFilter || ''}
                     onChange={(e) => setStartDateFilter(e.target.value)}
                     className="bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-emerald-500 rounded-xl px-4 py-2 text-xs md:text-sm font-bold focus:outline-none transition-all text-slate-800"
                   />
                 </div>
              </div>
           </div>
        </div>
      )}

          {/* Individual Doctor Breakdown Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-right">
            {doctorsList.map((doc, idx) => (
              <div key={doc} className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-5 hover:shadow-md transition-shadow">
                 <h4 className="font-extrabold text-slate-900 text-lg border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg text-xs font-black">{stats[doc].casesCount} کەیس</span>
                    <span className="text-right">{doc}</span>
                 </h4>
                 <div className="space-y-4">
                    <div>
                       <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2">شیکاری پرۆسیجەرەکان</span>
                       <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                         {Object.entries(stats[doc].procedures).sort((a,b) => (b[1] as number) - (a[1] as number)).map(([proc, count]) => (
                           <div key={proc} className="flex justify-between items-center bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700">
                             <span className="bg-indigo-50 text-indigo-700 px-2 rounded-md font-mono">{count}</span>
                             <span className="text-right truncate ml-2">{proc}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                 </div>
              </div>
            ))}
          </div>

          {/* Comparative Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Top Doctors by Cases */}
             <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs flex flex-col h-full">
                <h4 className="font-extrabold text-slate-800 text-sm mb-4 flex items-center justify-end gap-2">
                   <span>بەراوردکاری پزیشکان (بەپێی ژمارەی کەیس)</span>
                   <Users className="w-4 h-4 text-indigo-500" />
                </h4>

                {/* Legend for procedures */}
                <div className="flex flex-wrap gap-2.5 justify-end mb-5">
                   {Object.entries(procedureColors).map(([proc, colors]) => (
                      <div key={proc} className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                         <span className="text-[10px] font-bold text-slate-600">{proc}</span>
                         <div className="w-2.5 h-2.5 rounded shadow-2xs" style={{ backgroundColor: colors.border }}></div>
                      </div>
                   ))}
                </div>

                <div className="space-y-3 flex-1">
                  {comparativeCasesData.map((doc, idx) => {
                     const maxCases = Math.max(...comparativeCasesData.map(d => d.cases)) || 1;
                     const percentage = (doc.cases / maxCases) * 100;
                     return (
                        <div key={doc.name} className="relative flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden group hover:border-indigo-200 transition-colors">
                           <div 
                              className="absolute right-0 top-0 bottom-0 z-0 flex rounded-r-xl overflow-hidden transition-all duration-1000 ease-out rtl flex-row-reverse"
                              style={{ width: `${percentage}%` }}
                           >
                              {Object.entries(doc.procedures).map(([procName, countStr], pIdx) => {
                                 let count = Number(countStr);
                                 const procPercentage = (count / doc.cases) * 100;
                                 const colors = procedureColors[procName];
                                 return (
                                    <div 
                                      key={procName}
                                      className="h-full flex items-center flex-col justify-center opacity-85 border-r-4 transition-all"
                                      style={{ 
                                        width: `${procPercentage}%`, 
                                        backgroundColor: colors.bg,
                                        borderRightColor: colors.border
                                      }}
                                      title={`${procName}: ${count}`}
                                    >
                                    </div>
                                 );
                              })}
                           </div>
                           <div className="flex justify-end gap-4 z-10 w-full text-right ml-4">
                              <div className="font-bold text-slate-700 text-sm flex items-center">{doc.name}</div>
                           </div>
                           <div className="z-10 text-left whitespace-nowrap pl-2 flex items-center gap-3">
                              <span className="font-mono text-xl font-black text-slate-800">{doc.cases}</span>
                              <span className="font-mono text-xs font-bold text-indigo-600 bg-white shadow-2xs rounded-md w-6 h-6 flex items-center justify-center">
                                 {idx + 1}
                              </span>
                           </div>
                        </div>
                     );
                  })}
                </div>
             </div>

             {/* Top Doctors by Revenue */}
             <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs flex flex-col h-full">
                <h4 className="font-extrabold text-slate-800 text-sm mb-6 flex items-center justify-end gap-2">
                   <span>بەراوردکاری پزیشکان (بەپێی پشکی پزیشک)</span>
                   <TrendingUp className="w-4 h-4 text-emerald-500" />
                </h4>
                <div className="space-y-3 flex-1">
                  {comparativeDoctorRevenueData.map((doc, idx) => {
                     const maxRev = Math.max(...comparativeDoctorRevenueData.map(d => d.revenue)) || 1;
                     const percentageDoc = (doc.revenue / maxRev) * 100;
                     return (
                        <div key={doc.name} className="relative flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden group hover:border-emerald-200 transition-colors">
                           <div 
                              className="absolute right-0 top-0 bottom-0 bg-emerald-100/60 z-0 transition-all duration-1000 ease-out border-r-4 border-emerald-500"
                              style={{ width: `${percentageDoc}%` }}
                           />
                           <div className="flex justify-end gap-4 z-10 w-full text-right ml-4">
                              <div className="font-bold text-slate-700 text-sm flex items-center">{doc.name}</div>
                           </div>
                           <div className="z-10 text-left whitespace-nowrap pl-2 flex items-center gap-3">
                              <span className="font-mono text-sm font-black text-slate-800">
                                 {doc.revenue > 1000000 ? (doc.revenue / 1000000).toFixed(2) + 'M' : doc.revenue.toLocaleString()}
                              </span>
                              <span className="font-mono text-xs font-bold text-emerald-600 bg-white shadow-2xs rounded-md w-6 h-6 flex items-center justify-center">
                                 {idx + 1}
                              </span>
                           </div>
                        </div>
                     );
                  })}
                </div>
             </div>

             {/* Top Doctors by Clinic Revenue Generated */}
             <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs flex flex-col h-full">
                <h4 className="font-extrabold text-slate-800 text-sm mb-6 flex items-center justify-end gap-2">
                   <span>بەراوردکاری پزیشکان (پشکی سەنتەر لە ڕێگەیەوە)</span>
                   <TrendingUp className="w-4 h-4 text-amber-500" />
                </h4>
                <div className="space-y-3 flex-1">
                  {comparativeClinicRevenueData.map((doc, idx) => {
                     const maxRev = Math.max(...comparativeClinicRevenueData.map(d => d.clinicRevenue)) || 1;
                     const percentageClinic = (doc.clinicRevenue / maxRev) * 100;
                     return (
                        <div key={doc.name} className="relative flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden group hover:border-amber-200 transition-colors">
                           <div 
                              className="absolute right-0 top-0 bottom-0 bg-amber-100/60 z-0 transition-all duration-1000 ease-out border-r-4 border-amber-500"
                              style={{ width: `${percentageClinic}%` }}
                           />
                           <div className="flex justify-end gap-4 z-10 w-full text-right ml-4">
                              <div className="font-bold text-slate-700 text-sm flex items-center">{doc.name}</div>
                           </div>
                           <div className="z-10 text-left whitespace-nowrap pl-2 flex items-center gap-3">
                              <span className="font-mono text-sm font-black text-slate-800">
                                 {doc.clinicRevenue > 1000000 ? (doc.clinicRevenue / 1000000).toFixed(2) + 'M' : doc.clinicRevenue.toLocaleString()}
                              </span>
                              <span className="font-mono text-xs font-bold text-amber-600 bg-white shadow-2xs rounded-md w-6 h-6 flex items-center justify-center">
                                 {idx + 1}
                              </span>
                           </div>
                        </div>
                     );
                  })}
                </div>
             </div>
          </div>


        </>
      )}
    </div>
  );
};
