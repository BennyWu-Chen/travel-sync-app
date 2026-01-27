import { useState, useRef, useEffect } from 'react'
import { Edit, X } from 'lucide-react'
import React from 'react'
import { db } from '../api/firebase'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'

type DateItem = {
  id: string
  weekday: string
  day: string
  dateValue: string
  dayNumber: number // 第幾天（1, 2, 3...）
}

const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const dayFormatter = new Intl.DateTimeFormat('en-US', { day: '2-digit' })

export type DateSelectorProps = {
  selectedDay: number;
  onSelectDay: (day: number) => void;
  startDate: string;
  onUpdateStartDate: (newDate: string) => Promise<void>;
}

const DateSelector: React.FC<DateSelectorProps> = ({ selectedDay, onSelectDay, startDate, onUpdateStartDate }) => {
  // 驗證並初始化 baseDateStr，確保格式正確
  const getValidDate = (dateStr: string): string => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // 如果格式不正確，嘗試從 localStorage 讀取
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('trip_start_date');
        if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
          return saved;
        }
      }
      // 如果都沒有，使用今天的日期
      const today = new Date();
      return today.toISOString().slice(0, 10);
    }
    return dateStr;
  };

  const [baseDateStr, setBaseDateStr] = useState(() => getValidDate(startDate))
  const [isEditMode, setIsEditMode] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [dates, setDates] = useState<DateItem[]>([])
  const [weatherText, setWeatherText] = useState('')
  const [isLoadingWeather, setIsLoadingWeather] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const dateInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // A. 當 props 的 startDate 改變時，更新本地狀態（但不重新計算日期列表，除非列表為空）
  useEffect(() => {
    const validDate = getValidDate(startDate);
    if (validDate !== baseDateStr) {
      setBaseDateStr(validDate);
      // 只有在沒有日期列表時才重新計算
      if (dates.length === 0) {
        updateDatesList(validDate, false);
      }
    }
  }, [startDate]);

  // B. 監聽 Firebase 中的起點日期和日期列表
  useEffect(() => {
    if (!db) {
      // 如果沒有 db，從 localStorage 讀取日期列表
      if (typeof window !== 'undefined') {
        const savedDates = localStorage.getItem('trip_dates');
        if (savedDates) {
          try {
            const parsedDates = JSON.parse(savedDates);
            if (Array.isArray(parsedDates) && parsedDates.length > 0) {
              setDates(parsedDates);
              return;
            }
          } catch (e) {
            console.error('Error parsing saved dates:', e);
          }
        }
      }
      // 如果沒有保存的日期，根據 startDate 計算
      if (baseDateStr && /^\d{4}-\d{2}-\d{2}$/.test(baseDateStr)) {
        updateDatesList(baseDateStr);
      }
      return;
    }
    
    const unsubscribe = onSnapshot(doc(db, 'config', 'trip_settings'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // 優先讀取保存的日期列表
        if (data.dates && Array.isArray(data.dates) && data.dates.length > 0) {
          // 驗證日期格式
          const validDates = data.dates.filter((d: any) => 
            d && d.dateValue && /^\d{4}-\d{2}-\d{2}$/.test(d.dateValue)
          );
          if (validDates.length > 0) {
            setDates(validDates);
            // 同時更新 baseDateStr 為第一個日期
            if (validDates[0].dateValue) {
              setBaseDateStr(validDates[0].dateValue);
            }
            // 保存到 localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('trip_dates', JSON.stringify(validDates));
            }
            return;
          }
        }
        
        // 如果沒有保存的日期列表，使用 startDate 計算（僅在 dates 為空時）
        if (dates.length === 0 && data.startDate) {
          const newStartDate = data.startDate;
          // 驗證日期格式
          if (/^\d{4}-\d{2}-\d{2}$/.test(newStartDate)) {
            setBaseDateStr(newStartDate);
            // 重新計算日期列表並保存
            updateDatesList(newStartDate, true);
          } else {
            console.error('Invalid date format from Firebase:', newStartDate);
          }
        } else if (data.startDate) {
          // 如果有日期列表，只更新 baseDateStr（不重新計算）
          const newStartDate = data.startDate;
          if (/^\d{4}-\d{2}-\d{2}$/.test(newStartDate)) {
            setBaseDateStr(newStartDate);
          }
        }
      }
    }, (err) => {
      console.error("DateSelector Firebase onSnapshot Error: ", err);
      // 錯誤時使用 localStorage 備援
      if (typeof window !== 'undefined') {
        const savedDates = localStorage.getItem('trip_dates');
        if (savedDates) {
          try {
            const parsedDates = JSON.parse(savedDates);
            if (Array.isArray(parsedDates) && parsedDates.length > 0) {
              setDates(parsedDates);
            }
          } catch (e) {
            console.error('Error parsing saved dates:', e);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // C. 根據 baseDateStr 計算日期項目（僅在沒有保存的日期列表時使用）
  const updateDatesList = (startDateStr: string, shouldSave: boolean = false) => {
    // 驗證日期格式
    if (!startDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(startDateStr)) {
      console.error('Invalid date format in updateDatesList:', startDateStr);
      return;
    }

    try {
      const newDates: DateItem[] = Array.from({ length: 3 }, (_, index) => {
        const date = new Date(startDateStr + 'T00:00:00');
        // 檢查日期是否有效
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date: ${startDateStr}`);
        }
        date.setDate(date.getDate() + index);
        const dateValue = date.toISOString().slice(0, 10);
        return {
          id: `date-${index}`,
          weekday: weekdayFormatter.format(date),
          day: dayFormatter.format(date),
          dateValue,
          dayNumber: index + 1,
        };
      });
      setDates(newDates);
      
      // 如果需要保存（例如初始載入時），保存到 Firebase
      if (shouldSave) {
        saveDatesToFirebase(newDates);
      }
    } catch (error) {
      console.error('Error updating dates list:', error);
      // 如果出錯，使用今天的日期作為備援
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const fallbackDates: DateItem[] = Array.from({ length: 3 }, (_, index) => {
        const date = new Date(todayStr + 'T00:00:00');
        date.setDate(date.getDate() + index);
        return {
          id: `date-${index}`,
          weekday: weekdayFormatter.format(date),
          day: dayFormatter.format(date),
          dateValue: date.toISOString().slice(0, 10),
          dayNumber: index + 1,
        };
      });
      setDates(fallbackDates);
      if (shouldSave) {
        saveDatesToFirebase(fallbackDates);
      }
    }
  };

  // 初始化日期列表（只在沒有從 Firebase 載入日期時執行）
  useEffect(() => {
    // 如果 dates 已經有資料（從 Firebase 載入），就不需要重新計算
    if (dates.length > 0) {
      return;
    }
    
    // 如果沒有日期，根據 baseDateStr 計算（但不保存，因為 Firebase 監聽器會處理）
    if (baseDateStr && /^\d{4}-\d{2}-\d{2}$/.test(baseDateStr)) {
      updateDatesList(baseDateStr, false);
    }
  }, []);

  // 獲取天氣資訊
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setWeatherError('無法取得定位')
      return
    }

    setIsLoadingWeather(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords

        ;(async () => {
          try {
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
            )
            const data = await res.json()
            const temp = data?.current_weather?.temperature

            if (typeof temp === 'number') {
              const rounded = Math.round(temp)
              setWeatherText(`${rounded}°C`)
            } else {
              setWeatherError('無法取得天氣')
            }
          } catch (_error) {
            setWeatherError('無法取得天氣')
          } finally {
            setIsLoadingWeather(false)
          }
        })()
      },
      () => {
        setWeatherError('無法取得定位')
        setIsLoadingWeather(false)
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
      }
    )
  }, [])

  // D. 當使用者點擊日曆選擇日期後，回傳至 Firebase（全局起點日期）
  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      console.error('Invalid date format:', newDate);
      return;
    }
    
    setBaseDateStr(newDate);
    updateDatesList(newDate);
    
    try {
      await onUpdateStartDate(newDate);
    } catch (err) {
      console.error("更新資料庫失敗", err);
    }
    setIsEditMode(false);
  };

  // F. 保存日期列表到 Firebase 和 localStorage
  const saveDatesToFirebase = async (datesToSave: DateItem[]) => {
    // 先保存到 localStorage（立即生效）
    if (typeof window !== 'undefined') {
      localStorage.setItem('trip_dates', JSON.stringify(datesToSave));
    }
    
    // 然後同步到 Firebase
    if (!db) return;
    try {
      await setDoc(doc(db, 'config', 'trip_settings'), {
        dates: datesToSave,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("保存日期列表失敗", err);
    }
  };

  // G. 編輯單個日期卡片
  const handleEditDateItem = async (itemId: string, newDateValue: string) => {
    if (!newDateValue || !/^\d{4}-\d{2}-\d{2}$/.test(newDateValue)) {
      console.error('Invalid date format:', newDateValue);
      return;
    }
    
    try {
      const date = new Date(newDateValue + 'T00:00:00');
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${newDateValue}`);
      }
      
      const updatedDates = dates.map(d => {
        if (d.id === itemId) {
          return {
            ...d,
            weekday: weekdayFormatter.format(date),
            day: dayFormatter.format(date),
            dateValue: newDateValue,
          };
        }
        return d;
      });
      
      setDates(updatedDates);
      // 保存到 Firebase
      await saveDatesToFirebase(updatedDates);
    } catch (error) {
      console.error('Error editing date item:', error);
    }
  };

  // D. 刪除日期卡片
  const handleDeleteDate = async (dayNumber: number) => {
    if (dates.length <= 1) {
      alert("至少需要保留一個日期");
      return;
    }
    
    const newDates = dates.filter(d => d.dayNumber !== dayNumber);
    // 重新編號
    const renumberedDates = newDates.map((d, index) => ({
      ...d,
      dayNumber: index + 1,
      id: `date-${index}`
    }));
    setDates(renumberedDates);
    
    // 保存到 Firebase
    await saveDatesToFirebase(renumberedDates);
    
    // 如果刪除的是選中的日期，自動選中第一個
    if (selectedDay === dayNumber) {
      onSelectDay(1);
    } else if (selectedDay > dayNumber) {
      // 如果選中的日期在刪除的日期之後，需要調整選中索引
      onSelectDay(selectedDay - 1);
    }
  };

  // E. 新增日期卡片
  const handleAddDate = async () => {
    let newDates: DateItem[];
    
    if (dates.length === 0) {
      // 如果沒有日期，從 baseDateStr 開始
      const date = new Date(baseDateStr + 'T00:00:00');
      const dateValue = date.toISOString().slice(0, 10);
      newDates = [{
        id: 'date-0',
        weekday: weekdayFormatter.format(date),
        day: dayFormatter.format(date),
        dateValue,
        dayNumber: 1,
      }];
    } else {
      // 找到最後一個日期，加一天
      const lastDate = dates[dates.length - 1];
      const nextDate = new Date(lastDate.dateValue + 'T00:00:00');
      nextDate.setDate(nextDate.getDate() + 1);
      const dateValue = nextDate.toISOString().slice(0, 10);
      
      const newDate: DateItem = {
        id: `date-${dates.length}`,
        weekday: weekdayFormatter.format(nextDate),
        day: dayFormatter.format(nextDate),
        dateValue,
        dayNumber: dates.length + 1,
      };
      
      newDates = [...dates, newDate];
    }
    
    setDates(newDates);
    // 保存到 Firebase
    await saveDatesToFirebase(newDates);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2 px-2">
        {/* 天氣顯示 */}
        <div className="flex items-center gap-1.5 text-[11px] text-[#8B5E3C] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#86A38E]" />
          {isLoadingWeather && <span>讀取天氣中...</span>}
          {!isLoadingWeather && weatherText && <span>{weatherText}</span>}
          {!isLoadingWeather && !weatherText && weatherError && (
            <span className="text-gray-400">{weatherError}</span>
          )}
          {!isLoadingWeather && !weatherText && !weatherError && (
            <span className="text-gray-400">載入天氣中...</span>
          )}
        </div>
        
        {/* 編輯按鈕：點擊後觸發隱藏的日曆輸入框 */}
        <button 
          onClick={() => {
            setIsEditMode(!isEditMode);
            if (!isEditMode && dateInputRef.current) {
              dateInputRef.current.showPicker?.();
            }
          }}
          className="flex items-center gap-1 text-xs text-[#86A38E] border border-[#86A38E] px-2 py-1 rounded-lg bg-white active:scale-95 transition-all"
        >
          <Edit size={12} />
          <span>{isEditMode ? '完成' : '編輯日期'}</span>
        </button>
      </div>

      {/* 隱藏的 HTML5 日曆輸入框 */}
      <input 
        ref={dateInputRef}
        type="date" 
        value={baseDateStr}
        className="absolute opacity-0 pointer-events-none" 
        onChange={handleDateChange}
      />

      <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
        {dates.map((item) => (
          <div
            key={item.id}
            className="relative flex-shrink-0 group"
          >
            {/* 刪除按鈕 - 編輯模式下顯示 */}
            {isEditMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDate(item.dayNumber);
                }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-400 text-white text-xs font-bold flex items-center justify-center hover:bg-red-500 z-10 shadow-sm active:scale-95"
                aria-label="刪除日期"
              >
                <X size={12} />
              </button>
            )}
            
            {/* 隱藏的日期輸入框（每個卡片一個） */}
            <input
              ref={(el) => {
                dateInputRefs.current[item.id] = el;
              }}
              type="date"
              value={item.dateValue}
              onChange={(e) => {
                e.stopPropagation();
                handleEditDateItem(item.id, e.target.value);
              }}
              className="absolute opacity-0 pointer-events-none"
              style={{ position: 'absolute', width: 0, height: 0 }}
            />
            
            <div
              onClick={(e) => {
                if (isEditMode) {
                  // 編輯模式下，點擊卡片觸發日期選擇器
                  e.stopPropagation();
                  dateInputRefs.current[item.id]?.showPicker?.();
                } else {
                  // 非編輯模式下，選擇日期
                  onSelectDay(item.dayNumber);
                }
              }}
              className={`flex-shrink-0 w-16 rounded-2xl border px-3 py-2 text-center transition-all cursor-pointer ${
                selectedDay === item.dayNumber
                  ? 'bg-[#86A38E] text-white border-transparent shadow-md scale-105'
                  : 'bg-white text-[#8B5E3C] border-[#E0D5D3] opacity-70 hover:opacity-100'
              } ${isEditMode ? 'ring-2 ring-[#86A38E] ring-opacity-50' : ''}`}
            >
              <div className="text-[10px] font-medium uppercase">{item.weekday}</div>
              <div className="mt-1 text-lg font-bold">{item.day}</div>
            </div>
          </div>
        ))}
        
        {/* 新增日期按鈕 - 編輯模式下顯示 */}
        {isEditMode && (
          <button
            onClick={handleAddDate}
            className="flex-shrink-0 w-16 h-16 rounded-2xl border-2 border-dashed border-[#86A38E] text-[#86A38E] flex items-center justify-center text-2xl font-light hover:bg-[#86A38E] hover:text-white transition-colors active:scale-95"
            aria-label="新增日期"
          >
            ＋
          </button>
        )}
      </div>
    </div>
  )
}

export default DateSelector