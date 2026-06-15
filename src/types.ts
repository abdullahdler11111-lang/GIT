export interface PatientRecord {
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
  settledShares?: Record<string, boolean>; // key: `${role}_${name}` -> true if paid/settled
  responsibilityTierId?: string;
  cadreTierId?: string;
}

export interface BreakdownDetailRow {
  recordId: string;
  patientName: string;
  recipientName?: string;
  date: string;
  procedures: string;
  grossAmount: number;
  calculatedShare: number;
  detailInfo: string;
  isSettled?: boolean;
  settleKey?: string;
}

export interface CustomSplitItem {
  id: string;
  name: string;
  percent: number;
  recipientName?: string;
  valueType?: 'percent' | 'fixed';
  deductType?: 'first' | 'concurrent';
  deductStage?: number;
}

export interface ConditionalRule {
  id: string;
  conditionStaff: string;
  conditionType: 'present' | 'absent' | 'feedback_hours' | 'cad' | 'responsibility';
  targetStaff: string;
  rulePercent: number;
  applyToOthers?: boolean;
  othersPercent?: number;
  othersCustomPercents?: Record<string, number>;
  feedbackData?: Record<string, { workingHours: number; feedbackRate: number; hourlyRate: number }>;
  cadData?: Record<string, Record<string, number>>;
  cadColumns?: string[];
  cadColumnMaxValues?: Record<string, number>;
  responsibilityData?: Record<string, number>;
}

export interface ProcedureSplit {
  procedureType: string;
  surgeonPercent: number;
  anesthesiaDocPercent: number;
  anesthesiaStaffPercent: number;
  nursesPercent: number;
  clinicPercent: number;
  customSplits?: CustomSplitItem[];
  staffPercents?: Record<string, number>;
  conditionalRules?: ConditionalRule[];
  surgeonDeductType?: 'first' | 'concurrent';
  anesthesiaDocDeductType?: 'first' | 'concurrent';
  anesthesiaStaffDeductType?: 'first' | 'concurrent';
  nursesDeductType?: 'first' | 'concurrent';
  clinicDeductType?: 'first' | 'concurrent';
  surgeonDeductStage?: number;
  anesthesiaDocDeductStage?: number;
  anesthesiaStaffDeductStage?: number;
  nursesDeductStage?: number;
  clinicDeductStage?: number;
}
