import React, {useCallback, useEffect, useState} from "react";
import {AlertTriangle, Calculator, Calendar, Clock, DollarSign, Info, Settings} from "lucide-react";
import type { ComprehensiveResult, WorkDataInput} from "./type.ts";
import {DEFAULT_RATES, useRateStore} from "../store/useRatestore.ts";
import {useEditDialog} from "../hook/useEditDialog.tsx";
import SettingsForm, {type SettingsFormData} from "./SettingsForm.tsx";
import { createCustomCalculator} from "../utils/SalaryCalculatorService.ts";
import FloatingButton from "./FloatingButton.tsx";

const SalaryCalculator: React.FC = () => {
  const [monthlySalary, setMonthlySalary] = useState<string>('');
  const [showmodel, setShowModel] = useState<boolean>(false);
  const [workData, setWorkData] = useState<WorkDataInput>({
    weekdayOvertime: '',
    restDayWork: '',
    holidayWork: '',
    regularDayOffWork: '',
    isEmergency: false
  });
  const [results, setResults] = useState<ComprehensiveResult | null>(null);
  const [showComparison, setShowComparison] = useState<boolean>(false);


  // 使用 React state 管理設定
  const [, setSettings] = useState({
    customRates: DEFAULT_RATES,
    useCeilingCalculation: true
  });
  // 從 Zustand Store 中取出狀態和動作
  const { customRates, setCustomRates } = useRateStore();

  // 使用 React state 管理計算方式
  const [useCeilingCalculation, setUseCeilingCalculation] = useState<boolean>(true);


  // 創建計算器實例 - 根據設定動態更新
  const [calculator] = useState(() => createCustomCalculator(customRates));

  useEffect(() => {
    calculator.updateRates(customRates);
  }, [calculator, customRates]);



  // 使用 useEditDialog hook
  const { editDialog, EditComponent } = useEditDialog<SettingsFormData>();

  // 開啟設定對話框
  const handleOpenSettings = useCallback(async () => {
      setShowModel(true)
    const result = await editDialog({
      cardTitle: "自訂倍率設定",
      initialData: { customRates, useCeilingCalculation },
      cardStyle:"card bg-base-100 border border-gray-200 shadow-lg max-w-5xl w-full mx-4 max-h-[100vh] overflow-auto",
      renderForm: ({ initialData, onConfirm, onCancel }) => (
        <SettingsForm
          initialData={initialData}
          onConfirm={onConfirm}
            onCancel={onCancel}
        />
      )
    });

    if (result) {
        // 更新 Zustand store 中的 customRates
        Object.keys(result.customRates).forEach(key => {
            setCustomRates(key as keyof typeof result.customRates, result.customRates[key as keyof typeof result.customRates]);
        });
      setUseCeilingCalculation(result.useCeilingCalculation);
               setShowModel(false)
    }else {
         setShowModel(false)
    }


  }, [editDialog, customRates, useCeilingCalculation, setCustomRates]);

  // 計算綜合加班費 - 使用封裝的服務
  const calculateComprehensive = useCallback((): void => {
    const salary = parseFloat(monthlySalary);
    if (!salary || salary <= 0) {
      alert('請輸入有效的月薪');
      return;
    }

    try {
      const result = calculator.calculateComprehensive(salary, workData, useCeilingCalculation);
      setResults(result);

      // 顯示工時合規性檢查
      const validation = calculator.validateWorkHours(workData);
      if (!validation.isValid && validation.warnings.length > 0) {
        const warningMessage = validation.warnings.join('\n');
        // 可以選擇顯示警告，但不阻止計算
        console.warn('工時檢查警告:', warningMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '計算發生錯誤';
      alert(errorMessage);
    }
  }, [calculator, monthlySalary, workData, useCeilingCalculation]);

  // 處理輸入變更
  const handleInputChange = useCallback((field: keyof WorkDataInput, value: string | boolean): void => {
    setWorkData(prev => ({ ...prev, [field]: value }));
  }, []);

  // 重置表單
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
  }, []);

  // 計算薪資比較數據 - 使用計算器服務
  const hourlyRateExact = monthlySalary ? calculator.calculateHourlyRate(parseFloat(monthlySalary), false) : 0;
  const hourlyRateCeiling = monthlySalary ? calculator.calculateHourlyRate(parseFloat(monthlySalary), true) : 0;
  const dailyWageExact = monthlySalary ? calculator.calculateDailyWage(parseFloat(monthlySalary), false) : 0;
  const dailyWageCeiling = monthlySalary ? calculator.calculateDailyWage(parseFloat(monthlySalary), true) : 0;

  const currentHourlyRate = monthlySalary ? calculator.calculateHourlyRate(parseFloat(monthlySalary), useCeilingCalculation) : 0;
  const currentDailyWage = monthlySalary ? calculator.calculateDailyWage(parseFloat(monthlySalary), useCeilingCalculation) : 0;

  // 檢查是否要顯示計算比較 - 假設這是一個 prop 或設定
  const showCalculationComparison = true;

  return (
<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
  <div className="max-w-4xl mx-auto">
    {/* Header */}
    <div className="text-center mb-8 relative">
      <button
        onClick={handleOpenSettings}
        className="absolute top-0 right-0 p-2 text-gray-500 hover:text-indigo-600 hover:bg-white hover:shadow-md rounded-lg transition-all duration-200"
        title="自訂倍率設定"
        aria-label="自訂倍率設定"
      >

      </button>
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="flex justify-center items-center gap-3">
          <Calculator className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">勞動基準法加班費計算系統</h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600 mt-1">根據勞基法第24條規定，準確計算各種加班費用</p>
      </div>
    </div>

    {/* Main Content */}
    <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-6">

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
            aria-label="請輸入月薪"
          />
          <span className="text-gray-600 font-medium">元</span>
        </div>
      </div>

      {/* 計算方式開關 */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-semibold text-gray-700">計算方式設定</h3>
              <p className="text-sm text-gray-600">選擇薪資計算方式（影響加班費計算）</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 sm:mt-0">
            <span className={`text-sm font-medium ${!useCeilingCalculation ? 'text-gray-900' : 'text-gray-500'}`}>
              四捨五入
            </span>
            <button
              onClick={() => setSettings(prev => ({
                ...prev,
                useCeilingCalculation: !prev.useCeilingCalculation
              }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${useCeilingCalculation ? 'bg-indigo-600' : 'bg-gray-200'}`}
              role="switch"
              aria-checked={useCeilingCalculation}
              aria-label="切換計算方式"
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${useCeilingCalculation ? 'translate-x-5' : 'translate-x-0'}`}
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3">
            <h3 className="font-semibold text-gray-700">薪資計算方式</h3>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors mt-2 sm:mt-0"
            >
              {showComparison ? '隱藏' : '顯示'} 計算比較
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className={`p-3 rounded transition-all duration-200 ${useCeilingCalculation ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-gray-100 border border-gray-200'}`}>
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
              <div className={`p-3 rounded transition-all duration-200 ${!useCeilingCalculation ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-gray-100 border border-gray-200'}`}>
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
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={calculateComprehensive}
          disabled={!monthlySalary}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
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
        </ul>
      </div>
    </div>

    {/* 計算結果 */}
    {results && (
      <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mt-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-green-600" />
          計算結果
        </h2>

        {/* 總計 */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-xl mb-6">
          <div className="text-center">
            <p className="text-lg opacity-90">總加給工資</p>
            <p className="text-3xl sm:text-4xl font-bold">{Math.round(results.totalPay).toLocaleString()} 元</p>
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

        {/* 法規提醒 - 使用計算器的合規性檢查 */}
        <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-400 rounded">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <h4 className="font-semibold text-red-800 mb-2">工時限制檢查</h4>
              {(() => {
                const validation = calculator.validateWorkHours(workData);
                return validation.warnings.length > 0 ? (
                  <div className="bg-red-100 p-2 rounded mb-2">
                    <p className="text-red-700 font-medium">⚠️ 注意：</p>
                    {validation.warnings.map((warning, index) => (
                      <p key={index} className="text-red-700 text-xs mt-1">• {warning}</p>
                    ))}
                  </div>
                ) : null;
              })()}
              <ul className="text-red-700 space-y-1">
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

    {/* EditDialog Component */}
    {EditComponent}
      {!showmodel &&
          <FloatingButton
        onClick={handleOpenSettings} unreadCount={1}
        icon={<Settings
        />}
    />
      }

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
