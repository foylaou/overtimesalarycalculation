// ===== 類型定義 =====
export interface WorkDataInput {
  weekdayOvertime: string;
  restDayWork: string;
  holidayWork: string;
  regularDayOffWork: string;
  isEmergency: boolean;
}

export interface ParsedHoursData {
  total: number;
  detail: number[];
}

export interface DailyWorkDetail {
  day: number;
  hours: number;
  pay: number;
}

export interface CalculationDetail {
  pay: number;
  details: string[];
  dailyBreakdown?: DailyWorkDetail[];
}

export interface ComprehensiveResult {
  hourlyRate: number;
  dailyWage: number;
  calculations: {
    [key in '平日加班' | '休息日工作' | '假日出勤' | '例假出勤']?: CalculationDetail;
  };
  totalPay: number;
}

export interface LaborStandardRates {
  weekdayFirst2hr: number;    // 平日前2小時：1又1/3
  weekdayNext2hr: number;     // 平日再延長2小時：1又2/3
  weekdayEmergency: number;   // 天災事變：2倍
  restDayFirst2hr: number;    // 休息日前2小時：1又1/3
  restDay2to8hr: number;      // 休息日2-8小時：1又2/3
  restDayOver8hr: number;     // 休息日超過8小時：2又2/3
  holidayRate: number;        // 國定假日/特休：2倍
  regularDayOffRate: number;  // 例假：2倍
}

// ===== 預設倍率 =====
export const DEFAULT_RATES: LaborStandardRates = {
  weekdayFirst2hr: 4/3,    // 平日前2小時：1又1/3倍
  weekdayNext2hr: 5/3,     // 平日再延長2小時：1又2/3倍
  weekdayEmergency: 2,     // 天災事變：2倍
  restDayFirst2hr: 4/3,    // 休息日前2小時：1又1/3倍
  restDay2to8hr: 5/3,      // 休息日2-8小時：1又2/3倍
  restDayOver8hr: 8/3,     // 休息日超過8小時：2又2/3倍
  holidayRate: 2,          // 國定假日、特休：2倍
  regularDayOffRate: 2     // 例假：2倍
};

// ===== 核心計算服務類別 =====
export class SalaryCalculatorService {
  private rates: LaborStandardRates;

  constructor(rates: LaborStandardRates = DEFAULT_RATES) {
    this.rates = rates;
  }

  // 更新費率設定
  updateRates(newRates: LaborStandardRates): void {
    this.rates = { ...newRates };
  }

  // 計算時薪
  calculateHourlyRate(salary: number, useCeiling: boolean = true): number {
    const hourlyRate = salary / 240;
    return useCeiling ? Math.ceil(hourlyRate) : Math.round(hourlyRate * 100) / 100;
  }

  // 計算日薪
  calculateDailyWage(salary: number, useCeiling: boolean = true): number {
    const dailyWage = salary / 30;
    return useCeiling ? Math.ceil(dailyWage) : Math.round(dailyWage * 100) / 100;
  }

  // 解析時數輸入
  parseHoursInput(input: string): ParsedHoursData | null {
    if (!input.trim()) return null;

    if (input.includes(',')) {
      const hoursList = input.split(',').map(x => {
        const parsed = parseFloat(x.trim());
        if (isNaN(parsed)) throw new Error(`無效的時數: ${x.trim()}`);
        return parsed;
      });
      return { total: hoursList.reduce((sum, h) => sum + h, 0), detail: hoursList };
    } else {
      const hours = parseFloat(input.trim());
      if (isNaN(hours)) throw new Error(`無效的時數: ${input.trim()}`);
      return { total: hours, detail: [hours] };
    }
  }

  // 計算平日加班費
  calculateWeekdayOvertime(hours: number, hourlyRate: number, isEmergency: boolean = false): CalculationDetail {
    if (hours <= 0) return { pay: 0, details: ['無加班'] };

    let totalPay = 0;
    const details: string[] = [];

    if (isEmergency) {
      totalPay = hours * hourlyRate * this.rates.weekdayEmergency;
      details.push(`天災事變加班 ${hours} 小時: ${hours} × ${hourlyRate} × ${this.rates.weekdayEmergency} = ${totalPay.toFixed(2)}`);
    } else {
      if (hours <= 2) {
        totalPay = hours * hourlyRate * this.rates.weekdayFirst2hr;
        details.push(`前 ${hours} 小時: ${hours} × ${hourlyRate} × ${this.rates.weekdayFirst2hr.toFixed(3)} = ${totalPay.toFixed(2)}`);
      } else if (hours <= 4) {
        const first2hrPay = 2 * hourlyRate * this.rates.weekdayFirst2hr;
        const remainingHours = hours - 2;
        const remainingPay = remainingHours * hourlyRate * this.rates.weekdayNext2hr;
        totalPay = first2hrPay + remainingPay;

        details.push(`前2小時: 2 × ${hourlyRate} × ${this.rates.weekdayFirst2hr.toFixed(3)} = ${first2hrPay.toFixed(2)}`);
        details.push(`再延長 ${remainingHours} 小時: ${remainingHours} × ${hourlyRate} × ${this.rates.weekdayNext2hr.toFixed(3)} = ${remainingPay.toFixed(2)}`);
      } else {
        const first2hrPay = 2 * hourlyRate * this.rates.weekdayFirst2hr;
        const next2hrPay = 2 * hourlyRate * this.rates.weekdayNext2hr;
        const over4hr = hours - 4;
        const over4hrPay = over4hr * hourlyRate * this.rates.weekdayNext2hr;
        totalPay = first2hrPay + next2hrPay + over4hrPay;

        details.push(`前2小時: 2 × ${hourlyRate} × ${this.rates.weekdayFirst2hr.toFixed(3)} = ${first2hrPay.toFixed(2)}`);
        details.push(`再延長2小時: 2 × ${hourlyRate} × ${this.rates.weekdayNext2hr.toFixed(3)} = ${next2hrPay.toFixed(2)}`);
        details.push(`超過4小時部分 ${over4hr} 小時: ${over4hr} × ${hourlyRate} × ${this.rates.weekdayNext2hr.toFixed(3)} = ${over4hrPay.toFixed(2)}`);
      }
    }

    return { pay: Math.round(totalPay * 100) / 100, details };
  }

  // 計算休息日加班費
  calculateRestDayOvertime(hours: number, hourlyRate: number): CalculationDetail {
    if (hours <= 0) return { pay: 0, details: ['未出勤'] };

    let totalPay = 0;
    const details: string[] = [];

    if (hours <= 2) {
      totalPay = hours * hourlyRate * this.rates.restDayFirst2hr;
      details.push(`前 ${hours} 小時: ${hours} × ${hourlyRate} × ${this.rates.restDayFirst2hr.toFixed(3)} = ${totalPay.toFixed(2)}`);
    } else if (hours <= 8) {
      const first2hrPay = 2 * hourlyRate * this.rates.restDayFirst2hr;
      const remainingHours = hours - 2;
      const remainingPay = remainingHours * hourlyRate * this.rates.restDay2to8hr;
      totalPay = first2hrPay + remainingPay;

      details.push(`前2小時: 2 × ${hourlyRate} × ${this.rates.restDayFirst2hr.toFixed(3)} = ${first2hrPay.toFixed(2)}`);
      details.push(`2-8小時 ${remainingHours} 小時: ${remainingHours} × ${hourlyRate} × ${this.rates.restDay2to8hr.toFixed(3)} = ${remainingPay.toFixed(2)}`);
    } else {
      const first2hrPay = 2 * hourlyRate * this.rates.restDayFirst2hr;
      const mid6hrPay = 6 * hourlyRate * this.rates.restDay2to8hr;
      const over8hr = hours - 8;
      const over8hrPay = over8hr * hourlyRate * this.rates.restDayOver8hr;
      totalPay = first2hrPay + mid6hrPay + over8hrPay;

      details.push(`前2小時: 2 × ${hourlyRate} × ${this.rates.restDayFirst2hr.toFixed(3)} = ${first2hrPay.toFixed(2)}`);
      details.push(`2-8小時: 6 × ${hourlyRate} × ${this.rates.restDay2to8hr.toFixed(3)} = ${mid6hrPay.toFixed(2)}`);
      details.push(`超過8小時 ${over8hr} 小時: ${over8hr} × ${hourlyRate} × ${this.rates.restDayOver8hr.toFixed(3)} = ${over8hrPay.toFixed(2)}`);
    }

    return { pay: Math.round(totalPay * 100) / 100, details };
  }

  // 計算假日出勤費
  calculateHolidayPay(hours: number, hourlyRate: number, holidayType: '國定假日' | '例假' = '國定假日'): CalculationDetail {
    if (hours <= 0) return { pay: 0, details: ['未出勤'] };

    const rate = holidayType === '例假' ? this.rates.regularDayOffRate : this.rates.holidayRate;
    const totalPay = hours * hourlyRate * rate;
    const details = [`${holidayType}出勤 ${hours} 小時: ${hours} × ${hourlyRate} × ${rate} = ${totalPay.toFixed(2)}`];

    return { pay: Math.round(totalPay * 100) / 100, details };
  }

  // 處理多天計算的私有方法
  private processDailyCalculation(
    parsedData: ParsedHoursData,
    hourlyRate: number,
    calculationMethod: (hours: number, hourlyRate: number, ...args: any[]) => CalculationDetail,
    ...additionalArgs: any[]
  ): CalculationDetail {
    if (parsedData.detail.length > 1) {
      // 多天計算
      const dailyResults: DailyWorkDetail[] = parsedData.detail
        .map((dailyHours, index) => {
          if (dailyHours > 0) {
            const result = calculationMethod(dailyHours, hourlyRate, ...additionalArgs);
            return {
              day: index + 1,
              hours: dailyHours,
              pay: result.pay
            };
          }
          return { day: index + 1, hours: 0, pay: 0 };
        })
        .filter(item => item.hours > 0);

      const dailyTotal = dailyResults.reduce((sum, day) => sum + day.pay, 0);
      return {
        pay: dailyTotal,
        details: [`共${parsedData.detail.length}天，每天分別計算`],
        dailyBreakdown: dailyResults
      };
    } else {
      // 單日計算
      return calculationMethod(parsedData.total, hourlyRate, ...additionalArgs);
    }
  }

  // 綜合計算主方法
  calculateComprehensive(
    monthlySalary: number,
    workData: WorkDataInput,
    useCeilingCalculation: boolean = true
  ): ComprehensiveResult {
    if (!monthlySalary || monthlySalary <= 0) {
      throw new Error('請輸入有效的月薪');
    }

    const hourlyRate = this.calculateHourlyRate(monthlySalary, useCeilingCalculation);
    const dailyWage = this.calculateDailyWage(monthlySalary, useCeilingCalculation);

    const result: ComprehensiveResult = {
      hourlyRate,
      dailyWage,
      calculations: {},
      totalPay: 0
    };

    let totalPay = 0;

    try {
      // 平日加班費
      if (workData.weekdayOvertime.trim()) {
        const parsed = this.parseHoursInput(workData.weekdayOvertime);
        if (parsed) {
          result.calculations['平日加班'] = this.processDailyCalculation(
            parsed,
            hourlyRate,
            this.calculateWeekdayOvertime.bind(this),
            workData.isEmergency
          );
          totalPay += result.calculations['平日加班'].pay;
        }
      }

      // 休息日工作
      if (workData.restDayWork.trim()) {
        const parsed = this.parseHoursInput(workData.restDayWork);
        if (parsed) {
          result.calculations['休息日工作'] = this.processDailyCalculation(
            parsed,
            hourlyRate,
            this.calculateRestDayOvertime.bind(this)
          );
          totalPay += result.calculations['休息日工作'].pay;
        }
      }

      // 國定假日/特休出勤
      if (workData.holidayWork.trim()) {
        const parsed = this.parseHoursInput(workData.holidayWork);
        if (parsed) {
          result.calculations['假日出勤'] = this.processDailyCalculation(
            parsed,
            hourlyRate,
            (hours: number, rate: number) => this.calculateHolidayPay(hours, rate, '國定假日')
          );
          totalPay += result.calculations['假日出勤'].pay;
        }
      }

      // 例假出勤
      if (workData.regularDayOffWork.trim()) {
        const parsed = this.parseHoursInput(workData.regularDayOffWork);
        if (parsed) {
          result.calculations['例假出勤'] = this.processDailyCalculation(
            parsed,
            hourlyRate,
            (hours: number, rate: number) => this.calculateHolidayPay(hours, rate, '例假')
          );
          totalPay += result.calculations['例假出勤'].pay;
        }
      }

      result.totalPay = Math.round(totalPay * 100) / 100;
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '輸入格式錯誤';
      throw new Error(`${errorMessage}\n\n請確認輸入格式：\n• 單一時數: 3\n• 多天時數: 9,9,9,9`);
    }
  }

  // 工時合規性檢查
  validateWorkHours(workData: WorkDataInput): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let isValid = true;

    // 檢查各項工作時數
    const checkHours = (input: string, type: string, maxRecommended?: number) => {
      if (!input.trim()) return;

      try {
        const parsed = this.parseHoursInput(input);
        if (parsed) {
          const maxDaily = Math.max(...parsed.detail);
          if (maxRecommended && maxDaily > maxRecommended) {
            warnings.push(`${type}單日工作時數 ${maxDaily} 小時可能超過建議上限 ${maxRecommended} 小時`);
            isValid = false;
          }
          if (maxDaily > 12) {
            warnings.push(`${type}單日工作時數 ${maxDaily} 小時超過法定上限 12 小時`);
            isValid = false;
          }
        }
      } catch (error) {
        warnings.push(`${type}輸入格式錯誤`);
        isValid = false;
      }
    };

    checkHours(workData.weekdayOvertime, '平日加班', 4);
    checkHours(workData.restDayWork, '休息日工作', 8);
    checkHours(workData.holidayWork, '假日出勤', 8);
    checkHours(workData.regularDayOffWork, '例假出勤', 8);

    return { isValid, warnings };
  }

  // 獲取當前費率設定
  getCurrentRates(): LaborStandardRates {
    return { ...this.rates };
  }
}

// ===== 工廠函數和便利方法 =====

// 建立預設計算器實例
export const createDefaultCalculator = (): SalaryCalculatorService => {
  return new SalaryCalculatorService();
};

// 建立自定義費率計算器實例
export const createCustomCalculator = (customRates: Partial<LaborStandardRates>): SalaryCalculatorService => {
  const rates = { ...DEFAULT_RATES, ...customRates };
  return new SalaryCalculatorService(rates);
};

// 快速計算方法（無需實例化）
export const quickCalculate = {
  // 快速計算時薪
  hourlyRate: (monthlySalary: number, useCeiling: boolean = true): number => {
    const calculator = createDefaultCalculator();
    return calculator.calculateHourlyRate(monthlySalary, useCeiling);
  },

  // 快速計算日薪
  dailyWage: (monthlySalary: number, useCeiling: boolean = true): number => {
    const calculator = createDefaultCalculator();
    return calculator.calculateDailyWage(monthlySalary, useCeiling);
  },

  // 快速計算平日加班費
  weekdayOvertime: (hours: number, hourlyRate: number, isEmergency: boolean = false): number => {
    const calculator = createDefaultCalculator();
    return calculator.calculateWeekdayOvertime(hours, hourlyRate, isEmergency).pay;
  }
};
