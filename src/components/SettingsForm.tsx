import React, { useState, useCallback } from 'react';
import { Clock, Calendar,  Info,  RotateCcw } from 'lucide-react';

// ===== TypeScript Interface Definitions =====

interface LaborStandardRates {
  weekdayFirst2hr: number;
  weekdayNext2hr: number;
  weekdayEmergency: number;
  restDayFirst2hr: number;
  restDay2to8hr: number;
  restDayOver8hr: number;
  holidayRate: number;
  regularDayOffRate: number;
}








export interface SettingsFormData {
  customRates: LaborStandardRates;
  useCeilingCalculation: boolean;
}

interface SettingsFormProps {
  initialData?: SettingsFormData;
  onConfirm: (data: SettingsFormData) => void;
  onCancel: () => void;
  onClose?: () => void;
}

// ===== Constants =====

const DEFAULT_RATES: LaborStandardRates = {
  weekdayFirst2hr: 4 / 3,
  weekdayNext2hr: 5 / 3,
  weekdayEmergency: 2,
  restDayFirst2hr: 4 / 3,
  restDay2to8hr: 5 / 3,
  restDayOver8hr: 8 / 3,
  holidayRate: 2,
  regularDayOffRate: 2,
};

// ===== Settings Form Component =====

const SettingsForm: React.FC<SettingsFormProps> = ({
  initialData,
  onConfirm,
  onCancel,
}) => {
  const [formData, setFormData] = useState<SettingsFormData>(() => ({
    customRates: initialData?.customRates || DEFAULT_RATES,
    useCeilingCalculation: initialData?.useCeilingCalculation ?? true
  }));

  // 保存輸入框的顯示值（允許用戶輸入過程中的中間狀態）
  const [inputValues, setInputValues] = useState<Record<keyof LaborStandardRates, string>>(() => {
    const rates = initialData?.customRates || DEFAULT_RATES;
    return {
      weekdayFirst2hr: getRateInputValue(rates.weekdayFirst2hr),
      weekdayNext2hr: getRateInputValue(rates.weekdayNext2hr),
      weekdayEmergency: getRateInputValue(rates.weekdayEmergency),
      restDayFirst2hr: getRateInputValue(rates.restDayFirst2hr),
      restDay2to8hr: getRateInputValue(rates.restDay2to8hr),
      restDayOver8hr: getRateInputValue(rates.restDayOver8hr),
      holidayRate: getRateInputValue(rates.holidayRate),
      regularDayOffRate: getRateInputValue(rates.regularDayOffRate),
    };
  });

  const handleInputChange = useCallback((field: keyof LaborStandardRates, value: string): void => {
    setInputValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleInputBlur = useCallback((field: keyof LaborStandardRates, value: string): void => {
    if (!value.trim()) {
      // 如果輸入為空，恢復到當前有效值
      setInputValues(prev => ({ ...prev, [field]: getRateInputValue(formData.customRates[field]) }));
      return;
    }

    try {
      let numValue: number;

      if (value.includes('/')) {
        const parts = value.split('/');
        if (parts.length === 2) {
          const numerator = parseFloat(parts[0].trim());
          const denominator = parseFloat(parts[1].trim());

          if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
            numValue = numerator / denominator;
          } else {
            throw new Error('無效的分數格式');
          }
        } else {
          throw new Error('分數格式應為 a/b');
        }
      } else {
        numValue = parseFloat(value);
        if (isNaN(numValue)) {
          throw new Error('無效的數字格式');
        }
      }

      if (numValue > 0) {
        // 更新實際的倍率值
        setFormData(prev => ({
          ...prev,
          customRates: {
            ...prev.customRates,
            [field]: numValue
          }
        }));
        // 將輸入框值標準化顯示
        setInputValues(prev => ({ ...prev, [field]: getRateInputValue(numValue) }));
      } else {
        throw new Error('倍率必須大於0');
      }
    } catch (error) {
      console.warn(`倍率輸入錯誤 (${field}): ${error instanceof Error ? error.message : '未知錯誤'}`);
      // 恢復到上一個有效值
      setInputValues(prev => ({ ...prev, [field]: getRateInputValue(formData.customRates[field]) }));
    }
  }, [formData.customRates]);

  function getRateInputValue(rate: number): string {
    if (Math.abs(rate - 4/3) < 0.001) return '4/3';
    if (Math.abs(rate - 5/3) < 0.001) return '5/3';
    if (Math.abs(rate - 8/3) < 0.001) return '8/3';
    if (Math.abs(rate - 2) < 0.001) return '2';
    return rate.toFixed(3);
  }

  const formatRateDisplay = (rate: number): string => {
    if (Math.abs(rate - 4/3) < 0.001) return '1又1/3倍 (4/3)';
    if (Math.abs(rate - 5/3) < 0.001) return '1又2/3倍 (5/3)';
    if (Math.abs(rate - 8/3) < 0.001) return '2又2/3倍 (8/3)';
    if (Math.abs(rate - 2) < 0.001) return '2倍';
    return `${rate.toFixed(3)}倍`;
  };

  const handleResetAll = useCallback(() => {
    setFormData({
      customRates: DEFAULT_RATES,
      useCeilingCalculation: true
    });
    // 同時重置輸入框顯示值
    setInputValues({
      weekdayFirst2hr: getRateInputValue(DEFAULT_RATES.weekdayFirst2hr),
      weekdayNext2hr: getRateInputValue(DEFAULT_RATES.weekdayNext2hr),
      weekdayEmergency: getRateInputValue(DEFAULT_RATES.weekdayEmergency),
      restDayFirst2hr: getRateInputValue(DEFAULT_RATES.restDayFirst2hr),
      restDay2to8hr: getRateInputValue(DEFAULT_RATES.restDay2to8hr),
      restDayOver8hr: getRateInputValue(DEFAULT_RATES.restDayOver8hr),
      holidayRate: getRateInputValue(DEFAULT_RATES.holidayRate),
      regularDayOffRate: getRateInputValue(DEFAULT_RATES.regularDayOffRate),
    });
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent): void => {
    e.preventDefault();
    onConfirm(formData);
  }, [formData, onConfirm]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 計算方式設定 */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-3">計算方式設定</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">薪資計算方式（影響加班費計算）</span>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${!formData.useCeilingCalculation ? 'text-gray-900' : 'text-gray-500'}`}>
              四捨五入
            </span>
            <button
              type="button"
              onClick={() => setFormData(prev => ({
                ...prev,
                useCeilingCalculation: !prev.useCeilingCalculation
              }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                formData.useCeilingCalculation ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={formData.useCeilingCalculation}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                  formData.useCeilingCalculation ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${formData.useCeilingCalculation ? 'text-gray-900' : 'text-gray-500'}`}>
              無條件進位
            </span>
          </div>
        </div>
      </div>

      {/* 平日加班倍率 */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          平日加班倍率（勞基法第24條第1項）
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              前2小時（{formatRateDisplay(formData.customRates.weekdayFirst2hr)}）
            </label>
            <input
              type="text"
              value={inputValues.weekdayFirst2hr}
              onChange={(e) => handleInputChange('weekdayFirst2hr', e.target.value)}
              onBlur={(e) => handleInputBlur('weekdayFirst2hr', e.target.value)}
              placeholder="例如: 4/3 或 1.333"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              再延長2小時（{formatRateDisplay(formData.customRates.weekdayNext2hr)}）
            </label>
            <input
              type="text"
              value={inputValues.weekdayNext2hr}
              onChange={(e) => handleInputChange('weekdayNext2hr', e.target.value)}
              onBlur={(e) => handleInputBlur('weekdayNext2hr', e.target.value)}
              placeholder="例如: 5/3 或 1.667"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              天災事變（{formatRateDisplay(formData.customRates.weekdayEmergency)}）
            </label>
            <input
              type="text"
              value={inputValues.weekdayEmergency}
              onChange={(e) => handleInputChange('weekdayEmergency', e.target.value)}
              onBlur={(e) => handleInputBlur('weekdayEmergency', e.target.value)}
              placeholder="例如: 2 或 2.000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 休息日工作倍率 */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          休息日工作倍率（勞基法第24條第2項）
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              前2小時（{formatRateDisplay(formData.customRates.restDayFirst2hr)}）
            </label>
            <input
              type="text"
              value={inputValues.restDayFirst2hr}
              onChange={(e) => handleInputChange('restDayFirst2hr', e.target.value)}
              onBlur={(e) => handleInputBlur('restDayFirst2hr', e.target.value)}
              placeholder="例如: 4/3 或 1.333"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              2-8小時（{formatRateDisplay(formData.customRates.restDay2to8hr)}）
            </label>
            <input
              type="text"
              value={inputValues.restDay2to8hr}
              onChange={(e) => handleInputChange('restDay2to8hr', e.target.value)}
              onBlur={(e) => handleInputBlur('restDay2to8hr', e.target.value)}
              placeholder="例如: 5/3 或 1.667"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              超過8小時（{formatRateDisplay(formData.customRates.restDayOver8hr)}）
            </label>
            <input
              type="text"
              value={inputValues.restDayOver8hr}
              onChange={(e) => handleInputChange('restDayOver8hr', e.target.value)}
              onBlur={(e) => handleInputBlur('restDayOver8hr', e.target.value)}
              placeholder="例如: 8/3 或 2.667"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 假日出勤倍率 */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-red-500" />
          假日出勤倍率
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              國定假日/特休（{formatRateDisplay(formData.customRates.holidayRate)}）
            </label>
            <input
              type="text"
              value={inputValues.holidayRate}
              onChange={(e) => handleInputChange('holidayRate', e.target.value)}
              onBlur={(e) => handleInputBlur('holidayRate', e.target.value)}
              placeholder="例如: 2 或 2.000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              例假（{formatRateDisplay(formData.customRates.regularDayOffRate)}）
            </label>
            <input
              type="text"
              value={inputValues.regularDayOffRate}
              onChange={(e) => handleInputChange('regularDayOffRate', e.target.value)}
              onBlur={(e) => handleInputBlur('regularDayOffRate', e.target.value)}
              placeholder="例如: 2 或 2.000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 輸入格式說明 */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-1">
          <Info className="w-4 h-4" />
          輸入格式說明
        </h4>
        <div className="text-sm text-blue-700">
          <p>支援格式：分數 (4/3、5/3)、小數 (1.333、1.667) 或整數 (2、3)</p>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleResetAll}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          重置全部
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            套用設定
          </button>
        </div>
      </div>
    </form>
  );
};

export default SettingsForm;
