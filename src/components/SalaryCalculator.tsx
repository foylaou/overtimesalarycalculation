import React, { useState, useCallback } from 'react';
import { Calculator, DollarSign, Clock, Calendar, AlertTriangle, Info } from 'lucide-react';

// ===== TypeScript 介面定義 =====

/** 工作時數輸入資料 */
interface WorkDataInput {
  weekdayOvertime: string;
  restDayWork: string;
  holidayWork: string;
  regularDayOffWork: string;
  isEmergency: boolean;
}

/** 解析後的時數資料 */
interface ParsedHoursData {
  total: number;
  detail: number[];
}

/** 單日工作明細 */
interface DailyWorkDetail {
  day: number;
  hours: number;
  pay: number;
}

/** 計算詳細結果 */
interface CalculationDetail {
  pay: number;
  details: string[];
  dailyBreakdown?: DailyWorkDetail[];
}

/** 綜合計算結果 */
interface ComprehensiveResult {
  hourlyRate: number;
  dailyWage: number;
  calculations: {
    [key in '平日加班' | '休息日工作' | '假日出勤' | '例假出勤']?: CalculationDetail;
  };
  totalPay: number;
}

/** 勞基法規定的加班費倍率 */
interface LaborStandardRates {
  weekdayFirst2hr: number;    // 平日前2小時：1又1/3
  weekdayNext2hr: number;     // 平日再延長2小時：1又2/3
  weekdayEmergency: number;   // 天災事變：2倍
  restDayFirst2hr: number;    // 休息日前2小時：1又1/3
  restDay2to8hr: number;      // 休息日2-8小時：1又2/3
  restDayOver8hr: number;     // 休息日超過8小時：2又2/3
  holidayRate: number;        // 國定假日/特休：2倍
  regularDayOffRate: number;  // 例假：2倍
}

/** 組件 Props */
interface SalaryCalculatorProps {
  defaultMonthlySalary?: number;
  showCalculationComparison?: boolean;
  className?: string;
  onCalculationComplete?: (result: ComprehensiveResult) => void;
}

// ===== 主要組件 =====

const SalaryCalculator: React.FC<SalaryCalculatorProps> = ({
  defaultMonthlySalary,
  showCalculationComparison = true,
  className = '',
  onCalculationComplete
}) => {
  const [monthlySalary, setMonthlySalary] = useState<string>(
    defaultMonthlySalary ? defaultMonthlySalary.toString() : ''
  );
  const [workData, setWorkData] = useState<WorkDataInput>({
    weekdayOvertime: '',
    restDayWork: '',
    holidayWork: '',
    regularDayOffWork: '',
    isEmergency: false
  });
  const [results, setResults] = useState<ComprehensiveResult | null>(null);
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [useCeilingCalculation, setUseCeilingCalculation] = useState<boolean>(true);

  // 勞基法倍率常數
  const rates: LaborStandardRates = {
    weekdayFirst2hr: 4/3,    // 平日前2小時：1又1/3倍
    weekdayNext2hr: 5/3,     // 平日再延長2小時：1又2/3倍
    weekdayEmergency: 2,     // 天災事變：2倍
    restDayFirst2hr: 4/3,    // 休息日前2小時：1又1/3倍
    restDay2to8hr: 5/3,      // 休息日2-8小時：1又2/3倍
    restDayOver8hr: 8/3,     // 休息日超過8小時：2又2/3倍
    holidayRate: 2,          // 國定假日、特休：2倍
    regularDayOffRate: 2     // 例假：2倍
  };

  const calculateHourlyRate = useCallback((salary: number, useCeiling: boolean = true): number => {
    // 官方計算方式：月薪給付總額相當於240小時
    const hourlyRate = salary / 240;
    return useCeiling ? Math.ceil(hourlyRate) : Math.round(hourlyRate * 100) / 100;
  }, []);

  const calculateDailyWage = useCallback((salary: number, useCeiling: boolean = true): number => {
    // 基於240小時制：240/30 = 8小時/日，所以日薪 = 月薪/30
    const dailyWage = salary / 30;
    return useCeiling ? Math.ceil(dailyWage) : Math.round(dailyWage * 100) / 100;
  }, []);

  const parseHoursInput = useCallback((input: string): ParsedHoursData | null => {
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
  }, []);

  const calculateWeekdayOvertime = useCallback((hours: number, hourlyRate: number, isEmergency: boolean = false): CalculationDetail => {
    if (hours <= 0) return { pay: 0, details: ['無加班'] };

    let totalPay = 0;
    const details: string[] = [];

    if (isEmergency) {
      totalPay = hours * hourlyRate * rates.weekdayEmergency;
      details.push(`天災事變加班 ${hours} 小時: ${hours} × ${hourlyRate} × ${rates.weekdayEmergency} = ${totalPay.toFixed(2)}`);
    } else {
      if (hours <= 2) {
        totalPay = hours * hourlyRate * rates.weekdayFirst2hr;
        details.push(`前 ${hours} 小時: ${hours} × ${hourlyRate} × ${rates.weekdayFirst2hr.toFixed(3)} = ${totalPay.toFixed(2)}`);
      } else if (hours <= 4) {
        const first2hrPay = 2 * hourlyRate * rates.weekdayFirst2hr;
        const remainingHours = hours - 2;
        const remainingPay = remainingHours * hourlyRate * rates.weekdayNext2hr;
        totalPay = first2hrPay + remainingPay;

        details.push(`前2小時: 2 × ${hourlyRate} × ${rates.weekdayFirst2hr.toFixed(3)} = ${first2hrPay.toFixed(2)}`);
        details.push(`再延長 ${remainingHours} 小時: ${remainingHours} × ${hourlyRate} × ${rates.weekdayNext2hr.toFixed(3)} = ${remainingPay.toFixed(2)}`);
      } else {
        const first2hrPay = 2 * hourlyRate * rates.weekdayFirst2hr;
        const next2hrPay = 2 * hourlyRate * rates.weekdayNext2hr;
        const over4hr = hours - 4;
        const over4hrPay = over4hr * hourlyRate * rates.weekdayNext2hr;
        totalPay = first2hrPay + next2hrPay + over4hrPay;

        details.push(`前2小時: 2 × ${hourlyRate} × ${rates.weekdayFirst2hr.toFixed(3)} = ${first2hrPay.toFixed(2)}`);
        details.push(`再延長2小時: 2 × ${hourlyRate} × ${rates.weekdayNext2hr.toFixed(3)} = ${next2hrPay.toFixed(2)}`);
        details.push(`超過4小時部分 ${over4hr} 小時: ${over4hr} × ${hourlyRate} × ${rates.weekdayNext2hr.toFixed(3)} = ${over4hrPay.toFixed(2)}`);
      }
    }

    return { pay: Math.round(totalPay * 100) / 100, details };
  }, [rates]);

  const calculateRestDayOvertime = useCallback((hours: number, hourlyRate: number): CalculationDetail => {
    if (hours <= 0) return { pay: 0, details: ['未出勤'] };

    let totalPay = 0;
    const details: string[] = [];

    if (hours <= 2) {
      totalPay = hours * hourlyRate * rates.restDayFirst2hr;
      details.push(`前 ${hours} 小時: ${hours} × ${hourlyRate} × ${rates.restDayFirst2hr.toFixed(3)} = ${totalPay.toFixed(2)}`);
    } else if (hours <= 8) {
      const first2hrPay = 2 * hourlyRate * rates.restDayFirst2hr;
      const remainingHours = hours - 2;
      const remainingPay = remainingHours * hourlyRate * rates.restDay2to8hr;
      totalPay = first2hrPay + remainingPay;

      details.push(`前2小時: 2 × ${hourlyRate} × ${rates.restDayFirst2hr.toFixed(3)} = ${first2hrPay.toFixed(2)}`);
      details.push(`2-8小時 ${remainingHours} 小時: ${remainingHours} × ${hourlyRate} × ${rates.restDay2to8hr.toFixed(3)} = ${remainingPay.toFixed(2)}`);
    } else {
      const first2hrPay = 2 * hourlyRate * rates.restDayFirst2hr;
      const mid6hrPay = 6 * hourlyRate * rates.restDay2to8hr;
      const over8hr = hours - 8;
      const over8hrPay = over8hr * hourlyRate * rates.restDayOver8hr;
      totalPay = first2hrPay + mid6hrPay + over8hrPay;

      details.push(`前2小時: 2 × ${hourlyRate} × ${rates.restDayFirst2hr.toFixed(3)} = ${first2hrPay.toFixed(2)}`);
      details.push(`2-8小時: 6 × ${hourlyRate} × ${rates.restDay2to8hr.toFixed(3)} = ${mid6hrPay.toFixed(2)}`);
      details.push(`超過8小時 ${over8hr} 小時: ${over8hr} × ${hourlyRate} × ${rates.restDayOver8hr.toFixed(3)} = ${over8hrPay.toFixed(2)}`);
    }

    return { pay: Math.round(totalPay * 100) / 100, details };
  }, [rates]);

  const calculateHolidayPay = useCallback((hours: number, hourlyRate: number, holidayType: string = '國定假日'): CalculationDetail => {
    if (hours <= 0) return { pay: 0, details: ['未出勤'] };

    const totalPay = hours * hourlyRate * rates.holidayRate;
    const details = [`${holidayType}出勤 ${hours} 小時: ${hours} × ${hourlyRate} × ${rates.holidayRate} = ${totalPay.toFixed(2)}`];

    return { pay: Math.round(totalPay * 100) / 100, details };
  }, [rates]);

  const calculateComprehensive = useCallback((): void => {
    const salary = parseFloat(monthlySalary);
    if (!salary || salary <= 0) {
      alert('請輸入有效的月薪');
      return;
    }

    const hourlyRate = calculateHourlyRate(salary, useCeilingCalculation);
    const dailyWage = calculateDailyWage(salary, useCeilingCalculation);

    const calculationResults: ComprehensiveResult = {
      hourlyRate,
      dailyWage,
      calculations: {},
      totalPay: 0
    };

    let totalPay = 0;

    try {
      // 平日加班費
      if (workData.weekdayOvertime.trim()) {
        const parsed = parseHoursInput(workData.weekdayOvertime);
        if (parsed) {
          if (parsed.detail.length > 1) {
            // 多天計算
            const dailyResults: DailyWorkDetail[] = parsed.detail.map((dailyHours, index) => {
              if (dailyHours > 0) {
                const result = calculateWeekdayOvertime(dailyHours, hourlyRate, workData.isEmergency);
                return {
                  day: index + 1,
                  hours: dailyHours,
                  pay: result.pay
                };
              }
              return { day: index + 1, hours: 0, pay: 0 };
            }).filter(item => item.hours > 0);

            const dailyTotal = dailyResults.reduce((sum, day) => sum + day.pay, 0);
            calculationResults.calculations['平日加班'] = {
              pay: dailyTotal,
              details: [`共${parsed.detail.length}天，每天分別計算`],
              dailyBreakdown: dailyResults
            };
          } else {
            // 單日計算
            const result = calculateWeekdayOvertime(parsed.total, hourlyRate, workData.isEmergency);
            calculationResults.calculations['平日加班'] = {
              pay: result.pay,
              details: result.details
            };
          }
          totalPay += calculationResults.calculations['平日加班']!.pay;
        }
      }

      // 休息日工作
      if (workData.restDayWork.trim()) {
        const parsed = parseHoursInput(workData.restDayWork);
        if (parsed) {
          if (parsed.detail.length > 1) {
            // 多天計算
            const dailyResults: DailyWorkDetail[] = parsed.detail.map((dailyHours, index) => {
              if (dailyHours > 0) {
                const result = calculateRestDayOvertime(dailyHours, hourlyRate);
                return {
                  day: index + 1,
                  hours: dailyHours,
                  pay: result.pay
                };
              }
              return { day: index + 1, hours: 0, pay: 0 };
            }).filter(item => item.hours > 0);

            const dailyTotal = dailyResults.reduce((sum, day) => sum + day.pay, 0);
            calculationResults.calculations['休息日工作'] = {
              pay: dailyTotal,
              details: [`共${parsed.detail.length}天，每天分別計算`],
              dailyBreakdown: dailyResults
            };
          } else {
            // 單日計算
            const result = calculateRestDayOvertime(parsed.total, hourlyRate);
            calculationResults.calculations['休息日工作'] = {
              pay: result.pay,
              details: result.details
            };
          }
          totalPay += calculationResults.calculations['休息日工作']!.pay;
        }
      }

      // 國定假日/特休出勤
      if (workData.holidayWork.trim()) {
        const parsed = parseHoursInput(workData.holidayWork);
        if (parsed) {
          if (parsed.detail.length > 1) {
            // 多天計算
            const dailyResults: DailyWorkDetail[] = parsed.detail.map((dailyHours, index) => {
              if (dailyHours > 0) {
                const result = calculateHolidayPay(dailyHours, hourlyRate, '國定假日');
                return {
                  day: index + 1,
                  hours: dailyHours,
                  pay: result.pay
                };
              }
              return { day: index + 1, hours: 0, pay: 0 };
            }).filter(item => item.hours > 0);

            const dailyTotal = dailyResults.reduce((sum, day) => sum + day.pay, 0);
            calculationResults.calculations['假日出勤'] = {
              pay: dailyTotal,
              details: [`共${parsed.detail.length}天，每天分別計算`],
              dailyBreakdown: dailyResults
            };
          } else {
            // 單日計算
            const result = calculateHolidayPay(parsed.total, hourlyRate, '國定假日');
            calculationResults.calculations['假日出勤'] = {
              pay: result.pay,
              details: result.details
            };
          }
          totalPay += calculationResults.calculations['假日出勤']!.pay;
        }
      }

      // 例假出勤
      if (workData.regularDayOffWork.trim()) {
        const parsed = parseHoursInput(workData.regularDayOffWork);
        if (parsed) {
          if (parsed.detail.length > 1) {
            // 多天計算
            const dailyResults: DailyWorkDetail[] = parsed.detail.map((dailyHours, index) => {
              if (dailyHours > 0) {
                const result = calculateHolidayPay(dailyHours, hourlyRate, '例假');
                return {
                  day: index + 1,
                  hours: dailyHours,
                  pay: result.pay
                };
              }
              return { day: index + 1, hours: 0, pay: 0 };
            }).filter(item => item.hours > 0);

            const dailyTotal = dailyResults.reduce((sum, day) => sum + day.pay, 0);
            calculationResults.calculations['例假出勤'] = {
              pay: dailyTotal,
              details: [`共${parsed.detail.length}天，每天分別計算`],
              dailyBreakdown: dailyResults
            };
          } else {
            // 單日計算
            const result = calculateHolidayPay(parsed.total, hourlyRate, '例假');
            calculationResults.calculations['例假出勤'] = {
              pay: result.pay,
              details: result.details
            };
          }
          totalPay += calculationResults.calculations['例假出勤']!.pay;
        }
      }

      calculationResults.totalPay = Math.round(totalPay * 100) / 100;
      setResults(calculationResults);

      // 回調函數
      if (onCalculationComplete) {
        onCalculationComplete(calculationResults);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '輸入格式錯誤';
      alert(`${errorMessage}\n\n請確認輸入格式：\n• 單一時數: 3\n• 多天時數: 9,9,9,9`);
    }
  }, [monthlySalary, workData, rates, calculateHourlyRate, calculateDailyWage, parseHoursInput, calculateWeekdayOvertime, calculateRestDayOvertime, calculateHolidayPay, onCalculationComplete]);

  const handleInputChange = useCallback((field: keyof WorkDataInput, value: string | boolean): void => {
    setWorkData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback((): void => {
    setMonthlySalary('');
    setWorkData({
      weekdayOvertime: '',
      restDayWork: '',
      holidayWork: '',
      regularDayOffWork: '',
      isEmergency: false
    });
    setResults(null);
    setShowComparison(false);
    // 保持計算方式設定，不重置
  }, []);

  // 計算薪資比較數據
  const hourlyRateExact = monthlySalary ? calculateHourlyRate(parseFloat(monthlySalary), false) : 0;
  const hourlyRateCeiling = monthlySalary ? calculateHourlyRate(parseFloat(monthlySalary), true) : 0;
  const dailyWageExact = monthlySalary ? calculateDailyWage(parseFloat(monthlySalary), false) : 0;
  const dailyWageCeiling = monthlySalary ? calculateDailyWage(parseFloat(monthlySalary), true) : 0;

  // 當前使用的薪資（根據開關狀態）
  const currentHourlyRate = monthlySalary ? calculateHourlyRate(parseFloat(monthlySalary), useCeilingCalculation) : 0;
  const currentDailyWage = monthlySalary ? calculateDailyWage(parseFloat(monthlySalary), useCeilingCalculation) : 0;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Calculator className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">勞動基準法加班費計算系統</h1>
          </div>
          <p className="text-gray-600">根據勞基法第24條規定，準確計算各種加班費用</p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          {/* 月薪輸入 */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-3">
              <DollarSign className="w-5 h-5" />
              月薪設定
            </label>
            <div className="flex gap-4 items-center">
              <input
                type="number"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                placeholder="請輸入月薪"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
              />
              <span className="text-gray-600 font-medium">元</span>
            </div>
          </div>

          {/* 計算方式開關 */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-gray-700">計算方式設定</h3>
                  <p className="text-sm text-gray-600">選擇薪資計算方式（影響加班費計算）</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${!useCeilingCalculation ? 'text-gray-900' : 'text-gray-500'}`}>
                  四捨五入
                </span>
                <button
                  onClick={() => setUseCeilingCalculation(!useCeilingCalculation)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                    useCeilingCalculation ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={useCeilingCalculation}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                      useCeilingCalculation ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${useCeilingCalculation ? 'text-gray-900' : 'text-gray-500'}`}>
                  無條件進位
                </span>
              </div>
            </div>

            {monthlySalary && (
              <div className="mt-3 pt-3 border-t border-amber-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">當前時薪:</span>
                  <span className="font-bold text-amber-700">{currentHourlyRate} 元</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">當前日薪:</span>
                  <span className="font-bold text-amber-700">{currentDailyWage} 元</span>
                </div>
              </div>
            )}
          </div>

          {/* 薪資比較 */}
          {monthlySalary && showCalculationComparison && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-700">薪資計算方式</h3>
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
                >
                  {showComparison ? '隱藏' : '顯示'} 計算比較
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className={`p-3 rounded transition-all duration-200 ${
                  useCeilingCalculation 
                    ? 'bg-indigo-50 border-2 border-indigo-200' 
                    : 'bg-gray-100 border border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        {useCeilingCalculation ? '✓ 使用中' : '未使用'} - 無條件進位
                      </p>
                      <p className="font-bold text-indigo-700">時薪: {hourlyRateCeiling} 元 | 日薪: {dailyWageCeiling} 元</p>
                    </div>
                  </div>
                </div>

                {showComparison && (
                  <div className={`p-3 rounded transition-all duration-200 ${
                    !useCeilingCalculation 
                      ? 'bg-indigo-50 border-2 border-indigo-200' 
                      : 'bg-gray-100 border border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          {!useCeilingCalculation ? '✓ 使用中' : '未使用'} - 四捨五入
                        </p>
                        <p className="font-medium text-gray-700">時薪: {hourlyRateExact.toFixed(2)} 元 | 日薪: {dailyWageExact.toFixed(2)} 元</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 工作時數輸入 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* 平日加班 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-semibold text-gray-700">
                <Clock className="w-4 h-4" />
                平日加班時數
              </label>
              <input
                type="text"
                value={workData.weekdayOvertime}
                onChange={(e) => handleInputChange('weekdayOvertime', e.target.value)}
                placeholder="例如: 3 或 2,3,4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={workData.isEmergency}
                  onChange={(e) => handleInputChange('isEmergency', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  天災、事變或突發事件
                </span>
              </div>
            </div>

            {/* 休息日工作 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-semibold text-gray-700">
                <Calendar className="w-4 h-4" />
                休息日工作時數
              </label>
              <input
                type="text"
                value={workData.restDayWork}
                onChange={(e) => handleInputChange('restDayWork', e.target.value)}
                placeholder="例如: 6 或 9,9,9,9"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* 國定假日/特休 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-semibold text-gray-700">
                <Calendar className="w-4 h-4 text-red-500" />
                國定假日/特休出勤
              </label>
              <input
                type="text"
                value={workData.holidayWork}
                onChange={(e) => handleInputChange('holidayWork', e.target.value)}
                placeholder="例如: 8 或 8,8"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* 例假 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-semibold text-gray-700">
                <Calendar className="w-4 h-4 text-yellow-500" />
                例假出勤時數
              </label>
              <input
                type="text"
                value={workData.regularDayOffWork}
                onChange={(e) => handleInputChange('regularDayOffWork', e.target.value)}
                placeholder="例如: 8（僅天災事變可出勤）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={calculateComprehensive}
              disabled={!monthlySalary}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              計算加班費
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors"
            >
              重置
            </button>
          </div>

          {/* 使用說明 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-blue-800">輸入格式說明</h4>
            </div>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>單一時數</strong>：直接輸入數字，例如 <code className="bg-white px-1 rounded">3</code></li>
              <li>• <strong>多天時數</strong>：用逗號分隔，例如 <code className="bg-white px-1 rounded">9,9,9,9</code></li>
              <li>• <strong>系統特色</strong>：使用無條件進位保護勞工權益，每天分別計算加班費</li>
            </ul>
          </div>
        </div>

        {/* 計算結果 */}
        {results && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              計算結果
            </h2>

            {/* 總計 */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-xl mb-6">
              <div className="text-center">
                <p className="text-lg opacity-90">總加給工資</p>
                <p className="text-4xl font-bold">{results.totalPay.toLocaleString()} 元</p>
                <p className="text-sm opacity-75 mt-2">
                  計算方式：{useCeilingCalculation ? '無條件進位' : '四捨五入'}
                  {useCeilingCalculation && ' (保護勞工權益)'}
                </p>
              </div>
            </div>

            {/* 各項計算明細 */}
            {Object.keys(results.calculations).length > 0 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-800">詳細計算</h3>

                {Object.entries(results.calculations).map(([workType, calculation]) => {
                  if (!calculation) return null;

                  return (
                    <div key={workType} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-lg font-semibold text-gray-700">{workType}</h4>
                        <span className="text-xl font-bold text-indigo-600">
                          {calculation.pay.toLocaleString()} 元
                        </span>
                      </div>

                      {/* 每日明細 */}
                      {calculation.dailyBreakdown && calculation.dailyBreakdown.length > 0 && (
                        <div className="mb-4 p-3 bg-gray-50 rounded">
                          <p className="font-medium text-gray-700 mb-2">每日明細：</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {calculation.dailyBreakdown.map((daily) => (
                              <div key={daily.day} className="text-sm bg-white p-2 rounded border">
                                <span className="text-gray-600">第{daily.day}天: </span>
                                <span className="font-medium">{daily.hours}h</span>
                                <br />
                                <span className="text-indigo-600 font-bold">{daily.pay.toLocaleString()}元</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 計算詳情 */}
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-600">
                          {calculation.dailyBreakdown ? '總計算說明：' : '計算詳情：'}
                        </p>
                        {calculation.details.map((detail, index) => (
                          <p key={index} className="text-sm text-gray-600 ml-4">• {detail}</p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {Object.keys(results.calculations).length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>未輸入任何工作時數</p>
                <p className="text-sm mt-2">請在上方輸入工作時數後重新計算</p>
              </div>
            )}

            {/* 法規提醒 */}
            <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <h4 className="font-semibold text-yellow-800 mb-1">法規提醒</h4>
                  <ul className="text-yellow-700 space-y-1">
                    <li>• 每日工作時間（含加班）不得超過12小時</li>
                    <li>• 每月延長工作時間不得超過46小時（經同意後不得超過54小時）</li>
                    <li>• 每3個月延長工作時間不得超過138小時</li>
                    <li>• 休息日工作時數計入月加班總時數</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>本計算器依據《勞動基準法》第24條、第32條、第36條、第39條、第40條規定製作</p>
          <p>計算結果僅供參考，實際薪資以公司規定為準</p>
        </div>
      </div>
    </div>
  );
};

export default SalaryCalculator;
