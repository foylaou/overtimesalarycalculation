import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// 定義勞基法費率的介面
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

// 定義整個 store 的狀態和行為
interface RatesState {
  customRates: LaborStandardRates;
  useCeilingCalculation: boolean;
  setCustomRates: (key: keyof LaborStandardRates, value: number) => void;
  setUseCeilingCalculation: (value: boolean) => void;
  resetCustomRates: () => void;
  resetAllSettings: () => void;
}

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

// 建立 Zustand Store 並啟用持久化
export const useRateStore = create<RatesState>()(
  persist(
    (set) => ({
      // 初始狀態
      customRates: DEFAULT_RATES,
      useCeilingCalculation: true,

      // 更新費率的動作
      setCustomRates: (key, value) => set((state) => ({
        customRates: {
          ...state.customRates,
          [key]: value,
        }
      })),

      // 更新計算方式的動作
      setUseCeilingCalculation: (value) => set({ useCeilingCalculation: value }),

      // 重置為預設費率的動作
      resetCustomRates: () => set({ customRates: DEFAULT_RATES }),

      // 重置所有設定的動作
      resetAllSettings: () => set({
        customRates: DEFAULT_RATES,
        useCeilingCalculation: true
      }),
    }),
    {
      name: "salary-calculator-settings", // localStorage 的 key 名稱
      storage: createJSONStorage(() => localStorage), // 使用 localStorage

      // 選擇性地只持久化某些欄位
      partialize: (state) => ({
        customRates: state.customRates,
        useCeilingCalculation: state.useCeilingCalculation,
      }),

      // 版本控制（如果未來需要遷移資料結構）
      version: 1,

      // 資料遷移函數（當版本升級時使用）
      migrate: (persistedState: unknown, version: number) => {
        // 型別安全的版本遷移
        if (version === 0 && persistedState && typeof persistedState === 'object') {
          const state = persistedState as Partial<RatesState>;
          return {
            customRates: state.customRates || DEFAULT_RATES,
            useCeilingCalculation: state.useCeilingCalculation ?? true,
          };
        }
        return persistedState as RatesState;
      },
    }
  )
);

// 匯出預設費率供其他地方使用
export { DEFAULT_RATES };
export type { LaborStandardRates };
