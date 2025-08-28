// ===== 基本資料型別 =====

/** 工作日類型 */
export type WorkDayType = 'weekday' | 'restDay' | 'holiday' | 'regularDayOff';

/** 假日類型 */
export type HolidayType = '國定假日' | '特休' | '例假';

/** 計算方式 */
export type CalculationMethod = 'ceiling' | 'round';

// ===== 輸入資料介面 =====

/** 工作時數輸入資料 */
export interface WorkDataInput {
  /** 平日加班時數（字串格式，支援逗號分隔） */
  weekdayOvertime: string;
  /** 休息日工作時數 */
  restDayWork: string;
  /** 國定假日/特休出勤時數 */
  holidayWork: string;
  /** 例假出勤時數 */
  regularDayOffWork: string;
  /** 是否為天災、事變或突發事件 */
  isEmergency: boolean;
}

/** 解析後的時數資料 */
export interface ParsedHoursData {
  /** 總時數 */
  total: number;
  /** 每日時數明細 */
  detail: number[];
}

// ===== 計算結果介面 =====

/** 單日工作明細 */
export interface DailyWorkDetail {
  /** 第幾天 */
  day: number;
  /** 工作時數 */
  hours: number;
  /** 加班費或出勤工資 */
  pay: number;
}

/** 計算詳細結果 */
export interface CalculationDetail {
  /** 加班費金額 */
  pay: number;
  /** 計算過程說明 */
  details: string[];
  /** 每日工作明細（多天時才有） */
  dailyBreakdown?: DailyWorkDetail[];
}

/** 平日加班計算結果 */
export interface WeekdayOvertimeResult extends CalculationDetail {
  /** 是否為緊急狀況 */
  isEmergency?: boolean;
}

/** 休息日工作計算結果 */
export interface RestDayWorkResult extends CalculationDetail {}

/** 假日出勤計算結果 */
export interface HolidayWorkResult extends CalculationDetail {
  /** 假日類型 */
  holidayType?: HolidayType;
}

/** 綜合計算結果 */
export interface ComprehensiveResult {
  /** 每小時薪資 */
  hourlyRate: number;
  /** 日薪 */
  dailyWage: number;
  /** 各項工作類型的計算結果 */
  calculations: {
    [key in '平日加班' | '休息日工作' | '假日出勤' | '例假出勤']?: CalculationDetail;
  };
  /** 總加給工資 */
  totalPay: number;
  /** 計算方式 */
  calculationMethod?: CalculationMethod;
}

// ===== 勞基法倍率常數 =====

/** 勞基法規定的加班費倍率 */
export interface LaborStandardRates {
  /** 平日前2小時倍率：1又1/3 */
  weekdayFirst2hr: number;
  /** 平日再延長2小時倍率：1又2/3 */
  weekdayNext2hr: number;
  /** 天災事變倍率：2倍 */
  weekdayEmergency: number;
  /** 休息日前2小時倍率：1又1/3 */
  restDayFirst2hr: number;
  /** 休息日2-8小時倍率：1又2/3 */
  restDay2to8hr: number;
  /** 休息日超過8小時倍率：2又2/3 */
  restDayOver8hr: number;
  /** 國定假日/特休倍率：2倍 */
  holidayRate: number;
  /** 例假倍率：2倍 */
  regularDayOffRate: number;
}

// ===== 元件 Props 介面 =====

/** 薪資計算器組件的 Props */
export interface SalaryCalculatorProps {
  /** 預設月薪 */
  defaultMonthlySalary?: number;
  /** 是否顯示計算方式比較 */
  showCalculationComparison?: boolean;
  /** 自訂樣式類別 */
  className?: string;
  /** 計算完成回調函數 */
  onCalculationComplete?: (result: ComprehensiveResult) => void;
}

/** 結果顯示組件的 Props */
export interface ResultDisplayProps {
  /** 計算結果 */
  results: ComprehensiveResult;
  /** 是否顯示詳細計算過程 */
  showDetails?: boolean;
  /** 自訂樣式 */
  className?: string;
}

/** 工作時數輸入組件的 Props */
export interface WorkHoursInputProps {
  /** 工作資料 */
  workData: WorkDataInput;
  /** 輸入變更處理函數 */
  onChange: (field: keyof WorkDataInput, value: string | boolean) => void;
  /** 是否禁用輸入 */
  disabled?: boolean;
}

// ===== 工具函數介面 =====

/** 時數解析函數簽名 */
export interface ParseHoursFunction {
  (input: string): ParsedHoursData | null;
}

/** 薪資計算函數簽名 */
export interface CalculateSalaryFunction {
  (salary: number, useCeiling?: boolean): number;
}

/** 加班費計算函數簽名 */
export interface CalculateOvertimeFunction {
  (hours: number, hourlyRate: number, isEmergency?: boolean): CalculationDetail;
}

// ===== 錯誤處理 =====

/** 計算錯誤類型 */
export type CalculationErrorType =
  | 'INVALID_SALARY'
  | 'INVALID_HOURS_FORMAT'
  | 'NEGATIVE_HOURS'
  | 'EXCEEDED_LEGAL_LIMIT';

/** 計算錯誤介面 */
export interface CalculationError {
  /** 錯誤類型 */
  type: CalculationErrorType;
  /** 錯誤訊息 */
  message: string;
  /** 錯誤欄位 */
  field?: keyof WorkDataInput;
}

// ===== 驗證相關 =====

/** 輸入驗證結果 */
export interface ValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 錯誤列表 */
  errors: CalculationError[];
}

/** 勞基法限制檢查結果 */
export interface LegalLimitCheck {
  /** 是否符合法規 */
  isWithinLimit: boolean;
  /** 超時警告訊息 */
  warnings: string[];
  /** 建議事項 */
  suggestions: string[];
}

// ===== 設定選項 =====

/** 計算器設定選項 */
export interface CalculatorSettings {
  /** 使用無條件進位 */
  useCeilingCalculation: boolean;
  /** 顯示詳細計算過程 */
  showDetailedBreakdown: boolean;
  /** 顯示法規警告 */
  showLegalWarnings: boolean;
  /** 語言設定 */
  locale: 'zh-TW' | 'en-US';
}

// ===== API 相關（如果需要後端整合） =====

/** API 請求資料 */
export interface CalculationRequest {
  /** 月薪 */
  monthlySalary: number;
  /** 工作資料 */
  workData: WorkDataInput;
  /** 計算設定 */
  settings?: Partial<CalculatorSettings>;
}

/** API 回應資料 */
export interface CalculationResponse {
  /** 是否成功 */
  success: boolean;
  /** 計算結果 */
  result?: ComprehensiveResult;
  /** 錯誤訊息 */
  error?: CalculationError;
  /** 法規檢查結果 */
  legalCheck?: LegalLimitCheck;
}
