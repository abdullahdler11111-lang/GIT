import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Calendar, 
  User, 
  Users,
  DollarSign, 
  Wallet,
  Stethoscope, 
  Activity, 
  Filter, 
  TrendingUp, 
  FileSpreadsheet, 
  X, 
  Check,
  AlertCircle,
  FileText,
  Settings,
  Download,
  Percent,
  PieChart,
  Coins,
  PlusCircle,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Printer,
  BarChart as BarChartIcon,
  Star,
  Clock,
  UserCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

import { SettlementsPanel } from './components/SettlementsPanel';
import { AnalyzePanel } from './components/AnalyzePanel';
import { PatientRecord, ProcedureSplit, CustomSplitItem, ConditionalRule, BreakdownDetailRow } from './types';
import { cleanTitle, formatMoneyWithCommas, parseMoneyWithCommas } from './lib/utils';
import { useAuth } from './components/FirebaseProvider';
import { 
  fetchUserData, 
  syncRecordToCloud, 
  deleteRecordFromCloud, 
  syncSettingsToCloud, 
  syncProcedureSplitToCloud
} from './lib/firestore-sync';
import { LogOut, LogIn } from 'lucide-react';

export default function App() {
  const { user, loading, signIn, signOut, authError } = useAuth();
  const [passcode, setPasscode] = useState('');
  
  // Load initial data from localStorage if exists, otherwise load premium sample Kurdish data
  const [records, setRecords] = useState<PatientRecord[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);

  const [procedureSplits, setProcedureSplits] = useState<Record<string, ProcedureSplit>>(() => {
    const saved = localStorage.getItem('clinic_procedure_splits');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  // Fetch data from Firestore on login and perform a smart cloud-local merge
  useEffect(() => {
    if (user) {
      setIsCloudDataLoaded(false);
      const loadCloudData = async () => {
        setIsSyncing(true);
        try {
          const data = await fetchUserData(user.uid);
          if (data) {
            // 1. Direct secure database-first load for records
            const finalRecordsList = data.records || [];

            // Update both states and local storage
            setRecords(finalRecordsList);
            localStorage.setItem('clinic_patient_records', JSON.stringify(finalRecordsList));

            // 2. Settings backup & load
            if (data.userSettings) {
              const s = data.userSettings;
              if (s.doctors) setSavedDoctors(s.doctors);
              if (s.nurses) setSavedNurses(s.nurses);
              if (s.anesthesiaDoctors) setSavedAnesthesiaDoctors(s.anesthesiaDoctors);
              if (s.anesthesiaStaff) setSavedAnesthesiaStaff(s.anesthesiaStaff);
              if (s.procedureTypes) setSavedProcedures(s.procedureTypes);
              if (s.deactivatedItems) setDeactivatedItems(s.deactivatedItems);
              if (s.savedCustomSplitNames) setSavedCustomSplitNames(s.savedCustomSplitNames);
            } else {
              // Cloud has no settings, backup current local settings to cloud!
              try {
                const lp = localStorage.getItem('clinic_list_procedures');
                const ld = localStorage.getItem('clinic_list_doctors');
                const ln = localStorage.getItem('clinic_list_nurses');
                const la = localStorage.getItem('clinic_list_anesthesia_doctors');
                const ls = localStorage.getItem('clinic_list_anesthesia_staff');
                const di = localStorage.getItem('clinic_list_deactivated');
                const cs = localStorage.getItem('clinic_saved_custom_split_names');

                const currentProcedures = lp ? JSON.parse(lp) : null;
                const currentDoctors = ld ? JSON.parse(ld) : null;
                const currentNurses = ln ? JSON.parse(ln) : null;
                const currentAnesDocs = la ? JSON.parse(la) : null;
                const currentAnesStaff = ls ? JSON.parse(ls) : null;
                const currentDeactivated = di ? JSON.parse(di) : null;
                const currentCustomNames = cs ? JSON.parse(cs) : null;

                await syncSettingsToCloud(user.uid, {
                  savedProcedures: currentProcedures || undefined,
                  savedDoctors: currentDoctors || undefined,
                  savedNurses: currentNurses || undefined,
                  savedAnesthesiaDoctors: currentAnesDocs || undefined,
                  savedAnesthesiaStaff: currentAnesStaff || undefined,
                  deactivatedItems: currentDeactivated || undefined,
                  savedCustomSplitNames: currentCustomNames || undefined
                });
              } catch (err) {
                console.error("Local settings read error for backup:", err);
              }
            }

            // 3. Splits load
            if (data.splits) {
              setProcedureSplits(data.splits);
            }
          }
        } catch (error) {
          console.error("Error loading/merging cloud data:", error);
        } finally {
          setIsCloudDataLoaded(true);
          setIsSyncing(false);
        }
      };
      loadCloudData();
    } else {
      setIsCloudDataLoaded(false);
      // If no user, fall back to local storage or defaults
      const savedRecords = localStorage.getItem('clinic_patient_records');
      if (savedRecords) {
        try {
          const parsed = JSON.parse(savedRecords);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecords(parsed);
          } else {
            loadDefaultData();
          }
        } catch (e) {
          loadDefaultData();
        }
      } else {
        loadDefaultData();
      }
    }
  }, [user]);

  useEffect(() => {
    // Cloud sync logic moved to individual actions or a centralized debounced effect if needed
  }, [user, records, procedureSplits]);

  const loadDefaultData = () => {
    const initialList = [
      {
        id: '1',
        patientName: 'کامەران مستەفا',
        totalAmount: 250000,
        procedureType: 'چاندنی ددان (Dental Implant)',
        date: '2026-06-08',
        doctorName: 'د. پێشەنگ عەلی'
      },
      {
        id: '2',
        patientName: 'سازان ئەحمەد',
        totalAmount: 180000,
        procedureType: 'پڕکردنەوەی ددان (Composite Filling)',
        date: '2026-06-09',
        doctorName: 'د. لەرێ خالید'
      },
      {
        id: '3',
        patientName: 'ژيار عومەر',
        totalAmount: 1200000,
        procedureType: 'نەشتەرگەری لووت (Rhinoplasty)',
        date: '2026-06-09',
        doctorName: 'د. پێشەنگ عەلی'
      }
    ];
    setRecords(initialList);
    localStorage.setItem('clinic_patient_records', JSON.stringify(initialList));
  };

  // Form states
  const [patientName, setPatientName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualAnesthesiaDocAmount, setManualAnesthesiaDocAmount] = useState('');
  const [manualAnesthesiaStaffAmount, setManualAnesthesiaStaffAmount] = useState('');

  // Saved list of procedures with default fallback and seeding from current records
  const [savedProcedures, setSavedProcedures] = useState<string[]>(() => {
    const saved = localStorage.getItem('clinic_list_procedures');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    
    // Seed from default suggestions first, plus any custom items in preexisting records
    const baseProcedures = [
      'چاندنی ددان (Dental Implant)',
      'پڕکردنەوەی ددان (Composite Filling)',
      'نەشتەرگەری لووت (Rhinoplasty)',
      'سپی کردنەوەی ددان (Teeth Whitening)',
      'سۆنار (Ultrasound)'
    ];
    const savedRecordsStr = localStorage.getItem('clinic_patient_records');
    if (savedRecordsStr) {
      try {
        const recordsObj = JSON.parse(savedRecordsStr);
        if (Array.isArray(recordsObj)) {
          const recProcs = recordsObj.map((r: any) => r.procedureType).filter(Boolean);
          return Array.from(new Set([...baseProcedures, ...recProcs]));
        }
      } catch(e){}
    }
    return baseProcedures;
  });

  // Saved list of doctors with default fallback and seeding from current records
  const [savedDoctors, setSavedDoctors] = useState<string[]>(() => {
    const saved = localStorage.getItem('clinic_list_doctors');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }

    const baseDoctors = ['د. پێشەنگ عەلی', 'د. لەرێ خالید', 'د. هێمن دانا', 'د. بڕوا بەکر'];
    const savedRecordsStr = localStorage.getItem('clinic_patient_records');
    if (savedRecordsStr) {
      try {
        const recordsObj = JSON.parse(savedRecordsStr);
        if (Array.isArray(recordsObj)) {
          const recDocs = recordsObj.map((r: any) => r.doctorName).filter(Boolean);
          return Array.from(new Set([...baseDoctors, ...recDocs]));
        }
      } catch(e){}
    }
    return baseDoctors;
  });

  // Saved list of nurses with default fallback and seeding from current records
  const [savedNurses, setSavedNurses] = useState<string[]>(() => {
    const saved = localStorage.getItem('clinic_list_nurses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(n => cleanTitle(n));
      } catch (e) {}
    }

    const baseNurses = ['لانە سیروان', 'ئەژین دانا', 'شادی عومەر', 'دیار هەڵگورد'];
    const savedRecordsStr = localStorage.getItem('clinic_patient_records');
    if (savedRecordsStr) {
      try {
        const recordsObj = JSON.parse(savedRecordsStr);
        if (Array.isArray(recordsObj)) {
          const recNurses: string[] = [];
          recordsObj.forEach((r: any) => {
            if (Array.isArray(r.nurses)) {
              recNurses.push(...r.nurses.map(cleanTitle));
            } else if (typeof r.nurses === 'string') {
              recNurses.push(cleanTitle(r.nurses));
            }
          });
          if (recNurses.length > 0) {
            return Array.from(new Set([...baseNurses, ...recNurses]));
          }
        }
      } catch(e){}
    }
    return baseNurses;
  });

  // Saved list of anesthesia doctors with default fallback and seeding from current records
  const [savedAnesthesiaDoctors, setSavedAnesthesiaDoctors] = useState<string[]>(() => {
    const saved = localStorage.getItem('clinic_list_anesthesia_doctors');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(d => cleanTitle(d));
      } catch (e) {}
    }

    const baseAnesDocs = ['د. دیدار عوسمان', 'د. شوان سەرکەوت', 'د. هاوڕێ عومەر'];
    const savedRecordsStr = localStorage.getItem('clinic_patient_records');
    if (savedRecordsStr) {
      try {
        const recordsObj = JSON.parse(savedRecordsStr);
        if (Array.isArray(recordsObj)) {
          const recAnesDocs = recordsObj.map((r: any) => cleanTitle(r.anesthesiaDoctor)).filter(Boolean);
          return Array.from(new Set([...baseAnesDocs, ...recAnesDocs]));
        }
      } catch(e){}
    }
    return baseAnesDocs;
  });

  // Saved list of anesthesia staff with default fallback and seeding from current records
  const [savedAnesthesiaStaff, setSavedAnesthesiaStaff] = useState<string[]>(() => {
    const saved = localStorage.getItem('clinic_list_anesthesia_staff');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(s => cleanTitle(s));
      } catch (e) {}
    }

    const baseAnesStaff = ['هێمن عەلی', 'سۆران ئەحمەد', 'پەیمان سالار'];
    const savedRecordsStr = localStorage.getItem('clinic_patient_records');
    if (savedRecordsStr) {
      try {
        const recordsObj = JSON.parse(savedRecordsStr);
        if (Array.isArray(recordsObj)) {
          const recAnesStaff = recordsObj.map((r: any) => cleanTitle(r.anesthesiaStaff)).filter(Boolean);
          return Array.from(new Set([...baseAnesStaff, ...recAnesStaff]));
        }
      } catch(e){}
    }
    return baseAnesStaff;
  });

  // List storage synchronization is unified into the Firestore coordinator below

  // Deactivated items/presets
  const [deactivatedItems, setDeactivatedItems] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('clinic_list_deactivated');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            procedure: parsed.procedure || [],
            doctor: parsed.doctor || [],
            anesthesiaDoctor: parsed.anesthesiaDoctor || [],
            anesthesiaStaff: parsed.anesthesiaStaff || [],
            nurse: parsed.nurse || []
          };
        }
      } catch (e) {}
    }
    return {
      procedure: [],
      doctor: [],
      anesthesiaDoctor: [],
      anesthesiaStaff: [],
      nurse: []
    };
  });

  // Deactivated items persistence is managed by the unified cloud coordinator

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'records' | 'distribution' | 'reports' | 'analyze' | 'settlements'>('records');
  const [activeReportDetail, setActiveReportDetail] = useState<{
    type: 'department' | 'employee' | 'custom';
    id: string;
    label: string;
  } | null>(null);
  const [detailSearchQuery, setDetailSearchQuery] = useState('');
  const [reportDateMode, setReportDateMode] = useState<'range' | 'single'>('range');
  const [newSavedRecord, setNewSavedRecord] = useState<PatientRecord | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [popupsBlocked, setPopupsBlocked] = useState<boolean>(false);
  
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const [tableRowsPerPage, setTableRowsPerPage] = useState(10);

  // Procedure splits persistence is managed by the unified cloud coordinator

  const getSplitForProcedure = (procType: string): ProcedureSplit => {
    const cleanType = (procType || '').trim().toLowerCase();
    const matchedKey = Object.keys(procedureSplits).find(k => k.trim().toLowerCase() === cleanType);
    const existingSplit = matchedKey ? procedureSplits[matchedKey] : undefined;

    if (existingSplit) {
      return {
        customSplits: [],
        staffPercents: {},
        conditionalRules: [],
        surgeonDeductType: 'concurrent',
        anesthesiaDocDeductType: 'concurrent',
        anesthesiaStaffDeductType: 'concurrent',
        nursesDeductType: 'concurrent',
        clinicDeductType: 'concurrent',
        surgeonDeductStage: undefined,
        anesthesiaDocDeductStage: undefined,
        anesthesiaStaffDeductStage: undefined,
        nursesDeductStage: undefined,
        clinicDeductStage: undefined,
        ...existingSplit
      };
    }
    // Default values
    return {
      procedureType: procType,
      surgeonPercent: 40,
      anesthesiaDocPercent: 15,
      anesthesiaStaffPercent: 10,
      nursesPercent: 10,
      clinicPercent: 25,
      customSplits: [],
      staffPercents: {},
      conditionalRules: [],
      surgeonDeductType: 'concurrent',
      anesthesiaDocDeductType: 'concurrent',
      anesthesiaStaffDeductType: 'concurrent',
      nursesDeductType: 'concurrent',
      clinicDeductType: 'concurrent',
      surgeonDeductStage: undefined,
      anesthesiaDocDeductStage: undefined,
      anesthesiaStaffDeductStage: undefined,
      nursesDeductStage: undefined,
      clinicDeductStage: undefined,
    };
  };

  const getRuleConflicts = (procName: string, selectedStaff: string, selectedType: 'present' | 'absent' | 'feedback_hours' | 'cad' | 'responsibility', currentRulePercent: number, applyToOthers: boolean): { type: 'critical' | 'warning'; message: string }[] => {
    const conflicts: { type: 'critical' | 'warning'; message: string }[] = [];
    if (selectedType === 'feedback_hours' || selectedType === 'cad' || selectedType === 'responsibility') return conflicts;
    if (!selectedStaff) return conflicts;

    const currentSplit = getSplitForProcedure(procName);
    const currentRules = currentSplit.conditionalRules || [];

    const cleanSelectedStaff = cleanTitle(selectedStaff);

    // 1. Direct duplicate or same condition staff with same condition type
    const directOverlapRule = currentRules.find(r => cleanTitle(r.conditionStaff) === cleanSelectedStaff && r.conditionType === selectedType);
    if (directOverlapRule) {
      if (directOverlapRule.rulePercent === currentRulePercent) {
        conflicts.push({
          type: 'critical',
          message: `⚠️ ئەم مەرجە پێشتر تۆمارکراوە: کاتێک "${selectedStaff}" ${selectedType === 'present' ? 'ئامادەبێت' : 'ئامادەنەبێت'}، بڕەکەی دەبێتە %${directOverlapRule.rulePercent}.`
        });
      } else {
        conflicts.push({
          type: 'critical',
          message: `⚠️ دژبەریی ڕاستەوخۆ: مەرجێک پێشتر تۆمارکراوە بۆ "${selectedStaff}" لە کاتی ${selectedType === 'present' ? 'ئامادەبوونیدا' : 'نەبوونیدا'} کە نیسبەکەی دەکاتە %${directOverlapRule.rulePercent}. ناتوانیت لە هەمان کاتدا مەرجێکی تر دابنێیت کە نیسبەکەی بکاتە %${currentRulePercent}!`
        });
      }
    }

    // 2. Overlapping applyToOthers conflict (Same Role Team Rule Conflict)
    if (selectedType === 'present') {
      currentRules.forEach(otherRule => {
        if (otherRule.conditionType === 'present' && cleanTitle(otherRule.conditionStaff) !== cleanSelectedStaff) {
          const otherStaffClean = cleanTitle(otherRule.conditionStaff);
          
          const isSameRoleGroup = (
            (savedDoctors.map(cleanTitle).includes(cleanSelectedStaff) && savedDoctors.map(cleanTitle).includes(otherStaffClean)) ||
            (savedAnesthesiaDoctors.map(cleanTitle).includes(cleanSelectedStaff) && savedAnesthesiaDoctors.map(cleanTitle).includes(otherStaffClean)) ||
            (savedAnesthesiaStaff.map(cleanTitle).includes(cleanSelectedStaff) && savedAnesthesiaStaff.map(cleanTitle).includes(otherStaffClean)) ||
            (savedNurses.map(cleanTitle).includes(cleanSelectedStaff) && savedNurses.map(cleanTitle).includes(otherStaffClean))
          );

          if (isSameRoleGroup) {
            if (applyToOthers || otherRule.applyToOthers) {
              conflicts.push({
                type: 'warning',
                message: `⚠️ ئاگاداری دەربارەی تێکەڵبوون: مەرجێکی تری چالاک هەیە بۆ [${otherRule.conditionStaff}] کاتێک ئامادە دەبێت. چونکە مەرجەکان کاریگەرییان لەسەر هاوپیشەکانی تر هەیە، ئەگەر هەردوو [${selectedStaff}] و [${otherRule.conditionStaff}] پێکەوە لە یەک کاتدا لە دابەشکارییەکەدا ئامادەبن، ڕێژەکانیان دژ دەبێت و تێکەڵ دەبێت.`
              });
            }
          }
        }
      });
    }

    return conflicts;
  };

  const [activeSettingsTab, setActiveSettingsTab] = useState<'procedure' | 'doctor' | 'anesthesiaDoctor' | 'anesthesiaStaff' | 'nurse'>('procedure');
  const [settingsNewItemInput, setSettingsNewItemInput] = useState('');

  // Helper to check if item is active
  const isItemActive = (category: string, name: string) => {
    const list = deactivatedItems[category] || [];
    return !list.includes(name);
  };

  // Helper to toggle active state
  const toggleItemActive = (category: string, name: string) => {
    setDeactivatedItems(prev => {
      const currentList = prev[category] || [];
      const updatedList = currentList.includes(name)
        ? currentList.filter(item => item !== name)
        : [...currentList, name];
      return {
        ...prev,
        [category]: updatedList
      };
    });
  };

  // Helper to delete an item
  const handleDeletePresetItem = (category: string, name: string) => {
    setPresetToDelete({ category, name });
  };

  const confirmDeletePresetItem = () => {
    if (!presetToDelete) return;
    const { category, name } = presetToDelete;

    if (category === 'procedure') {
      setSavedProcedures(prev => prev.filter(item => item !== name));
      setSelectedProcedures(prev => prev.filter(item => item !== name));
    } else if (category === 'doctor') {
      setSavedDoctors(prev => prev.filter(item => item !== name));
      setSelectedDoctorsForm(prev => prev.filter(item => item !== name));
    } else if (category === 'anesthesiaDoctor') {
      setSavedAnesthesiaDoctors(prev => prev.filter(item => item !== name));
      setSelectedAnesthesiaDoctorsForm(prev => prev.filter(item => item !== name));
    } else if (category === 'anesthesiaStaff') {
      setSavedAnesthesiaStaff(prev => prev.filter(item => item !== name));
      setSelectedAnesthesiaStaffsForm(prev => prev.filter(item => item !== name));
    } else if (category === 'nurse') {
      setSavedNurses(prev => prev.filter(item => item !== name));
      setSelectedNurses(prev => prev.filter(item => item !== name));
    }

    // Clean up from deactivated list too
    setDeactivatedItems(prev => {
      const currentList = prev[category] || [];
      return {
        ...prev,
        [category]: currentList.filter(item => item !== name)
      };
    });

    setPresetToDelete(null);
  };
  
  const handleSavePresetEdit = (category: string, oldName: string, newName: string) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName || trimmedNewName === oldName) {
      setEditingPreset(null);
      return;
    }

    const cleanOld = cleanTitle(oldName);
    const cleanNew = cleanTitle(trimmedNewName);

    // Update preset lists and active form selections
    if (category === 'procedure') {
      setSavedProcedures(prev => prev.map(item => item === oldName ? trimmedNewName : item));
      setSelectedProcedures(prev => prev.map(item => item === oldName ? trimmedNewName : item));
      
      // Update procedure splits config
      setProcedureSplits(prev => {
        const updated = { ...prev };
        if (updated[oldName]) {
          updated[trimmedNewName] = { 
            ...updated[oldName], 
            procedureType: trimmedNewName 
          };
          delete updated[oldName];
        }
        return updated;
      });
    } else if (category === 'doctor') {
      setSavedDoctors(prev => prev.map(item => item === oldName ? trimmedNewName : item));
      setSelectedDoctorsForm(prev => prev.map(item => item === oldName ? trimmedNewName : item));
    } else if (category === 'anesthesiaDoctor') {
      setSavedAnesthesiaDoctors(prev => prev.map(item => item === oldName ? cleanNew : item));
      setSelectedAnesthesiaDoctorsForm(prev => prev.map(item => item === oldName ? cleanNew : item));
    } else if (category === 'anesthesiaStaff') {
      setSavedAnesthesiaStaff(prev => prev.map(item => item === oldName ? cleanNew : item));
      setSelectedAnesthesiaStaffsForm(prev => prev.map(item => item === oldName ? cleanNew : item));
    } else if (category === 'nurse') {
      setSavedNurses(prev => prev.map(item => item === oldName ? cleanNew : item));
      setSelectedNurses(prev => prev.map(item => item === oldName ? cleanNew : item));
    }

    // Also update staffPercents and rules inside procedureSplits if a staff name was edited
    if (category !== 'procedure') {
      setProcedureSplits(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(procKey => {
          const split = { ...updated[procKey] };
          let changed = false;
          
          if (split.staffPercents) {
            const percents = { ...split.staffPercents };
            if (percents[cleanOld] !== undefined) {
              percents[cleanNew] = percents[cleanOld];
              delete percents[cleanOld];
              split.staffPercents = percents;
              changed = true;
            }
          }
          
          if (split.conditionalRules) {
            split.conditionalRules = split.conditionalRules.map(rule => {
              const r = { ...rule };
              let ruleChanged = false;
              if (r.conditionStaff === cleanOld) {
                r.conditionStaff = cleanNew;
                ruleChanged = true;
              }
              if (r.targetStaff === cleanOld) {
                r.targetStaff = cleanNew;
                ruleChanged = true;
              }
              if (r.othersCustomPercents) {
                const customP = { ...r.othersCustomPercents };
                if (customP[cleanOld] !== undefined) {
                  customP[cleanNew] = customP[cleanOld];
                  delete customP[cleanOld];
                  r.othersCustomPercents = customP;
                  ruleChanged = true;
                }
              }
              if (ruleChanged) changed = true;
              return r;
            });
          }

          if (changed) {
            updated[procKey] = split;
          }
        });
        return updated;
      });
    }

    // Update deactivation status list
    setDeactivatedItems(prev => {
      const currentList = prev[category] || [];
      return {
        ...prev,
        [category]: currentList.map(item => item === oldName ? trimmedNewName : item)
      };
    });

    setEditingPreset(null);
  };

  const handleAddFromSettings = (category: string) => {
    const trimmed = settingsNewItemInput.trim();
    if (!trimmed) return;
    
    if (category === 'procedure') {
      if (!savedProcedures.includes(trimmed)) setSavedProcedures(prev => [...prev, trimmed]);
    } else if (category === 'doctor') {
      if (!savedDoctors.includes(trimmed)) setSavedDoctors(prev => [...prev, trimmed]);
    } else if (category === 'anesthesiaDoctor') {
      const cleaned = cleanTitle(trimmed);
      if (!savedAnesthesiaDoctors.includes(cleaned)) setSavedAnesthesiaDoctors(prev => [...prev, cleaned]);
    } else if (category === 'anesthesiaStaff') {
      const cleaned = cleanTitle(trimmed);
      if (!savedAnesthesiaStaff.includes(cleaned)) setSavedAnesthesiaStaff(prev => [...prev, cleaned]);
    } else if (category === 'nurse') {
      const cleaned = cleanTitle(trimmed);
      if (!savedNurses.includes(cleaned)) setSavedNurses(prev => [...prev, cleaned]);
    }
    setSettingsNewItemInput('');
  };

  // Current selections
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [customProcedureInput, setCustomProcedureInput] = useState('');
  const [showCustomProcedureField, setShowCustomProcedureField] = useState(false);

  const [selectedDoctorsForm, setSelectedDoctorsForm] = useState<string[]>([]);
  const [customDoctorInput, setCustomDoctorInput] = useState('');
  const [showCustomDoctorField, setShowCustomDoctorField] = useState(false);

  const [selectedNurses, setSelectedNurses] = useState<string[]>([]);
  const [customNurseInput, setCustomNurseInput] = useState('');
  const [showCustomNurseField, setShowCustomNurseField] = useState(false);

  const [selectedAnesthesiaDoctorsForm, setSelectedAnesthesiaDoctorsForm] = useState<string[]>([]);
  const [customAnesthesiaDoctorInput, setCustomAnesthesiaDoctorInput] = useState('');
  const [showCustomAnesthesiaDoctorField, setShowCustomAnesthesiaDoctorField] = useState(false);

  const [selectedAnesthesiaStaffsForm, setSelectedAnesthesiaStaffsForm] = useState<string[]>([]);
  const [customAnesthesiaStaffInput, setCustomAnesthesiaStaffInput] = useState('');
  const [showCustomAnesthesiaStaffField, setShowCustomAnesthesiaStaffField] = useState(false);

  const [notes, setNotes] = useState('');
  const [customSplitsOverrides, setCustomSplitsOverrides] = useState<Record<string, { mode: 'default' | 'manual'; value: number; deductStage?: number; deductType?: 'first' | 'concurrent' }>>({});

  // Toggle helpers for multi-select
  const toggleProcedureSelection = (procName: string) => {
    if (selectedProcedures.includes(procName)) {
      setSelectedProcedures(prev => prev.filter(p => p !== procName));
    } else {
      setSelectedProcedures(prev => [...prev, procName]);
    }
  };

  const toggleDoctorSelection = (docName: string) => {
    if (selectedDoctorsForm.includes(docName)) {
      setSelectedDoctorsForm(prev => prev.filter(d => d !== docName));
    } else {
      setSelectedDoctorsForm(prev => [...prev, docName]);
    }
  };

  const toggleAnesthesiaDoctorSelection = (docName: string) => {
    if (selectedAnesthesiaDoctorsForm.includes(docName)) {
      setSelectedAnesthesiaDoctorsForm(prev => prev.filter(d => d !== docName));
    } else {
      setSelectedAnesthesiaDoctorsForm(prev => [...prev, docName]);
    }
  };

  const toggleAnesthesiaStaffSelection = (staffName: string) => {
    if (selectedAnesthesiaStaffsForm.includes(staffName)) {
      setSelectedAnesthesiaStaffsForm(prev => prev.filter(s => s !== staffName));
    } else {
      setSelectedAnesthesiaStaffsForm(prev => [...prev, staffName]);
    }
  };

  // Custom add helpers
  const handleAddCustomProcedure = () => {
    const trimmed = customProcedureInput.trim();
    if (!trimmed) return;
    if (!savedProcedures.includes(trimmed)) {
      setSavedProcedures(prev => [...prev, trimmed]);
    }
    if (!selectedProcedures.includes(trimmed)) {
      setSelectedProcedures(prev => [...prev, trimmed]);
    }
    setCustomProcedureInput('');
    setShowCustomProcedureField(false);
  };

  const handleAddCustomDoctor = () => {
    const trimmed = customDoctorInput.trim();
    if (!trimmed) return;
    if (!savedDoctors.includes(trimmed)) {
      setSavedDoctors(prev => [...prev, trimmed]);
    }
    if (!selectedDoctorsForm.includes(trimmed)) {
      setSelectedDoctorsForm(prev => [...prev, trimmed]);
    }
    setCustomDoctorInput('');
    setShowCustomDoctorField(false);
  };

  const handleAddCustomAnesthesiaDoctor = () => {
    const trimmed = cleanTitle(customAnesthesiaDoctorInput.trim());
    if (!trimmed) return;
    if (!savedAnesthesiaDoctors.includes(trimmed)) {
      setSavedAnesthesiaDoctors(prev => [...prev, trimmed]);
    }
    if (!selectedAnesthesiaDoctorsForm.includes(trimmed)) {
      setSelectedAnesthesiaDoctorsForm(prev => [...prev, trimmed]);
    }
    setCustomAnesthesiaDoctorInput('');
    setShowCustomAnesthesiaDoctorField(false);
  };

  const handleAddCustomAnesthesiaStaff = () => {
    const trimmed = cleanTitle(customAnesthesiaStaffInput.trim());
    if (!trimmed) return;
    if (!savedAnesthesiaStaff.includes(trimmed)) {
      setSavedAnesthesiaStaff(prev => [...prev, trimmed]);
    }
    if (!selectedAnesthesiaStaffsForm.includes(trimmed)) {
      setSelectedAnesthesiaStaffsForm(prev => [...prev, trimmed]);
    }
    setCustomAnesthesiaStaffInput('');
    setShowCustomAnesthesiaStaffField(false);
  };

  // App operations state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<any | null>(null);
  const [presetToDelete, setPresetToDelete] = useState<{ category: string, name: string } | null>(null);
  const [editingPreset, setEditingPreset] = useState<{ category: string, oldName: string, currentEditingValue: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientNameSearchQuery, setPatientNameSearchQuery] = useState('');
  const [addingCustomToProc, setAddingCustomToProc] = useState<string | null>(null);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomPercent, setNewCustomPercent] = useState(5);
  const [newCustomRecipient, setNewCustomRecipient] = useState('');
  const [newCustomValueType, setNewCustomValueType] = useState<'percent' | 'fixed'>('percent');
  const [newCustomDeductType, setNewCustomDeductType] = useState<'concurrent' | 'first'>('concurrent');
  const [newCustomDeductStage, setNewCustomDeductStage] = useState<number>(0);

  const [savedCustomSplitNames, setSavedCustomSplitNames] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('clinic_saved_custom_split_names');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return ['یاریدەدەر', 'سەنتەر / باج', 'تێچووی ئامێر', 'Maintenance', 'چاودێر'];
  });

  const [isInitialSettingsLoaded, setIsInitialSettingsLoaded] = useState(true);
  const [isCloudDataLoaded, setIsCloudDataLoaded] = useState(false);

  // Sync changes to clinic settings back to Local Storage (debounce 500ms)
  useEffect(() => {
    if (!isInitialSettingsLoaded) return;

    // Safety guard: if a user is logged in, do not synchronize settings state to local storage or cloud
    // until we have successfully completed our initial data load from Firestore.
    // This prevents local empty default structures from overwriting the cloud's real pre-existing data!
    if (user && !isCloudDataLoaded) return;

    const saveSettings = () => {
      try {
        localStorage.setItem('clinic_list_procedures', JSON.stringify(savedProcedures));
        localStorage.setItem('clinic_list_doctors', JSON.stringify(savedDoctors));
        localStorage.setItem('clinic_list_nurses', JSON.stringify(savedNurses));
        localStorage.setItem('clinic_list_anesthesia_doctors', JSON.stringify(savedAnesthesiaDoctors));
        localStorage.setItem('clinic_list_anesthesia_staff', JSON.stringify(savedAnesthesiaStaff));
        localStorage.setItem('clinic_list_deactivated', JSON.stringify(deactivatedItems));
        localStorage.setItem('clinic_procedure_splits', JSON.stringify(procedureSplits));
        localStorage.setItem('clinic_saved_custom_split_names', JSON.stringify(savedCustomSplitNames)); 
        
        if (user) {
          syncSettingsToCloud(user.uid, { 
            savedProcedures, 
            savedDoctors, 
            savedNurses, 
            savedAnesthesiaDoctors, 
            savedAnesthesiaStaff, 
            deactivatedItems, 
            savedCustomSplitNames
          });
          // Also sync splits
          Object.values(procedureSplits).forEach(split => {
            syncProcedureSplitToCloud(user.uid, split);
          });
        }
      } catch (err) {
        console.error('Failed to sync settings locally:', err);
      }
    };

    const timeoutId = setTimeout(() => {
      saveSettings();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    savedProcedures,
    savedDoctors,
    savedNurses,
    savedAnesthesiaDoctors,
    savedAnesthesiaStaff,
    savedCustomSplitNames,
    deactivatedItems,
    procedureSplits,
    isInitialSettingsLoaded,
    isCloudDataLoaded,
    user
  ]);

  // Conditional split rules state
  const [addingRuleToProc, setAddingRuleToProc] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [newRuleTeam, setNewRuleTeam] = useState<string>('');
  const [newRuleConditionStaff, setNewRuleConditionStaff] = useState('');
  const [newRuleConditionType, setNewRuleConditionType] = useState<'present' | 'absent' | 'feedback_hours' | 'cad' | 'responsibility'>('present');
  const [newRuleFeedbackData, setNewRuleFeedbackData] = useState<Record<string, { workingHours: number; feedbackRate: number; hourlyRate: number }>>({});
  const [newRuleCadColumns, setNewRuleCadColumns] = useState<string[]>(['بڕوانامە', 'ئەزموون']);
  const [newRuleCadColumnMaxValues, setNewRuleCadColumnMaxValues] = useState<Record<string, number>>({'بڕوانامە': 2, 'ئەزموون': 1.5});
  const [newRuleCadData, setNewRuleCadData] = useState<Record<string, Record<string, number>>>({});
  const [newRuleResponsibilityData, setNewRuleResponsibilityData] = useState<Record<string, number>>({});
  const [newRuleTargetStaff, setNewRuleTargetStaff] = useState('');
  const [newRulePercent, setNewRulePercent] = useState(10);
  const [newRuleApplyToOthers, setNewRuleApplyToOthers] = useState(false);
  const [newRuleOthersPercent, setNewRuleOthersPercent] = useState(5);
  const [newRuleOthersCustomPercents, setNewRuleOthersCustomPercents] = useState<Record<string, number>>({});
  const [bypassedConflict, setBypassedConflict] = useState(false);

  const allStaffNames = Array.from(new Set([
    ...savedDoctors,
    ...savedNurses,
    ...savedAnesthesiaDoctors,
    ...savedAnesthesiaStaff
  ])).map(cleanTitle).filter(Boolean);
  const [selectedDoctorFilters, setSelectedDoctorFilters] = useState<string[]>([]);
  const [selectedProcedureFilters, setSelectedProcedureFilters] = useState<string[]>([]);
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successAnimation, setSuccessAnimation] = useState(false);

  // Handle Form submit (Add / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!patientName.trim()) {
      setErrorMsg('تکایە ناوی نەخۆش بنووسە');
      return;
    }
    const parsedAmount = parseFloat(totalAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setErrorMsg('تکایە بڕی پارەی دروست و گونجاو بنووسە');
      return;
    }

    if (selectedProcedures.length === 0) {
      setErrorMsg('تکایە لانی کەم جۆرێکی پرۆسیجەر دیاریبکە');
      return;
    }

    if (selectedDoctorsForm.length === 0) {
      setErrorMsg('تکایە لانی کەم ناوێکی دکتۆر دیاریبکە');
      return;
    }

    if (!date) {
      setErrorMsg('تکایە بەروارەکە دیاری بکە');
      return;
    }

    const joinedProcedures = selectedProcedures.join(', ');
    const joinedDoctors = selectedDoctorsForm.join(', ');
    const joinedAnesthesiaDoctors = selectedAnesthesiaDoctorsForm.join(', ');
    const joinedAnesthesiaStaff = selectedAnesthesiaStaffsForm.join(', ');

    const isAnesthesiaDocPercentZero = selectedProcedures.length > 0 && selectedProcedures.some(proc => {
      const s = getSplitForProcedure(proc);
      const docPercent = Number(s.anesthesiaDocPercent ?? 0);
      const hasPercent = docPercent > 0;
      const hasStage = s.anesthesiaDocDeductStage !== undefined && s.anesthesiaDocDeductStage !== null && s.anesthesiaDocDeductStage > 0;
      return !hasPercent && !hasStage;
    });

    const isAnesthesiaStaffPercentZero = selectedProcedures.length > 0 && selectedProcedures.some(proc => {
      const s = getSplitForProcedure(proc);
      const staffPercent = Number(s.anesthesiaStaffPercent ?? 0);
      const hasPercent = staffPercent > 0;
      const hasStage = s.anesthesiaStaffDeductStage !== undefined && s.anesthesiaStaffDeductStage !== null && s.anesthesiaStaffDeductStage > 0;
      return !hasPercent && !hasStage;
    });

    const parsedAnesDocAmt = isAnesthesiaDocPercentZero && manualAnesthesiaDocAmount ? parseFloat(manualAnesthesiaDocAmount) : undefined;
    const parsedAnesStaffAmt = isAnesthesiaStaffPercentZero && manualAnesthesiaStaffAmount ? parseFloat(manualAnesthesiaStaffAmount) : undefined;

    const targetRecordId = editingId ? editingId : Date.now().toString();
    const updatedRecord: PatientRecord = {
      id: targetRecordId,
      patientName,
      totalAmount: parsedAmount,
      procedureType: joinedProcedures,
      procedureTypes: selectedProcedures,
      date,
      doctorName: joinedDoctors,
      doctorNames: selectedDoctorsForm,
      nurses: selectedNurses,
      notes,
      anesthesiaDoctor: joinedAnesthesiaDoctors,
      anesthesiaDoctors: selectedAnesthesiaDoctorsForm,
      anesthesiaStaff: joinedAnesthesiaStaff,
      anesthesiaStaffs: selectedAnesthesiaStaffsForm,
      customSplitsOverrides,
      manualAnesthesiaDocAmount: parsedAnesDocAmt,
      manualAnesthesiaStaffAmount: parsedAnesStaffAmt
    };

    // Helper to recursively remove undefined fields for robust firestore compatibility
    const removeUndefinedFields = (obj: any): any => {
      if (obj === null || obj === undefined) return undefined;
      if (Array.isArray(obj)) {
        return obj.map(removeUndefinedFields).filter(v => v !== undefined);
      }
      if (typeof obj === 'object') {
        const cleaned: any = {};
        Object.keys(obj).forEach((key) => {
          const val = removeUndefinedFields(obj[key]);
          if (val !== undefined) {
            cleaned[key] = val;
          }
        });
        return cleaned;
      }
      return obj;
    };

    const sanitizedRecord = removeUndefinedFields(updatedRecord);

    try {
      let newRecordsList;
      if (editingId) {
        newRecordsList = records.map(r => r.id === targetRecordId ? sanitizedRecord : r);
      } else {
        newRecordsList = [sanitizedRecord, ...records];
        setNewSavedRecord(sanitizedRecord);
        setShowReceiptModal(true);
      }
      setRecords(newRecordsList);
      localStorage.setItem('clinic_patient_records', JSON.stringify(newRecordsList)); 
      if (user) {
        setIsSyncing(true);
        syncRecordToCloud(user.uid, sanitizedRecord)
          .catch((err) => {
            console.error('Cloud sync error:', err);
          })
          .finally(() => {
            setIsSyncing(false);
          });
      }
    } catch (err: any) {
      console.error('Failed to save patient record', err);
      setErrorMsg(`پاشەکەوت نەکرا!: ${err?.message || err}`);
      return; // Stop form reset and modal closing so user can read error and retry
    }

    if (editingId) {
      setEditingId(null);
    }

    // Reset inputs & close modal
    setPatientName('');
    setTotalAmount('');
    setSelectedProcedures([]);
    setCustomProcedureInput('');
    setShowCustomProcedureField(false);
    setDate(new Date().toISOString().split('T')[0]);
    setManualAnesthesiaDocAmount('');
    setManualAnesthesiaStaffAmount('');
    setSelectedDoctorsForm([]);
    setCustomDoctorInput('');
    setShowCustomDoctorField(false);
    setSelectedNurses([]);
    setCustomNurseInput('');
    setShowCustomNurseField(false);
    setSelectedAnesthesiaDoctorsForm([]);
    setCustomAnesthesiaDoctorInput('');
    setShowCustomAnesthesiaDoctorField(false);
    setSelectedAnesthesiaStaffsForm([]);
    setCustomAnesthesiaStaffInput('');
    setShowCustomAnesthesiaStaffField(false);
    setNotes('');
    setCustomSplitsOverrides({});
    setShowFormModal(false);
    
    // Trigger quick success indicator
    setSuccessAnimation(true);
    setTimeout(() => {
      setSuccessAnimation(false);
    }, 2500);
  };

  const handlePrintReceipt = (record: PatientRecord) => {
    setPopupsBlocked(false);
    const printWindow = window.open('', '_blank', 'width=450,height=700,status=no,toolbar=no,menubar=no,location=no');
    
    if (!printWindow) {
      setPopupsBlocked(true);
      // Fallback
      try {
        window.print();
      } catch (e) {}
      return;
    }

    const procedureText = record.procedureTypes && record.procedureTypes.length > 0 
      ? record.procedureTypes.join(' ، ') 
      : (record.procedureType || 'نادیار');

    const amountFormatted = record.totalAmount?.toLocaleString() || '0';

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>وەسڵ - ${record.patientName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #ffffff;
            color: #000000;
            padding: 15px;
            direction: rtl;
            width: 100%;
            font-size: 13px;
            line-height: 1.5;
          }
          .receipt-container {
            max-width: 380px;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            padding: 20px;
            border-radius: 8px;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px dashed #000000;
            padding-bottom: 12px;
          }
          .header h1 {
            font-size: 20px;
            font-weight: 900;
            margin-bottom: 2px;
            color: #000000;
          }
          .header p {
            font-size: 11px;
            font-weight: 700;
            color: #334155;
          }
          .date {
            font-size: 10px;
            color: #475569;
            margin-top: 4px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .label {
            font-weight: 700;
            color: #475569;
            font-size: 12px;
          }
          .value {
            font-weight: 900;
            color: #0f172a;
            text-align: left;
            font-size: 13px;
          }
          .total-box {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 12px;
            margin-top: 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .total-label {
            font-weight: 950;
            color: #166534;
            font-size: 13px;
          }
          .total-value {
            font-size: 16px;
            font-weight: 950;
            color: #15803d;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            border-top: 2px dashed #000000;
            padding-top: 12px;
          }
          .footer p {
            font-size: 12px;
            font-weight: 700;
            color: #1e293b;
          }
          .footer span {
            font-size: 10px;
            color: #475569;
            display: block;
            margin-top: 2px;
          }
          @media print {
            body {
              padding: 0;
              font-size: 12px;
            }
            .receipt-container {
              border: none;
              padding: 5px;
              max-width: 100%;
            }
            .total-box {
              background-color: transparent !important;
              border: 1px solid #000000;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <h1>Smart Hospital</h1>
            <p>وەسڵـی فەرمی نەخـۆش</p>
            <div class="date">ڕێکەوت: ${record.date}</div>
          </div>
          
          <div class="row">
            <span class="label">ناوی نەخۆش:</span>
            <span class="value">${record.patientName}</span>
          </div>
          
          <div class="row">
            <span class="label">جۆری پرۆسیجەر:</span>
            <span class="value">${procedureText}</span>
          </div>
          
          <div class="row">
            <span class="label">بەروار:</span>
            <span class="value">${record.date}</span>
          </div>
          
          <div class="total-box">
            <span class="total-label">بڕی پارەی گشتی:</span>
            <span class="total-value">${amountFormatted} د.ع</span>
          </div>
          
          <div class="footer">
            <p>سوپاس بۆ متمانەتان بە سەنتەرەکەمان</p>
            <span>هیوای چاکبوونەوەی خێراتان بۆ دەخوازین</span>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              try {
                window.print();
              } catch(e) {}
              setTimeout(function() {
                try {
                  window.close();
                } catch(e) {}
              }, 1000);
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleAddCustomNurse = () => {
    const trimmed = cleanTitle(customNurseInput.trim());
    if (!trimmed) return;
    if (!savedNurses.includes(trimmed)) {
      setSavedNurses(prev => [...prev, trimmed]);
    }
    if (!selectedNurses.includes(trimmed)) {
      setSelectedNurses(prev => [...prev, trimmed]);
    }
    setCustomNurseInput('');
    setShowCustomNurseField(false);
  };

  const removeSelectedNurse = (nurseName: string) => {
    setSelectedNurses(prev => prev.filter(n => n !== nurseName));
  };

  const toggleNurseSelection = (nurseName: string) => {
    if (selectedNurses.includes(nurseName)) {
      setSelectedNurses(prev => prev.filter(n => n !== nurseName));
    } else {
      setSelectedNurses(prev => [...prev, nurseName]);
    }
  };

  // Start Editing action
  const startEdit = (record: PatientRecord) => {
    setEditingId(record.id);
    setPatientName(record.patientName);
    setTotalAmount(record.totalAmount.toString());
    setDate(record.date);

    // Set procedures
    if (record.procedureTypes && Array.isArray(record.procedureTypes)) {
      setSelectedProcedures(record.procedureTypes);
    } else if (record.procedureType) {
      setSelectedProcedures([record.procedureType]);
    } else {
      setSelectedProcedures([]);
    }
    setCustomProcedureInput('');
    setShowCustomProcedureField(false);

    // Set doctors
    if (record.doctorNames && Array.isArray(record.doctorNames)) {
      setSelectedDoctorsForm(record.doctorNames);
    } else if (record.doctorName) {
      setSelectedDoctorsForm([record.doctorName]);
    } else {
      setSelectedDoctorsForm([]);
    }
    setCustomDoctorInput('');
    setShowCustomDoctorField(false);

    // Set nurses
    if (record.nurses && Array.isArray(record.nurses)) {
      setSelectedNurses(record.nurses);
    } else {
      setSelectedNurses([]);
    }
    setCustomNurseInput('');
    setShowCustomNurseField(false);

    // Set anesthesia doctors
    if (record.anesthesiaDoctors && Array.isArray(record.anesthesiaDoctors)) {
      setSelectedAnesthesiaDoctorsForm(record.anesthesiaDoctors);
    } else if (record.anesthesiaDoctor) {
      setSelectedAnesthesiaDoctorsForm([record.anesthesiaDoctor]);
    } else {
      setSelectedAnesthesiaDoctorsForm([]);
    }
    setCustomAnesthesiaDoctorInput('');
    setShowCustomAnesthesiaDoctorField(false);

    // Set anesthesia staff
    if (record.anesthesiaStaffs && Array.isArray(record.anesthesiaStaffs)) {
      setSelectedAnesthesiaStaffsForm(record.anesthesiaStaffs);
    } else if (record.anesthesiaStaff) {
      setSelectedAnesthesiaStaffsForm([record.anesthesiaStaff]);
    } else {
      setSelectedAnesthesiaStaffsForm([]);
    }
    setCustomAnesthesiaStaffInput('');
    setShowCustomAnesthesiaStaffField(false);

    setNotes(record.notes || '');
    setCustomSplitsOverrides(record.customSplitsOverrides || {});
    setManualAnesthesiaDocAmount(record.manualAnesthesiaDocAmount !== undefined ? record.manualAnesthesiaDocAmount.toString() : '');
    setManualAnesthesiaStaffAmount(record.manualAnesthesiaStaffAmount !== undefined ? record.manualAnesthesiaStaffAmount.toString() : '');

    setErrorMsg('');
    setShowFormModal(true);
  };

  // Delete Record action
  const deleteRecord = (record: any) => {
    setRecordToDelete(record);
  };

  // Reset form helper
  const openAddModal = () => {
    setEditingId(null);
    setPatientName('');
    setTotalAmount('');
    setSelectedProcedures([]);
    setCustomProcedureInput('');
    setShowCustomProcedureField(false);
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedDoctorsForm([]);
    setCustomDoctorInput('');
    setShowCustomDoctorField(false);
    setSelectedNurses([]);
    setCustomNurseInput('');
    setShowCustomNurseField(false);
    setSelectedAnesthesiaDoctorsForm([]);
    setCustomAnesthesiaDoctorInput('');
    setShowCustomAnesthesiaDoctorField(false);
    setSelectedAnesthesiaStaffsForm([]);
    setCustomAnesthesiaStaffInput('');
    setShowCustomAnesthesiaStaffField(false);
    setNotes('');
    setCustomSplitsOverrides({});
    setManualAnesthesiaDocAmount('');
    setManualAnesthesiaStaffAmount('');
    setErrorMsg('');
    setShowFormModal(true);
  };

  // Lists and filtered records
  const isAnesthesiaDocPercentZero = selectedProcedures.length > 0 && selectedProcedures.some(proc => {
    const s = getSplitForProcedure(proc);
    const docPercent = Number(s.anesthesiaDocPercent ?? 0);
    const hasPercent = docPercent > 0;
    const hasStage = s.anesthesiaDocDeductStage !== undefined && s.anesthesiaDocDeductStage !== null && s.anesthesiaDocDeductStage > 0;
    return !hasPercent && !hasStage;
  });

  const isAnesthesiaStaffPercentZero = selectedProcedures.length > 0 && selectedProcedures.some(proc => {
    const s = getSplitForProcedure(proc);
    const staffPercent = Number(s.anesthesiaStaffPercent ?? 0);
    const hasPercent = staffPercent > 0;
    const hasStage = s.anesthesiaStaffDeductStage !== undefined && s.anesthesiaStaffDeductStage !== null && s.anesthesiaStaffDeductStage > 0;
    return !hasPercent && !hasStage;
  });

  const uniqueDoctors = Array.from(new Set(records.flatMap(r => {
    if (r.doctorNames && r.doctorNames.length > 0) return r.doctorNames;
    return r.doctorName ? [r.doctorName] : [];
  })));
  
  const uniqueProcedures = Array.from(new Set(records.flatMap(r => {
    if (r.procedureTypes && r.procedureTypes.length > 0) return r.procedureTypes;
    return r.procedureType ? [r.procedureType] : [];
  })));
  
  const filteredRecords = records.filter(rec => {
    const nursesStr = (rec.nurses || []).join(' ').toLowerCase();
    const notesStr = (rec.notes || '').toLowerCase();
    const anesthesiaDocStr = (rec.anesthesiaDoctor || '').toLowerCase();
    const anesthesiaStaffStr = (rec.anesthesiaStaff || '').toLowerCase();
    const matchesSearch = 
      rec.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.procedureType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nursesStr.includes(searchQuery.toLowerCase()) ||
      notesStr.includes(searchQuery.toLowerCase()) ||
      anesthesiaDocStr.includes(searchQuery.toLowerCase()) ||
      anesthesiaStaffStr.includes(searchQuery.toLowerCase());
    
    const matchesPatientNameSearch = !patientNameSearchQuery.trim() || 
      rec.patientName.toLowerCase().includes(patientNameSearchQuery.toLowerCase().trim());
    
    const matchesDocFilter = selectedDoctorFilters.length === 0 || selectedDoctorFilters.some(filterDoc => {
      if (rec.doctorNames && rec.doctorNames.length > 0) return rec.doctorNames.includes(filterDoc);
      return rec.doctorName === filterDoc;
    });
    const matchesProcedureFilter = selectedProcedureFilters.length === 0 || selectedProcedureFilters.some(filterProc => {
      if (rec.procedureTypes && rec.procedureTypes.length > 0) return rec.procedureTypes.includes(filterProc);
      return rec.procedureType === filterProc;
    });
    
    // Date filter matching
    const matchesStartDate = !startDateFilter || rec.date >= startDateFilter;
    const matchesEndDate = !endDateFilter || rec.date <= endDateFilter;
    
    return matchesSearch && matchesPatientNameSearch && matchesDocFilter && matchesProcedureFilter && matchesStartDate && matchesEndDate;
  });

  // Calculate generic pagination (safe boundaries)
  const totalTablePages = Math.max(1, Math.ceil(filteredRecords.length / tableRowsPerPage));
  const safeCurrentPage = Math.min(tableCurrentPage, totalTablePages);
  const indexOfLastRecord = safeCurrentPage * tableRowsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - tableRowsPerPage;
  const paginatedRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);

  // Calculated Stats
  const totalReceivedAmount = filteredRecords.reduce((sum, rec) => sum + rec.totalAmount, 0);
  const averageAmount = filteredRecords.length > 0 ? (totalReceivedAmount / filteredRecords.length) : 0;

  // Calculated distribution splits across filtered records
  let overallSurgeonsShare = 0;
  let overallAnesthesiaDocsShare = 0;
  let overallAnesthesiaStaffShare = 0;
  let overallNursesShare = 0;
  let overallClinicShare = 0;
  let overallCustomShare = 0;
  const overallCustomShareBreakdown: Record<string, number> = {};

  // Detailed reporting structures
  const deptDetails: Record<string, { label: string; total: number; rows: BreakdownDetailRow[] }> = {
    surgeon: { label: 'پزیشکی نەشتەرگەری', total: 0, rows: [] },
    anesthesiaDoc: { label: 'پزیشکی بەنج', total: 0, rows: [] },
    anesthesiaStaff: { label: 'تیمی یاریدەدەری بەنج', total: 0, rows: [] },
    nurse: { label: 'تیمی نێرسینگ', total: 0, rows: [] },
    clinic: { label: 'بەشی سەنتەر / کلینیک', total: 0, rows: [] },
    custom: { label: 'پشکە زیادکراوەکانی تر', total: 0, rows: [] }
  };
  const empDetails: Record<string, { name: string; role: string; total: number; rows: BreakdownDetailRow[] }> = {};
  const customDetailsBreakdown: Record<string, { total: number; rows: BreakdownDetailRow[] }> = {};

  const addEmpDetailRow = (role: string, nameVal: string, row: BreakdownDetailRow) => {
    if (row.calculatedShare <= 0) return;
    const name = cleanTitle(nameVal);
    if (!name) return;
    const key = `${role}_${name}`;
    if (!empDetails[key]) {
      empDetails[key] = { name, role, total: 0, rows: [] };
    }
    empDetails[key].total += row.calculatedShare;
    // Check if row already exists for this record in this employee log to avoid duplicate pushes
    if (!empDetails[key].rows.some(r => r.recordId === row.recordId && r.detailInfo === row.detailInfo)) {
      empDetails[key].rows.push(row);
    }
  };

  const individualEarnings: Record<string, { 
    name: string; 
    role: string; 
    count: number; 
    amount: number; 
    paidAmount: number; 
    dueAmount: number; 
  }> = {};

  const addEarning = (nameVal: string, role: string, amount: number, isSettled: boolean) => {
    if (amount <= 0) return;
    const name = cleanTitle(nameVal);
    if (!name) return;
    const key = `${role}_${name}`;
    if (!individualEarnings[key]) {
      individualEarnings[key] = { name, role, count: 0, amount: 0, paidAmount: 0, dueAmount: 0 };
    }
    individualEarnings[key].amount += amount;
    if (isSettled) {
      individualEarnings[key].paidAmount += amount;
    } else {
      individualEarnings[key].dueAmount += amount;
    }
    individualEarnings[key].count += 1;
  };

  filteredRecords.forEach((rec) => {
    const procType = rec.procedureTypes?.[0] || rec.procedureType || '';
    const split = getSplitForProcedure(procType);

    // List all participants for the current record
    const surgeons = rec.doctorNames && rec.doctorNames.length > 0 
      ? rec.doctorNames 
      : (rec.doctorName ? [rec.doctorName] : []);
    const anesthesiaDocs = rec.anesthesiaDoctors && rec.anesthesiaDoctors.length > 0
      ? rec.anesthesiaDoctors 
      : (rec.anesthesiaDoctor ? [rec.anesthesiaDoctor] : []);
    const staffList = rec.anesthesiaStaffs && rec.anesthesiaStaffs.length > 0
      ? rec.anesthesiaStaffs
      : (rec.anesthesiaStaff ? [rec.anesthesiaStaff] : []);
    const nurseList = rec.nurses && rec.nurses.length > 0 ? rec.nurses : [];

    const allRecParticipants = [
      ...surgeons,
      ...anesthesiaDocs,
      ...staffList,
      ...nurseList
    ].map(cleanTitle).filter(Boolean);

    // Resolve staff percentages with conditional overrides
    const resolvedStaffPercents = { ...(split.staffPercents || {}) };
    if (split.conditionalRules && split.conditionalRules.length > 0) {
      split.conditionalRules.forEach(rule => {
        const condStaffClean = cleanTitle(rule.conditionStaff);
        const isPresent = allRecParticipants.includes(condStaffClean);
        const conditionMet = (rule.conditionType === 'present' && isPresent) ||
                             (rule.conditionType === 'absent' && !isPresent);
        
        if (conditionMet) {
          const targetClean = cleanTitle(rule.targetStaff);
          resolvedStaffPercents[targetClean] = rule.rulePercent;

          // If applyToOthers is enabled, apply othersPercent (or specific othersCustomPercents) to all other members of the same category
          if (rule.applyToOthers) {
            let categoryStaff: string[] = [];
            const doctorsClean = savedDoctors.map(cleanTitle);
            const nursesClean = savedNurses.map(cleanTitle);
            const anesthesiaDocsClean = savedAnesthesiaDoctors.map(cleanTitle);
            const anesthesiaStaffClean = savedAnesthesiaStaff.map(cleanTitle);

            if (doctorsClean.includes(targetClean)) categoryStaff = savedDoctors;
            else if (nursesClean.includes(targetClean)) categoryStaff = savedNurses;
            else if (anesthesiaDocsClean.includes(targetClean)) categoryStaff = savedAnesthesiaDoctors;
            else if (anesthesiaStaffClean.includes(targetClean)) categoryStaff = savedAnesthesiaStaff;

            categoryStaff.forEach(s => {
              const cleanS = cleanTitle(s);
              if (cleanS !== targetClean) {
                if (rule.othersCustomPercents && rule.othersCustomPercents[cleanS] !== undefined) {
                  resolvedStaffPercents[cleanS] = rule.othersCustomPercents[cleanS];
                } else if (rule.othersPercent !== undefined) {
                  resolvedStaffPercents[cleanS] = rule.othersPercent;
                }
              }
            });
          }
        }
      });
    }

    const recSelectedProcedures = rec.procedureTypes && rec.procedureTypes.length > 0 
      ? rec.procedureTypes 
      : (rec.procedureType ? [rec.procedureType] : []);

    const isAnesthesiaDocPercentZeroRec = recSelectedProcedures.length > 0 && recSelectedProcedures.some(proc => {
      const s = getSplitForProcedure(proc);
      const docPercent = Number(s.anesthesiaDocPercent ?? 0);
      const hasPercent = docPercent > 0;
      const hasStage = s.anesthesiaDocDeductStage !== undefined && s.anesthesiaDocDeductStage !== null && s.anesthesiaDocDeductStage > 0;
      return !hasPercent && !hasStage;
    });

    const isAnesthesiaStaffPercentZeroRec = recSelectedProcedures.length > 0 && recSelectedProcedures.some(proc => {
      const s = getSplitForProcedure(proc);
      const staffPercent = Number(s.anesthesiaStaffPercent ?? 0);
      const hasPercent = staffPercent > 0;
      const hasStage = s.anesthesiaStaffDeductStage !== undefined && s.anesthesiaStaffDeductStage !== null && s.anesthesiaStaffDeductStage > 0;
      return !hasPercent && !hasStage;
    });

    const manualAnesDocAmt = isAnesthesiaDocPercentZeroRec ? Number(rec.manualAnesthesiaDocAmount || 0) : 0;
    const manualAnesStaffAmt = isAnesthesiaStaffPercentZeroRec ? Number(rec.manualAnesthesiaStaffAmount || 0) : 0;
    const initialRemBase = rec.totalAmount;

    // Dynamic multi-stage deduction loop
    let currentRemBase = initialRemBase;

    let surgeonResult: any = null;
    let anesDocResult: any = null;
    let staffResult: any = null;
    let nurseResult: any = { shares: [], totalPoolSpent: 0, isFeedback: false, count: 0 };
    let clinicAmt = 0;

    const anesthesiaDocsList = rec.anesthesiaDoctors && rec.anesthesiaDoctors.length > 0
      ? rec.anesthesiaDoctors 
      : (rec.anesthesiaDoctor ? [rec.anesthesiaDoctor] : []);

    // Distribute manual anesthesia doctor amount if registered
    if (manualAnesDocAmt > 0 && anesthesiaDocsList.length > 0) {
      const cleanAnesDocs = anesthesiaDocsList.map(cleanTitle).filter(Boolean);
      if (cleanAnesDocs.length > 0) {
        const shareAmount = manualAnesDocAmt / cleanAnesDocs.length;
        deptDetails.anesthesiaDoc.total += manualAnesDocAmt;
        cleanAnesDocs.forEach(name => {
          const isS = rec.settledShares?.[`پزیشکی بەنج_${name}`] === true;
          addEarning(name, 'پزیشکی بەنج', shareAmount, isS);
          const row: BreakdownDetailRow = {
            recordId: rec.id,
            patientName: rec.patientName,
            recipientName: name,
            date: rec.date,
            procedures: rec.procedureTypes?.join(' ، ') || rec.procedureType || '',
            grossAmount: rec.totalAmount,
            calculatedShare: shareAmount,
            detailInfo: `بڕی دەستی دیاریکراو (دابەشکراو بەسەر ${cleanAnesDocs.length} پزیشکدا)`,
            isSettled: isS
          };
          if (shareAmount > 0) {
            addEmpDetailRow('پزیشکی بەنج', name, row);
            deptDetails.anesthesiaDoc.rows.push(row);
          }
        });
        overallAnesthesiaDocsShare += manualAnesDocAmt;
      }
    }

    // Distribute manual anesthesia staff amount if registered
    if (manualAnesStaffAmt > 0 && staffList.length > 0) {
      const cleanStaff = staffList.map(cleanTitle).filter(Boolean);
      if (cleanStaff.length > 0) {
        const shareAmount = manualAnesStaffAmt / cleanStaff.length;
        deptDetails.anesthesiaStaff.total += manualAnesStaffAmt;
        cleanStaff.forEach(name => {
          const isS = rec.settledShares?.[`کارمەندی بەنج_${name}`] === true;
          addEarning(name, 'کارمەندی بەنج', shareAmount, isS);
          const row: BreakdownDetailRow = {
            recordId: rec.id,
            patientName: rec.patientName,
            recipientName: name,
            date: rec.date,
            procedures: rec.procedureTypes?.join(' ، ') || rec.procedureType || '',
            grossAmount: rec.totalAmount,
            calculatedShare: shareAmount,
            detailInfo: `بڕی دەستی دیاریکراو (دابەشکراو بەسەر ${cleanStaff.length} کارمەنددا)`,
            isSettled: isS
          };
          if (shareAmount > 0) {
            addEmpDetailRow('کارمەندی بەنج', name, row);
            deptDetails.anesthesiaStaff.rows.push(row);
          }
        });
        overallAnesthesiaStaffShare += manualAnesStaffAmt;
      }
    }

    const getRoleSplitShares = (
      names: string[],
      poolPercent: number,
      staffPercents: Record<string, number> = {},
      basisAmount: number = initialRemBase
    ): { shares: { name: string; amount: number }[]; totalPoolSpent: number } => {
      if (names.length === 0) return { shares: [], totalPoolSpent: 0 };
      const cleanNames = names.map(cleanTitle).filter(Boolean);
      if (cleanNames.length === 0) return { shares: [], totalPoolSpent: 0 };

      const sharesList: { name: string; amount: number }[] = [];

      // If pool / team percentage is 0, no staff member of this team can get any share
      if (poolPercent <= 0) {
        cleanNames.forEach(name => {
          sharesList.push({ name, amount: 0 });
        });
        return { shares: sharesList, totalPoolSpent: 0 };
      }

      // Find who has custom overrides
      const customOnes = cleanNames.filter(n => staffPercents[n] !== undefined && staffPercents[n] > 0);
      const standardOnes = cleanNames.filter(n => staffPercents[n] === undefined || staffPercents[n] <= 0);

      let totalCustomPercentUsed = 0;
      customOnes.forEach(name => {
        const pct = staffPercents[name];
        totalCustomPercentUsed += pct;
      });

      // SMART NORMALIZATION: If the allocated custom percentages inside this team exceed the team's total poolPercent,
      // scale them down proportionally so we NEVER exceed the poolPercent. This prevents the distributed amount
      // from exceeding the patient's money.
      if (totalCustomPercentUsed > poolPercent) {
        const scaleRatio = poolPercent / totalCustomPercentUsed;
        customOnes.forEach(name => {
          const originalPct = staffPercents[name];
          const scaledPct = originalPct * scaleRatio;
          sharesList.push({ name, amount: basisAmount * (scaledPct / 100) });
        });
        // Standard (non-overridden) members get 0 as the pool is fully exhausted
        standardOnes.forEach(name => {
          sharesList.push({ name, amount: 0 });
        });
        const totalPoolSpent = basisAmount * (poolPercent / 100);
        return { shares: sharesList, totalPoolSpent };
      } else {
        // Standard distribution flow
        customOnes.forEach(name => {
          const pct = staffPercents[name];
          sharesList.push({ name, amount: basisAmount * (pct / 100) });
        });

        const remainingPoolPercent = Math.max(0, poolPercent - totalCustomPercentUsed);
        if (standardOnes.length > 0) {
          const perOtherPercent = remainingPoolPercent / standardOnes.length;
          standardOnes.forEach(name => {
            sharesList.push({ name, amount: basisAmount * (perOtherPercent / 100) });
          });
        }

        const finalUsedPercent = totalCustomPercentUsed + (standardOnes.length > 0 ? remainingPoolPercent : 0);
        const totalPoolSpent = basisAmount * (finalUsedPercent / 100);

        return { shares: sharesList, totalPoolSpent };
      }
    };

    // Helper to get deduction stage for custom splits (default 1 if 'first')
    const getCustomItemStage = (item: CustomSplitItem): number => {
      const override = rec.customSplitsOverrides?.[item.id];
      if (override && override.mode === 'manual' && override.deductStage !== undefined && override.deductStage !== null) {
        return Number(override.deductStage);
      }
      if (item.deductStage !== undefined && item.deductStage !== null) return Number(item.deductStage);
      return item.deductType === 'first' ? 1 : 0;
    };

    // Helper to get deduction stage for standard roles (default 2 if 'first', because standard pre-deducts run after custom pre-deducts like maintenance)
    const getStandardRoleStage = (fieldStage: number | undefined, fieldType: 'first' | 'concurrent' | undefined): number => {
      if (fieldStage !== undefined && fieldStage !== null) return Number(fieldStage);
      return fieldType === 'first' ? 2 : 0;
    };

    const surgeonStage = getStandardRoleStage(split.surgeonDeductStage, split.surgeonDeductType);
    const anesthesiaDocStage = getStandardRoleStage(split.anesthesiaDocDeductStage, split.anesthesiaDocDeductType);
    const anesthesiaStaffStage = getStandardRoleStage(split.anesthesiaStaffDeductStage, split.anesthesiaStaffDeductType);
    const nursesStage = getStandardRoleStage(split.nursesDeductStage, split.nursesDeductType);
    const clinicStage = getStandardRoleStage(split.clinicDeductStage, split.clinicDeductType);

    const getNurseResult = (basisAmount: number) => {
      const fbRule = split.conditionalRules?.find(r => r.conditionType === 'feedback_hours');
      const cadRule = split.conditionalRules?.find(r => r.conditionType === 'cad');
      const respRule = split.conditionalRules?.find(r => r.conditionType === 'responsibility');

      if ((fbRule && fbRule.feedbackData) || (cadRule && cadRule.cadData) || (respRule && respRule.responsibilityData)) {
        let fbAbsolutePercent = 0;
        let cadAbsolutePercent = 0;
        let respAbsolutePercent = 0;

        if (fbRule && fbRule.feedbackData) fbAbsolutePercent = fbRule.rulePercent || 5;
        if (cadRule && cadRule.cadData) {
          cadAbsolutePercent = cadRule.rulePercent || 5;
        }
        
        if (respRule && respRule.responsibilityData) {
          respAbsolutePercent = respRule.rulePercent || 5;
        }
        
        const totalNursePercent = split.nursesPercent || 0;
        let standardAbsolutePercent = totalNursePercent - fbAbsolutePercent - cadAbsolutePercent - respAbsolutePercent;

        // Avoid negative in case logic is flawed or percentage exceeds total
        if (standardAbsolutePercent < 0) {
            const sum = fbAbsolutePercent + cadAbsolutePercent + respAbsolutePercent;
            if (sum > 0) {
                fbAbsolutePercent = (fbAbsolutePercent / sum) * totalNursePercent;
                cadAbsolutePercent = (cadAbsolutePercent / sum) * totalNursePercent;
                respAbsolutePercent = (respAbsolutePercent / sum) * totalNursePercent;
            }
            standardAbsolutePercent = 0;
        }

        const feedbackPool = basisAmount * (fbAbsolutePercent / 100);
        const cadPool = basisAmount * (cadAbsolutePercent / 100);
        const respPool = basisAmount * (respAbsolutePercent / 100);
        const standardPool = basisAmount * (standardAbsolutePercent / 100);

        // Standard shares
        const standardResult = getRoleSplitShares(nurseList, 100, resolvedStaffPercents, standardPool);
        
        const aggregatedShares: Record<string, number> = {};
        const nurseBreakdowns: Record<string, { std: number; fb: number; cad: number; resp: number }> = {};
        
        nurseList.forEach(n => {
          nurseBreakdowns[n] = { std: 0, fb: 0, cad: 0, resp: 0 };
        });
        
        // Add standard shares first
        standardResult.shares.forEach(s => {
            aggregatedShares[s.name] = (aggregatedShares[s.name] || 0) + s.amount;
            if (nurseBreakdowns[s.name]) nurseBreakdowns[s.name].std += s.amount;
        });

        let actualFbSpent = 0;
        // Feedback calculation
        if (fbRule && fbRule.feedbackData) {
          let globalTotalPoints = 0;
          nurseList.forEach(n => {
            const cName = cleanTitle(n);
            const fb = fbRule.feedbackData![cName];
            if (fb) {
              const h = fb.workingHours || 0;
              const r = fb.feedbackRate || 0;
              const w = fb.hourlyRate || 0;
              globalTotalPoints += (h * r * w);
            }
          });

          const pointPrice = globalTotalPoints > 0 ? (feedbackPool / globalTotalPoints) : 0;
          
          nurseList.forEach(n => {
            const cName = cleanTitle(n);
            const fb = fbRule.feedbackData![cName];
            if (fb) {
              const points = (fb.workingHours || 0) * (fb.feedbackRate || 0) * (fb.hourlyRate || 0);
              const amt = points * pointPrice;
              if (amt > 0) {
                aggregatedShares[n] = (aggregatedShares[n] || 0) + amt;
                if (nurseBreakdowns[n]) nurseBreakdowns[n].fb += amt;
                actualFbSpent += amt;
              }
            }
          });
        }

        let actualCadSpent = 0;
        // CAD calculation
        if (cadRule && cadRule.cadData) {
          let globalCadPoints = 0;
          const userColumns = cadRule.cadColumns || [];
          nurseList.forEach(n => {
            const cName = cleanTitle(n);
            const cadObj = cadRule.cadData![cName];
            if (cadObj) {
              // We'll just define points as the sum of all columns
              let points = 0;
              for (const col of userColumns) {
                if (cadObj[col]) points += cadObj[col];
              }
              globalCadPoints += points;
            }
          });

          const cadPointPrice = globalCadPoints > 0 ? (cadPool / globalCadPoints) : 0;
          
          nurseList.forEach(n => {
            const cName = cleanTitle(n);
            const cadObj = cadRule.cadData![cName];
            if (cadObj) {
              let points = 0;
              const userColumns = cadRule.cadColumns || [];
              for (const col of userColumns) {
                if (cadObj[col]) points += cadObj[col];
              }
              const amt = points * cadPointPrice;
              if (amt > 0) {
                aggregatedShares[n] = (aggregatedShares[n] || 0) + amt;
                if (nurseBreakdowns[n]) nurseBreakdowns[n].cad += amt;
                actualCadSpent += amt;
              }
            }
          });
        }

        let actualRespSpent = 0;
        // Responsibility calculation
        if (respRule && respRule.responsibilityData) {
          let globalRespPoints = 0;
          nurseList.forEach(n => {
            const cName = cleanTitle(n);
            globalRespPoints += (respRule.responsibilityData![cName] || 0);
          });
          
          if (globalRespPoints > 0) {
            const respPool = basisAmount * (respAbsolutePercent / 100);
            nurseList.forEach(n => {
              const cName = cleanTitle(n);
              const rPoints = respRule.responsibilityData![cName] || 0;
              if (rPoints > 0) {
                let amt = respPool * (rPoints / globalRespPoints);
                aggregatedShares[n] = (aggregatedShares[n] || 0) + amt;
                if (nurseBreakdowns[n]) nurseBreakdowns[n].resp += amt;
                actualRespSpent += amt;
              }
            });
          }
        }

        const finalSharesList = Object.keys(aggregatedShares).map(name => ({
           name,
           amount: aggregatedShares[name],
           breakdown: nurseBreakdowns[name]
        }));
        
        const totalSpent = standardResult.totalPoolSpent + actualFbSpent + actualCadSpent + actualRespSpent;

        return { 
           shares: finalSharesList, 
           totalPoolSpent: totalSpent, 
           isFeedback: true, // indicates that it's a dynamic division
           count: finalSharesList.length,
           fbPercent: fbAbsolutePercent,
           cadPercent: cadAbsolutePercent,
           respPercent: respAbsolutePercent,
           stdPercent: standardAbsolutePercent,
           fbSpent: actualFbSpent,
           cadSpent: actualCadSpent,
           respSpent: actualRespSpent,
           stdSpent: standardResult.totalPoolSpent,
           fbPointsCount: actualFbSpent > 0 ? nurseList.length : 0
        };
      }

      const standardResultFallback = getRoleSplitShares(nurseList, split.nursesPercent, resolvedStaffPercents, basisAmount);
      return { 
        ...standardResultFallback, 
        shares: standardResultFallback.shares.map(s => ({ ...s, breakdown: { std: s.amount, fb: 0, cad: 0, resp: 0 }})),
        isFeedback: false, 
        count: 0, 
        fbPercent: 0, cadPercent: 0, respPercent: 0, stdPercent: 0, fbSpent: 0, cadSpent: 0, respSpent: 0, stdSpent: 0, fbPointsCount: 0 
      };
    };

    // Calculate details for a custom extra item
    const processCustomItemInStage = (customItem: CustomSplitItem, basisAmount: number) => {
      const override = rec.customSplitsOverrides?.[customItem.id];
      const amt = override && override.mode === 'manual'
        ? override.value
        : (customItem.valueType === 'fixed' 
           ? customItem.percent 
           : (basisAmount * (customItem.percent / 100)));
      overallCustomShare += amt;
      const customName = cleanTitle(customItem.name || 'پشکی زیادە');
      overallCustomShareBreakdown[customName] = (overallCustomShareBreakdown[customName] || 0) + amt;

      const settledKeyMap = customItem.recipientName 
        ? `${customName}_${cleanTitle(customItem.recipientName)}` 
        : `پشکی زیادە_${customName}`;
      
      const isS = rec.settledShares?.[settledKeyMap] === true;

      const row: BreakdownDetailRow = {
        recordId: rec.id,
        patientName: rec.patientName,
        recipientName: customItem.recipientName ? cleanTitle(customItem.recipientName) : customName,
        date: rec.date,
        procedures: rec.procedureTypes?.join(' ، ') || rec.procedureType || '',
        grossAmount: rec.totalAmount,
        calculatedShare: amt,
        detailInfo: `${customItem.valueType === 'fixed' ? 'بڕی جێگیر' : `ڕێژەی %${customItem.percent}`}`,
        isSettled: isS
      };

      if (amt > 0) {
        deptDetails.custom.total += amt;
        // Add to department list
        deptDetails.custom.rows.push(row);
      }

      // Add to custom split specific name breakdown
      if (amt > 0) {
        if (!customDetailsBreakdown[customName]) {
          customDetailsBreakdown[customName] = { total: 0, rows: [] };
        }
        customDetailsBreakdown[customName].total += amt;
        customDetailsBreakdown[customName].rows.push(row);
      }

      if (customItem.recipientName && customItem.recipientName.trim() && amt > 0) {
        addEarning(customItem.recipientName, customName, amt, isS);
        addEmpDetailRow(customName, customItem.recipientName, row);
      }
      return amt;
    };

    // Run Stage 1, Stage 2, and Stage 3/4/5/6 sequentially
    for (let s = 1; s <= 6; s++) {
      let stageDeductionsSum = 0;

      // 1. Evaluate custom splits in this stage
      if (split.customSplits && split.customSplits.length > 0) {
        split.customSplits.forEach((customItem) => {
          if (getCustomItemStage(customItem) === s) {
            const amt = processCustomItemInStage(customItem, currentRemBase);
            stageDeductionsSum += amt;
          }
        });
      }

      // 2. Evaluate surgeons in this stage
      if (surgeonStage === s) {
        surgeonResult = getRoleSplitShares(surgeons, split.surgeonPercent, resolvedStaffPercents, currentRemBase);
        stageDeductionsSum += surgeonResult.totalPoolSpent;
      }

      // 3. Evaluate anesthesia doc in this stage
      if (anesthesiaDocStage === s) {
        anesDocResult = getRoleSplitShares(anesthesiaDocsList, split.anesthesiaDocPercent, resolvedStaffPercents, currentRemBase);
        stageDeductionsSum += anesDocResult.totalPoolSpent;
      }

      // 4. Evaluate anesthesia staff in this stage
      if (anesthesiaStaffStage === s) {
        staffResult = getRoleSplitShares(staffList, split.anesthesiaStaffPercent, resolvedStaffPercents, currentRemBase);
        stageDeductionsSum += staffResult.totalPoolSpent;
      }

      // 5. Evaluate nurses in this stage
      if (nursesStage === s) {
        nurseResult = getNurseResult(currentRemBase);
        stageDeductionsSum += nurseResult.totalPoolSpent;
      }

      // 6. Evaluate clinic in this stage
      if (clinicStage === s) {
        clinicAmt = currentRemBase * (split.clinicPercent / 100);
        stageDeductionsSum += clinicAmt;
      }

      // Subtract work done in this stage from the running base
      currentRemBase = Math.max(0, currentRemBase - stageDeductionsSum);
    }

    // Now calculate concurrent (Stage 0) items based on the final remaining base
    const baseAmount = currentRemBase;

    if (surgeonStage === 0) {
      surgeonResult = getRoleSplitShares(surgeons, split.surgeonPercent, resolvedStaffPercents, baseAmount);
    }
    if (anesthesiaDocStage === 0) {
      anesDocResult = getRoleSplitShares(anesthesiaDocsList, split.anesthesiaDocPercent, resolvedStaffPercents, baseAmount);
    }
    if (anesthesiaStaffStage === 0) {
      staffResult = getRoleSplitShares(staffList, split.anesthesiaStaffPercent, resolvedStaffPercents, baseAmount);
    }
    if (nursesStage === 0) {
      nurseResult = getNurseResult(baseAmount);
    }
    if (clinicStage === 0) {
      clinicAmt = baseAmount * (split.clinicPercent / 100);
    }

    // Evaluate concurrent custom splits
    if (split.customSplits && split.customSplits.length > 0) {
      split.customSplits.forEach((customItem) => {
        if (getCustomItemStage(customItem) === 0) {
          processCustomItemInStage(customItem, baseAmount);
        }
      });
    }

    // Accumulate actual standard shares
    if (surgeonResult) {
      overallSurgeonsShare += surgeonResult.totalPoolSpent;
      deptDetails.surgeon.total += surgeonResult.totalPoolSpent;
      surgeonResult.shares.forEach(item => {
        if (item.amount <= 0) return;
        const isS = rec.settledShares?.[`پزیشکی نەشتەرگەری_${cleanTitle(item.name)}`] === true;
        addEarning(item.name, 'پزیشکی نەشتەرگەری', item.amount, isS);
        const row: BreakdownDetailRow = {
          recordId: rec.id,
          patientName: rec.patientName,
          recipientName: cleanTitle(item.name),
          date: rec.date,
          procedures: rec.procedureTypes?.join(' ، ') || rec.procedureType || '',
          grossAmount: rec.totalAmount,
          calculatedShare: item.amount,
          detailInfo: `ڕێژە: %${split.surgeonPercent} (${surgeons.length > 1 ? `دابەشکراو بەسەر ${surgeons.length} پزیشکدا` : 'پشکی نەشتەرگەری'})`,
          isSettled: isS
        };
        if (item.amount > 0) {
          addEmpDetailRow('پزیشکی نەشتەرگەری', item.name, row);
          deptDetails.surgeon.rows.push(row);
        }
      });
    }

    if (anesDocResult) {
      overallAnesthesiaDocsShare += anesDocResult.totalPoolSpent;
      deptDetails.anesthesiaDoc.total += anesDocResult.totalPoolSpent;
      anesDocResult.shares.forEach(item => {
        if (item.amount <= 0) return;
        const isS = rec.settledShares?.[`پزیشکی بەنج_${cleanTitle(item.name)}`] === true;
        addEarning(item.name, 'پزیشکی بەنج', item.amount, isS);
        const row: BreakdownDetailRow = {
          recordId: rec.id,
          patientName: rec.patientName,
          recipientName: cleanTitle(item.name),
          date: rec.date,
          procedures: rec.procedureTypes?.join(' ، ') || rec.procedureType || '',
          grossAmount: rec.totalAmount,
          calculatedShare: item.amount,
          detailInfo: `ڕێژە: %${split.anesthesiaDocPercent} (${anesthesiaDocsList.length > 1 ? `دابەشکراو بەسەر ${anesthesiaDocsList.length} پزیشکدا` : 'پشکی پزیشکی بەنج'})`,
          isSettled: isS
        };
        if (item.amount > 0) {
          addEmpDetailRow('پزیشکی بەنج', item.name, row);
          deptDetails.anesthesiaDoc.rows.push(row);
        }
      });
    }

    if (staffResult) {
      overallAnesthesiaStaffShare += staffResult.totalPoolSpent;
      deptDetails.anesthesiaStaff.total += staffResult.totalPoolSpent;
      staffResult.shares.forEach(item => {
        if (item.amount <= 0) return;
        const isS = rec.settledShares?.[`کارمەندی بەنج_${cleanTitle(item.name)}`] === true;
        addEarning(item.name, 'کارمەندی بەنج', item.amount, isS);
        const row: BreakdownDetailRow = {
          recordId: rec.id,
          patientName: rec.patientName,
          recipientName: cleanTitle(item.name),
          date: rec.date,
          procedures: rec.procedureTypes?.join(' ، ') || rec.procedureType || '',
          grossAmount: rec.totalAmount,
          calculatedShare: item.amount,
          detailInfo: `ڕێژە: %${split.anesthesiaStaffPercent} (${staffList.length > 1 ? `دابەشکراو بەسەر ${staffList.length} یاریدەدەردا` : 'پشکی کارمەندی بەنج'})`,
          isSettled: isS
        };
        if (item.amount > 0) {
          addEmpDetailRow('کارمەندی بەنج', item.name, row);
          deptDetails.anesthesiaStaff.rows.push(row);
        }
      });
    }

    if (nurseResult) {
      overallNursesShare += nurseResult.totalPoolSpent;
      deptDetails.nurse.total += nurseResult.totalPoolSpent;
      nurseResult.shares.forEach(item => {
        if (item.amount <= 0) return;
        const isS = rec.settledShares?.[`کارمەندی نێرس_${cleanTitle(item.name)}`] === true;
        addEarning(item.name, 'کارمەندی نێرس', item.amount, isS);
        const row: BreakdownDetailRow = {
          recordId: rec.id,
          patientName: rec.patientName,
          recipientName: cleanTitle(item.name),
          date: rec.date,
          procedures: rec.procedureTypes?.join(' ، ') || rec.procedureType || '',
          grossAmount: rec.totalAmount,
          calculatedShare: item.amount,
          detailInfo: nurseResult.isFeedback 
            ? `ڕێژە: %${split.nursesPercent} (دابەشکرا بەسەر ${nurseResult.count} نێرسدا، %${nurseResult.stdPercent} ئاسایی (${Math.round((item as any).breakdown?.std || 0).toLocaleString()} د.ع)${nurseResult.fbPercent ? `، %${nurseResult.fbPercent} فیدباک (${Math.round((item as any).breakdown?.fb || 0).toLocaleString()} د.ع)` : ''}${nurseResult.cadPercent ? `، %${nurseResult.cadPercent} کاد (${Math.round((item as any).breakdown?.cad || 0).toLocaleString()} د.ع)` : ''}${nurseResult.respPercent ? `، %${nurseResult.respPercent} بەرپرسیاریەتی (${Math.round((item as any).breakdown?.resp || 0).toLocaleString()} د.ع)` : ''})`
            : `ڕێژە: %${split.nursesPercent} (${nurseList.length > 1 ? `دابەشکراو بەسەر ${nurseList.length} نێرسدا` : 'پشکی نێرس'})`,
          isSettled: isS
        };
        if (item.amount > 0) {
          addEmpDetailRow('کارمەندی نێرس', item.name, row);
          deptDetails.nurse.rows.push(row);
        }
      });
    }

    overallClinicShare += clinicAmt;
    if (clinicAmt > 0) {
      deptDetails.clinic.total += clinicAmt;
      deptDetails.clinic.rows.push({
        recordId: rec.id,
        patientName: rec.patientName,
        recipientName: "سەنتەر / کلینیک",
        date: rec.date,
        procedures: rec.procedureTypes?.join(' ، ') || rec.procedureType || '',
        grossAmount: rec.totalAmount,
        calculatedShare: clinicAmt,
        detailInfo: `پشکی سەنتەر: %${split.clinicPercent}`,
        isSettled: rec.settledShares?.['سەنتەر / کلینیک'] === true
      });
    }
  });

  const sortedIndividualEarnings = Object.values(individualEarnings).sort((a, b) => b.amount - a.amount);

  // Export to Excel function using actual filtered list of records
  const exportToExcel = () => {
    if (filteredRecords.length === 0) return;

    // Structure data for Excel sheet
    const excelData = filteredRecords.map((record) => {
      // Get procedures
      const procedures = record.procedureTypes && record.procedureTypes.length > 0 
        ? record.procedureTypes.join(' ، ') 
        : record.procedureType;

      // Get Doctors
      const doctors = record.doctorNames && record.doctorNames.length > 0
        ? record.doctorNames.map(cleanTitle).join(' ، ')
        : cleanTitle(record.doctorName);

      // Get Anesthesia Doctors
      const anesDoctors = record.anesthesiaDoctors && record.anesthesiaDoctors.length > 0
        ? record.anesthesiaDoctors.map(cleanTitle).join(' ، ')
        : cleanTitle(record.anesthesiaDoctor || '');

      // Get Anesthesia Staff
      const anesStaff = record.anesthesiaStaffs && record.anesthesiaStaffs.length > 0
        ? record.anesthesiaStaffs.map(cleanTitle).join(' ، ')
        : cleanTitle(record.anesthesiaStaff || '');

      // Get Nurses
      const nurses = record.nurses && record.nurses.length > 0
        ? record.nurses.map(cleanTitle).join(' ، ')
        : 'دیاری نەکراوە';

      return {
        'ناوی نەخۆش': record.patientName,
        'کۆی بڕی پارە (د.ع)': record.totalAmount,
        'جۆری پرۆسیجەر': procedures,
        'ناوی دکتۆر': doctors,
        'پزیشکی بەنج': anesDoctors || 'دیاری نەکراوە',
        'کارمەندی بەنج': anesStaff || 'دیاری نەکراوە',
        'کارمەندی نێرس': nurses,
        'تێبینی': record.notes || 'نيیە',
        'بەروار': record.date
      };
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set sheet text direction to Right-to-Left (RTL) for Kurdish/Arabic content
    if (!worksheet['!views']) {
      worksheet['!views'] = [];
    }
    worksheet['!views'].push({ RTL: true });

    // Set column widths
    const maxLens = Object.keys(excelData[0] || {}).map(key => {
      let maxLen = key.length;
      excelData.forEach(row => {
        const val = row[key as keyof typeof row];
        if (val) {
          const strVal = String(val);
          if (strVal.length > maxLen) {
            maxLen = strVal.length;
          }
        }
      });
      return { wch: Math.min(Math.max(maxLen * 1.5 + 4, 12), 40) }; // multiplied length for better display of Kurdish text
    });
    worksheet['!cols'] = maxLens;

    // Create a workbook and append the sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Patient Records');

    // Save/Download file
    XLSX.writeFile(workbook, `patient_records_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const [procSplitQuery, setProcSplitQuery] = useState('');
  const [staffReportQuery, setStaffReportQuery] = useState('');

  const exportSplitsToExcel = () => {
    if (sortedIndividualEarnings.length === 0) return;

    const excelData = sortedIndividualEarnings.map(item => ({
      'ناوی کارمەند': item.name,
      'پیشە / ڕۆڵ': item.role,
      'ژمارەی بەشداریکردن': item.count,
      'کۆی پارەی وەرگیراو (د.ع)': Math.round(item.amount)
    }));

    // Add empty rows for separation
    excelData.push({
      'ناوی کارمەند': '----------------------------------',
      'پیشە / ڕۆڵ': '----------------',
      'ژمارەی بەشداریکردن': 0,
      'کۆی پارەی وەرگیراو (د.ع)': 0
    });

    // Add global group summary rows
    excelData.push({
      'ناوی کارمەند': 'سەرجەم بەشی پزیشكانی نەشتەرگەری',
      'پیشە / ڕۆڵ': 'پزیشک',
      'ژمارەی بەشداریکردن': filteredRecords.length,
      'کۆی پارەی وەرگیراو (د.ع)': Math.round(overallSurgeonsShare)
    });

    excelData.push({
      'ناوی کارمەند': 'سەرجەم بەشی پزیشکانی بێهۆشکاری (بەنج)',
      'پیشە / ڕۆڵ': 'پزیشکی بەنج',
      'ژمارەی بەشداریکردن': filteredRecords.length,
      'کۆی پارەی وەرگیراو (د.ع)': Math.round(overallAnesthesiaDocsShare)
    });

    excelData.push({
      'ناوی کارمەند': 'سەرجەم بەشی تیمی یاریدەدەری بەنج',
      'پیشە / ڕۆڵ': 'کارمەندی بەنج',
      'ژمارەی بەشداریکردن': filteredRecords.length,
      'کۆی پارەی وەرگیراو (د.ع)': Math.round(overallAnesthesiaStaffShare)
    });

    excelData.push({
      'ناوی کارمەند': 'سەرجەم بەشی تیمی نێرس و کارمەند',
      'پیشە / ڕۆڵ': 'کارمەندی نێرس',
      'ژمارەی بەشداریکردن': filteredRecords.length,
      'کۆی پارەی وەرگیراو (د.ع)': Math.round(overallNursesShare)
    });

    excelData.push({
      'ناوی کارمەند': 'سەرجەم داهاتی سەنتەر / نەخۆشخانە',
      'پیشە / ڕۆڵ': 'سەنتەر / کلینیک',
      'ژمارەی بەشداریکردن': filteredRecords.length,
      'کۆی پارەی وەرگیراو (د.ع)': Math.round(overallClinicShare)
    });

    if (Object.keys(overallCustomShareBreakdown).length > 0) {
      Object.entries(overallCustomShareBreakdown).forEach(([name, sum]) => {
        const count = filteredRecords.filter(rec => {
          const procType = rec.procedureTypes?.[0] || rec.procedureType || '';
          const split = getSplitForProcedure(procType);
          return split.customSplits?.some(item => (item.name || '').trim() === name);
        }).length;
        
        excelData.push({
          'ناوی کارمەند': `سەرجەم پشکی زیادەکراوی (${name})`,
          'پیشە / ڕۆڵ': 'پشکی زیادەکراوی تایبەت',
          'ژمارەی بەشداریکردن': count,
          'کۆی پارەی وەرگیراو (د.ع)': Math.round(sum)
        });
      });
    } else {
      excelData.push({
        'ناوی کارمەند': 'سەرجەم بەشە زیادکراوەکانی تر (ڕێژەی تر)',
        'پیشە / ڕۆڵ': 'بەشەکانی تر',
        'ژمارەی بەشداریکردن': filteredRecords.length,
        'کۆی پارەی وەرگیراو (د.ع)': Math.round(overallCustomShare)
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    if (!worksheet['!views']) {
      worksheet['!views'] = [];
    }
    worksheet['!views'].push({ RTL: true });

    // Auto fit column widths
    const maxLens = Object.keys(excelData[0] || {}).map(key => {
      let maxLen = key.length;
      excelData.forEach(row => {
        const val = row[key as keyof typeof row];
        if (val) {
          const strVal = String(val);
          if (strVal.length > maxLen) {
            maxLen = strVal.length;
          }
        }
      });
      return { wch: Math.min(Math.max(maxLen * 1.5 + 4, 12), 40) };
    });
    worksheet['!cols'] = maxLens;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Income Splits');

    XLSX.writeFile(workbook, `earnings_distribution_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportDetailToExcel = (type: 'department' | 'employee' | 'custom', id: string, label: string) => {
    let sourceRows: BreakdownDetailRow[] = [];
    if (type === 'department') {
      sourceRows = deptDetails[id]?.rows || [];
    } else if (type === 'employee') {
      sourceRows = empDetails[id]?.rows || [];
    } else if (type === 'custom') {
      sourceRows = customDetailsBreakdown[id]?.rows || [];
    }

    const filteredRows = sourceRows.filter(row => 
      !detailSearchQuery || row.patientName.toLowerCase().includes(detailSearchQuery.toLowerCase())
    );

    if (filteredRows.length === 0) return;

    const excelData = filteredRows.map(row => ({
      'ناوی نەخۆش': row.patientName,
      'ناوی وەرگر / کارمەند': row.recipientName || (type === 'employee' ? label : 'سەنتەر / نەخۆشخانە'),
      'بەروار': row.date,
      'جۆری پرۆسیجەرەکان': row.procedures,
      'پارەی گشتی فاکتەر (د.ع)': row.grossAmount,
      'پشکی حیسابکراو (د.ع)': Math.round(row.calculatedShare),
      'ڕێژە و بنەمای حیسابکردن': row.detailInfo
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    if (!worksheet['!views']) {
      worksheet['!views'] = [];
    }
    worksheet['!views'].push({ RTL: true });

    const maxLens = Object.keys(excelData[0] || {}).map(key => {
      let maxLen = key.length;
      excelData.forEach(row => {
        const val = row[key as keyof typeof row];
        if (val) {
          const strVal = String(val);
          if (strVal.length > maxLen) {
            maxLen = strVal.length;
          }
        }
      });
      return { wch: Math.min(Math.max(maxLen * 1.5 + 4, 12), 40) };
    });
    worksheet['!cols'] = maxLens;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'وردەکاری پشکەکان');

    XLSX.writeFile(workbook, `detail_report_${label.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportDepartmentsSummaryToExcel = () => {
    const list = [
      { label: 'بەشی پزیشکی نەشتەرگەر', amount: overallSurgeonsShare },
      { label: 'بەشی پزیشکانی بێهۆشکاری (بەنج)', amount: overallAnesthesiaDocsShare },
      { label: 'تیمی یاریدەدەرانی بەنج', amount: overallAnesthesiaStaffShare },
      { label: 'بەشی نێرس و کارمەندان', amount: overallNursesShare },
      { label: 'بەشی کلینیک / سەنتەر', amount: overallClinicShare },
      { label: 'کۆی گشتی پشکە زیادکراوەکانی تر', amount: overallCustomShare }
    ];

    const totalDistributed = overallSurgeonsShare + overallAnesthesiaDocsShare + overallAnesthesiaStaffShare + overallNursesShare + overallClinicShare + overallCustomShare;

    const excelData = list.map(item => ({
      'ناوی بەش': item.label,
      'کۆی پشکی بەش (د.ع)': Math.round(item.amount),
      'ڕێژە لە کۆی دابەشکردن': totalDistributed > 0 ? `${((item.amount / totalDistributed) * 100).toFixed(1)}%` : '0%'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    if (!worksheet['!views']) {
      worksheet['!views'] = [];
    }
    worksheet['!views'].push({ RTL: true });

    const maxLens = Object.keys(excelData[0] || {}).map(key => {
      let maxLen = key.length;
      excelData.forEach(row => {
        const val = row[key as keyof typeof row];
        if (val) {
          const strVal = String(val);
          if (strVal.length > maxLen) {
            maxLen = strVal.length;
          }
        }
      });
      return { wch: Math.min(Math.max(maxLen * 1.5 + 4, 12), 40) };
    });
    worksheet['!cols'] = maxLens;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'پشکی گشتی بەشەکان');
    XLSX.writeFile(workbook, `departments_summary_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportCustomSplitsSummaryToExcel = () => {
    if (Object.keys(overallCustomShareBreakdown).length === 0) return;

    const excelData = Object.entries(overallCustomShareBreakdown).map(([name, amount]) => ({
      'ناوی پشکی زیادکراو': name,
      'کۆی بڕی دابەشکراو (د.ع)': Math.round(amount)
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    if (!worksheet['!views']) {
      worksheet['!views'] = [];
    }
    worksheet['!views'].push({ RTL: true });

    const maxLens = Object.keys(excelData[0] || {}).map(key => {
      let maxLen = key.length;
      excelData.forEach(row => {
        const val = row[key as keyof typeof row];
        if (val) {
          const strVal = String(val);
          if (strVal.length > maxLen) {
            maxLen = strVal.length;
          }
        }
      });
      return { wch: Math.min(Math.max(maxLen * 1.5 + 4, 12), 40) };
    });
    worksheet['!cols'] = maxLens;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'پشکە زیادکراوەکانی تر');
    XLSX.writeFile(workbook, `custom_splits_summary_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportStaffSummaryToExcel = () => {
    const filteredEarnings = sortedIndividualEarnings.filter(emp => 
      !staffReportQuery || emp.name.toLowerCase().includes(staffReportQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(staffReportQuery.toLowerCase())
    );

    if (filteredEarnings.length === 0) return;

    const excelData = filteredEarnings.map(emp => ({
      'ناوی دکتۆر / کارمەند': emp.name,
      'پیشە / ڕۆڵ': emp.role,
      'ژمارەی حاڵەتەکانی بەشداریکرد': emp.count,
      'کۆی شایستەی دارایی (د.ع)': Math.round(emp.amount)
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    if (!worksheet['!views']) {
      worksheet['!views'] = [];
    }
    worksheet['!views'].push({ RTL: true });

    const maxLens = Object.keys(excelData[0] || {}).map(key => {
      let maxLen = key.length;
      excelData.forEach(row => {
        const val = row[key as keyof typeof row];
        if (val) {
          const strVal = String(val);
          if (strVal.length > maxLen) {
            maxLen = strVal.length;
          }
        }
      });
      return { wch: Math.min(Math.max(maxLen * 1.5 + 4, 12), 40) };
    });
    worksheet['!cols'] = maxLens;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'شایستەی کارمەندان');
    XLSX.writeFile(workbook, `staff_financial_summary_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
        <Activity className="w-12 h-12 text-emerald-600 animate-bounce mb-4" />
        <p className="text-slate-600 font-bold">تکایە چاوەڕێ بکە...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-emerald-700 flex flex-col items-center justify-center p-6 relative overflow-hidden" dir="rtl">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-400 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-md text-center z-10 space-y-6"
        >
          <div className="space-y-4">
            <div className="mx-auto w-20 h-20 bg-emerald-100 flex items-center justify-center rounded-2xl">
              <Activity className="w-10 h-10 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">پێشوازی لە سیستەمی Smart Clinic</h1>
              <p className="text-slate-500 text-sm font-semibold">بۆ چالاککردن و پاراستنی هەمیشەیی داتاکانت بە هەژماری گووگڵ بچۆ ژوورەوە</p>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <button 
              type="button"
              onClick={() => signIn()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              بە هەژماری گووگڵ بچۆ ژوورەوە
            </button>
          </div>

          <div className="mt-8 text-center bg-blue-50/50 rounded-xl p-4 border border-blue-100/50 space-y-2">
            <p className="text-[11px] text-blue-900/70 leading-relaxed font-bold">
              بە بەکارهێنانی هەژماری گووگڵ دەتوانیت داتاکانت لەسەر چەندین کۆمپیوتەر هاوبەش بکەیت و بیپارێزیت.
            </p>
            <div className="w-16 h-[1px] bg-blue-200/50 mx-auto my-2"></div>
            <p className="text-[11px] text-blue-900/60 leading-relaxed font-semibold">
              * کاتێک لەسەر کۆمپیوتەرێکی نوێ کلیک لە دوگمەی چوونەژوورەوە دەکرێت، پەنجەرەیەکی فەرمی گووگڵ دەکرێتەوە بۆ ئەوەی بە دەستی ئیمەیڵ و پاسۆردەکەت بنووسیت.
            </p>
          </div>

          {authError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-sm font-medium animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-right leading-relaxed">{authError}</p>
            </div>
          )}

          <div className="pt-2 space-y-3">
            <div className="bg-amber-50 border border-amber-100 text-amber-900 text-xs rounded-xl p-4 leading-relaxed font-semibold text-right space-y-1.5 shadow-3xs">
              <span className="block font-black text-amber-950">⚠️ چی ڕوودەدات ئەگەر دەرچوون (Sign Out) بکەیت یان کۆمپیوتەرەکەت فۆرمات بکەیت؟</span>
              هیچ کێشەیەک نییە! داتاکانت بە سەلامەتی لە داتابەیس پاشەکەوت کراون. 
              تەنها بە **چوونە ژوورەوە بە هەمان هەژماری گووگڵی پێشووت**، یەکسەر ١٠٠٪ کارەکانت و داتاکانت دەگەڕێنەوە بەردەستت.
            </div>

            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl p-4 leading-relaxed font-semibold text-right space-y-1 shadow-3xs">
              <span className="block font-black text-emerald-950 mb-1">💡 فەلسەفەی پاراستن و دڵنیایی داتا:</span>
              سەرجەم لێکدانەوە گشتییەکان، بڕی پارە و تۆماری نەخۆشەکان لەسەر ئەم **هەژمارەی گووگڵەت** لە داتابەیسی هەوری (Firestore) بە شێوەی هەمیشەیی پاشەکەوت دەبن.
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-between" id="app-root" dir="rtl">
      {/* Suggestions datalist for custom split recipients */}
      <datalist id="staff-suggestions-list">
        {allStaffNames.map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {/* Suggestions datalist for custom split names */}
      <datalist id="custom-split-names-list">
        {savedCustomSplitNames.map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {/* Header section */}
      <header className="border-b border-slate-200 bg-white shadow-xs py-4 px-6 sticky top-0 z-10" id="app-header">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                سیستەمی داتابەیسی تۆماری نەخۆشەکان
              </h1>
              <p className="text-xs text-slate-500 font-medium">پاشەکەوتکردنی زانیاری گشتی و بڕی تێچووی پرۆسیجەرەکان</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-black uppercase shadow-xs border border-emerald-200">
                {user?.displayName ? user.displayName.charAt(0) : user?.email?.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-slate-800 leading-none">{user?.displayName || user?.email}</span>
                <span className={`text-[9px] font-bold flex items-center gap-1 ${isSyncing ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {isSyncing ? (
                    <>سینک ئەکرێت (Cloud)... <Activity className="w-2.5 h-2.5 animate-spin" /></>
                  ) : (
                    <>پارێزراوە (Cloud) <Check className="w-2.5 h-2.5" /></>
                  )}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                signOut();
              }}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-black text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
              title="دەرچوون / گۆڕینی لۆگین"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>دەرچوون</span>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            {successAnimation && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1"
              >
                <Check className="w-4 h-4" /> زانیارییەکان بە سەرکەوتوویی پاشەکەوت کران!
              </motion.div>
            )}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer focus:ring-3 focus:ring-slate-100"
              id="manage-lists-btn"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              بەڕێوەبردنی لیستەکان
            </button>
            <button
              onClick={openAddModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-xs hover:shadow-md flex items-center gap-2 cursor-pointer focus:ring-3 focus:ring-emerald-200"
              id="add-patient-btn"
            >
              <Plus className="w-4 h-4" />
              تۆمارکردنی نەخۆشی نوێ
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 space-y-6">
        
        {/* View Tabs Selector */}
        <div className="bg-white p-1 rounded-2xl border border-slate-200/80 flex flex-wrap gap-2 max-w-4xl shadow-2xs" id="main-view-tabs">
          <button
            type="button"
            onClick={() => setActiveMainTab('records')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeMainTab === 'records'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-4.5 h-4.5" />
            <span>تۆمارە گشتییەکان</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveMainTab('distribution')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeMainTab === 'distribution'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
            id="main-tab-distribution"
          >
            <Coins className="w-4.5 h-4.5" />
            <span>بەشی دابەشکاری و نیسبەی کار</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('reports')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeMainTab === 'reports'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
            id="main-tab-reports"
          >
            <PieChart className="w-4.5 h-4.5" />
            <span>ڕاپۆرتی گشتی و دیتەیڵ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('settlements')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeMainTab === 'settlements'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
            id="main-tab-settlements"
          >
            <Wallet className="w-4.5 h-4.5" />
            <span>واسڵکردنی شایستەکان</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('analyze')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeMainTab === 'analyze'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
            id="main-tab-analyze"
          >
            <BarChartIcon className="w-4.5 h-4.5" />
            <span>شیکاری و داتا</span>
          </button>
        </div>
        
        {activeMainTab === 'records' && (
          <>
            {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="stats-container">
          {/* Total Patients */}
          <motion.div 
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-xs"
            id="stat-box-patients"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 block">کۆی نەخۆشە تۆمارکراوەکان</span>
              <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {filteredRecords.length}
              </span>
              <span className="text-xs text-slate-400 block">نەخۆش لە داتابەیسدا</span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <User className="w-6 h-6" />
            </div>
          </motion.div>

          {/* Total Received Amount */}
          <motion.div 
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-xs"
            id="stat-box-total"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 block">سەرجەم پارەی وەرگیراو</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight text-emerald-600">
                {totalReceivedAmount.toLocaleString()} <span className="text-sm font-sans font-medium text-slate-500">د.ع</span>
              </span>
              <span className="text-xs text-slate-400 block">داهاتی گشتی پرۆسیجەرەکان</span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </motion.div>

          {/* Average Cost per Procedure */}
          <motion.div 
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-xs"
            id="stat-box-avg"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 block">تێکڕای تێچوو بۆ هەر یەکێک</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                {Math.round(averageAmount).toLocaleString()} <span className="text-sm font-sans font-medium text-slate-500">د.ع</span>
              </span>
              <span className="text-xs text-slate-400 block">دابەشکاری بۆ هەر چارەسەرێک</span>
            </div>
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </motion.div>
        </div>

        {/* Database Filtering & Action Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs" id="filter-bar">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Filter className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
              <span>فلتەرکردن و گەڕانی پێشکەوتوو</span>
            </h3>
            {(searchQuery || patientNameSearchQuery || selectedDoctorFilters.length > 0 || selectedProcedureFilters.length > 0 || startDateFilter || endDateFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setPatientNameSearchQuery('');
                  setSelectedDoctorFilters([]);
                  setSelectedProcedureFilters([]);
                  setStartDateFilter('');
                  setEndDateFilter('');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 transition-all cursor-pointer bg-rose-50 hover:bg-rose-100 py-1.5 px-3 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
                <span>پاککردنەوەی فلتەرەکان</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Input */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 block border-r-2 border-emerald-500 pr-1.5 mb-1.5">گەڕانی گشتی لە نێوان تۆمارەکاندا</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                  <Search className="w-4 h-4" />
                </span>
                <input 
                  type="text" 
                  placeholder="گەڕان بەپێی نەخۆش، نێرس..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:ring-2 focus:ring-emerald-500 rounded-xl pr-9 pl-3 py-2 text-xs focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
                  id="search-input"
                />
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-800 block border-r-2 border-emerald-500 pr-1.5 mb-1.5">فلتەری بەرواری تۆمارکردن</label>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:ring-2 focus:ring-emerald-500 rounded-xl px-2 py-1.5 text-xs focus:outline-none transition-all text-slate-800 cursor-pointer text-center"
                    id="filter-start-date"
                  />
                </div>
                <span className="text-slate-400 text-xs font-bold">تا</span>
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:ring-2 focus:ring-emerald-500 rounded-xl px-2 py-1.5 text-xs focus:outline-none transition-all text-slate-800 cursor-pointer text-center"
                    id="filter-end-date"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            {/* Dynamic Doctor Multi-Selection Pool */}
            <div className="space-y-1.5">
              <span className="text-[13px] font-bold text-slate-800 block border-r-2 border-emerald-500 pr-1.5 mb-2.5">فلتەرکردن بەپێی ناوی دکتۆرەکان</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDoctorFilters([])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedDoctorFilters.length === 0 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  گشت دکتۆرەکان
                </button>
                {uniqueDoctors.map(doc => {
                  const isSelected = selectedDoctorFilters.includes(doc);
                  return (
                    <button
                      type="button"
                      key={doc}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedDoctorFilters(prev => prev.filter(d => d !== doc));
                        } else {
                          setSelectedDoctorFilters(prev => [...prev, doc]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-900 text-white shadow-xs' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{doc}</span>
                      {isSelected && <Check className="w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Procedure Multi-Selection Pool */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[13px] font-bold text-slate-800 block border-r-2 border-emerald-500 pr-1.5 mb-2.5">فلتەرکردن بەپێی جۆری پرۆسیجەرەکان</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedProcedureFilters([])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedProcedureFilters.length === 0 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  گشت پرۆسیجەرەکان
                </button>
                {uniqueProcedures.map(proc => {
                  const isSelected = selectedProcedureFilters.includes(proc);
                  return (
                    <button
                      type="button"
                      key={proc}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedProcedureFilters(prev => prev.filter(p => p !== proc));
                        } else {
                          setSelectedProcedureFilters(prev => [...prev, proc]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-900 text-white shadow-xs' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{proc}</span>
                      {isSelected && <Check className="w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Database List Display */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs" id="database-display">
          <div className="border-b border-slate-200 bg-slate-50/60 px-6 py-4 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 flex-1 w-full">
              <div className="flex items-center gap-2.5 shrink-0">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-slate-500" />
                  خشتەی تۆمارەکانی داتابەیس
                </h3>
                <span className="text-xs bg-slate-200/80 text-slate-700 px-2.5 py-0.5 rounded-lg font-mono font-bold">
                  {filteredRecords.length} تۆمار
                </span>
              </div>
              
              {/* Patient Name Search Input closely integrated */}
              <div className="relative flex-1 max-w-sm w-full sm:mr-4">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                  <Search className="w-3.5 h-3.5 text-emerald-600" />
                </span>
                <input
                  type="text"
                  placeholder="بۆ ناوی نەخۆش بگەڕێ..."
                  value={patientNameSearchQuery}
                  onChange={(e) => setPatientNameSearchQuery(e.target.value)}
                  className="w-full bg-white hover:bg-slate-55 focus:bg-white border border-slate-200 focus:ring-2 focus:ring-emerald-500 rounded-xl pr-8 pl-8 py-2 text-xs font-bold focus:outline-none transition-all placeholder:text-slate-400 text-slate-800 shadow-3xs"
                  id="patient-name-table-search"
                />
                {patientNameSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPatientNameSearchQuery('')}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="سڕینەوەی گەڕانی ناو"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            {filteredRecords.length > 0 && (
              <button
                type="button"
                onClick={exportToExcel}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer whitespace-nowrap self-stretch sm:self-auto justify-center"
                title="داگرتنی داتا فلتەرکراوەکان وەک فایلی ئێکسڵ"
                id="export-excel-btn"
              >
                <Download className="w-4 h-4" />
                <span>داگرتن وەک ئێکسڵ (Excel)</span>
              </button>
            )}
          </div>

          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3" id="empty-state">
              <p className="text-lg font-bold text-slate-700">هیچ تۆمارێک نەدۆزرایەوە</p>
              <p className="text-sm max-w-md mx-auto text-slate-400">
                هیچ نەخۆشێک هاوتای ئەم گەڕان یان فلتەرە نییە. دەتوانیت تۆماری نوێ بنوسیت یان پشکنینەکان لابدەیت.
              </p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setPatientNameSearchQuery('');
                  setSelectedDoctorFilters([]);
                  setSelectedProcedureFilters([]);
                  setStartDateFilter('');
                  setEndDateFilter('');
                }}
                className="text-emerald-600 text-xs font-bold underline hover:text-emerald-700 cursor-pointer"
              >
                پاککردنەوەی هەموو فلتەرەکان
              </button>
            </div>
          ) : (
            /* Patients list (Responsive layout: Grid on mobile, pristine structured table on bigger screens) */
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right border-collapse text-xs whitespace-nowrap" id="patient-data-table">
                <thead>
                  <tr className="bg-slate-800 text-slate-100 text-xs font-extrabold border-b border-slate-700">
                    <th className="px-3 py-3 font-bold">ناوی نەخۆش</th>
                    <th className="px-3 py-3 font-bold">کۆی بڕی پارە (د.ع)</th>
                    <th className="px-3 py-3 font-bold">جۆری پرۆسیجەر</th>
                    <th className="px-3 py-3 font-bold">ناوی دکتۆر</th>
                    <th className="px-3 py-3 font-bold">پزیشکی بەنج</th>
                    <th className="px-3 py-3 font-bold">کارمەندی بەنج</th>
                    <th className="px-3 py-3 font-bold">کارمەندی نێرس (مەڵتی)</th>
                    <th className="px-3 py-3 font-bold">تێبینی</th>
                    <th className="px-3 py-3 font-bold">بەروار</th>
                    <th className="px-3 py-3 text-left font-bold">کردارەکان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedRecords.map((record) => (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={record.id} 
                      className="hover:bg-slate-50/70 transition-all border-b border-slate-100"
                      id={`patient-row-${record.id}`}
                    >
                      {/* Name */}
                      <td className="px-3 py-3 font-bold text-slate-800 whitespace-nowrap">
                        {record.patientName}
                      </td>
                      
                      {/* Money */}
                      <td className="px-3 py-3 font-mono font-bold text-emerald-600 whitespace-nowrap">
                        {record.totalAmount.toLocaleString()} د.ع
                      </td>

                      {/* Procedure info */}
                      <td className="px-3 py-3">
                        {record.procedureTypes && record.procedureTypes.length > 0 ? (
                          <div className="flex flex-col gap-1 items-start">
                            {record.procedureTypes.map((proc) => (
                              <span 
                                key={proc}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium text-[11px]"
                              >
                                <Stethoscope className="w-3 h-3 text-slate-400" />
                                {proc}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                            {record.procedureType}
                          </span>
                        )}
                      </td>

                      {/* Doctor Name */}
                      <td className="px-3 py-3 text-slate-600 font-medium">
                        {record.doctorNames && record.doctorNames.length > 0 ? (
                          <div className="flex flex-col gap-1 items-start">
                            {record.doctorNames.map((doc) => (
                              <span 
                                key={doc}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 font-medium text-[11px]"
                              >
                                <User className="w-3 h-3 text-slate-400" />
                                {doc}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="whitespace-nowrap">{record.doctorName}</span>
                        )}
                      </td>

                      {/* Anesthesia Doctor */}
                      <td className="px-3 py-3">
                        {record.anesthesiaDoctors && record.anesthesiaDoctors.length > 0 ? (
                          <div className="flex flex-col gap-1 items-start">
                            {record.anesthesiaDoctors.map((doc) => (
                              <span 
                                key={doc}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium text-[11px]"
                              >
                                <User className="w-3 h-3 text-indigo-500" />
                                {cleanTitle(doc)}
                              </span>
                            ))}
                          </div>
                        ) : record.anesthesiaDoctor ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium text-xs">
                            <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            {cleanTitle(record.anesthesiaDoctor)}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic text-xs whitespace-nowrap">دياری نەکراوە</span>
                        )}
                        {record.manualAnesthesiaDocAmount !== undefined && record.manualAnesthesiaDocAmount > 0 && (
                          <div className="mt-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 max-w-max">
                            بڕی دەستی: {record.manualAnesthesiaDocAmount.toLocaleString()} د.ع
                          </div>
                        )}
                      </td>

                      {/* Anesthesia Staff */}
                      <td className="px-3 py-3">
                        {record.anesthesiaStaffs && record.anesthesiaStaffs.length > 0 ? (
                          <div className="flex flex-col gap-1 items-start">
                            {record.anesthesiaStaffs.map((staff) => (
                              <span 
                                key={staff}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 font-medium text-[11px]"
                              >
                                <Users className="w-3 h-3 text-blue-500" />
                                {cleanTitle(staff)}
                              </span>
                            ))}
                          </div>
                        ) : record.anesthesiaStaff ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 font-medium text-xs">
                            <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            {cleanTitle(record.anesthesiaStaff)}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic text-xs whitespace-nowrap">دياری نەکراوە</span>
                        )}
                        {record.manualAnesthesiaStaffAmount !== undefined && record.manualAnesthesiaStaffAmount > 0 && (
                          <div className="mt-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 max-w-max">
                            بڕی دەستی: {record.manualAnesthesiaStaffAmount.toLocaleString()} د.ع
                          </div>
                        )}
                      </td>

                      {/* Nurses Info */}
                      <td className="px-3 py-3">
                        {record.nurses && record.nurses.length > 0 ? (
                          <div className="flex flex-col gap-1 items-start">
                            {record.nurses.map((nurse) => (
                              <span 
                                key={nurse}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium text-[11px]"
                              >
                                <Users className="w-3 h-3 text-emerald-600" />
                                {cleanTitle(nurse)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs whitespace-nowrap">دیاری نەکراوە</span>
                        )}
                      </td>

                      {/* Notes Info */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {record.notes ? (
                          <div className="flex items-center gap-1.5 max-w-[200px]" title={record.notes}>
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-600 text-xs truncate max-w-[170px]">
                              {record.notes}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 italic text-xs whitespace-nowrap">نيیە</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          {record.date}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 text-left whitespace-nowrap">
                        <div className="flex justify-end gap-2" id={`actions-${record.id}`}>
                          <button
                            type="button"
                            onClick={() => {
                              setNewSavedRecord(record);
                              setShowReceiptModal(true);
                            }}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                            title="ڕاکێشانی وەسڵ (Print)"
                            id={`receipt-btn-${record.id}`}
                          >
                            <Printer className="w-4 h-4 text-emerald-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(record)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                            title="دەستکاریکردن"
                            id={`edit-btn-${record.id}`}
                          >
                            <Edit3 className="w-4 h-4 text-slate-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRecord(record)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                            title="سڕینەوە"
                            id={`delete-btn-${record.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
                 <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-bold">نیشاندانی</span>
                    <select
                      value={tableRowsPerPage}
                      onChange={(e) => {
                         setTableRowsPerPage(Number(e.target.value));
                         setTableCurrentPage(1);
                      }}
                      className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2 py-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                       <option value={10}>10</option>
                       <option value={20}>20</option>
                       <option value={30}>30</option>
                       <option value={50}>50</option>
                    </select>
                    <span className="text-xs text-slate-600 font-bold">لە {filteredRecords.length} تۆمار</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setTableCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={safeCurrentPage === 1}
                      className="px-3 py-1.5 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-colors"
                    >
                      پێشووتر
                    </button>
                    <span className="text-xs font-bold text-slate-700 px-2 flex items-center">
                       پەڕەی {safeCurrentPage} لە {totalTablePages}
                    </span>
                    <button
                      onClick={() => setTableCurrentPage(prev => Math.min(prev + 1, totalTablePages))}
                      disabled={safeCurrentPage === totalTablePages}
                      className="px-3 py-1.5 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-colors"
                    >
                      دواتر
                    </button>
                 </div>
              </div>

            </div>
          )}
        </div>
        </>
       )}

        {/* Distribution Tab */}
        {activeMainTab === 'distribution' && (
          <div className="space-y-6" id="distribution-dashboard">
            <div className="grid grid-cols-1 gap-6">
              {/* Ratio Setup Panel */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4" id="ratio-configuration-col">
                <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm md:text-base flex items-center gap-2">
                      <Percent className="w-5 h-5 text-emerald-600" />
                      <span>ڕێکخستنی نیسیبەی دابەشکاری بەپێی پرۆسیجەر</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">سەدی (%) دابەشکارییەکە بۆ هەر جۆرە پرۆسیجەرێک لێرە ڕێکبخە</p>
                  </div>
                  
                  {/* Local procedure search */}
                  <div className="relative w-full md:w-auto">
                    <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 pointer-events-none">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="گەڕان لە پرۆسیجەرەکان..."
                      id="proc-split-search"
                      value={procSplitQuery}
                      onChange={(e) => setProcSplitQuery(e.target.value)}
                      className="bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded-xl pr-7/5 pl-2.5 py-1.5 text-xs text-slate-850 focus:outline-none transition-all placeholder:text-slate-400 w-full"
                    />
                  </div>
                </div>

                {/* Configuration List */}
                <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1" id="presets-split-list">
                  {savedProcedures.filter(p => !deactivatedItems.procedure?.includes(p)).filter(p => p.toLowerCase().includes(procSplitQuery.toLowerCase())).length === 0 ? (
                    <div className="text-center text-slate-400 py-12 text-xs font-semibold">
                      هیچ پرۆسیجەرێکی تەرخانکراو یان چالاک نەدۆزرایەوە بەم ناوە!
                    </div>
                  ) : (
                    savedProcedures.filter(p => !deactivatedItems.procedure?.includes(p)).filter(p => p.toLowerCase().includes(procSplitQuery.toLowerCase())).map((proc) => {
                      const split = getSplitForProcedure(proc);
                      const standardPercent = split.surgeonPercent + split.anesthesiaDocPercent + split.anesthesiaStaffPercent + split.nursesPercent + split.clinicPercent;
                      const customPercent = (split.customSplits || []).reduce((sum, item) => sum + (item.valueType === 'fixed' ? 0 : item.percent), 0);
                      const totalPercent = standardPercent + customPercent;
                      
                      const updateSplit = (field: keyof ProcedureSplit, value: number) => {
                        const current = getSplitForProcedure(proc);

                        setProcedureSplits(prev => ({
                          ...prev,
                          [proc]: {
                            ...current,
                            [field]: value
                          }
                        }));
                      };


                      return (
                        <div key={proc} className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3.5 shadow-3xs hover:border-slate-300 hover:bg-slate-100/30 transition-all">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200/50 pb-2">
                            <span className="text-[13px] font-black text-slate-900 flex items-center gap-1.5 text-right leading-relaxed">
                              <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{proc}</span>
                            </span>
                            <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black ${
                              totalPercent === 100 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              کۆی نیسبەکان: {totalPercent}% {totalPercent === 100 ? '✅' : '⚠️'}
                            </span>
                          </div>

                          {/* Inputs Wrapper */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-slate-700">
                            {/* Surgeon share */}
                            <div className="space-y-1.5 p-2.5 bg-slate-100/50 rounded-xl border border-slate-200/50 transition-all hover:bg-slate-100/80">
                              <label className="text-[10px] font-black text-slate-600 block">پزیشکی نەشتەرگەری</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={split.surgeonPercent}
                                  onChange={(e) => updateSplit('surgeonPercent', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                                  className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded-lg px-2 py-1 text-xs text-center font-mono focus:outline-none font-bold"
                                />
                                <span className="absolute left-1.5 top-1 text-[10px] text-slate-400 font-bold">%</span>
                              </div>

                              {/* Deduct type selector */}
                              <div className="mt-1">
                                <select
                                  value={split.surgeonDeductStage !== undefined ? split.surgeonDeductStage : (split.surgeonDeductType === 'first' ? 2 : 0)}
                                  onChange={(e) => {
                                    const stageVal = Number(e.target.value);
                                    setProcedureSplits(prev => ({
                                      ...prev,
                                      [proc]: {
                                        ...split,
                                        surgeonDeductStage: stageVal,
                                        surgeonDeductType: stageVal > 0 ? 'first' : 'concurrent'
                                      }
                                    }));
                                  }}
                                  className="w-full bg-slate-100 border border-slate-200 rounded-lg py-0.5 px-1 text-[8.5px] font-black text-slate-750 text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                >
                                  <option value={0}>هاوبەش (دوای بڕینەکان)</option>
                                  <option value={1}>بڕینی پێشوەختە - قۆناغی ١</option>
                                  <option value={2}>بڕینی پێشوەختە - قۆناغی ٢</option>
                                  <option value={3}>بڕینی پێشوەختە - قۆناغی ٣</option>
                                  <option value={4}>بڕینی پێشوەختە - قۆناغی ٤</option>
                                  <option value={5}>بڕینی پێشوەختە - قۆناغی ٥</option>
                                  <option value={6}>بڕینی پێشوەختە - قۆناغی ٦</option>
                                </select>
                              </div>
                               
                               {/* Sub-list of surgeons for individual splits */}
                               <div className="space-y-1 pt-1.5 border-t border-slate-200/60 mt-1.5">
                                 <span className="text-[8.5px] text-slate-400 font-black block">پشکی پزشکەکان بە جیا:</span>
                                 {(() => {
                                   const activeDocs = savedDoctors.filter(d => !deactivatedItems.doctor?.includes(d));
                                   const totalDocsSum = split.surgeonPercent <= 0 ? 0 : activeDocs.reduce((sum, d) => sum + (split.staffPercents?.[cleanTitle(d)] || 0), 0);
                                   return (
                                     <>
                                       <div className="flex justify-between items-center text-[8.5px] font-black pb-1 border-b border-dashed border-slate-200/55 mb-1.5">
                                         <span className="text-slate-500">کۆی تەرخانکراو:</span>
                                         <span className={`font-mono ${totalDocsSum > split.surgeonPercent ? 'text-rose-600 font-extrabold animate-pulse' : 'text-slate-650 font-bold'}`}>
                                           %{totalDocsSum} / %{split.surgeonPercent}
                                         </span>
                                       </div>
                                       {totalDocsSum > split.surgeonPercent && (
                                         <div className="p-1.5 bg-amber-50 border border-amber-200/50 rounded-lg text-[8px] text-amber-700 leading-relaxed font-bold mb-2">
                                           ⚠️ کۆی بەشی پزیشکەکان (%{totalDocsSum}) لە بەشی گشتی (%{split.surgeonPercent}) زیاترە! لە کاتی تۆماردا، سیستەمەکە ڕێژەکەیان بە شێوەیەکی زیرەک و ڕێکژراو کەم دەکاتەوە هەتا پارەی بەشێنراو بەسەر کارمەنددا زیاتر دابەش نەبێت لە پارەی نەخۆشەکە.
                                         </div>
                                       )}
                                     </>
                                   );
                                 })()}
                                 {savedDoctors.filter(doc => !deactivatedItems.doctor?.includes(doc)).length === 0 ? (
                                   <span className="text-[8px] text-slate-400 italic block">هیچ پزیشکێک نییە</span>
                                 ) : (
                                   savedDoctors.filter(doc => !deactivatedItems.doctor?.includes(doc)).map(doc => {
                                     const cleanDoc = cleanTitle(doc);
                                     const hasStage = split.surgeonDeductStage !== undefined && split.surgeonDeductStage !== null && split.surgeonDeductStage > 0;
                                     const isBlocked = split.surgeonPercent <= 0 && !hasStage;
                                     const val = isBlocked ? 0 : (split.staffPercents?.[cleanDoc] ?? '');
                                     return (
                                       <div key={doc} className="flex justify-between items-center gap-1">
                                         <span className={`text-[8.5px] font-bold truncate max-w-[65px] text-right ${isBlocked ? 'text-slate-400' : 'text-slate-600'}`} title={doc}>{doc}</span>
                                         <div className="relative w-12 shrink-0">
                                           <input
                                             type="number"
                                             placeholder="هاوبەش"
                                             value={val}
                                             disabled={isBlocked}
                                             onChange={(e) => {
                                               const updatedPercents = { ...(split.staffPercents || {}) };
                                               const textVal = e.target.value;
                                               if (textVal === '') {
                                                 delete updatedPercents[cleanDoc];
                                                } else {
                                                  const numVal = Math.max(0, Math.min(100, Number(textVal) || 0));
                                                  updatedPercents[cleanDoc] = numVal;
                                                }
                                                setProcedureSplits(prev => ({
                                                  ...prev,
                                                  [proc]: {
                                                    ...split,
                                                    staffPercents: updatedPercents
                                                  }
                                                }));
                                              }}
                                              className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[8.5px] font-mono text-center font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-300 disabled:bg-slate-100 disabled:text-slate-400 cursor-not-allowed"
                                            />
                                            <span className="absolute left-0.5 top-0.5 text-[7px] text-slate-400 font-bold">%</span>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              {/* Anesthesia Doctor share */}
                              <div className="space-y-1.5 p-2.5 bg-slate-100/50 rounded-xl border border-slate-200/50 transition-all hover:bg-slate-100/80">
                                <label className="text-[10px] font-black text-slate-600 block">پزیشکی بەنج</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={split.anesthesiaDocPercent}
                                    onChange={(e) => updateSplit('anesthesiaDocPercent', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                                    className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded-lg px-2 py-1 text-xs text-center font-mono focus:outline-none font-bold"
                                  />
                                  <span className="absolute left-1.5 top-1 text-[10px] text-slate-400 font-bold">%</span>
                                </div>

                                {/* Deduct type selector */}
                                <div className="mt-1">
                                  <select
                                    value={split.anesthesiaDocDeductStage !== undefined ? split.anesthesiaDocDeductStage : (split.anesthesiaDocDeductType === 'first' ? 2 : 0)}
                                    onChange={(e) => {
                                      const stageVal = Number(e.target.value);
                                      setProcedureSplits(prev => ({
                                        ...prev,
                                        [proc]: {
                                          ...split,
                                          anesthesiaDocDeductStage: stageVal,
                                          anesthesiaDocDeductType: stageVal > 0 ? 'first' : 'concurrent'
                                        }
                                      }));
                                    }}
                                    className="w-full bg-slate-100 border border-slate-200 rounded-lg py-0.5 px-1 text-[8.5px] font-black text-slate-710 text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                  >
                                    <option value={0}>هاوبەش (دوای بڕینەکان)</option>
                                    <option value={1}>بڕینی پێشوەختە - قۆناغی ١</option>
                                    <option value={2}>بڕینی پێشوەختە - قۆناغی ٢</option>
                                    <option value={3}>بڕینی پێشوەختە - قۆناغی ٣</option>
                                    <option value={4}>بڕینی پێشوەختە - قۆناغی ٤</option>
                                    <option value={5}>بڕینی پێشوەختە - قۆناغی ٥</option>
                                    <option value={6}>بڕینی پێشوەختە - قۆناغی ٦</option>
                                  </select>
                                </div>
                                
                                {/* Sub-list of anesthesia doctors for individual splits */}
                                <div className="space-y-1 pt-1.5 border-t border-slate-200/60 mt-1.5">
                                  <span className="text-[8.5px] text-slate-400 font-black block">پشکی پزشکەکان بە جیا:</span>
                                  {(() => {
                                    const activeAds = savedAnesthesiaDoctors.filter(ad => !deactivatedItems.anesthesiaDoctor?.includes(ad));
                                    const totalAdsSum = split.anesthesiaDocPercent <= 0 ? 0 : activeAds.reduce((sum, d) => sum + (split.staffPercents?.[cleanTitle(d)] || 0), 0);
                                    return (
                                      <>
                                        <div className="flex justify-between items-center text-[8.5px] font-black pb-1 border-b border-dashed border-slate-200/55 mb-1.5">
                                          <span className="text-slate-500">کۆی تەرخانکراو:</span>
                                          <span className={`font-mono ${totalAdsSum > split.anesthesiaDocPercent ? 'text-rose-600 font-extrabold animate-pulse' : 'text-slate-650 font-bold'}`}>
                                            %${totalAdsSum} / %${split.anesthesiaDocPercent}
                                          </span>
                                        </div>
                                        {totalAdsSum > split.anesthesiaDocPercent && (
                                          <div className="p-1.5 bg-amber-50 border border-amber-200/50 rounded-lg text-[8px] text-amber-700 leading-relaxed font-bold mb-2">
                                            ⚠️ کۆی بەشی پزیشکەکان (%${totalAdsSum}) لە بەشی گشتی (%${split.anesthesiaDocPercent}) زیاترە! لە کاتی تۆماردا، سیستەمەکە ڕێژەکەیان بە شێوەیەکی زیرەک و ڕێکژراو کەم دەکاتەوە هەتا پارەی بەشێنراو بەسەر کارمەنددا زیاتر دابەش نەبێت لە پارەی نەخۆشەکە.
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                  {savedAnesthesiaDoctors.filter(ad => !deactivatedItems.anesthesiaDoctor?.includes(ad)).length === 0 ? (
                                    <span className="text-[8px] text-slate-400 italic block">هیچ پزیشکێک نییە</span>
                                  ) : (
                                    savedAnesthesiaDoctors.filter(ad => !deactivatedItems.anesthesiaDoctor?.includes(ad)).map(ad => {
                                      const cleanAd = cleanTitle(ad);
                                      const hasStage = split.anesthesiaDocDeductStage !== undefined && split.anesthesiaDocDeductStage !== null && split.anesthesiaDocDeductStage > 0;
                                      const isBlocked = split.anesthesiaDocPercent <= 0 && !hasStage;
                                      const val = isBlocked ? 0 : (split.staffPercents?.[cleanAd] ?? '');
                                      return (
                                        <div key={ad} className="flex justify-between items-center gap-1">
                                          <span className={`text-[8.5px] font-bold truncate max-w-[65px] text-right ${isBlocked ? 'text-slate-400' : 'text-slate-600'}`} title={ad}>{ad}</span>
                                          <div className="relative w-12 shrink-0">
                                            <input
                                              type="number"
                                              placeholder="هاوبەش"
                                              value={val}
                                              disabled={isBlocked}
                                              onChange={(e) => {
                                                const updatedPercents = { ...(split.staffPercents || {}) };
                                                const textVal = e.target.value;
                                                if (textVal === '') {
                                                  delete updatedPercents[cleanAd];
                                                } else {
                                                  const numVal = Math.max(0, Math.min(100, Number(textVal) || 0));
                                                  updatedPercents[cleanAd] = numVal;
                                                }
                                                setProcedureSplits(prev => ({
                                                  ...prev,
                                                  [proc]: {
                                                    ...split,
                                                    staffPercents: updatedPercents
                                                  }
                                                }));
                                              }}
                                              className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[8.5px] font-mono text-center font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-300 disabled:bg-slate-100 disabled:text-slate-400 cursor-not-allowed"
                                            />
                                            <span className="absolute left-0.5 top-0.5 text-[7px] text-slate-400 font-bold">%</span>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              {/* Anesthesia Staff share */}
                              <div className="space-y-1.5 p-2.5 bg-slate-100/50 rounded-xl border border-slate-200/50 transition-all hover:bg-slate-100/80">
                                <label className="text-[10px] font-black text-slate-600 block">یاریدەدەری بەنج</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={split.anesthesiaStaffPercent}
                                    onChange={(e) => updateSplit('anesthesiaStaffPercent', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                                    className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded-lg px-2 py-1 text-xs text-center font-mono focus:outline-none font-bold"
                                  />
                                  <span className="absolute left-1.5 top-1 text-[10px] text-slate-400 font-bold">%</span>
                                </div>

                                {/* Deduct type selector */}
                                <div className="mt-1">
                                  <select
                                    value={split.anesthesiaStaffDeductStage !== undefined ? split.anesthesiaStaffDeductStage : (split.anesthesiaStaffDeductType === 'first' ? 2 : 0)}
                                    onChange={(e) => {
                                      const stageVal = Number(e.target.value);
                                      setProcedureSplits(prev => ({
                                        ...prev,
                                        [proc]: {
                                          ...split,
                                          anesthesiaStaffDeductStage: stageVal,
                                          anesthesiaStaffDeductType: stageVal > 0 ? 'first' : 'concurrent'
                                        }
                                      }));
                                    }}
                                    className="w-full bg-slate-100 border border-slate-200 rounded-lg py-0.5 px-1 text-[8.5px] font-black text-slate-710 text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                  >
                                    <option value={0}>هاوبەش (دوای بڕینەکان)</option>
                                    <option value={1}>بڕینی پێشوەختە - قۆناغی ١</option>
                                    <option value={2}>بڕینی پێشوەختە - قۆناغی ٢</option>
                                    <option value={3}>بڕینی پێشوەختە - قۆناغی ٣</option>
                                    <option value={4}>بڕینی پێشوەختە - قۆناغی ٤</option>
                                    <option value={5}>بڕینی پێشوەختە - قۆناغی ٥</option>
                                    <option value={6}>بڕینی پێشوەختە - قۆناغی ٦</option>
                                  </select>
                                </div>

                                {/* Sub-list of anesthesia staffs */}
                                <div className="space-y-1 pt-1.5 border-t border-slate-200/60 mt-1.5">
                                  <span className="text-[8.5px] text-slate-400 font-black block">پشکی یاریدەدەران بە جیا:</span>
                                  {(() => {
                                    const activeSts = savedAnesthesiaStaff.filter(st => !deactivatedItems.anesthesiaStaff?.includes(st));
                                    const totalStsSum = split.anesthesiaStaffPercent <= 0 ? 0 : activeSts.reduce((sum, d) => sum + (split.staffPercents?.[cleanTitle(d)] || 0), 0);
                                    return (
                                      <>
                                        <div className="flex justify-between items-center text-[8.5px] font-black pb-1 border-b border-dashed border-slate-200/55 mb-1.5">
                                          <span className="text-slate-500">کۆی تەرخانکراو:</span>
                                          <span className={`font-mono ${totalStsSum > split.anesthesiaStaffPercent ? 'text-rose-600 font-extrabold animate-pulse' : 'text-slate-650 font-bold'}`}>
                                            %${totalStsSum} / %${split.anesthesiaStaffPercent}
                                          </span>
                                        </div>
                                        {totalStsSum > split.anesthesiaStaffPercent && (
                                          <div className="p-1.5 bg-amber-50 border border-amber-200/50 rounded-lg text-[8px] text-amber-700 leading-relaxed font-bold mb-2">
                                            ⚠️ کۆی بەشی یاریدەدەران (%${totalStsSum}) لە بەشی گشتی (%${split.anesthesiaStaffPercent}) زیاترە! لە کاتی تۆماردا، سیستەمەکە ڕێژەکەیان بە شێوەیەکی زیرەک و ڕێکژراو کەم دەکاتەوە هەتا پارەی بەشێنراو بەسەر کارمەنددا زیاتر دابەش نەبێت لە پارەی نەخۆشەکە.
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                  {savedAnesthesiaStaff.filter(st => !deactivatedItems.anesthesiaStaff?.includes(st)).length === 0 ? (
                                    <span className="text-[8px] text-slate-400 italic block">هیچ کارمەندێک نییە</span>
                                  ) : (
                                    savedAnesthesiaStaff.filter(st => !deactivatedItems.anesthesiaStaff?.includes(st)).map(st => {
                                      const cleanSt = cleanTitle(st);
                                      const hasStage = split.anesthesiaStaffDeductStage !== undefined && split.anesthesiaStaffDeductStage !== null && split.anesthesiaStaffDeductStage > 0;
                                      const isBlocked = split.anesthesiaStaffPercent <= 0 && !hasStage;
                                      const val = isBlocked ? 0 : (split.staffPercents?.[cleanSt] ?? '');
                                      return (
                                        <div key={st} className="flex justify-between items-center gap-1">
                                          <span className={`text-[8.5px] font-bold truncate max-w-[65px] text-right ${isBlocked ? 'text-slate-400' : 'text-slate-600'}`} title={st}>{st}</span>
                                          <div className="relative w-12 shrink-0">
                                            <input
                                              type="number"
                                              placeholder="هاوبەش"
                                              value={val}
                                              disabled={isBlocked}
                                              onChange={(e) => {
                                                const updatedPercents = { ...(split.staffPercents || {}) };
                                                const textVal = e.target.value;
                                                if (textVal === '') {
                                                  delete updatedPercents[cleanSt];
                                                } else {
                                                  const numVal = Math.max(0, Math.min(100, Number(textVal) || 0));
                                                  updatedPercents[cleanSt] = numVal;
                                                }
                                                setProcedureSplits(prev => ({
                                                  ...prev,
                                                  [proc]: {
                                                    ...split,
                                                    staffPercents: updatedPercents
                                                  }
                                                }));
                                              }}
                                              className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[8.5px] font-mono text-center font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-300 disabled:bg-slate-100 disabled:text-slate-400 cursor-not-allowed"
                                            />
                                            <span className="absolute left-0.5 top-0.5 text-[7px] text-slate-400 font-bold">%</span>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              {/* Nurses share */}
                              <div className="space-y-1.5 p-2.5 bg-slate-100/50 rounded-xl border border-slate-200/50 transition-all hover:bg-slate-100/80">
                                <label className="text-[10px] font-black text-slate-600 block">تیمی نێرس</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={split.nursesPercent}
                                    onChange={(e) => updateSplit('nursesPercent', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                                    className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded-lg px-2 py-1 text-xs text-center font-mono focus:outline-none font-bold"
                                  />
                                  <span className="absolute left-1.5 top-1 text-[10px] text-slate-400 font-bold">%</span>
                                </div>

                                {/* Deduct type selector */}
                                <div className="mt-1 flex items-center justify-between">
                                  <span className="text-[8.5px] text-slate-400 font-black block pl-2 leading-[0.9]">قۆناغی بڕین:</span>
                                  <select
                                    value={split.nursesDeductStage !== undefined ? split.nursesDeductStage : (split.nursesDeductType === 'first' ? 2 : 0)}
                                    onChange={(e) => {
                                      const stageVal = Number(e.target.value);
                                      setProcedureSplits(prev => ({
                                        ...prev,
                                        [proc]: {
                                          ...split,
                                          nursesDeductStage: stageVal,
                                          nursesDeductType: stageVal > 0 ? 'first' : 'concurrent'
                                        }
                                      }));
                                    }}
                                    className="flex-1 max-w-[120px] bg-slate-100 border border-slate-200 rounded-md py-0.5 px-0.5 text-[8.5px] font-bold text-slate-700 text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                  >
                                    <option value={0}>هاوبەش (دوای بڕینەکان)</option>
                                    <option value={1}>بڕینی پێشوەختە - قۆناغی ١</option>
                                    <option value={2}>بڕینی پێشوەختە - قۆناغی ٢</option>
                                    <option value={3}>بڕینی پێشوەختە - قۆناغی ٣</option>
                                    <option value={4}>بڕینی پێشوەختە - قۆناغی ٤</option>
                                    <option value={5}>بڕینی پێشوەختە - قۆناغی ٥</option>
                                    <option value={6}>بڕینی پێشوەختە - قۆناغی ٦</option>
                                  </select>
                                </div>

                                {/* Sub-list of nurses */}
                                <div className="space-y-1 pt-1.5 border-t border-slate-200/60 mt-1.5">
                                  <span className="text-[8.5px] text-slate-400 font-black block">پشکی نێرسەکان بە جیا:</span>
                                  {(() => {
                                    const activeNurses = savedNurses.filter(n => !deactivatedItems.nurse?.includes(n));
                                    const totalNursesSum = split.nursesPercent <= 0 ? 0 : activeNurses.reduce((sum, d) => sum + (split.staffPercents?.[cleanTitle(d)] || 0), 0);
                                    return (
                                      <>
                                        <div className="flex justify-between items-center text-[8.5px] font-black pb-1 border-b border-dashed border-slate-200/55 mb-1.5">
                                          <span className="text-slate-500">کۆی تەرخانکراو:</span>
                                          <span className={`font-mono ${totalNursesSum > split.nursesPercent ? 'text-rose-600 font-extrabold animate-pulse' : 'text-slate-650 font-bold'}`}>
                                            %${totalNursesSum} / %${split.nursesPercent}
                                          </span>
                                        </div>
                                        {totalNursesSum > split.nursesPercent && (
                                          <div className="p-1.5 bg-amber-50 border border-amber-200/50 rounded-lg text-[8px] text-amber-700 leading-relaxed font-bold mb-2">
                                            ⚠️ کۆی بەشی نێرسەکان (%${totalNursesSum}) لە بەشی گشتی (%${split.nursesPercent}) زیاترە! لە کاتی تۆماردا، سیستەمەکە ڕێژەکەیان بە شێوەیەکی زیرەک و ڕێکژراو کەم دەکاتەوە هەتا پارەی بەشێنراو بەسەر کارمەنددا زیاتر دابەش نەبێت لە پارەی نەخۆشەکە.
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                  {savedNurses.filter(n => !deactivatedItems.nurse?.includes(n)).length === 0 ? (
                                    <span className="text-[8px] text-slate-400 italic block">هیچ نێرسێک نییە</span>
                                  ) : (
                                    savedNurses.filter(n => !deactivatedItems.nurse?.includes(n)).map(n => {
                                      const cleanN = cleanTitle(n);
                                      const hasStage = split.nursesDeductStage !== undefined && split.nursesDeductStage !== null && split.nursesDeductStage > 0;
                                      const isBlocked = split.nursesPercent <= 0 && !hasStage;
                                      const val = isBlocked ? 0 : (split.staffPercents?.[cleanN] ?? '');
                                      return (
                                        <div key={n} className="flex justify-between items-center gap-1">
                                          <span className={`text-[8.5px] font-bold truncate max-w-[65px] text-right ${isBlocked ? 'text-slate-400' : 'text-slate-600'}`} title={n}>{n}</span>
                                          <div className="relative w-12 shrink-0">
                                            <input
                                              type="number"
                                              placeholder="هاوبەش"
                                              value={val}
                                              disabled={isBlocked}
                                              onChange={(e) => {
                                                const updatedPercents = { ...(split.staffPercents || {}) };
                                                const textVal = e.target.value;
                                                if (textVal === '') {
                                                  delete updatedPercents[cleanN];
                                                } else {
                                                  const numVal = Math.max(0, Math.min(100, Number(textVal) || 0));
                                                  updatedPercents[cleanN] = numVal;
                                                }
                                                setProcedureSplits(prev => ({
                                                  ...prev,
                                                  [proc]: {
                                                    ...split,
                                                    staffPercents: updatedPercents
                                                  }
                                                }));
                                              }}
                                              className="w-full bg-white border border-slate-200 rounded px-1 py-0.5 text-[8.5px] font-mono text-center font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-300 disabled:bg-slate-100 disabled:text-slate-400 cursor-not-allowed"
                                            />
                                            <span className="absolute left-0.5 top-0.5 text-[7px] text-slate-400 font-bold">%</span>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              {/* Clinic share */}
                              <div className="space-y-1.5 p-2.5 bg-amber-500/5 rounded-xl border border-amber-500/10 transition-all hover:bg-amber-500/10">
                                <label className="text-[10px] font-black text-amber-900 block text-right">ڕێژەی گشتی سەنتەر</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={split.clinicPercent}
                                    onChange={(e) => updateSplit('clinicPercent', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                                    className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded-lg px-2 py-1 text-xs text-center font-mono focus:outline-none font-bold"
                                  />
                                  <span className="absolute left-1.5 top-1 text-[10px] text-slate-400 font-bold">%</span>
                                </div>

                                {/* Deduct type selector */}
                                <div className="mt-1">
                                  <select
                                    value={split.clinicDeductStage !== undefined ? split.clinicDeductStage : (split.clinicDeductType === 'first' ? 2 : 0)}
                                    onChange={(e) => {
                                      const stageVal = Number(e.target.value);
                                      setProcedureSplits(prev => ({
                                        ...prev,
                                        [proc]: {
                                          ...split,
                                          clinicDeductStage: stageVal,
                                          clinicDeductType: stageVal > 0 ? 'first' : 'concurrent'
                                        }
                                      }));
                                    }}
                                    className="w-full bg-amber-50 border border-amber-200 rounded-lg py-0.5 px-1 text-[8.5px] font-black text-amber-900 text-right focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                                  >
                                    <option value={0}>هاوبەش (دوای بڕینەکان)</option>
                                    <option value={1}>بڕینی پێشوەختە - قۆناغی ١</option>
                                    <option value={2}>بڕینی پێشوەختە - قۆناغی ٢</option>
                                    <option value={3}>بڕینی پێشوەختە - قۆناغی ٣</option>
                                    <option value={4}>بڕینی پێشوەختە - قۆناغی ٤</option>
                                    <option value={5}>بڕینی پێشوەختە - قۆناغی ٥</option>
                                    <option value={6}>بڕینی پێشوەختە - قۆناغی ٦</option>
                                  </select>
                                </div>

                                <div className="pt-2 text-center text-[8px] text-amber-600 font-bold leading-relaxed border-t border-amber-200/40 mt-1.5">
                                  داهاتی پاشەکەوتوو و گشتی بۆ نەخۆشخانەکە یان سەنتەرەکە.
                                </div>
                              </div>
                            </div>

                            {/* Custom splits section divider and list */}
                            <div className="pt-2.5 pt-3 border-t border-slate-200 mt-2.5">
                              <div className="flex justify-between items-center mb-2">
                                <button
                                  type="button"
                                  onClick={() => setAddingCustomToProc(addingCustomToProc === proc ? null : proc)}
                                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70 border border-emerald-250 font-black rounded-lg py-1 px-2 text-[9.5px] cursor-pointer transition-colors flex items-center gap-1"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>زیادکردنی پشکی تر</span>
                                </button>
                                <span className="text-[10px] font-black text-slate-500 flex items-center gap-1">
                                  <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
                                  <span>بەش و پشکی تری زیادە (یاریدەدەر، تێچووی ئامێر، هتد.)</span>
                                </span>
                              </div>

                              {/* Listed custom items */}
                              {(!split.customSplits || split.customSplits.length === 0) ? (
                                <p className="text-[10px] text-slate-400 italic">هیچ دابەشکارییەکی تری زیاتری بەسەردا دەستنیشان نەکراوە بۆ ئەم پرۆسیجەرە.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1">
                                  {split.customSplits.map((item) => (
                                    <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-2.5 flex justify-between items-center gap-2 shadow-2xs">
                                      <div className="min-w-0 flex-1 text-right">
                                        <span className="text-[11px] font-extrabold text-slate-800 block truncate leading-tight">
                                          {item.name}: {item.valueType === 'fixed' ? `${item.percent.toLocaleString()} د.ع` : `${item.percent}%`}
                                        </span>
                                        <div className="flex flex-wrap gap-1 mt-1 justify-end">
                                          {(() => {
                                            const stage = item.deductStage !== undefined ? item.deductStage : (item.deductType === 'first' ? 1 : 0);
                                            if (stage === 1) {
                                              return (
                                                <span className="inline-block bg-rose-100 text-rose-800 text-[8px] font-black px-1.5 py-0.5 rounded">
                                                  بڕینی پێشوەختە - قۆناغی ١
                                                </span>
                                              );
                                            } else if (stage === 2) {
                                              return (
                                                <span className="inline-block bg-amber-105 bg-amber-100 text-amber-850 text-[8px] font-black px-1.5 py-0.5 rounded">
                                                  بڕینی پێشوەختە - قۆناغی ٢
                                                </span>
                                              );
                                            } else if (stage === 3) {
                                              return (
                                                <span className="inline-block bg-orange-100 text-orange-850 text-[8px] font-black px-1.5 py-0.5 rounded">
                                                  بڕینی پێشوەختە - قۆناغی ٣
                                                </span>
                                              );
                                            } else if (stage === 4) {
                                              return (
                                                <span className="inline-block bg-teal-100 text-teal-800 text-[8px] font-black px-1.5 py-0.5 rounded">
                                                  بڕینی پێشوەختە - قۆناغی ٤
                                                </span>
                                              );
                                            } else if (stage === 5) {
                                              return (
                                                <span className="inline-block bg-blue-100 text-blue-800 text-[8px] font-black px-1.5 py-0.5 rounded">
                                                  بڕینی پێشوەختە - قۆناغی ٥
                                                </span>
                                              );
                                            } else if (stage === 6) {
                                              return (
                                                <span className="inline-block bg-purple-100 text-purple-800 text-[8px] font-black px-1.5 py-0.5 rounded">
                                                  بڕینی پێشوەختە - قۆناغی ٦
                                                </span>
                                              );
                                            return (
                                              <span className="inline-block bg-slate-100 text-slate-700 text-[8px] font-bold px-1.5 py-0.5 rounded">
                                                هاوبەش
                                              </span>
                                            );
                                          }
                                        })()}
                                        {item.valueType === 'fixed' && (
                                          <span className="inline-block bg-slate-100 text-slate-705 text-[8px] font-bold px-1.5 py-0.5 rounded">
                                            بڕی سابت
                                          </span>
                                        )}
                                      </div>
                                      {item.recipientName && (
                                        <span className="text-[9.5px] text-slate-500 font-bold block truncate leading-tight mt-1">
                                          خاوەن پشک: {item.recipientName}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedCustoms = (split.customSplits || []).filter(c => c.id !== item.id);
                                        setProcedureSplits(prev => ({
                                          ...prev,
                                          [proc]: {
                                            ...split,
                                            customSplits: updatedCustoms
                                          }
                                        }));
                                      }}
                                      className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 cursor-pointer shrink-0 transition-colors"
                                      title="سڕینەوەی ئەم پشکە"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Collapsible inline form */}
                            {addingCustomToProc === proc ? (
                              <div className="bg-slate-100/70 border border-slate-300/60 rounded-xl p-3 space-y-3">
                                <div className="flex justify-between items-center pb-1 border-b border-slate-250">
                                  <span className="text-[10px] font-black text-slate-700">تۆمارکردنی پشکی دابەشکاری نوێ</span>
                                  <button 
                                    type="button" 
                                    onClick={() => setAddingCustomToProc(null)} 
                                    className="text-[10px] text-slate-400 hover:text-rose-500 font-bold transition-colors"
                                  >
                                    داخستن ×
                                  </button>
                                </div>

                                {/* Options toggles for Custom split */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2 border-b border-slate-200">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 block text-right">جۆری پشکەکە</label>
                                    <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-300">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewCustomValueType('percent');
                                          setNewCustomPercent(5);
                                        }}
                                        className={`flex-1 text-center py-1 text-[9px] font-black rounded-md cursor-pointer transition-all ${newCustomValueType === 'percent' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-800'}`}
                                      >
                                        نیسبەی سەدی %
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewCustomValueType('fixed');
                                          setNewCustomPercent(10000);
                                        }}
                                        className={`flex-1 text-center py-1 text-[9px] font-black rounded-md cursor-pointer transition-all ${newCustomValueType === 'fixed' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-800'}`}
                                      >
                                        بڕی پارەی سابت (د.ع)
                                      </button>
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 block text-right">یاسای دەرکردنی بڕەکە و قۆناغی لێدەرکردن</label>
                                    <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-300">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewCustomDeductType('concurrent');
                                          setNewCustomDeductStage(0);
                                        }}
                                        title="دوای بڕینی هەموو پێشوەختەکان دابەشکاری لەسەر بڕی ماوە دەکرێت"
                                        className={`flex-1 text-center py-1 text-[8.5px] font-black rounded-md cursor-pointer transition-all ${newCustomDeductStage === 0 ? 'bg-white text-indigo-800 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-850'}`}
                                      >
                                        هاوبەش
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewCustomDeductType('first');
                                          setNewCustomDeductStage(1);
                                        }}
                                        title="لە کۆی گشتی یەکەمجار دەبڕدرێت (وەکو نۆژەنکردنەوە یان باج)"
                                        className={`flex-1 text-center py-1 text-[8.5px] font-black rounded-md cursor-pointer transition-all ${newCustomDeductStage === 1 ? 'bg-rose-600 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-850'}`}
                                      >
                                        قۆناغی ١
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewCustomDeductType('first');
                                          setNewCustomDeductStage(2);
                                        }}
                                        title="دوای قۆناغی یەکەم لە بڕی ماوە لێدەردەکرێت (وەکو پزیشکی بەنج)"
                                        className={`flex-1 text-center py-1 text-[8.5px] font-black rounded-md cursor-pointer transition-all ${newCustomDeductStage === 2 ? 'bg-amber-600 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-850'}`}
                                      >
                                        قۆناغی ٢
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewCustomDeductType('first');
                                          setNewCustomDeductStage(3);
                                        }}
                                        title="لە بڕی ماوە پاش قۆناغی دووەم لێدەردەکرێت"
                                        className={`flex-1 text-center py-1 text-[8.5px] font-black rounded-md cursor-pointer transition-all ${newCustomDeductStage === 3 ? 'bg-orange-600 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-850'}`}
                                      >
                                        قۆناغی ٣
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div className="space-y-1 text-right">
                                    <label className="text-[9px] font-black text-slate-500 block">ناوی پشک / بوارەکە *</label>
                                    <input
                                      type="text"
                                      list="custom-split-names-list"
                                      placeholder="بۆ نموونە: یاریدەدەر یان Maintenance..."
                                      value={newCustomName}
                                      onChange={(e) => setNewCustomName(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-right font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                  </div>
                                  <div className="space-y-1 text-right">
                                    <label className="text-[9px] font-black text-slate-500 block">
                                      {newCustomValueType === 'percent' ? 'ڕێژەی نیسبە %' : 'بڕی پارەی سابیت (د.ع)'}
                                    </label>
                                    {newCustomValueType === 'fixed' ? (
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9,]*"
                                        value={formatMoneyWithCommas(newCustomPercent)}
                                        onChange={(e) => {
                                          const parsed = parseMoneyWithCommas(e.target.value);
                                          if (parsed === '' || /^\d*$/.test(parsed)) {
                                            setNewCustomPercent(parsed === '' ? 0 : Number(parsed));
                                          }
                                        }}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                                      />
                                    ) : (
                                      <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={newCustomPercent || ''}
                                        onChange={(e) => {
                                          const numericVal = Number(e.target.value) || 0;
                                          setNewCustomPercent(Math.max(1, Math.min(100, numericVal)));
                                        }}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                                      />
                                    )}
                                  </div>
                                  <div className="space-y-1 text-right">
                                    <label className="text-[9px] font-black text-slate-500 block">ناوی کارمەند (ئارەزوومەندانە)</label>
                                    <input
                                      type="text"
                                      list="staff-suggestions-list"
                                      placeholder="پێویست بە نووسینی ناو ناکات..."
                                      value={newCustomRecipient}
                                      onChange={(e) => setNewCustomRecipient(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-right font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-1 border-t border-slate-200/30">
                                  <button
                                    type="button"
                                    onClick={() => setAddingCustomToProc(null)}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer"
                                  >
                                    پاشگەزبوونەوە
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!newCustomName.trim()) {
                                        alert('تکایە ناوی بەشەکە بنووسە!');
                                        return;
                                      }
                                      const trimmedCustomName = newCustomName.trim();
                                      const currentSplit = getSplitForProcedure(proc);
                                      const currentCustoms = currentSplit.customSplits || [];

                                      // Save the custom split name to persistent suggestions list if it's new
                                      if (trimmedCustomName && !savedCustomSplitNames.includes(trimmedCustomName)) {
                                        const updatedNames = [...savedCustomSplitNames, trimmedCustomName];
                                        setSavedCustomSplitNames(updatedNames);
                                        try {
                                          localStorage.setItem('clinic_saved_custom_split_names', JSON.stringify(updatedNames)); 
                                          if (user) {
                                            syncSettingsToCloud(user.uid, { 
                                              savedProcedures, 
                                              savedDoctors, 
                                              savedNurses, 
                                              savedAnesthesiaDoctors, 
                                              savedAnesthesiaStaff, 
                                              deactivatedItems, 
                                              savedCustomSplitNames: updatedNames 
                                            });
                                          }
                                        } catch (e) {
                                          console.error('Error saving custom split name:', e);
                                        }
                                      }

                                      const newItem: CustomSplitItem = {
                                        id: Math.random().toString(),
                                        name: trimmedCustomName,
                                        percent: newCustomPercent,
                                        recipientName: newCustomRecipient.trim() || undefined,
                                        valueType: newCustomValueType,
                                        deductType: newCustomDeductType,
                                        deductStage: newCustomDeductStage,
                                      };
                                      
                                      setProcedureSplits(prev => ({
                                        ...prev,
                                        [proc]: {
                                          ...currentSplit,
                                          customSplits: [...currentCustoms, newItem]
                                        }
                                      }));
                                      
                                      // reset state
                                      setNewCustomName('');
                                      setNewCustomPercent(5);
                                      setNewCustomRecipient('');
                                      setNewCustomValueType('percent');
                                      setNewCustomDeductType('concurrent');
                                      setNewCustomDeductStage(0);
                                      setAddingCustomToProc(null);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1 rounded-lg text-[9.5px] font-black shadow-3xs transition-all cursor-pointer"
                                  >
                                    تۆمارکردن
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingCustomToProc(proc);
                                  setNewCustomName('');
                                  setNewCustomPercent(5);
                                  setNewCustomRecipient('');
                                }}
                                className="inline-flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 font-black px-3 py-2 rounded-lg border border-emerald-200/50 cursor-pointer transition-all w-full justify-center animate-pulse-slow"
                              >
                                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                                <span>زیادکردنی پشکێکی دیاریکراوی تر بۆ ئەم جۆرە پرۆسیجەرە</span>
                              </button>
                            )}
                          </div>

                          {/* Dynamic Conditional Rules Panel (ئەگەرەکان و مەرجەکانی دابەشکاری) */}
                          <div className="pt-3 border-t border-slate-200/50 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-black text-indigo-800 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-indigo-600" />
                                <span>مەرج و ئەگەرەکانی دابەشکاری (ئەگەر هێمن عەلی حزور بوو، هتد.)</span>
                              </span>
                            </div>

                            {/* Listed conditional rules */}
                            {(!split.conditionalRules || split.conditionalRules.length === 0) ? (
                              <p className="text-[10px] text-slate-400 italic">هیچ مەرجێکی تایبەت پێناسە نەکراوە بۆ ئەم پرۆسیجەرە.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1">
                                {split.conditionalRules.map((rule) => (
                                  <div key={rule.id} className="bg-indigo-50/50 border border-indigo-150/70 rounded-xl p-3 flex justify-between items-start gap-2 shadow-sm transition-all hover:shadow-md">
                                    <div className="min-w-0 flex-1 text-right space-y-1.5">
                                      {rule.conditionType === 'feedback_hours' ? (
                                        <div className="space-y-1">
                                          <span className="text-[10.5px] font-black text-amber-800 block truncate leading-tight">
                                            مەرج: فیدباک و کاتژمێری نێرسەکان (%{rule.rulePercent})
                                          </span>
                                          <div className="text-[8.5px] text-amber-700 font-bold block max-h-[80px] overflow-y-auto custom-scrollbar">
                                            {rule.feedbackData && Object.entries(rule.feedbackData).map(([name, data]) => (
                                              <div key={name} className="flex justify-between border-b border-amber-200/50 py-1 last:border-0 pl-1">
                                                <span className="truncate">{name}</span>
                                                <span className="shrink-0 mr-2 text-amber-900 font-mono text-[8px] whitespace-nowrap">
                                                  سەعات: {data.workingHours} | ڕێژە: {data.feedbackRate}% | نرخ: {data.hourlyRate}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : rule.conditionType === 'cad' ? (
                                        <div className="space-y-1">
                                          <span className="text-[10.5px] font-black text-purple-800 block truncate leading-tight">
                                            مەرج: دابەشکاریی تایبەتی کاد (%{rule.rulePercent})
                                          </span>
                                          <div className="text-[8.5px] text-purple-700 font-bold block max-h-[80px] overflow-y-auto custom-scrollbar">
                                            {rule.cadData && Object.entries(rule.cadData).map(([name, data]) => (
                                              <div key={name} className="flex flex-col border-b border-purple-200/50 py-1 last:border-0 pl-1">
                                                <span className="truncate font-black">{name}</span>
                                                <div className="flex flex-wrap gap-1 mt-0.5 justify-end">
                                                  {Object.entries(data).map(([col, val]) => (
                                                    <span key={col} className="bg-purple-100/50 text-purple-900 px-1 py-0.5 rounded text-[7.5px]">
                                                      {col}: <span className="font-mono">{val}</span>
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : rule.conditionType === 'responsibility' ? (
                                        <div className="space-y-1">
                                          <span className="text-[10.5px] font-black text-blue-800 block truncate leading-tight">
                                            مەرج: دابەشکاریی بەرپرسیاریەتی (سەرجەم: %{Object.values(rule.responsibilityData || {}).reduce((a, b) => a + (b || 0), 0)})
                                          </span>
                                          <div className="text-[8.5px] text-blue-700 font-bold block max-h-[80px] overflow-y-auto custom-scrollbar">
                                            {rule.responsibilityData && Object.entries(rule.responsibilityData).map(([name, data]) => (
                                              <div key={name} className="flex flex-col border-b border-blue-200/50 py-1 last:border-0 pl-1">
                                                <span className="truncate flex justify-between">
                                                  <span>پشکی: <span className="font-mono bg-blue-100/50 text-blue-900 px-1 py-0.5 rounded text-[8px]">%{(data || 0)}</span></span>
                                                  <span className="font-black">{name}</span>
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <span className="text-[10.5px] font-black text-slate-800 block truncate leading-tight">
                                            مەرج: ئەگەر <span className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">({rule.conditionStaff})</span> {rule.conditionType === 'present' ? 'ئامادە بوو' : 'ئامادە نەبوو'}
                                          </span>
                                          <div className="space-y-1 text-[9.5px]">
                                            <span className="text-slate-600 font-bold block leading-tight">
                                              ← پشکی خودی <span className="text-emerald-700 bg-emerald-50 px-1 rounded">({rule.targetStaff})</span> دەبێتە: <span className="font-mono text-emerald-600 font-extrabold">{rule.rulePercent}%</span>
                                            </span>
                                            {rule.applyToOthers && (
                                              <div className="text-[9px] text-indigo-700 font-bold border-t border-indigo-100/50 pt-1.5 mt-1.5 space-y-1">
                                                {rule.othersCustomPercents && Object.keys(rule.othersCustomPercents).length > 0 ? (
                                                  <>
                                                    <span className="block text-slate-500 font-black mb-0.5">نیسبەی هاوپیشەکان:</span>
                                                    <div className="grid grid-cols-1 gap-0.5 pl-2">
                                                      {Object.entries(rule.othersCustomPercents).map(([name, pct]) => (
                                                        <span key={name} className="block text-right text-[8.5px] text-slate-600 font-medium">
                                                          • {name}: <span className="font-mono text-indigo-700 font-extrabold">{pct}%</span>
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </>
                                                ) : rule.othersPercent !== undefined ? (
                                                  <span>← پشکی سەرجەم هاوپیشەکانی تری دەبێتە: <span className="font-mono text-indigo-750 font-extrabold">{rule.othersPercent}%</span></span>
                                                ) : null}
                                              </div>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          let infTeam = '';
                                          if (rule.conditionType === 'feedback_hours' || rule.conditionType === 'cad' || rule.conditionType === 'responsibility') {
                                            infTeam = 'nurse';
                                          } else {
                                            if (savedDoctors.includes(rule.conditionStaff)) infTeam = 'surgeon';
                                            else if (savedAnesthesiaDoctors.includes(rule.conditionStaff)) infTeam = 'anesthesiaDoctor';
                                            else if (savedAnesthesiaStaff.includes(rule.conditionStaff)) infTeam = 'anesthesiaStaff';
                                            else infTeam = 'nurse';
                                          }
                                          setAddingRuleToProc(proc);
                                          setEditingRuleId(rule.id);
                                          setNewRuleTeam(infTeam);
                                          setNewRuleConditionStaff(rule.conditionStaff);
                                          setNewRuleConditionType(rule.conditionType);
                                          setNewRuleTargetStaff(rule.targetStaff);
                                          setNewRulePercent(rule.rulePercent);
                                          setNewRuleApplyToOthers(rule.applyToOthers || false);
                                          setNewRuleOthersPercent(rule.othersPercent ?? 5);
                                          setNewRuleOthersCustomPercents(rule.othersCustomPercents || {});
                                          setNewRuleFeedbackData(rule.feedbackData || {});
                                          setNewRuleCadData(rule.cadData || {});
                                          setNewRuleResponsibilityData(rule.responsibilityData || {});
                                          setNewRuleCadColumns(rule.cadColumns || ['بڕوانامە', 'ئەزموون']);
                                          setNewRuleCadColumnMaxValues(rule.cadColumnMaxValues || {'بڕوانامە': 2, 'ئەزموون': 1.5});
                                        }}
                                        className="text-indigo-500 hover:text-indigo-700 p-1 rounded-md hover:bg-indigo-50 cursor-pointer shrink-0 transition-all"
                                        title="دەسکاری ئەم مەرجە"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedRules = (split.conditionalRules || []).filter(r => r.id !== rule.id);
                                          setProcedureSplits(prev => ({
                                            ...prev,
                                            [proc]: {
                                              ...split,
                                              conditionalRules: updatedRules
                                            }
                                          }));
                                        }}
                                        className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 cursor-pointer shrink-0 transition-all"
                                        title="سڕینەوەی ئەم مەرجە"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Rule Input Form */}
                            {addingRuleToProc === proc ? (
                              <div className="bg-slate-100/70 border border-slate-350 rounded-xl p-3.5 space-y-3.5">
                                <div className="flex justify-between items-center pb-1 border-b border-slate-250">
                                  <span className="text-[9.5px] font-black text-indigo-800">
                                    {editingRuleId ? 'دەسکاری ڕێسای دابەشکاری' : 'داخڵکردنی ڕێسای نوێی مەرجی دابەشکاری'}
                                  </span>
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      setAddingRuleToProc(null);
                                      setEditingRuleId(null);
                                      setNewRuleTeam('');
                                    }} 
                                    className="text-[10px] text-slate-400 hover:text-rose-500 font-bold transition-colors"
                                  >
                                    داخستن ×
                                  </button>
                                </div>

                                {/* Dynamic Team Selector First */}
                                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 shadow-2xs">
                                  <span className="text-[10px] font-black text-indigo-800 block text-right">ئەتەوێ مەرج بۆ کام تیم داخل بکەیت؟</span>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                    {[
                                      { id: 'surgeon', label: 'پزیشکی نەشتەرگەری' },
                                      { id: 'anesthesiaDoctor', label: 'پزیشکی بەنج' },
                                      { id: 'anesthesiaStaff', label: 'یاریدەدەری بەنج' },
                                      { id: 'nurse', label: 'تیمی نێرس' }
                                    ].map(t => (
                                      <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => {
                                          setNewRuleTeam(t.id);
                                          let firstStaff = '';
                                          if (t.id === 'surgeon') {
                                            const active = savedDoctors.filter(d => !deactivatedItems.doctor?.includes(d));
                                            if (active.length > 0) firstStaff = cleanTitle(active[0]);
                                          } else if (t.id === 'anesthesiaDoctor') {
                                            const active = savedAnesthesiaDoctors.filter(d => !deactivatedItems.anesthesiaDoctor?.includes(d));
                                            if (active.length > 0) firstStaff = cleanTitle(active[0]);
                                          } else if (t.id === 'anesthesiaStaff') {
                                            const active = savedAnesthesiaStaff.filter(d => !deactivatedItems.anesthesiaStaff?.includes(d));
                                            if (active.length > 0) firstStaff = cleanTitle(active[0]);
                                          } else if (t.id === 'nurse') {
                                            const active = savedNurses.filter(d => !deactivatedItems.nurse?.includes(d));
                                            if (active.length > 0) firstStaff = cleanTitle(active[0]);
                                          }
                                          setNewRuleConditionStaff(firstStaff);
                                          setNewRuleTargetStaff(firstStaff);
                                        }}
                                        className={`text-[9.5px] py-1.5 px-2 rounded-lg font-black text-center border transition-all cursor-pointer ${
                                          newRuleTeam === t.id
                                            ? 'bg-indigo-650 text-white border-indigo-650 shadow-3xs'
                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                        }`}
                                      >
                                        {t.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {newRuleTeam ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
                                    {(() => {
                                      let list: string[] = [];
                                      if (newRuleTeam === 'surgeon') {
                                        list = savedDoctors.filter(d => !deactivatedItems.doctor?.includes(d));
                                      } else if (newRuleTeam === 'anesthesiaDoctor') {
                                        list = savedAnesthesiaDoctors.filter(d => !deactivatedItems.anesthesiaDoctor?.includes(d));
                                      } else if (newRuleTeam === 'anesthesiaStaff') {
                                        list = savedAnesthesiaStaff.filter(d => !deactivatedItems.anesthesiaStaff?.includes(d));
                                      } else if (newRuleTeam === 'nurse') {
                                        list = savedNurses.filter(d => !deactivatedItems.nurse?.includes(d));
                                      }

                                      if (list.length === 0) {
                                        return (
                                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center md:col-span-2 text-amber-800 text-[10px] font-bold">
                                            ⚠️ هیچ کارمەندێکی چالاک لەم تیمەدا بوونی نییە بۆ پاشەکەوتکردنی مەرج!
                                          </div>
                                        );
                                      }

                                      const activeStaffList = list;

                                      return (
                                        <>
                                          {/* Section 1: Condition */}
                                          <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
                                            {newRuleConditionType !== 'feedback_hours' && newRuleConditionType !== 'cad' && newRuleConditionType !== 'responsibility' ? (
                                              <>
                                                <span className="text-[9px] font-black text-indigo-700 block text-right">١. کاتێک کارمەندی خوارەوە:</span>
                                                <select
                                                  value={newRuleConditionStaff}
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    setNewRuleConditionStaff(val);
                                                    setNewRuleTargetStaff(val);
                                                  }}
                                                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-right font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                                >
                                                  {activeStaffList.map(name => {
                                                    const cleaned = cleanTitle(name);
                                                    return <option key={cleaned} value={cleaned}>{name}</option>;
                                                  })}
                                                </select>
                                              </>
                                            ) : (
                                                <span className={`text-[9px] font-black block text-right ${newRuleConditionType === 'cad' ? 'text-purple-700' : newRuleConditionType === 'responsibility' ? 'text-blue-700' : 'text-amber-700'}`}>
                                                  ١. مەرجی زیرەکی {newRuleConditionType === 'cad' ? 'کاد' : newRuleConditionType === 'responsibility' ? 'بەرپرسیاریەتی' : 'فیدباک'} بۆ نێرسەکان (تەواوی تیمەكەیەوە دەگرێتەوە):
                                                </span>
                                            )}
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setNewRuleConditionType('present');
                                                  setNewRulePercent(10);
                                                }}
                                                className={`flex-1 min-w-[70px] text-[8.5px] py-1 rounded font-black text-center transition-all cursor-pointer ${
                                                  newRuleConditionType === 'present'
                                                    ? 'bg-emerald-600 text-white shadow-3xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                              >
                                                بەشداری تیمی کردبوو
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setNewRuleConditionType('absent');
                                                  setNewRulePercent(0);
                                                }}
                                                className={`flex-1 min-w-[70px] text-[8.5px] py-1 rounded font-black text-center transition-all cursor-pointer ${
                                                  newRuleConditionType === 'absent'
                                                    ? 'bg-rose-600 text-white shadow-3xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                              >
                                                بەشداری تیمی نەکردبوو
                                              </button>
                                              {newRuleTeam === 'nurse' && (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setNewRuleConditionType('feedback_hours');
                                                      setNewRulePercent(5);
                                                    }}
                                                    className={`flex-1 min-w-[70px] text-[8.5px] py-1 rounded font-black text-center transition-all cursor-pointer ${
                                                      newRuleConditionType === 'feedback_hours'
                                                        ? 'bg-amber-500 text-white shadow-3xs'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                  >
                                                    فیدباک و کاتژمێر
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setNewRuleConditionType('cad');
                                                      setNewRulePercent(10);
                                                    }}
                                                    className={`flex-1 min-w-[70px] text-[8.5px] py-1 rounded font-black text-center transition-all cursor-pointer ${
                                                      newRuleConditionType === 'cad'
                                                        ? 'bg-purple-600 text-white shadow-3xs'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                  >
                                                    کاد
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setNewRuleConditionType('responsibility');
                                                      setNewRulePercent(5);
                                                    }}
                                                    className={`flex-1 min-w-[70px] text-[8.5px] py-1 rounded font-black text-center transition-all cursor-pointer ${
                                                      newRuleConditionType === 'responsibility'
                                                        ? 'bg-blue-600 text-white shadow-3xs'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                  >
                                                    بەرپرسیاریەتی
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </div>

                                          {newRuleConditionType !== 'feedback_hours' && newRuleConditionType !== 'cad' && newRuleConditionType !== 'responsibility' ? (
                                            <>
                                              {/* Section 2: Consequence */}
                                              <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2 flex flex-col justify-between">
                                                <div>
                                                  <span className="text-[9px] font-black text-indigo-700 block text-right">٢. ڕێژەی نوێی ئەم کارمەندە خۆی چەن بێت؟</span>
                                                  <div className="w-full bg-indigo-50 border border-indigo-100 rounded px-2 py-1.5 text-xs text-right font-black text-indigo-905 mb-1.5">
                                                    دەستکاریکردنی نیسبەی: {newRuleConditionStaff}
                                                  </div>
                                                  <div className="relative">
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      max="100"
                                                      value={newRulePercent}
                                                      onChange={(e) => setNewRulePercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                                                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                                                      placeholder="بۆ نموونە: ١٥"
                                                    />
                                                    <span className="absolute left-1.5 top-1 text-[9px] text-slate-400 font-bold">% دەبێتە</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </>
                                          ) : newRuleConditionType === 'feedback_hours' ? (
                                            <div className="bg-amber-50 border border-amber-200/50 rounded-lg p-2.5 md:col-span-1 flex flex-col justify-between">
                                              <span className="text-[9px] font-black text-amber-800 block text-right leading-relaxed">
                                                ٢. ڕێژەی فیدباک
                                              </span>
                                              <div className="text-[8.5px] font-bold text-amber-700 mt-1 mb-2 text-right">
                                                دیاری بکە چەند لە سەدی گشتی پرۆسیجەرەکە بۆ فیدباک بڕوات (بۆ نموونە ئەگەر پشکی نێرس ١٢٪ بێت، و لێرە ٥٪ بنووسیت، ئەوا ٧٪ دەمێنێتەوە بۆ پێوانە ئاساییەکان):
                                              </div>
                                              <div className="relative w-full mb-3">
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max="100"
                                                  value={newRulePercent}
                                                  onChange={(e) => setNewRulePercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                                                  className="w-full bg-white border border-amber-200 rounded px-2 py-1.5 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                                                  placeholder="بۆ نموونە ٥"
                                                />
                                                <span className="absolute left-2 top-1.5 text-[9px] text-slate-400 font-bold">% فیدباک دەبێت</span>
                                              </div>
                                              <div className="space-y-2 overflow-y-auto max-h-[150px] custom-scrollbar pl-1">
                                                {activeStaffList.map(name => {
                                                  const cleanName = cleanTitle(name);
                                                  const d = newRuleFeedbackData[cleanName] || { workingHours: 0, feedbackRate: 0, hourlyRate: 0 };
                                                  return (
                                                    <div key={cleanName} className="bg-white border border-amber-100 rounded p-1.5 space-y-1.5">
                                                      <span className="text-[9px] font-bold text-slate-800 block text-right">{name}</span>
                                                      <div className="grid grid-cols-3 gap-1">
                                                        <input 
                                                          type="number" step="any" placeholder="سەعات" value={d.workingHours || ''} 
                                                          onChange={e => setNewRuleFeedbackData(p => ({ ...p, [cleanName]: { ...d, workingHours: Number(e.target.value) } })) } 
                                                          className="w-full text-center text-[8.5px] border border-slate-200 rounded p-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500" 
                                                        />
                                                        <div className="relative">
                                                          <input 
                                                            type="number" step="any" placeholder="ڕێژە" value={d.feedbackRate || ''} 
                                                            onChange={e => setNewRuleFeedbackData(p => ({ ...p, [cleanName]: { ...d, feedbackRate: Number(e.target.value) } })) } 
                                                            className="w-full text-center text-[8.5px] border border-slate-200 rounded p-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500" 
                                                          />
                                                          <span className="absolute left-0.5 top-0.5 text-[7px] text-slate-400">%</span>
                                                        </div>
                                                        <input 
                                                          type="number" step="any" placeholder="نرخ" value={d.hourlyRate || ''} 
                                                          onChange={e => setNewRuleFeedbackData(p => ({ ...p, [cleanName]: { ...d, hourlyRate: Number(e.target.value) } })) } 
                                                          className="w-full text-center text-[8.5px] border border-slate-200 rounded p-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500" 
                                                        />
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          ) : newRuleConditionType === 'cad' ? (
                                            <div className="bg-purple-50 border border-purple-200/50 rounded-lg p-2.5 md:col-span-1 flex flex-col justify-between">
                                              <span className="text-[9px] font-black text-purple-800 block text-right leading-relaxed">
                                                ٢. ڕێژەی کاد
                                              </span>
                                              <div className="text-[8.5px] font-bold text-purple-700 mt-1 mb-2 text-right">
                                                دیاری بکە چەند لە سەدی گشتی پرۆسیجەرەکە بۆ کاد بڕوات (بۆ نموونە ئەگەر پشکی تیمەکە ١٢٪ بێت، و لێرە ٥٪ بنووسیت، ئەوا ٧٪ دەمێنێتەوە بۆ پێوانە ئاساییەکان):
                                              </div>
                                              <div className="relative w-full mb-3">
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max="100"
                                                  value={newRulePercent}
                                                  onChange={(e) => setNewRulePercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                                                  className="w-full bg-white border border-purple-200 rounded px-2 py-1.5 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-purple-500 font-bold"
                                                  placeholder="بۆ نموونە ١٠"
                                                />
                                                <span className="absolute left-2 top-1.5 text-[9px] text-slate-400 font-bold">% کاد دەبێت</span>
                                              </div>

                                              <div className="bg-white/60 p-1.5 rounded border border-purple-100 flex gap-1 mb-2">
                                                <input
                                                  type="text"
                                                  placeholder="ناوی ستوونی نوێ..."
                                                  className="flex-1 text-[8.5px] border border-slate-200 rounded p-1 text-right focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                      const val = e.currentTarget.value.trim();
                                                      if (val && !newRuleCadColumns.includes(val)) {
                                                        setNewRuleCadColumns([...newRuleCadColumns, val]);
                                                        e.currentTarget.value = '';
                                                      }
                                                    }
                                                  }}
                                                />
                                                <button
                                                  type="button"
                                                  className="bg-purple-600 text-white px-2 py-1 rounded text-[8px] font-bold"
                                                  onClick={(e) => {
                                                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                    const val = input.value.trim();
                                                    if (val && !newRuleCadColumns.includes(val)) {
                                                      setNewRuleCadColumns([...newRuleCadColumns, val]);
                                                      input.value = '';
                                                    }
                                                  }}
                                                >
                                                  زیادکردن
                                                </button>
                                              </div>

                                              {newRuleCadColumns.length > 0 && (
                                                <div className="space-y-1 mb-2">
                                                  <div className="text-[8px] font-bold text-slate-500 text-right pr-1">بەهای کۆتایی سەدی بۆ هەر ستوونێک دیاری بکە (بۆ نمونە ٢ بۆ بڕوانامە):</div>
                                                  <div className="flex flex-wrap gap-1 justify-end">
                                                    {newRuleCadColumns.map(col => (
                                                      <span key={col} className="bg-purple-100/70 text-purple-800 text-[8px] pl-1 pr-1.5 py-0.5 rounded font-bold border border-purple-200 flex items-center gap-1.5">
                                                        <span>{col}</span>
                                                        <input 
                                                          type="number" step="any" min="0" placeholder="%"
                                                          value={newRuleCadColumnMaxValues[col] ?? ''}
                                                          onChange={e => setNewRuleCadColumnMaxValues(p => ({ ...p, [col]: Number(e.target.value) || 0 }))}
                                                          className="w-10 text-center text-[8.5px] border border-purple-200/50 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                                                        />
                                                        <button 
                                                          type="button" 
                                                          className="text-purple-400 hover:text-purple-700 bg-purple-200/50 hover:bg-purple-200 rounded-sm p-0.5" 
                                                          onClick={() => {
                                                            setNewRuleCadColumns(prev => prev.filter(c => c !== col));
                                                            setNewRuleCadColumnMaxValues(prev => { const n = {...prev}; delete n[col]; return n; });
                                                            setNewRuleCadData(prev => {
                                                              const n = {...prev};
                                                              for (const k in n) {
                                                                if (n[k] && col in n[k]) {
                                                                  n[k] = {...n[k]};
                                                                  delete n[k][col];
                                                                }
                                                              }
                                                              return n;
                                                            });
                                                          }}
                                                          title="سڕینەوەی ئەم ستوونە"
                                                        >
                                                          <X className="w-2.5 h-2.5" />
                                                        </button>
                                                      </span>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}

                                              <div className="space-y-2 overflow-y-auto max-h-[150px] custom-scrollbar pl-1">
                                                {activeStaffList.map(name => {
                                                  const cleanName = cleanTitle(name);
                                                  const d = newRuleCadData[cleanName] || {};
                                                  return (
                                                    <div key={cleanName} className="bg-white border border-purple-100 rounded p-1.5 space-y-1.5">
                                                      <span className="text-[9px] font-bold text-slate-800 block text-right">{name}</span>
                                                      <div className="grid grid-cols-2 gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(2, Math.min(4, newRuleCadColumns.length || 1))}, minmax(0, 1fr))` }}>
                                                        {newRuleCadColumns.map(col => {
                                                          const maxVal = newRuleCadColumnMaxValues[col] || 0;
                                                          return (
                                                          <input 
                                                            key={col}
                                                            type="number" step="any" min="0" max={maxVal > 0 ? maxVal : undefined} placeholder={maxVal > 0 ? `${col} (تا ${maxVal}٪)` : col} value={d[col] === undefined ? '' : d[col]} 
                                                            onChange={e => {
                                                              let val = e.target.value === '' ? undefined : Number(e.target.value);
                                                              if (val !== undefined && maxVal > 0 && val > maxVal) val = maxVal;
                                                              setNewRuleCadData(p => ({ ...p, [cleanName]: { ...(p[cleanName] || {}), [col]: val } })) 
                                                            }} 
                                                            className="w-full text-center text-[8.5px] border border-slate-200 rounded p-0.5 focus:outline-none focus:ring-1 focus:ring-purple-500" 
                                                          />
                                                        )})}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          ) : null}

                                          {newRuleConditionType === 'responsibility' && (
                                            <div className="bg-blue-50 border border-blue-200/50 rounded-lg p-2.5 md:col-span-1 flex flex-col justify-between">
                                              <span className="text-[9px] font-black text-blue-800 block text-right leading-relaxed">
                                                ٢. ڕێژەی بەرپرسیاریەتی
                                              </span>
                                              <div className="text-[8.5px] font-bold text-blue-700 mt-1 mb-2 text-right">
                                                دیاری بکە چەند لە سەدی گشتی پرۆسیجەرەکە بۆ بەرپرسیاریەتی بڕوات (بۆ نموونە ئەگەر پشکی تیمەکە ١٢٪ بێت، و لێرە ٥٪ بنووسیت، ئەوا ٧٪ دەمێنێتەوە بۆ پێوانە ئاساییەکان):
                                              </div>
                                              <div className="relative w-full mb-3">
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max="100"
                                                  value={newRulePercent}
                                                  onChange={(e) => setNewRulePercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                                                  className="w-full bg-white border border-blue-200 rounded px-2 py-1.5 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                                                  placeholder="بۆ نموونە ٥"
                                                />
                                                <span className="absolute left-2 top-1.5 text-[9px] text-slate-400 font-bold">% بەرپرسیاریەتی دەبێت</span>
                                              </div>
                                              <div className="text-[8.5px] font-bold text-blue-700 mb-2 text-right">
                                                ئەو ڕێژانەی خوارەوە بنووسە بۆ هەرکاتێک نێرسەکە ئامادەبوو، دواتر بەپێی ئامادەبوونیان پشکی بەرپرسیاریەتییەکە دابەش دەبێت لە نێوانیاندا.
                                              </div>
                                              <div className="space-y-2 overflow-y-auto max-h-[150px] custom-scrollbar pl-1">
                                                {activeStaffList.map(name => {
                                                  const cleanName = cleanTitle(name);
                                                  const val = newRuleResponsibilityData[cleanName];
                                                  return (
                                                    <div key={cleanName} className="bg-white border border-blue-100 rounded p-1.5 flex items-center justify-between gap-2">
                                                      <span className="text-[9px] font-bold text-slate-800 text-right">{name}</span>
                                                      <div className="relative">
                                                        <input 
                                                          type="number" step="any" min="0" placeholder="ڕێژە" value={val === undefined ? '' : val} 
                                                          onChange={e => {
                                                            const v = e.target.value === '' ? undefined : Number(e.target.value);
                                                            setNewRuleResponsibilityData(p => ({ ...p, [cleanName]: v || 0 }));
                                                          }} 
                                                          className="w-16 text-center text-[8.5px] border border-slate-200 rounded p-1 pl-4 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                                        />
                                                        <span className="absolute left-1 top-1 text-slate-400 text-[8.5px] font-bold">%</span>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <div className="bg-white border border-slate-200 rounded-lg py-6 text-center text-[10.5px] text-slate-400 font-bold select-none shadow-5xs">
                                    تکایە سەرەتا تیمێک لە سەرەوە دیاری بکە بۆ دەستپێکردنی ڕێکبەندە مەرجیەکان
                                  </div>
                                )}

                                {newRuleTeam && (
                                  <>
                                    {/* Section 3: Optional companion override */}
                                    {newRuleConditionType !== 'feedback_hours' && newRuleConditionType !== 'cad' && newRuleConditionType !== 'responsibility' && (
                                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                          <input
                                            type="checkbox"
                                            checked={newRuleApplyToOthers}
                                            onChange={(e) => {
                                              const checked = e.target.checked;
                                              setNewRuleApplyToOthers(checked);
                                              if (checked) {
                                                // Initialize default percents for other colleagues
                                                let list: string[] = [];
                                                if (newRuleTeam === 'surgeon') {
                                                  list = savedDoctors.filter(d => !deactivatedItems.doctor?.includes(d));
                                                } else if (newRuleTeam === 'anesthesiaDoctor') {
                                                  list = savedAnesthesiaDoctors.filter(d => !deactivatedItems.anesthesiaDoctor?.includes(d));
                                                } else if (newRuleTeam === 'anesthesiaStaff') {
                                                  list = savedAnesthesiaStaff.filter(d => !deactivatedItems.anesthesiaStaff?.includes(d));
                                                } else if (newRuleTeam === 'nurse') {
                                                  list = savedNurses.filter(d => !deactivatedItems.nurse?.includes(d));
                                                }
                                                const others = list.filter(s => cleanTitle(s) !== cleanTitle(newRuleConditionStaff));
                                                const initialObj: Record<string, number> = {};
                                                others.forEach(o => {
                                                  initialObj[cleanTitle(o)] = newRuleOthersPercent;
                                                });
                                                setNewRuleOthersCustomPercents(initialObj);
                                              } else {
                                                setNewRuleOthersCustomPercents({});
                                              }
                                            }}
                                            className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                                          />
                                          <span className="text-[10px] font-black text-slate-700">
                                            ⚠️ نیسبەی سەرجەم کارمەندەکانی تری ئەم بەشە (هاوپیشەکانی) بگۆڕە بۆ بڕێکی دیاریکراو؟
                                          </span>
                                        </label>

                                        {newRuleApplyToOthers && (
                                          <div className="pt-2 border-t border-slate-100 space-y-2.5 animate-fade-in text-right">
                                            <span className="text-[9.5px] font-black text-indigo-700 block">نیسبەی هاوپیشەکانی تری ئەم بەشە بە جیا بنووسە:</span>
                                            
                                            {(() => {
                                              let list: string[] = [];
                                              if (newRuleTeam === 'surgeon') {
                                                list = savedDoctors.filter(d => !deactivatedItems.doctor?.includes(d));
                                              } else if (newRuleTeam === 'anesthesiaDoctor') {
                                                list = savedAnesthesiaDoctors.filter(d => !deactivatedItems.anesthesiaDoctor?.includes(d));
                                              } else if (newRuleTeam === 'anesthesiaStaff') {
                                                list = savedAnesthesiaStaff.filter(d => !deactivatedItems.anesthesiaStaff?.includes(d));
                                              } else if (newRuleTeam === 'nurse') {
                                                list = savedNurses.filter(d => !deactivatedItems.nurse?.includes(d));
                                              }
                                              const otherColleagues = list.filter(s => cleanTitle(s) !== cleanTitle(newRuleConditionStaff));

                                              if (otherColleagues.length === 0) {
                                                return (
                                                  <p className="text-[9px] text-slate-400 italic">هیچ هاوپیشەیەکی تر لەم تیمەدا چالاک نییە.</p>
                                                );
                                              }

                                              return (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                  {otherColleagues.map((colleague) => {
                                                    const cleanC = cleanTitle(colleague);
                                                    const val = newRuleOthersCustomPercents[cleanC] !== undefined
                                                      ? newRuleOthersCustomPercents[cleanC]
                                                      : newRuleOthersPercent;

                                                    return (
                                                      <div key={cleanC} className="bg-slate-50 border border-slate-200/60 rounded-lg p-2 flex justify-between items-center gap-2">
                                                        <span className="text-[9.5px] font-bold text-slate-700 truncate">{colleague}</span>
                                                        <div className="relative w-20 shrink-0">
                                                          <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={val}
                                                            onChange={(e) => {
                                                              const num = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                                              setNewRuleOthersCustomPercents(prev => ({
                                                                ...prev,
                                                                [cleanC]: num
                                                              }));
                                                            }}
                                                            className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-center font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                          />
                                                          <span className="absolute left-1 top-0.5 text-[8.5px] text-slate-400">%</span>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              );
                                            })()}

                                            <div className="flex items-center gap-2.5 pt-1.5 border-t border-slate-100/50">
                                              <span className="text-[9px] font-bold text-slate-400 shrink-0">نیسبەی گشتی ئەوانی تر (بۆ یەدەگ):</span>
                                              <div className="relative w-24">
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max="100"
                                                  value={newRuleOthersPercent}
                                                  onChange={(e) => {
                                                    const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                                    setNewRuleOthersPercent(val);
                                                  }}
                                                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                                                />
                                                <span className="absolute left-1.5 top-0.5 text-[9px] text-slate-400 font-bold">%</span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Conflict Warnings Box */}
                                    {(() => {
                                      const conflicts = getRuleConflicts(proc, newRuleConditionStaff, newRuleConditionType, newRulePercent, newRuleApplyToOthers);
                                      if (conflicts.length === 0) return null;
                                      return (
                                        <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-3 mt-3.5 space-y-2 text-right">
                                          <div className="flex items-center gap-1.5 text-rose-800 font-extrabold text-[10px]">
                                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                            <span>ئاگاداری: مەرجی دژبەیەک یان لێکچوو دۆزرایەوە!</span>
                                          </div>
                                          <div className="space-y-1.5 text-[9px] leading-relaxed font-bold text-rose-700">
                                            {conflicts.map((c, idx) => (
                                              <p key={idx} className={c.type === 'critical' ? 'text-rose-650 font-extrabold bg-rose-100/40 p-1.5 rounded border border-rose-150' : 'text-amber-700'}>
                                                {c.message}
                                              </p>
                                            ))}
                                          </div>
                                          <label className="flex items-center gap-2 pt-2 border-t border-rose-100 cursor-pointer select-none">
                                            <input
                                              type="checkbox"
                                              checked={bypassedConflict}
                                              onChange={(e) => setBypassedConflict(e.target.checked)}
                                              className="w-3.5 h-3.5 text-rose-650 border-rose-300 rounded focus:ring-rose-500 cursor-pointer"
                                            />
                                            <span className="text-[9.5px] font-black text-rose-850">
                                              دڵنیام لە تۆمارکردنی ئەم مەرجە سەرەڕای بوونی دژبەری
                                            </span>
                                          </label>
                                        </div>
                                      );
                                    })()}

                                    <div className="flex justify-end gap-2 pt-1 border-t border-slate-200/50">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAddingRuleToProc(null);
                                          setEditingRuleId(null);
                                          setNewRuleTeam('');
                                          setNewRuleOthersCustomPercents({});
                                          setBypassedConflict(false);
                                        }}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer"
                                      >
                                        پاشگەزبوونەوە
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (newRuleConditionType !== 'feedback_hours' && newRuleConditionType !== 'cad' && newRuleConditionType !== 'responsibility' && !newRuleConditionStaff.trim()) {
                                            alert('تکایە ناوی کارمەندی مەرج دیاری بکە!');
                                            return;
                                          }

                                          const conflicts = getRuleConflicts(proc, newRuleConditionStaff, newRuleConditionType, newRulePercent, newRuleApplyToOthers);
                                          const hasCritical = conflicts.some(c => c.type === 'critical');
                                          if (hasCritical && !bypassedConflict) {
                                            alert('⚠️ ناتوانیت ئەم مەرجە پاشەکەوت بکەیت چونکە دژبەرییەکی مەرجی هەیە! تکایە سەرەتا مەرجەکە ڕاست بکەرەوە یان خانەی مەرجی دڵنیایی بە جێگیرکردنی دژبەرییەکە لە خوارەوە هەڵبژێرە.');
                                            return;
                                          }

                                          const isSpecialRule = newRuleConditionType === 'feedback_hours' || newRuleConditionType === 'cad' || newRuleConditionType === 'responsibility';
                                          const finalTarget = isSpecialRule ? 'nurse_team' : newRuleConditionStaff.trim();
                                          const currentSplit = getSplitForProcedure(proc);
                                          const currentRules = currentSplit.conditionalRules || [];
                                          const newRuleItem: ConditionalRule = {
                                            id: editingRuleId || Math.random().toString(),
                                            conditionStaff: finalTarget,
                                            conditionType: newRuleConditionType,
                                            targetStaff: finalTarget,
                                            rulePercent: newRulePercent,
                                            applyToOthers: isSpecialRule ? false : newRuleApplyToOthers,
                                            othersPercent: isSpecialRule ? undefined : (newRuleApplyToOthers ? newRuleOthersPercent : undefined),
                                            othersCustomPercents: isSpecialRule ? undefined : (newRuleApplyToOthers ? newRuleOthersCustomPercents : undefined),
                                            feedbackData: newRuleConditionType === 'feedback_hours' ? newRuleFeedbackData : undefined,
                                            cadData: newRuleConditionType === 'cad' ? newRuleCadData : undefined,
                                            cadColumns: newRuleConditionType === 'cad' ? newRuleCadColumns : undefined,
                                            cadColumnMaxValues: newRuleConditionType === 'cad' ? newRuleCadColumnMaxValues : undefined,
                                            responsibilityData: newRuleConditionType === 'responsibility' ? newRuleResponsibilityData : undefined
                                          };
                                          
                                          setProcedureSplits(prev => {
                                            let updatedRules;
                                            if (editingRuleId) {
                                              updatedRules = currentRules.map(r => r.id === editingRuleId ? newRuleItem : r);
                                            } else {
                                              updatedRules = [...currentRules, newRuleItem];
                                            }
                                            return {
                                              ...prev,
                                              [proc]: {
                                                ...currentSplit,
                                                conditionalRules: updatedRules
                                              }
                                            };
                                          });
                                          
                                          // reset state
                                          setNewRuleConditionStaff('');
                                          setNewRuleTargetStaff('');
                                          setNewRulePercent(10);
                                          setNewRuleApplyToOthers(false);
                                          setNewRuleOthersPercent(5);
                                          setNewRuleOthersCustomPercents({});
                                          setNewRuleFeedbackData({});
                                          setNewRuleCadData({});
                                          setNewRuleResponsibilityData({});
                                          setNewRuleCadColumns(['بڕوانامە', 'ئەزموون']);
                                          setNewRuleCadColumnMaxValues({'بڕوانامە': 2, 'ئەزموون': 1.5});
                                          setNewRuleTeam('');
                                          setBypassedConflict(false);
                                          setEditingRuleId(null);
                                          setAddingRuleToProc(null);
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded-lg text-[9.5px] font-black shadow-3xs transition-all cursor-pointer"
                                      >
                                        {editingRuleId ? 'پاشەکەوتکردن' : 'تۆمارکردن'}
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingRuleToProc(proc);
                                  setEditingRuleId(null);
                                  setNewRuleTeam('');
                                  setNewRuleConditionStaff('');
                                  setNewRuleTargetStaff('');
                                  setNewRuleConditionType('present');
                                  setNewRulePercent(10);
                                  setNewRuleApplyToOthers(false);
                                  setNewRuleOthersPercent(5);
                                  setNewRuleOthersCustomPercents({});
                                  setNewRuleFeedbackData({});
                                  setNewRuleCadData({});
                                  setNewRuleResponsibilityData({});
                                  setNewRuleCadColumns(['بڕوانامە', 'ئەزموون']);
                                  setNewRuleCadColumnMaxValues({'بڕوانامە': 2, 'ئەزموون': 1.5});
                                  setBypassedConflict(false);
                                }}
                                className="inline-flex items-center gap-1.5 text-[10px] text-indigo-750 bg-indigo-50/50 hover:bg-indigo-150/70 font-black px-3 py-2 rounded-lg border border-indigo-200/50 cursor-pointer transition-all w-full justify-center"
                              >
                                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                                <span>زیادکردنی مەرج یان ئەگەری نوێ بۆ دابەشکاری ئەم پرۆسیجەرە</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Reports & Breakdown Tab */}
        {activeMainTab === 'reports' && (
          <div className="space-y-6" id="reports-dashboard" dir="rtl">
            {activeReportDetail ? (
              // ==========================================
              // DETAIL STATEMENT OF ACCOUNT / RECORD LIST
              // ==========================================
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6"
                id="report-detail-view"
              >
                {/* Detail Header & Navigation */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100">
                  <div className="space-y-1.5">
                    <button 
                      onClick={() => {
                        setActiveReportDetail(null);
                        setDetailSearchQuery('');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 font-black px-3 py-1.5 rounded-lg transition-all cursor-pointer mb-2"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>گەڕانەوە بۆ ڕاپۆرتی سەرەکی</span>
                    </button>
                    <h3 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-6 bg-emerald-600 rounded-sm"></span>
                      وردەکارییەکانی شایستەی دارایی: <span className="text-emerald-600">{activeReportDetail.label}</span>
                    </h3>
                    <p className="text-xs md:text-sm text-slate-500 font-bold">
                      لیستی سەرجەم ئەو تۆمار و نەخۆشانەی کە ئەم پشکەیان بۆ هەژمارکراوە
                    </p>
                  </div>

                  {/* Summary calculations for selected account */}
                  {(() => {
                    let sourceRows = [];
                    if (activeReportDetail.type === 'department') {
                      sourceRows = deptDetails[activeReportDetail.id]?.rows || [];
                    } else if (activeReportDetail.type === 'employee') {
                      sourceRows = empDetails[activeReportDetail.id]?.rows || [];
                    } else if (activeReportDetail.type === 'custom') {
                      sourceRows = customDetailsBreakdown[activeReportDetail.id]?.rows || [];
                    }
                    const totalEntitled = sourceRows.reduce((sum, r) => sum + r.calculatedShare, 0);

                    return (
                      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto" id="detail-quick-stats">
                        <div className="grid grid-cols-2 gap-3 flex-1 sm:flex-initial">
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 min-w-[130px] text-right">
                            <span className="text-[10px] md:text-xs font-black text-slate-400 block mb-1">کۆی شایستەی دارایی</span>
                            <span className="text-sm md:text-base font-black text-emerald-600">{Math.round(totalEntitled).toLocaleString()} <span className="text-[10px]">د.ع</span></span>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 min-w-[130px] text-right">
                            <span className="text-[10px] md:text-xs font-black text-slate-400 block mb-1">ژمارەی نەخۆشەکان</span>
                            <span className="text-sm md:text-base font-black text-slate-800">{sourceRows.length} <span className="text-[10px]">حاڵەت</span></span>
                          </div>
                        </div>

                        <button 
                          onClick={() => exportDetailToExcel(activeReportDetail.type, activeReportDetail.id, activeReportDetail.label)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:shadow shrink-0"
                          title="داونلۆدکردنی لیستی ئەم دیتەیڵە بە شێوەی ئێکسڵ"
                          id="export-detail-excel-btn"
                        >
                          <Download className="w-4.5 h-4.5" />
                          <span>ئێکسپۆرت (Excel)</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Patient Search in Detailed Statement */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <div className="relative w-full sm:max-w-md">
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="گەڕان بەدوای ناوی نەخۆشدا بکە..."
                      value={detailSearchQuery}
                      onChange={(e) => setDetailSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-205 focus:ring-1 focus:ring-emerald-500 rounded-lg pr-9 pl-3 py-2 text-xs md:text-sm focus:outline-none transition-all text-slate-800 font-bold"
                      id="detail-search-input"
                    />
                    {detailSearchQuery && (
                      <button 
                        onClick={() => setDetailSearchQuery('')}
                        className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <span className="text-xs text-slate-550 font-bold">
                    پیشاندانی تۆمارەکان بە فلتەری دەرگیراوی ئێستا
                  </span>
                </div>

                {/* Detailed Table Grid */}
                {(() => {
                  let sourceRows: BreakdownDetailRow[] = [];
                  if (activeReportDetail.type === 'department') {
                    sourceRows = deptDetails[activeReportDetail.id]?.rows || [];
                  } else if (activeReportDetail.type === 'employee') {
                    sourceRows = empDetails[activeReportDetail.id]?.rows || [];
                  } else if (activeReportDetail.type === 'custom') {
                    sourceRows = customDetailsBreakdown[activeReportDetail.id]?.rows || [];
                  }

                  const filteredRows = sourceRows.filter(row => 
                    !detailSearchQuery || row.patientName.toLowerCase().includes(detailSearchQuery.toLowerCase())
                  );

                  if (filteredRows.length === 0) {
                    return (
                      <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-2xl">
                        <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 font-black">هیچ تۆمارێک نەدۆزرایەوە بۆ نیشاندان</p>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto rounded-xl border border-slate-150">
                      <table className="w-full text-right border-collapse text-xs md:text-sm">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                            <th className="py-3 px-4">ناوی نەخۆش</th>
                            <th className="py-3 px-4 bg-slate-50 text-slate-900 border-r border-l border-slate-200">ناوی وەرگر / کارمەند</th>
                            <th className="py-3 px-4">بەروار</th>
                            <th className="py-3 px-4">جۆری پرۆسیجەرەکان</th>
                            <th className="py-3 px-4">پارەی گشتی فاکتە</th>
                            <th className="py-3 px-4 text-emerald-600">پشکی حیسابکراو</th>
                            <th className="py-3 px-4 text-slate-500">ڕێژە و بنەمای حیسابکردن</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredRows.map((row, idx) => {
                            const recipientDispName = row.recipientName || (activeReportDetail.type === 'employee' ? activeReportDetail.label : '');
                            return (
                              <tr key={`${row.recordId}-${idx}`} className="hover:bg-slate-50/50 transition-colors font-bold text-slate-800">
                                <td className="py-3 px-4 text-slate-950 font-black">{row.patientName}</td>
                                <td className="py-3 px-4 bg-emerald-50/40 text-emerald-950 font-black border-r border-l border-slate-150">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-emerald-150 rounded-lg text-xs font-black text-emerald-800">
                                    <User className="w-3.5 h-3.5 text-emerald-600" />
                                    {recipientDispName || 'سەنتەر / نەخۆشخانە'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-slate-500 font-mono text-xs">{row.date}</td>
                                <td className="py-3 px-4 text-slate-600">{row.procedures}</td>
                                <td className="py-3 px-4 text-slate-700">{(row.grossAmount).toLocaleString()} <span className="text-[10px] text-slate-400">د.ع</span></td>
                                <td className="py-3 px-4 text-emerald-700 font-extrabold">{Math.round(row.calculatedShare).toLocaleString()} <span className="text-[10px] text-emerald-500">د.ع</span></td>
                                <td className="py-3 px-4 text-slate-500 text-xs font-semibold">{row.detailInfo}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

              </motion.div>
            ) : (
              // ==========================================
              // GENERAL DIRECTORY OVERVIEW (MAIN REPORTS)
              // ==========================================
              <>
                {/* Explanatory banner */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-3xs mb-6" id="distribution-banner">
                  <div className="space-y-1 text-right">
                    <h4 className="font-extrabold text-emerald-900 text-sm md:text-base flex items-center gap-2">
                      <Coins className="w-5 h-5 text-emerald-600 animate-bounce" />
                      <span>سیستەمی ژیرانەی دابەشکردنی داهات بەپێی نیسبە</span>
                    </h4>
                    <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                      ئەم بەشە بەشێوەیەکی ئۆتۆماتیکی داهاتی تۆمارەکان دابەش دەکات بەسەر پزیشک و کارمەندەکاندا بەپێی ئەو فلتەرانەی کە داوتە.
                    </p>
                  </div>
                  <div className="text-[11px] font-bold bg-white text-emerald-800 px-3.5 py-2 rounded-xl border border-emerald-200 shrink-0">
                    فلتەری ئێستا: <span className="font-mono text-xs font-black">{filteredRecords.length}</span> تۆمار بەکاردەهێنرێت
                  </div>
                </div>

                {/* Distribution Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6" id="distribution-stats">
                  {/* Doctor total */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-1.5 shadow-2xs border-r-4 border-r-emerald-500 text-right">
                    <span className="text-[10px] font-black text-slate-400 block uppercase">بەشی پزیشکی نەشتەرگەری</span>
                    <span className="text-lg font-black text-slate-900 font-mono block">
                      {Math.round(overallSurgeonsShare).toLocaleString()} <span className="text-[10px] font-sans font-bold text-slate-500">د.ع</span>
                    </span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md inline-block mt-1">سەرجەم پزیشکەکان</span>
                  </div>

                  {/* Anesthesia Doctor total */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-1.5 shadow-2xs border-r-4 border-r-indigo-500 text-right">
                    <span className="text-[10px] font-black text-slate-400 block uppercase">بەشی پزیشکانی بێهۆشکاری</span>
                    <span className="text-lg font-black text-slate-900 font-mono block">
                      {Math.round(overallAnesthesiaDocsShare).toLocaleString()} <span className="text-[10px] font-sans font-bold text-slate-500">د.ع</span>
                    </span>
                    <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md inline-block mt-1">پزیشکی بەنج</span>
                  </div>

                  {/* Anesthesia Staff total */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-1.5 shadow-2xs border-r-4 border-r-sky-500 text-right">
                    <span className="text-[10px] font-black text-slate-400 block uppercase">داهاتی یاریدەدەرانی بەنج</span>
                    <span className="text-lg font-black text-slate-900 font-mono block">
                      {Math.round(overallAnesthesiaStaffShare).toLocaleString()} <span className="text-[10px] font-sans font-bold text-slate-500">د.ع</span>
                    </span>
                    <span className="text-[9px] bg-sky-50 text-sky-700 font-bold px-2 py-0.5 rounded-md inline-block mt-1">کارمەندی بەنج</span>
                  </div>

                  {/* Nurses total */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-1.5 shadow-2xs border-r-4 border-r-violet-500 text-right">
                    <span className="text-[10px] font-black text-slate-400 block uppercase">بەشی تیمی نێرسەکان</span>
                    <span className="text-lg font-black text-slate-900 font-mono block">
                      {Math.round(overallNursesShare).toLocaleString()} <span className="text-[10px] font-sans font-bold text-slate-500">د.ع</span>
                    </span>
                    <span className="text-[9px] bg-violet-50 text-violet-700 font-bold px-2 py-0.5 rounded-md inline-block mt-1">تیمی نێرس</span>
                  </div>

                  {/* Center / Clinic total */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-1.5 shadow-2xs border-r-4 border-r-amber-500 text-right">
                    <span className="text-[10px] font-black text-slate-400 block uppercase">بەشی سەنتەر / کلینیک</span>
                    <span className="text-lg font-black text-amber-600 font-mono block">
                      {Math.round(overallClinicShare).toLocaleString()} <span className="text-[10px] font-sans font-bold text-slate-500">د.ع</span>
                    </span>
                    <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md inline-block mt-1">پشکی کلینیکەکە</span>
                  </div>

                  {/* Custom Shares total */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 shadow-2xs border-r-4 border-r-rose-500 flex flex-col justify-between text-right">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 block uppercase">کۆی پشکە زیادکراوەکان</span>
                      <span className="text-lg font-black text-rose-600 font-mono block">
                        {Math.round(overallCustomShare).toLocaleString()} <span className="text-[10px] font-sans font-bold text-slate-500">د.ع</span>
                      </span>
                    </div>
                    {Object.keys(overallCustomShareBreakdown).length > 0 ? (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5 mt-1 text-right">
                        {Object.entries(overallCustomShareBreakdown).map(([name, sum]) => (
                          <div key={name} className="flex justify-between items-center text-[10px] font-bold text-slate-600 gap-1">
                            <span className="font-mono text-rose-700 whitespace-nowrap">{Math.round(sum).toLocaleString()} د.ع</span>
                            <span className="truncate max-w-[110px]" title={name}>{name}:</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[9px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-md inline-block mt-1">پشکی تر و زیادە</span>
                    )}
                  </div>
                </div>

                {/* Reports Descriptive Banner */}
                <div className="bg-gradient-to-l from-emerald-600 to-emerald-700 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5" id="reports-header-banner">
                  <div className="space-y-1.5 text-right">
                    <h3 className="font-black text-white text-base md:text-xl flex items-center gap-2">
                      <PieChart className="w-5 h-5 animate-pulse" />
                      <span>سەنتەری ڕاپۆرت و شیکاری دارایی تۆمارەکان</span>
                    </h3>
                    <p className="text-xs md:text-sm text-emerald-100 font-bold leading-relaxed max-w-2xl">
                      لەم لاپەڕەیەدا بەتەواوی نیسبە و پشکی سەنتەر، پزیشکانی نەشتەرگەری، پزیشکانی بێهۆشکاری و یاریدەدەران بەڕوونی و شەفافی دەبینرێت. دەتوانیت کلیک لەسەر هەر بەش یان کارمەندێک بکەیت تا دەستبەجێ فێلبینی و ڕەگی نیسبەکەی بزانیت.
                    </p>
                  </div>
                  <button 
                    onClick={exportSplitsToExcel}
                    className="bg-white hover:bg-slate-50 text-emerald-700 hover:text-emerald-800 font-black text-xs md:text-sm px-5 py-3 rounded-xl shadow-sm hover:shadow transition-all shrink-0 cursor-pointer flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>ڕاپۆرتی کۆی گشتی دارایی و پشکەکان (Excel)</span>
                  </button>
                </div>

                {/* Date Filter Card inside General Reports Section */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-right space-y-4" id="reports-date-filter-section">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-100">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-900 text-xs md:text-sm flex items-center gap-2">
                        <Calendar className="w-4.5 h-4.5 text-emerald-600" />
                        <span>فلتەرکردنی ڕاپۆرتە گشتییەکان بەپێی بەروار</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-black">بەروارێکی دیاریکراو یان ماوەیەکی دڵخواز هەڵبژێرە بۆ بینینی پشکەکان لەو ماوەیەدا</p>
                    </div>

                    {/* Mode Buttons Selector */}
                    <div className="bg-slate-100 p-1 rounded-xl flex gap-1 self-stretch sm:self-auto shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          setReportDateMode('range');
                        }}
                        className={`py-1.5 px-3 rounded-lg font-black text-xs transition-all cursor-pointer ${
                          reportDateMode === 'range'
                            ? 'bg-emerald-600 text-white shadow-3xs'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        ماوەی نێوان دوو بەروار
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReportDateMode('single');
                          if (startDateFilter) {
                            setEndDateFilter(startDateFilter);
                          }
                        }}
                        className={`py-1.5 px-3 rounded-lg font-black text-xs transition-all cursor-pointer ${
                          reportDateMode === 'single'
                            ? 'bg-emerald-600 text-white shadow-3xs'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        یەک بەرواری دیاریکراو
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-4 items-end">
                    {reportDateMode === 'single' ? (
                      /* Single Date Picker */
                      <div className="space-y-1.5 flex-1 w-full text-right animate-isIn">
                        <label className="text-[11px] font-black text-slate-700 block pr-1">بەرواری دیاریکراو</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={startDateFilter}
                            onChange={(e) => {
                              const v = e.target.value;
                              setStartDateFilter(v);
                              setEndDateFilter(v);
                            }}
                            className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-205 focus:ring-2 focus:ring-emerald-500 rounded-xl px-4 py-2 text-xs md:text-sm font-bold focus:outline-none transition-all text-slate-800 cursor-pointer"
                            id="reports-single-date-input"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Date Range Picker */
                      <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full text-right sm:items-end animate-isIn">
                        <div className="space-y-1.5 flex-1 w-full">
                          <label className="text-[11px] font-black text-slate-700 block pr-1">لە بەرواری</label>
                          <input
                            type="date"
                            value={startDateFilter}
                            onChange={(e) => setStartDateFilter(e.target.value)}
                            className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-205 focus:ring-2 focus:ring-emerald-500 rounded-xl px-4 py-2 text-xs md:text-sm font-bold focus:outline-none transition-all text-slate-800 cursor-pointer"
                            id="reports-start-date-input"
                          />
                        </div>
                        <div className="flex items-center justify-center p-1.5 text-slate-400 font-bold self-center sm:mb-1.5 text-xs">
                          تاوەکو
                        </div>
                        <div className="space-y-1.5 flex-1 w-full">
                          <label className="text-[11px] font-black text-slate-700 block pr-1">بۆ بەرواری</label>
                          <input
                            type="date"
                            value={endDateFilter}
                            onChange={(e) => setEndDateFilter(e.target.value)}
                            className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-205 focus:ring-2 focus:ring-emerald-500 rounded-xl px-4 py-2 text-xs md:text-sm font-bold focus:outline-none transition-all text-slate-800 cursor-pointer"
                            id="reports-end-date-input"
                          />
                        </div>
                      </div>
                    )}

                    {/* Quick Filters / Preset Buttons */}
                    <div className="flex gap-1.5 flex-wrap items-center shrink-0 w-full lg:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          setStartDateFilter(today);
                          setEndDateFilter(today);
                          setReportDateMode('single');
                        }}
                        className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] md:text-xs font-black text-slate-705 transition-colors cursor-pointer"
                      >
                        ئەمڕۆ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const yesterdayObj = new Date();
                          yesterdayObj.setDate(yesterdayObj.getDate() - 1);
                          const yesterday = yesterdayObj.toISOString().split('T')[0];
                          setStartDateFilter(yesterday);
                          setEndDateFilter(yesterday);
                          setReportDateMode('single');
                        }}
                        className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] md:text-xs font-black text-slate-705 transition-colors cursor-pointer"
                      >
                        دوێنێ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const last7 = new Date();
                          last7.setDate(last7.getDate() - 6);
                          const start = last7.toISOString().split('T')[0];
                          const end = new Date().toISOString().split('T')[0];
                          setStartDateFilter(start);
                          setEndDateFilter(end);
                          setReportDateMode('range');
                        }}
                        className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] md:text-xs font-black text-slate-705 transition-colors cursor-pointer"
                      >
                        ٧ ڕۆژی ڕابردوو
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const last30 = new Date();
                          last30.setDate(last30.getDate() - 29);
                          const start = last30.toISOString().split('T')[0];
                          const end = new Date().toISOString().split('T')[0];
                          setStartDateFilter(start);
                          setEndDateFilter(end);
                          setReportDateMode('range');
                        }}
                        className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] md:text-xs font-black text-slate-705 transition-colors cursor-pointer"
                      >
                        ٣٠ ڕۆژی ڕابردوو
                      </button>

                      {/* Clear Button */}
                      {(startDateFilter || endDateFilter) && (
                        <button
                          type="button"
                          onClick={() => {
                            setStartDateFilter('');
                            setEndDateFilter('');
                          }}
                          className="py-2.5 px-3.5 bg-rose-50 hover:bg-rose-100/80 text-rose-650 border border-rose-200 rounded-xl text-[10px] md:text-xs font-black flex items-center gap-1 shadow-3xs transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>پاککردنەوە</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary info label */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-emerald-50/40 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-800 font-bold gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-ping"></span>
                      <span>فلتەری فەرمی:</span>
                      {startDateFilter || endDateFilter ? (
                        reportDateMode === 'single' ? (
                          <span>تەنها ڕۆژی <span className="font-mono bg-white border border-emerald-150 px-1.5 py-0.5 rounded text-emerald-950 font-black">{startDateFilter}</span></span>
                        ) : (
                          <span>ماوەی نێوان <span className="font-mono bg-white border border-emerald-150 px-1.5 py-0.5 rounded text-emerald-950 font-black">{startDateFilter || 'سەرەتا'}</span> تاوەکو <span className="font-mono bg-white border border-emerald-150 px-1.5 py-0.5 rounded text-emerald-950 font-black">{endDateFilter || 'ئەمڕۆ'}</span></span>
                        )
                      ) : (
                        <span>سەرجەم تۆمارە مێژووییەکان (بێ دیاریکردنی بەروار)</span>
                      )}
                    </div>
                    <span className="text-[10px] md:text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1 font-black transition-all">
                      {filteredRecords.length} تۆمار لەم ماوەیەدا هەیە
                    </span>
                  </div>
                </div>

                {/* Overall Statistical Highlight Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6" id="reports-stats-cards">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs text-right">
                    <span className="text-[11px] font-black text-slate-400 block mb-1.5 uppercase">کۆی داهاتی فیلتەرکراو</span>
                    <h4 className="text-lg md:text-xl font-black text-slate-900">{totalReceivedAmount.toLocaleString()} <span className="text-xs text-slate-400 font-semibold">د.ع</span></h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1.5">کۆی داهاتی گشتی پێش جیاکردنەوە</p>
                  </div>
                  
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs text-right">
                    <span className="text-[11px] font-black text-slate-400 block mb-1.5 uppercase">کۆی حیساباتی دابەشکراو</span>
                    <h4 className="text-lg md:text-xl font-black text-emerald-600">{(overallSurgeonsShare + overallAnesthesiaDocsShare + overallAnesthesiaStaffShare + overallNursesShare + overallCustomShare).toLocaleString()} <span className="text-xs text-emerald-500 font-semibold">د.ع</span></h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1.5">کۆی هەموو پشکە دابەشکراوەکانی تیمەکە</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs text-right">
                    <span className="text-[11px] font-black text-slate-400 block mb-1.5 uppercase">کۆی پشکی سەنتەر</span>
                    <h4 className="text-lg md:text-xl font-black text-blue-600">{overallClinicShare.toLocaleString()} <span className="text-xs text-blue-500 font-semibold">د.ع</span></h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1.5">بڕی پاشەکەوتکراو لە نەخۆشخانە/سەنتەر</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs text-right">
                    <span className="text-[11px] font-black text-slate-400 block mb-1.5 uppercase">مامناوەندی هەر فاکتەر</span>
                    <h4 className="text-lg md:text-xl font-black text-slate-900">{Math.round(averageAmount).toLocaleString()} <span className="text-xs text-slate-400 font-semibold">د.ع</span></h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1.5">تێکڕای خەرجی هەر نەخۆشێک تاوەکو ئێستا</p>
                  </div>
                </div>



                {/* Primary Report Grid: Categories vs Custom Splits vs Employees */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="reports-main-layouts">
                  
                  {/* Category 1: Standard Roles & Departments */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4 text-right">
                    <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-3 text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-600" />
                        <span>پشکی گشتی بەپێی بەشەکان</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            exportDepartmentsSummaryToExcel();
                          }}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                          title="هەناردەکردنی ئەم خشتەی بەشانە بۆ ئێکسڵ"
                          id="export-depts-excel-btn"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <span className="text-xs bg-emerald-55 text-emerald-700 px-2.5 py-1 rounded-full font-black">٦ بەش</span>
                      </div>
                    </h3>

                    <div className="space-y-3">
                      {[
                        { id: 'surgeon', key: 'surgeon', label: 'بەشی پزیشکی نەشتەرگەر', amount: overallSurgeonsShare, borderClass: 'border-r-emerald-500', textClass: 'text-emerald-700', bgClass: 'bg-emerald-50', iconColor: 'text-emerald-500' },
                        { id: 'anesthesiaDoc', key: 'anesthesiaDoc', label: 'بەشی پزیشکانی بێهۆشکاری', amount: overallAnesthesiaDocsShare, borderClass: 'border-r-indigo-500', textClass: 'text-indigo-700', bgClass: 'bg-indigo-50', iconColor: 'text-indigo-500' },
                        { id: 'anesthesiaStaff', key: 'anesthesiaStaff', label: 'تیمی یاریدەدەرانی بەنج', amount: overallAnesthesiaStaffShare, borderClass: 'border-r-sky-500', textClass: 'text-sky-700', bgClass: 'bg-sky-50', iconColor: 'text-sky-500' },
                        { id: 'nurse', key: 'nurse', label: 'بەشی نێرس و کارمەندان', amount: overallNursesShare, borderClass: 'border-r-violet-500', textClass: 'text-violet-700', bgClass: 'bg-violet-50', iconColor: 'text-violet-500' },
                        { id: 'clinic', key: 'clinic', label: 'بەشی کلینیک / سەنتەر', amount: overallClinicShare, borderClass: 'border-r-amber-500', textClass: 'text-amber-700', bgClass: 'bg-amber-50', iconColor: 'text-amber-500' },
                        { id: 'custom', key: 'custom', label: 'کۆی گشتی پشکە زیادکراوەکانی تر', amount: overallCustomShare, borderClass: 'border-r-rose-500', textClass: 'text-rose-700', bgClass: 'bg-rose-50', iconColor: 'text-rose-500' }
                      ].map((dept) => {
                        const totalDistributed = overallSurgeonsShare + overallAnesthesiaDocsShare + overallAnesthesiaStaffShare + overallNursesShare + overallClinicShare + overallCustomShare;
                        const pct = totalDistributed > 0 ? (dept.amount / totalDistributed) * 100 : 0;

                        return (
                          <div 
                            key={dept.id}
                            onClick={() => setActiveReportDetail({ type: 'department', id: dept.key, label: dept.label })}
                            className={`p-3.5 rounded-xl border border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer flex justify-between items-center group relative overflow-hidden border-r-4 ${dept.borderClass}`}
                          >
                            <div className="space-y-1.5 flex-1 pr-1 text-right">
                              <span className="font-extrabold text-[12px] text-slate-800 block group-hover:text-emerald-700 transition-colors uppercase">{dept.label}</span>
                              <span className="font-black text-lg text-slate-900 font-mono block transition-colors">
                                {Math.round(dept.amount).toLocaleString()} <span className="text-[10px] font-sans font-bold text-slate-500">د.ع</span>
                              </span>
                              <span className={`text-[9px] font-bold mt-1 inline-block ${dept.bgClass} ${dept.textClass} px-2 py-0.5 rounded-md`}>
                                % {pct.toFixed(1)} لە سەرجەم پشکەکان
                              </span>
                            </div>

                            <div className="text-left shrink-0 pl-1 flex flex-col items-end gap-2">
                              <div className={`w-7 h-7 rounded-full ${dept.bgClass} flex items-center justify-center`}>
                                <ChevronLeft className={`w-4 h-4 ${dept.iconColor} group-hover:-translate-x-0.5 transition-transform`} />
                              </div>
                              <span className={`text-[10px] ${dept.iconColor} font-black mt-1`}>وردەکاری</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category 2: Custom Splits & Extra Names */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4 text-right">
                    <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-3 text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-teal-600" />
                        <span>پشکە زیادکراوەکانی تر بەجیا</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {Object.keys(overallCustomShareBreakdown).length > 0 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              exportCustomSplitsSummaryToExcel();
                            }}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-teal-600 rounded-lg transition-colors cursor-pointer"
                            title="هەناردەکردنی ئەم پشکانە بۆ ئێکسڵ"
                            id="export-customs-excel-btn"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full font-black">پشکەکان</span>
                      </div>
                    </h3>

                    {Object.keys(overallCustomShareBreakdown).length === 0 ? (
                      <div className="text-center py-20 bg-slate-50/50 border border-slate-100 rounded-2xl">
                        <Coins className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs text-slate-500 font-bold">هیچ پشکێکی زیادە گوزارشت نەکراوە بۆ ئەم فلتەرە</p>
                      </div>
                    ) : (
                      <div className="space-y-3 overflow-y-auto max-h-[480px] pl-1">
                        {Object.entries(overallCustomShareBreakdown).map(([name, amount]) => (
                          <div 
                            key={name}
                            onClick={() => setActiveReportDetail({ type: 'custom', id: name, label: name })}
                            className="p-3.5 rounded-xl border border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer flex justify-between items-center group relative overflow-hidden border-r-4 border-r-teal-500"
                          >
                            <div className="space-y-1 pr-1 flex-1 text-right">
                              <span className="font-extrabold text-[12px] text-slate-800 block group-hover:text-emerald-700 transition-colors uppercase pt-1">{name}</span>
                              <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded px-2 rounded-md font-bold inline-block mt-0.5">پشکی زیادە</span>
                            </div>

                            <div className="text-left shrink-0 pl-1 flex flex-col items-end gap-1.5">
                              <span className="font-black text-slate-900 text-[15px] font-mono block">{(amount).toLocaleString()} <span className="text-[9px] text-slate-400 font-semibold">د.ع</span></span>
                              <div className="flex items-center gap-0.5 mt-1 text-[10px] text-teal-600 font-black">
                                <span>بینین</span>
                                <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category 3: Employees Statement List */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4 text-right flex flex-col">
                    <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-3 text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-600" />
                        <span>شایستەی کارمەندان و دکتۆران بەجیا</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {sortedIndividualEarnings.length > 0 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              exportStaffSummaryToExcel();
                            }}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                            title="هەناردەکردنی ئەم خشتەی شایستە داراییانە بۆ ئێکسڵ"
                            id="export-staff-excel-btn"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-black">کارمەندان</span>
                      </div>
                    </h3>

                    {/* Employee Small Search Bar */}
                    <div className="relative">
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 pointer-events-none">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input 
                        type="text"
                        placeholder="گەڕان بەدوای ناوی دکتۆر یان کارمەند..."
                        value={staffReportQuery}
                        onChange={(e) => setStaffReportQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded-lg pr-8.5 pl-3 py-1.5 text-xs md:text-sm focus:outline-none transition-all text-slate-800 font-semibold"
                        id="staff-report-search"
                      />
                    </div>

                    {/* Employee Listing */}
                    {(() => {
                      const filteredEarnings = sortedIndividualEarnings.filter(emp => 
                        !staffReportQuery || emp.name.toLowerCase().includes(staffReportQuery.toLowerCase()) ||
                        emp.role.toLowerCase().includes(staffReportQuery.toLowerCase())
                      );

                      if (filteredEarnings.length === 0) {
                        return (
                          <div className="text-center py-16 bg-slate-50 border border-slate-100 rounded-2xl">
                            <User className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                            <p className="text-xs text-slate-500 font-bold">هیچ دکتۆر یان کارمەندێک نەدۆزرایەوە</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3 overflow-y-auto max-h-[480px] pl-1 pr-0.5" id="employees-column-scrollbar">
                          {filteredEarnings.map((emp) => {
                            const uniqueKey = `${emp.role}_${emp.name}`;
                            
                            let colorSet = { border: 'border-r-slate-400', bg: 'bg-slate-50', text: 'text-slate-600', icon: 'text-slate-500' };
                            if (emp.role === 'پزیشکی نەشتەرگەری') colorSet = { border: 'border-r-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' };
                            else if (emp.role === 'پزیشکی بەنج') colorSet = { border: 'border-r-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-500' };
                            else if (emp.role === 'کارمەندی بەنج') colorSet = { border: 'border-r-sky-500', bg: 'bg-sky-50', text: 'text-sky-700', icon: 'text-sky-500' };
                            else if (emp.role === 'کارمەندی نێرس') colorSet = { border: 'border-r-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', icon: 'text-violet-500' };

                            return (
                              <div 
                                key={uniqueKey}
                                onClick={() => setActiveReportDetail({ type: 'employee', id: uniqueKey, label: `${emp.name} (${emp.role})` })}
                                className={`p-3.5 rounded-xl border border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer flex justify-between items-center group relative overflow-hidden border-r-4 ${colorSet.border}`}
                              >
                                <div className="space-y-1.5 flex-1 pr-1 text-right">
                                  <span className="font-extrabold text-[13px] text-slate-900 block group-hover:text-emerald-700 transition-colors uppercase pt-1">{emp.name}</span>
                                  <div className="flex gap-2 text-[10px] items-center">
                                    <span className={`${colorSet.text} ${colorSet.bg} font-black px-1.5 py-0.5 rounded-md`}>{emp.role}</span>
                                    <span className="text-slate-400 font-semibold">{emp.count} حاڵەت</span>
                                  </div>
                                </div>

                                <div className="text-left shrink-0 pl-1 flex flex-col items-end justify-between self-stretch">
                                  <span className="font-black text-[14px] text-slate-900 font-mono block">
                                    {Math.round(emp.amount).toLocaleString()} <span className="text-[9px] text-slate-400 font-sans font-bold">د.ع</span>
                                  </span>
                                  <div className="flex items-center gap-0.5 text-[9px] font-black text-slate-400 mt-2">
                                    <span>کرتە بکە</span>
                                    <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                </div>
              </>
            )}
          </div>
        )}

        {/* Analytics & Data Tab */}
        {activeMainTab === 'analyze' && (
          <AnalyzePanel 
             filteredRecords={filteredRecords} 
             individualEarnings={individualEarnings}
             deptDetails={deptDetails}
             startDateFilter={startDateFilter}
             endDateFilter={endDateFilter}
             setStartDateFilter={setStartDateFilter}
             setEndDateFilter={setEndDateFilter}
          />
        )}

        {/* Settlements & cash payouts tab */}
        {activeMainTab === 'settlements' && (
          <SettlementsPanel
            records={records}
            setRecords={setRecords}
            individualEarnings={individualEarnings}
            empDetails={empDetails}
            deptDetails={deptDetails}
            customDetailsBreakdown={customDetailsBreakdown}
            user={user}
          />
        )}
      </main>

      {/* Form Dialog/Modal for adding and editing records */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto" id="form-modal-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl w-full lg:max-w-6xl md:max-w-4xl mx-auto shadow-2xl overflow-hidden border border-slate-100"
              id="form-modal-container"
              dir="rtl"
            >
              {/* Modal header */}
              <div className="border-b border-slate-200 bg-emerald-600/5 px-6 py-5 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-slate-950 text-lg md:text-xl flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
                    {editingId ? 'دەستکاریکردنی زانیارییەکانی نەخۆش' : 'مێزی تۆمارکردنی داتای نەخۆشی نوێ'}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-500 font-bold mt-1">تکایە زانیارییەکان لە یەک لاپەڕەدا وردبینی بکە بەبێ پێویستی بە سکرۆڵ</p>
                </div>
                <button 
                  onClick={() => setShowFormModal(false)}
                  className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={handleSubmit} className="flex flex-col bg-white rounded-b-2xl">
                {/* 3 columns grid on desktop, 1 column on mobile */}
                <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6" id="form-grid-body">
                  {errorMsg && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-800 text-sm p-4 rounded-xl flex items-center gap-2 md:col-span-3 font-semibold" id="form-error">
                      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Column 1: Patient main details */}
                  <div className="space-y-5 bg-slate-55/60 p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <h4 className="text-xs md:text-[13px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2.5 mb-2.5">زانیارییە سەرەکییەکانی نەخۆش</h4>
                    
                    {/* Patient Name */}
                    <div className="space-y-2">
                      <label className="text-[13px] md:text-sm font-black text-indigo-950 block border-r-4 border-indigo-500 bg-indigo-50 px-3 py-2 rounded-l-lg mb-1.5 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-indigo-600" />
                        <span>ناوی تەواوی نەخۆش</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-450 pointer-events-none">
                          <User className="w-4 h-4 text-slate-400" />
                        </span>
                        <input 
                          type="text"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          placeholder="ناوی تەواوی نەخۆش بنووسە"
                          className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-emerald-500 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none transition-all text-slate-800 font-bold shadow-2xs"
                          id="input-patient-name"
                        />
                      </div>
                    </div>

                    {/* Total Money Input */}
                    <div className="space-y-2">
                      <label className="text-[13px] md:text-sm font-black text-indigo-950 block border-r-4 border-indigo-500 bg-indigo-50 px-3 py-2 rounded-l-lg mb-1.5 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                        <span>بڕی پارەی گشتی (دیناری عێراقی)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-450 pointer-events-none">
                          <DollarSign className="w-4 h-4 text-slate-400" />
                        </span>
                        <input 
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9,]*"
                          value={formatMoneyWithCommas(totalAmount)}
                          onChange={(e) => {
                            const rawVal = e.target.value;
                            const parsed = parseMoneyWithCommas(rawVal);
                            if (parsed === '' || /^\d*$/.test(parsed)) {
                              setTotalAmount(parsed);
                            }
                          }}
                          placeholder="مثال: 350,000"
                          className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-emerald-500 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none transition-all font-mono text-slate-800 font-bold text-right shadow-2xs"
                          id="input-total-amount"
                        />
                      </div>
                    </div>

                    {/* Date Input */}
                    <div className="space-y-2">
                      <label className="text-[13px] md:text-sm font-black text-indigo-950 block border-r-4 border-indigo-500 bg-indigo-50 px-3 py-2 rounded-l-lg mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span>بەرواری سەردان / نەشتەرگەری</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-450 pointer-events-none">
                          <Calendar className="w-4 h-4 text-slate-400" />
                        </span>
                        <input 
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-emerald-500 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none transition-all font-mono text-slate-800 font-bold text-center shadow-2xs"
                          id="input-date"
                        />
                      </div>
                    </div>

                    {/* Patient Notes */}
                    <div className="space-y-2" id="patient-notes-wrapper">
                      <label className="text-[13px] md:text-sm font-black text-indigo-950 block border-r-4 border-indigo-500 bg-indigo-50 px-3 py-2 rounded-l-lg mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span>تێبینی گشتی نەخۆش</span>
                      </label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="تێبینییەکی کورت..."
                        className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm focus:outline-none transition-all text-slate-800 leading-relaxed resize-none font-semibold shadow-2xs"
                        id="input-patient-notes"
                      />
                    </div>

                  </div>

                  {/* Column 2: Treatments and Main Doctor */}
                  <div className="space-y-5 bg-slate-55/60 p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <h4 className="text-xs md:text-[13px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2.5 mb-2.5">پرۆسیجەر و دکتۆری ئەنجامدەر</h4>

                    {/* Medical Procedure wrapper */}
                    <div className="space-y-2.5" id="procedure-select-wrapper">
                      <label className="text-[13px] md:text-sm font-black text-indigo-950 block border-r-4 border-indigo-500 bg-indigo-50 px-3 py-2 rounded-l-lg mb-1.5 flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-indigo-600" />
                        <span>جۆری پرۆسیجەری ئەنجامدراو</span>
                      </label>
                      <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                        {savedProcedures.filter(proc => !deactivatedItems.procedure?.includes(proc) || selectedProcedures.includes(proc)).map((proc) => {
                          const isSelected = selectedProcedures.includes(proc);
                          return (
                            <button
                              type="button"
                              key={proc}
                              onClick={() => toggleProcedureSelection(proc)}
                              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border transition-all text-right cursor-pointer font-extrabold text-xs md:text-[13px] ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs scale-[1.01]'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-705 hover:text-slate-900 shadow-3xs'
                              }`}
                            >
                              <span>{proc}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                            </button>
                          );
                        })}
                        
                        <button
                          type="button"
                          onClick={() => setShowCustomProcedureField(!showCustomProcedureField)}
                          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border transition-all text-right cursor-pointer font-extrabold text-xs md:text-[13px] ${
                            showCustomProcedureField
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-white hover:bg-slate-100 border-slate-205 text-emerald-600 border-dashed shadow-3xs'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>زیادکردن</span>
                        </button>
                      </div>

                      <AnimatePresence>
                        {showCustomProcedureField && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm"
                          >
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={customProcedureInput}
                                onChange={(e) => setCustomProcedureInput(e.target.value)}
                                placeholder="ناوی پرۆسیجەر"
                                className="flex-1 bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-none transition-all text-slate-800 font-bold"
                                id="custom-procedure-input"
                                autoComplete="off"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomProcedure();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={handleAddCustomProcedure}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-2 rounded-lg transition-all"
                              >
                                تۆمارکردن
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Custom Splits Override Section for all selected procedures */}
                    {(() => {
                      const allCustomSplits: { item: CustomSplitItem; procName: string }[] = [];
                      selectedProcedures.forEach(proc => {
                        const s = getSplitForProcedure(proc);
                        if (s.customSplits && s.customSplits.length > 0) {
                          s.customSplits.forEach(item => {
                            allCustomSplits.push({ item, procName: proc });
                          });
                        }
                      });

                      if (allCustomSplits.length === 0) return null;

                      return (
                        <div className="bg-emerald-50/70 border border-emerald-200/50 rounded-2xl p-4.5 space-y-3 shadow-3xs" id="custom-overrides-section">
                          <div className="flex items-center gap-1.5 border-b border-emerald-200/50 pb-2">
                            <Percent className="w-4.5 h-4.5 text-emerald-600" />
                            <div className="text-right flex-1">
                              <h5 className="text-[13px] font-black text-emerald-950">بەشە زیادەکانی (Extra Shares)</h5>
                              <span className="text-[9.5px] text-slate-500 font-bold block mt-0.5">بەهای بنەڕەتی بهێڵەوە یان بڕی پارەی دیاریکراو بە مانواڵی بنووسە:</span>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            {allCustomSplits.map(({ item, procName }) => {
                              const override = customSplitsOverrides[item.id] || { mode: 'default', value: 0 };
                              const isManual = override.mode === 'manual';
                              const currentStage = override.deductStage !== undefined 
                                ? override.deductStage 
                                : (item.deductStage !== undefined ? item.deductStage : (item.deductType === 'first' ? 1 : 0));
                              
                              return (
                                <div key={item.id} className="bg-white border border-slate-100 rounded-xl p-2.5 flex flex-col gap-2.5 shadow-4xs" id={`override-item-${item.id}`}>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-right min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 justify-end">
                                        <span className="text-[8px] text-slate-400 font-bold italic">({procName})</span>
                                        {currentStage === 0 ? (
                                          <span className="inline-block bg-slate-100 text-slate-600 text-[8px] font-black px-1.5 py-0.5 rounded leading-none">هاوبەش</span>
                                        ) : (
                                          <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-100 text-[8px] font-black px-1.5 py-0.5 rounded leading-none">قۆناغی {currentStage}</span>
                                        )}
                                        <span className="text-xs font-black text-slate-800 block truncate leading-tight">{item.name}</span>
                                      </div>
                                      <span className="text-[9.5px] text-slate-400 font-bold block mt-0.5">
                                        بنەڕەتی: {item.valueType === 'fixed' ? `${item.percent.toLocaleString()} د.ع` : `${item.percent}%`}
                                      </span>
                                    </div>

                                    {/* Mode select button group */}
                                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCustomSplitsOverrides(prev => {
                                            const updated = { ...prev };
                                            delete updated[item.id];
                                            return updated;
                                          });
                                        }}
                                        className={`px-2 py-1 text-[9.5px] font-black rounded-md transition-all cursor-pointer ${
                                          !isManual 
                                            ? 'bg-white text-emerald-700 shadow-3xs border border-emerald-100' 
                                            : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                      >
                                        ڕێژەی خۆی
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const defaultStage = item.deductStage !== undefined ? item.deductStage : (item.deductType === 'first' ? 1 : 0);
                                          setCustomSplitsOverrides(prev => ({
                                            ...prev,
                                            [item.id]: { 
                                              mode: 'manual', 
                                              value: override.value || (item.valueType === 'fixed' ? item.percent : 0),
                                              deductStage: defaultStage,
                                              deductType: defaultStage > 0 ? 'first' : 'concurrent'
                                            }
                                          }));
                                        }}
                                        className={`px-2 py-1 text-[9.5px] font-black rounded-md transition-all cursor-pointer ${
                                          isManual 
                                            ? 'bg-white text-emerald-700 shadow-3xs border border-emerald-100' 
                                            : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                      >
                                        بە دەستی
                                      </button>
                                    </div>
                                  </div>

                                  {/* Custom input panel */}
                                  {isManual && (
                                    <div className="flex flex-col gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-lg animate-fade-in text-right">
                                      <div className="flex items-center gap-2.5 justify-end">
                                        <span className="text-[10px] text-slate-600 font-bold">بڕی پارەی پێویست بنووسە:</span>
                                        <div className="relative w-36 shrink-0">
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9,]*"
                                            placeholder="بڕی پارە"
                                            value={formatMoneyWithCommas(override.value)}
                                            onChange={(e) => {
                                              const parsed = parseMoneyWithCommas(e.target.value);
                                              if (parsed === '' || /^\d*$/.test(parsed)) {
                                                const val = parsed === '' ? 0 : Number(parsed);
                                                setCustomSplitsOverrides(prev => ({
                                                  ...prev,
                                                  [item.id]: {
                                                    ...prev[item.id],
                                                    mode: 'manual',
                                                    value: val,
                                                    deductStage: prev[item.id]?.deductStage ?? (item.deductStage !== undefined ? item.deductStage : (item.deductType === 'first' ? 1 : 0))
                                                  }
                                                }));
                                              }
                                            }}
                                            className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded-lg px-2 pl-7 py-1 text-xs font-mono text-center font-bold focus:outline-none"
                                          />
                                          <span className="absolute left-2 top-1 text-[10px] text-slate-400 font-bold">د.ع</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2.5 justify-end">
                                        <span className="text-[10px] text-slate-600 font-bold">ڕێژەی ئەژمارکردن (بڕین):</span>
                                        <select
                                          value={override.deductStage !== undefined ? override.deductStage : (item.deductStage !== undefined ? item.deductStage : (item.deductType === 'first' ? 1 : 0))}
                                          onChange={(e) => {
                                            const stageVal = Number(e.target.value);
                                            setCustomSplitsOverrides(prev => ({
                                              ...prev,
                                              [item.id]: {
                                                ...prev[item.id],
                                                mode: 'manual',
                                                value: override.value || (item.valueType === 'fixed' ? item.percent : 0),
                                                deductStage: stageVal,
                                                deductType: stageVal > 0 ? 'first' : 'concurrent'
                                              }
                                            }));
                                          }}
                                          className="bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-[9.5px] font-black text-slate-700 text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer w-44"
                                        >
                                          <option value={0}>هاوبەش (دوای بڕینەکان)</option>
                                          <option value={1}>بڕینی پێشوەختە - قۆناغی ١</option>
                                          <option value={2}>بڕینی پێشوەختە - قۆناغی ٢</option>
                                          <option value={3}>بڕینی پێشوەختە - قۆناغی ٣</option>
                                          <option value={4}>بڕینی پێشوەختە - قۆناغی ٤</option>
                                          <option value={5}>بڕینی پێشوەختە - قۆناغی ٥</option>
                                          <option value={6}>بڕینی پێشوەختە - قۆناغی ٦</option>
                                        </select>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Surgeon selection */}
                    <div className="space-y-2.5" id="doctor-select-wrapper">
                      <label className="text-[13px] md:text-sm font-black text-indigo-950 block border-r-4 border-indigo-500 bg-indigo-50 px-3 py-2 rounded-l-lg mb-1.5 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-indigo-600" />
                        <span>ناوی دکتۆری ئەنجامدەر</span>
                      </label>
                      <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                        {savedDoctors.filter(doc => !deactivatedItems.doctor?.includes(doc) || selectedDoctorsForm.includes(doc)).map((doc) => {
                          const isSelected = selectedDoctorsForm.includes(doc);
                          return (
                            <button
                              type="button"
                              key={doc}
                              onClick={() => toggleDoctorSelection(doc)}
                              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border transition-all text-right cursor-pointer font-extrabold text-xs md:text-[13px] ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs scale-[1.01]'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-705 hover:text-slate-900 shadow-3xs'
                              }`}
                            >
                              <span>{doc}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => setShowCustomDoctorField(!showCustomDoctorField)}
                          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border transition-all text-right cursor-pointer font-extrabold text-xs md:text-[13px] ${
                            showCustomDoctorField
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-white hover:bg-slate-100 border-slate-205 text-emerald-600 border-dashed shadow-3xs'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>زیادکردن</span>
                        </button>
                      </div>

                      <AnimatePresence>
                        {showCustomDoctorField && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm"
                          >
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={customDoctorInput}
                                onChange={(e) => setCustomDoctorInput(e.target.value)}
                                placeholder="ناوی دکتۆر نووسە"
                                className="flex-1 bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-none transition-all text-slate-800 font-bold"
                                id="custom-doctor-input"
                                autoComplete="off"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomDoctor();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={handleAddCustomDoctor}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-2 rounded-lg transition-all"
                              >
                                تۆمارکردن
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Column 3: Anesthesia and Nursing */}
                  <div className="space-y-5 bg-slate-55/60 p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <h4 className="text-xs md:text-[13px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2.5 mb-2.5">تیمی پزیشکی بەنج و نێرسینگ</h4>

                    {/* Anesthesia doctor */}
                    <div className="space-y-2.5" id="anesthesia-doctor-select-wrapper">
                      <label className="text-[13px] md:text-sm font-black text-indigo-950 block border-r-4 border-indigo-500 bg-indigo-50 px-3 py-2 rounded-l-lg mb-1.5 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-indigo-600" />
                        <span>ناوی پزیشکی بەنج</span>
                      </label>
                      <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                        {savedAnesthesiaDoctors.filter(doc => !deactivatedItems.anesthesiaDoctor?.includes(doc) || selectedAnesthesiaDoctorsForm.includes(doc)).map((doc) => {
                          const isSelected = selectedAnesthesiaDoctorsForm.includes(doc);
                          return (
                            <button
                              type="button"
                              key={doc}
                              onClick={() => toggleAnesthesiaDoctorSelection(doc)}
                              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border transition-all text-right cursor-pointer font-extrabold text-xs md:text-[13px] ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs scale-[1.01]'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-750 hover:text-slate-900 shadow-3xs'
                              }`}
                            >
                              <span>{doc}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => setShowCustomAnesthesiaDoctorField(!showCustomAnesthesiaDoctorField)}
                          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border transition-all text-right cursor-pointer font-extrabold text-xs md:text-[13px] ${
                            showCustomAnesthesiaDoctorField
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-white hover:bg-slate-100 border-slate-205 text-emerald-600 border-dashed shadow-3xs'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>زیادکردن</span>
                        </button>
                      </div>

                      <AnimatePresence>
                        {showCustomAnesthesiaDoctorField && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm"
                          >
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={customAnesthesiaDoctorInput}
                                onChange={(e) => setCustomAnesthesiaDoctorInput(e.target.value)}
                                placeholder="ناوی پزیشکی بەنج"
                                className="flex-1 bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-none transition-all text-slate-800 font-bold"
                                id="custom-anesthesia-doctor-input"
                                autoComplete="off"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomAnesthesiaDoctor();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={handleAddCustomAnesthesiaDoctor}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-2 rounded-lg transition-all"
                              >
                                تۆمارکردن
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Manual anesthesia doctor amount field */}
                      {selectedAnesthesiaDoctorsForm.length > 0 && isAnesthesiaDocPercentZero && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5 shadow-2xs mt-2"
                        >
                          <div className="flex justify-between items-center text-[11px] text-amber-800 font-extrabold">
                            <span>{isAnesthesiaDocPercentZero 
                              ? '⚠️ ڕێژەی بەنج لەم پرۆسەیە %٠یە، بڕی پارەی مانواڵ بنووسە:' 
                              : 'بڕی پارەی دەستی بۆ پزیشکی بەنج (ئارەزوومەندانە - وەک پاداشت یان بڕی جێگیر):'}</span>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9,]*"
                              value={formatMoneyWithCommas(manualAnesthesiaDocAmount)}
                              onChange={(e) => {
                                const rawVal = e.target.value;
                                const parsed = parseMoneyWithCommas(rawVal);
                                if (parsed === '' || /^\d*$/.test(parsed)) {
                                  setManualAnesthesiaDocAmount(parsed);
                                }
                              }}
                              placeholder="بڕی پارەی دیاریکراو بە دەرەوەی دابەشکاری (د.ع)"
                              className="w-full bg-white border border-amber-300 focus:ring-1 focus:ring-amber-500 rounded-lg pl-12 pr-3 py-2 text-xs focus:outline-none font-bold text-slate-800"
                            />
                            <span className="absolute left-3 top-2.5 text-[10px] text-amber-700 font-extrabold">د.ع</span>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Anesthesia staff */}
                    <div className="space-y-2.5" id="anesthesia-staff-select-wrapper">
                      <label className="text-[13px] md:text-sm font-black text-indigo-950 block border-r-4 border-indigo-500 bg-indigo-50 px-3 py-2 rounded-l-lg mb-1.5 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <span>ناوی یاریدەدەری بەنج</span>
                      </label>
                      <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                        {savedAnesthesiaStaff.filter(staff => !deactivatedItems.anesthesiaStaff?.includes(staff) || selectedAnesthesiaStaffsForm.includes(staff)).map((staff) => {
                          const isSelected = selectedAnesthesiaStaffsForm.includes(staff);
                          return (
                            <button
                              type="button"
                              key={staff}
                              onClick={() => toggleAnesthesiaStaffSelection(staff)}
                              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border transition-all text-right cursor-pointer font-extrabold text-xs md:text-[13px] ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs scale-[1.01]'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-750 hover:text-slate-900 shadow-3xs'
                              }`}
                            >
                              <span>{staff}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => setShowCustomAnesthesiaStaffField(!showCustomAnesthesiaStaffField)}
                          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border transition-all text-right cursor-pointer font-extrabold text-xs md:text-[13px] ${
                            showCustomAnesthesiaStaffField
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-white hover:bg-slate-100 border-slate-205 text-emerald-600 border-dashed shadow-3xs'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>زیادکردن</span>
                        </button>
                      </div>

                      <AnimatePresence>
                        {showCustomAnesthesiaStaffField && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm"
                          >
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={customAnesthesiaStaffInput}
                                onChange={(e) => setCustomAnesthesiaStaffInput(e.target.value)}
                                placeholder="ناوی یاریدەدەری بەنج"
                                className="flex-1 bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-none transition-all text-slate-800 font-bold"
                                id="custom-anesthesia-staff-input"
                                autoComplete="off"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomAnesthesiaStaff();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={handleAddCustomAnesthesiaStaff}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-2 rounded-lg transition-all"
                              >
                                تۆمارکردن
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Manual anesthesia staff amount field */}
                      {selectedAnesthesiaStaffsForm.length > 0 && isAnesthesiaStaffPercentZero && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5 shadow-2xs mt-2"
                        >
                          <div className="flex justify-between items-center text-[11px] text-amber-800 font-extrabold">
                            <span>{isAnesthesiaStaffPercentZero 
                              ? '⚠️ ڕێژەی یاریدەدەری بەنج %٠یە، بڕی پارەی مانواڵ بنووسە:' 
                              : 'بڕی پارەی دەستی بۆ یاریدەدەری بەنج (ئارەزوومەندانە - وەک پاداشت یان بڕی جێگیر):'}</span>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9,]*"
                              value={formatMoneyWithCommas(manualAnesthesiaStaffAmount)}
                              onChange={(e) => {
                                const rawVal = e.target.value;
                                const parsed = parseMoneyWithCommas(rawVal);
                                if (parsed === '' || /^\d*$/.test(parsed)) {
                                  setManualAnesthesiaStaffAmount(parsed);
                                }
                              }}
                              placeholder="بڕی پارەی دیاریکراو بە دەرەوەی دابەشکاری (د.ع)"
                              className="w-full bg-white border border-amber-300 focus:ring-1 focus:ring-amber-500 rounded-lg pl-12 pr-3 py-2 text-xs focus:outline-none font-bold text-slate-800"
                            />
                            <span className="absolute left-3 top-2.5 text-[10px] text-amber-700 font-extrabold">د.ع</span>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Nurse Selection */}
                    <div className="space-y-2.5" id="nurse-select-wrapper">
                      <label className="text-[13px] md:text-sm font-black text-indigo-950 block border-r-4 border-indigo-500 bg-indigo-50 px-3 py-2 rounded-l-lg mb-1.5 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <span>ناوی نێرس / کارمەند</span>
                      </label>
                      <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                        {savedNurses.filter(nurse => !deactivatedItems.nurse?.includes(nurse) || selectedNurses.includes(nurse)).map((nurse) => {
                          const isSelected = selectedNurses.includes(nurse);
                          return (
                            <button
                              type="button"
                              key={nurse}
                              onClick={() => toggleNurseSelection(nurse)}
                              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border transition-all text-right cursor-pointer font-extrabold text-xs md:text-[13px] ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs scale-[1.01]'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-750 hover:text-slate-900 shadow-3xs'
                              }`}
                            >
                              <span>{nurse}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => setShowCustomNurseField(!showCustomNurseField)}
                          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border transition-all text-right cursor-pointer font-extrabold text-xs md:text-[13px] ${
                            showCustomNurseField
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-white hover:bg-slate-100 border-slate-205 text-emerald-600 border-dashed shadow-3xs'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>زیادکردن</span>
                        </button>
                      </div>

                      <AnimatePresence>
                        {showCustomNurseField && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm"
                          >
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={customNurseInput}
                                onChange={(e) => setCustomNurseInput(e.target.value)}
                                placeholder="ناوی کارمەندی نێرس"
                                className="flex-1 bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-sm focus:outline-none transition-all text-slate-800 font-bold"
                                id="custom-nurse-input"
                                autoComplete="off"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomNurse();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={handleAddCustomNurse}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-2 rounded-lg transition-all"
                              >
                                تۆمارکردن
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Fixed Action buttons in footer */}
                <div className="border-t border-slate-100 px-6 py-5 bg-slate-50 hover:bg-slate-50/95 flex justify-end gap-3 font-sans rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="bg-slate-200 hover:bg-slate-350 text-slate-705 text-sm font-black px-6 py-3 rounded-xl transition-all cursor-pointer"
                  >
                    پاشگەزبوونەوە
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black px-8 py-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                    id="submit-record-btn"
                  >
                    <Check className="w-4 h-4" />
                    {editingId ? 'نوێکردنەوەی داتا' : 'پاشەکەوتکردن'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal for active/deactive and deleting presets */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto font-sans" id="settings-modal-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl w-full max-w-4xl mx-auto shadow-2xl overflow-hidden border border-slate-100"
              id="settings-modal-container"
              dir="rtl"
            >
              {/* Header */}
              <div className="border-b border-slate-100 bg-emerald-600/5 px-6 py-4 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-slate-950 text-base md:text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5 text-emerald-600 animate-spin-slow" />
                    <span>بەڕێوەبردنی لیستە پاشەکەوتکراوەکان</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold mt-0.5">لێرەوە دەتوانیت لیستەکان چالاک/ناچالاک بکەیت یان بە تەواوی بیانسڕیتەوە</p>
                </div>
                <button 
                  onClick={() => {
                    setShowSettingsModal(false);
                    setSettingsNewItemInput('');
                  }}
                  className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-all text-xs cursor-pointer font-bold"
                >
                  داخستن
                </button>
              </div>

              {/* Body */}
              <div className="grid grid-cols-1 md:grid-cols-4 min-h-[400px]">
                {/* Tabs Sidebar */}
                <div className="bg-slate-50/70 p-4 border-l border-slate-100 flex flex-col gap-1.5 md:col-span-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 pr-2">جۆرەکانی داتا</span>
                  
                  <button
                    type="button"
                    onClick={() => { setActiveSettingsTab('procedure'); setSettingsNewItemInput(''); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                      activeSettingsTab === 'procedure'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'hover:bg-slate-100 text-slate-705'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4 shrink-0" />
                    <span>کۆمەڵەی پرۆسیجەرەکان</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveSettingsTab('doctor'); setSettingsNewItemInput(''); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                      activeSettingsTab === 'doctor'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'hover:bg-slate-100 text-slate-705'
                    }`}
                  >
                    <User className="w-4 h-4 shrink-0" />
                    <span>پزیشکانی نەشتەرگەری</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveSettingsTab('anesthesiaDoctor'); setSettingsNewItemInput(''); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                      activeSettingsTab === 'anesthesiaDoctor'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'hover:bg-slate-100 text-slate-705'
                    }`}
                  >
                    <User className="w-4 h-4 shrink-0" />
                    <span>پزیشکانی بەنج</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveSettingsTab('anesthesiaStaff'); setSettingsNewItemInput(''); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                      activeSettingsTab === 'anesthesiaStaff'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'hover:bg-slate-100 text-slate-705'
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>تیمی یاریدەدەری بەنج</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveSettingsTab('nurse'); setSettingsNewItemInput(''); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                      activeSettingsTab === 'nurse'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'hover:bg-slate-100 text-slate-705'
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>کارمەندانی نێرس</span>
                  </button>
                </div>

                {/* Tab Items List Area */}
                <div className="p-6 md:col-span-3 flex flex-col justify-between">
                  <div>
                    {/* Add new item field at top of tab */}
                    <div className="mb-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                      <label className="text-[11px] font-black text-slate-700 block mb-1.5">زیادکردنی نوێ بۆ ئەم کۆمەڵەیە:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settingsNewItemInput}
                          onChange={(e) => setSettingsNewItemInput(e.target.value)}
                          placeholder={`بۆ نموونە زیادکردنی ناوی نوێ بۆ کۆمەڵەکە...`}
                          className="flex-1 bg-white border border-slate-200 focus:ring-2 focus:ring-emerald-500 rounded-lg px-3 py-1.5 text-xs focus:outline-none transition-all text-slate-800 font-bold"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddFromSettings(activeSettingsTab);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddFromSettings(activeSettingsTab)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] px-4 py-1.5 rounded-lg transition-all shadow-2xs whitespace-nowrap cursor-pointer"
                        >
                          زیادکردن
                        </button>
                      </div>
                    </div>

                    {/* Presets List */}
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 mb-3 block">
                      لیستی داتا تۆمارکراوەکان و بارودۆخیان
                    </h4>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1" id="settings-presets-list">
                      {(() => {
                        let currentList: string[] = [];
                        if (activeSettingsTab === 'procedure') currentList = savedProcedures;
                        else if (activeSettingsTab === 'doctor') currentList = savedDoctors;
                        else if (activeSettingsTab === 'anesthesiaDoctor') currentList = savedAnesthesiaDoctors;
                        else if (activeSettingsTab === 'anesthesiaStaff') currentList = savedAnesthesiaStaff;
                        else if (activeSettingsTab === 'nurse') currentList = savedNurses;

                        if (currentList.length === 0) {
                          return (
                            <div className="text-center text-slate-400 py-8 text-xs font-medium">
                              هیچ ناوێک تۆمار نەکراوە بۆ ئەم بەشە
                            </div>
                          );
                        }

                        return currentList.map((item) => {
                          const isActive = isItemActive(activeSettingsTab, item);
                          const isEditing = editingPreset && editingPreset.category === activeSettingsTab && editingPreset.oldName === item;

                          return (
                            <div 
                              key={item} 
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                                isActive 
                                  ? 'bg-emerald-50/20 border-emerald-100/50 hover:bg-emerald-50/40' 
                                  : 'bg-slate-50/50 border-slate-150 hover:bg-slate-50 opacity-75'
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-grow min-w-0">
                                {/* Delete button with confirm */}
                                {!isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePresetItem(activeSettingsTab, item)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer shrink-0"
                                    title="سڕینەوە"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Edit button */}
                                {!isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingPreset({
                                      category: activeSettingsTab,
                                      oldName: item,
                                      currentEditingValue: item
                                    })}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer shrink-0"
                                    title="دەستکاریکردن"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {isEditing ? (
                                  <div className="flex items-center gap-1.5 flex-grow min-w-0" dir="rtl">
                                    <input
                                      type="text"
                                      value={editingPreset.currentEditingValue}
                                      onChange={(e) => setEditingPreset(prev => prev ? { ...prev, currentEditingValue: e.target.value } : null)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleSavePresetEdit(activeSettingsTab, item, editingPreset.currentEditingValue);
                                        } else if (e.key === 'Escape') {
                                          setEditingPreset(null);
                                        }
                                      }}
                                      className="flex-1 min-w-0 bg-white border border-slate-300 focus:ring-2 focus:ring-indigo-500 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSavePresetEdit(activeSettingsTab, item, editingPreset.currentEditingValue)}
                                      className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all cursor-pointer flex items-center justify-center shrink-0"
                                      title="پاشەکەوتکردن"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingPreset(null)}
                                      className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-all cursor-pointer flex items-center justify-center shrink-0"
                                      title="پاشگەزبوونەوە"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className={`text-xs font-bold leading-none truncate ${isActive ? 'text-slate-850' : 'text-slate-400 line-through'}`}>
                                    {item}
                                  </span>
                                )}
                              </div>

                              {/* Toggle active / active status */}
                              {!isEditing && (
                                <button
                                  type="button"
                                  onClick={() => toggleItemActive(activeSettingsTab, item)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                                    isActive
                                      ? 'bg-emerald-100 border-emerald-200 text-emerald-850'
                                      : 'bg-slate-200 border-slate-300 text-slate-600'
                                  }`}
                                >
                                  {isActive ? (
                                    <>
                                      <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full inline-block animate-pulse"></span>
                                      <span>چالاکە (Active)</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full inline-block"></span>
                                      <span>ناچالاکە (Inactive)</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-3 mt-4">
                    * تێبینی: ناچالاککردنی هەر ناوێک، تەنها لە بەشی تۆمارکردنی نەخۆشی نوێدا دەیشارێتەوە بەبێ سڕینەوەی لە تۆمارە کۆنەکان.
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {recordToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto font-sans" id="delete-confirm-overlay" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-6"
              id="delete-confirm-container"
            >
              {/* Icon and title */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="bg-rose-50 p-4 rounded-full border border-rose-100 flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-rose-600" />
                </div>
                <h3 className="text-lg font-black text-slate-900">سڕینەوەی تۆمار</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed px-4">
                  ئایا دڵنیایت لە سڕینەوەی تۆماری نەخۆش <span className="text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded">"{recordToDelete.patientName}"</span>؟ ئەم کردارە ناتوانرێت پاشگەز بکرێتەوە.
                </p>
              </div>

              {/* Record Summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 text-right space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">بڕی داهات:</span>
                  <span className="font-mono font-black text-emerald-600 font-bold">{recordToDelete.totalAmount?.toLocaleString()} د.ع</span>
                </div>
                {recordToDelete.procedureTypes && recordToDelete.procedureTypes.length > 0 ? (
                  <div className="flex justify-between items-start text-xs">
                    <span className="text-slate-400 font-bold shrink-0">جۆری پڕۆسیجەر:</span>
                    <span className="font-black text-slate-700 text-left line-clamp-2 max-w-[200px]">{recordToDelete.procedureTypes.join(' ، ')}</span>
                  </div>
                ) : recordToDelete.procedureType ? (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold">جۆری پڕۆسیجەر:</span>
                    <span className="font-black text-slate-700">{recordToDelete.procedureType}</span>
                  </div>
                ) : null}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">بەروار:</span>
                  <span className="font-mono text-slate-700 font-bold">{recordToDelete.date}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const newRecordsList = records.filter(r => r.id !== recordToDelete.id);
                      setRecords(newRecordsList);
                      localStorage.setItem('clinic_patient_records', JSON.stringify(newRecordsList));
                      if (user) {
                        setIsSyncing(true);
                        deleteRecordFromCloud(recordToDelete.id)
                          .catch((err) => {
                            console.error('Cloud delete error:', err);
                          })
                          .finally(() => {
                            setIsSyncing(false);
                          });
                      }
                    } catch (err) {
                      console.error('Failed to delete', err);
                    }
                    setRecordToDelete(null);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs md:text-sm py-3 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  id="confirm-delete-action-btn"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>بەڵێ، بسڕەوە</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecordToDelete(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs md:text-sm py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                  id="cancel-delete-action-btn"
                >
                  پاشگەزبوونەوە
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preset Delete Confirmation Modal */}
      <AnimatePresence>
        {presetToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto font-sans" id="preset-delete-confirm-overlay" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-6"
              id="preset-delete-confirm-container"
            >
              {/* Icon and title */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="bg-rose-50 p-4 rounded-full border border-rose-100 flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-rose-600" />
                </div>
                <h3 className="text-lg font-black text-slate-900">سڕینەوە لە لای لیستە پاشەکەوتکراوەکان</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed px-4 text-center">
                  ئایا دڵنیایت لە سڕینەوەی <span className="text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded">"{presetToDelete.name}"</span> لە لیستی پاشەکەوتکراوەکان؟
                </p>
              </div>

              {/* Category label */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 text-right space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">کۆمەڵە (بەش):</span>
                  <span className="font-extrabold text-indigo-750 bg-indigo-50/70 px-2 py-1 rounded">
                    {presetToDelete.category === 'procedure' ? 'کۆمەڵەی پرۆسیجەرەکان' :
                     presetToDelete.category === 'doctor' ? 'پزیشکانی نەشتەرگەری' :
                     presetToDelete.category === 'anesthesiaDoctor' ? 'پزیشکانی بەنج' :
                     presetToDelete.category === 'anesthesiaStaff' ? 'تیمی یاریدەدەری بەنج' :
                     presetToDelete.category === 'nurse' ? 'کارمەندانی نێرس' : 'نادیار'}
                  </span>
                </div>

                <div className="text-[10px] text-amber-700 bg-amber-50 rounded-lg p-2.5 border border-amber-200/50 leading-relaxed font-bold">
                  ⚠️ <strong>تێبینی زۆر گرنگ:</strong> سڕینەوەی ئەم بابەتە لە لیستە پاشەکەوتکراوەکان تەنها وەک دەربازکردنی مینیووەکان و لیستەکانی داهاتوو دەبێت. سەرجەم داتاکان و تۆمارە پێشترەکان لە داتابەیسدا بە پارێزراوی <span className="underline italic">دە مێننەوە و کارەکان تێکنەچوون</span>.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={confirmDeletePresetItem}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs md:text-sm py-3 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  id="confirm-preset-delete-action-btn"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>بەڵێ، بسڕەوە</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPresetToDelete(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs md:text-sm py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                  id="cancel-preset-delete-action-btn"
                >
                  پاشگەزبوونەوە
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceiptModal && newSavedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto font-sans no-print" id="receipt-modal-overlay" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
              id="receipt-modal-container"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 no-print">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm md:text-base">تۆمارکرا - ڕاکێشانی وەسڵ</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowReceiptModal(false);
                    setNewSavedRecord(null);
                    setPopupsBlocked(false);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Printable Area */}
              <div className="p-8 space-y-6" id="print-receipt-area">
                {/* Receipt Header Style */}
                <div className="text-center space-y-2 pb-5 border-b-2 border-dashed border-slate-200">
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">Smart Hospital</h4>
                  <p className="text-xs text-slate-500 font-bold">وەسڵـی فەرمی نەخـۆش</p>
                  <div className="text-[10px] font-mono text-slate-400">ڕێکەوت: {newSavedRecord.date}</div>
                </div>

                {/* Receipt Details in rows */}
                <div className="space-y-4 text-right">
                  <div className="grid grid-cols-3 items-center py-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-400 col-span-1">ناوی وەرگر (نەخۆش):</span>
                    <span className="text-sm font-black text-slate-900 col-span-2 text-left">{newSavedRecord.patientName}</span>
                  </div>

                  <div className="grid grid-cols-3 items-center py-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-400 col-span-1">جۆری پرۆسیجەر:</span>
                    <span className="text-xs font-bold text-slate-850 col-span-2 text-left leading-relaxed">
                      {newSavedRecord.procedureTypes && newSavedRecord.procedureTypes.length > 0 
                        ? newSavedRecord.procedureTypes.join(' ، ') 
                        : (newSavedRecord.procedureType || 'نادیار')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 items-center py-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-400 col-span-1">بەروار:</span>
                    <span className="text-xs font-mono font-bold text-slate-800 col-span-2 text-left">{newSavedRecord.date}</span>
                  </div>

                  <div className="grid grid-cols-3 items-center py-4 bg-emerald-50/50 rounded-xl px-4 border border-emerald-100 mt-4">
                    <span className="text-xs font-black text-emerald-800 col-span-1">بڕی پارەی گشتی:</span>
                    <span className="text-base font-extrabold text-emerald-700 col-span-2 text-left font-mono">
                      {newSavedRecord.totalAmount?.toLocaleString()} د.ع
                    </span>
                  </div>
                </div>

                {/* Receipt Footer Style */}
                <div className="text-center pt-5 border-t-2 border-dashed border-slate-200 space-y-1.5">
                  <p className="text-xs font-black text-slate-700">سوپاس بۆ متمانەتان بە سەنتەرەکەمان</p>
                  <p className="text-[10px] text-slate-400 font-bold">هیوای چاکبوونەوەی خێراتان بۆ دەخوازین</p>
                </div>
              </div>

              {/* Informative Pop-up notice if blocked */}
              {popupsBlocked && (
                <div className="mx-6 mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-xl font-bold flex flex-col gap-1.5 leading-relaxed text-right no-print">
                  <span className="text-amber-900 font-extrabold text-xs">⚠️ پەڕەی نوێ (Pop-up) بلۆک کراوە لە وێبگەڕەکەتدا!</span>
                  <span>بۆ چاپکردنی وەسڵەکە:</span>
                  <ul className="list-disc list-inside space-y-1 mr-2">
                    <li>تکایە ڕێگەبدە بە Pop-upەکان کار بکەن یان کلیک بکە لەسەر نیشانەی بلۆکەر لە شریتی سەرەوەی وێبگەڕەکەت.</li>
                    <li>دەتوانیت بەرنامەکە لە پەڕەیەکی سەربەخۆدا بکەیتەوە بە کلیک کردن لە دەگمەی <b>"Open in new tab"</b> لە سەرەوەی ڕاستی شاشەکە.</li>
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 no-print">
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(newSavedRecord)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs md:text-sm py-3 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  id="print-receipt-action-btn"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپکردن (Print)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReceiptModal(false);
                    setNewSavedRecord(null);
                    setPopupsBlocked(false);
                  }}
                  className="bg-slate-250 hover:bg-slate-300 text-slate-700 font-extrabold text-xs md:text-sm px-5 py-3 rounded-xl transition-all cursor-pointer"
                  id="close-receipt-action-btn"
                >
                  داخستن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer copyright */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>دابەشکاری پارەی کار © ٢٠٢٦ - داتابەیسی گشتی کۆنترۆڵکردنی داهاتی نەخۆشەکان</span>
          <span className="font-mono text-[10px] text-slate-400">Database Engine fully reactive & tailored to clinician metrics.</span>
        </div>
      </footer>
    </div>
  );
}
