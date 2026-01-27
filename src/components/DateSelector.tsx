import { useState, useRef, useEffect } from 'react'
import { Edit, X } from 'lucide-react'
import React from 'react'
import { db } from '../api/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'

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
  const [baseDateStr, setBaseDateStr] = useState(startDate)
  const [isEditMode, setIsEditMode] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [dates, setDates] = useState<DateItem[]>([])
  const [weatherText, setWeatherText] = useState('')
  const [isLoadingWeather, setIsLoadingWeather] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  // A. 監聽 Firebase 中的起點日期
  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(doc(db, 'config', 'trip_settings'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().startDate) {
        const newStartDate = docSnap.data().startDate;
        setBaseDateStr(newStartDate);
        // 重新計算日期列表
        updateDatesList(newStartDate);
      }
    });
    return () => unsubscribe();
  }, []);

  // B. 根據 baseDateStr 計算日期項目（初始化和更新）
  const updateDatesList = (startDateStr: string) => {
    const newDates: DateItem[] = Array.from({ length: 3 }, (_, index) => {
      const date = new Date(startDateStr + 'T00:00:00')
      date.setDate(date.getDate() + index)
      const dateValue = date.toISOString().slice(0, 10)
      return {
        id: `date-${index}`,
        weekday: weekdayFormatter.format(date),
        day: dayFormatter.format(date),
        dateValue,
        dayNumber: index + 1,
      }
    });
    setDates(newDates);
  };

  // 初始化日期列表
  useEffect(() => {
    updateDatesList(baseDateStr);
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

  // C. 當使用者點擊日曆選擇日期後，回傳至 Firebase
  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (!newDate || !db) return;
    
    setBaseDateStr(newDate);
    updateDatesList(newDate);
    
    try {
      await onUpdateStartDate(newDate);
    } catch (err) {
      console.error("更新資料庫失敗", err);
    }
    setIsEditMode(false);
  };

  // D. 刪除日期卡片
  const handleDeleteDate = (dayNumber: number) => {
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
    
    // 如果刪除的是選中的日期，自動選中第一個
    if (selectedDay === dayNumber) {
      onSelectDay(1);
    } else if (selectedDay > dayNumber) {
      // 如果選中的日期在刪除的日期之後，需要調整選中索引
      onSelectDay(selectedDay - 1);
    }
  };

  // E. 新增日期卡片
  const handleAddDate = () => {
    if (dates.length === 0) {
      // 如果沒有日期，從 baseDateStr 開始
      const date = new Date(baseDateStr + 'T00:00:00');
      const dateValue = date.toISOString().slice(0, 10);
      setDates([{
        id: 'date-0',
        weekday: weekdayFormatter.format(date),
        day: dayFormatter.format(date),
        dateValue,
        dayNumber: 1,
      }]);
      return;
    }
    
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
    
    setDates([...dates, newDate]);
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
            
            <div
              onClick={() => onSelectDay(item.dayNumber)}
              className={`flex-shrink-0 w-16 rounded-2xl border px-3 py-2 text-center transition-all cursor-pointer ${
                selectedDay === item.dayNumber
                  ? 'bg-[#86A38E] text-white border-transparent shadow-md scale-105'
                  : 'bg-white text-[#8B5E3C] border-[#E0D5D3] opacity-70 hover:opacity-100'
              }`}
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