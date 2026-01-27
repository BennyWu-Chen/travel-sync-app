import { useState, useRef, useEffect } from 'react'
import { Edit, Check } from 'lucide-react'
import React from 'react'

type DateItem = {
  id: string
  weekday: string
  day: string
  dateValue: string
}

const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const dayFormatter = new Intl.DateTimeFormat('en-US', { day: '2-digit' })

// 1. 修正 Props 名稱，讓 App.tsx 可以指派 onSelectDay
export type DateSelectorProps = {
  selectedDay: number;
  onSelectDay: (day: number) => void; 
}

const DateSelector: React.FC<DateSelectorProps> = ({ selectedDay, onSelectDay }) => {
  // 2. 讓日期可以根據記憶體或預設值顯示
  const getInitialDates = (): DateItem[] => {
    // 這裡設定你的旅程起點，例如 2026-01-30
    const baseDate = new Date('2026-01-30')
    return Array.from({ length: 3 }, (_, index) => {
      const date = new Date(baseDate)
      date.setDate(baseDate.getDate() + index)
      const dateValue = date.toISOString().slice(0, 10)
      return {
        id: dateValue + '-' + index,
        weekday: weekdayFormatter.format(date),
        day: dayFormatter.format(date),
        dateValue,
      }
    })
  }

  const [dates, setDates] = useState<DateItem[]>(getInitialDates())
  const [isEditMode, setIsEditMode] = useState(false)
  const dateInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // 處理點擊卡片
  const handleCardClick = (index: number) => {
    onSelectDay(index + 1); // 觸發父組件更新並存入 LocalStorage
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="text-[11px] text-[#8B5E3C]">旅程日期</div>
        <button 
          onClick={() => setIsEditMode(!isEditMode)}
          className="text-xs text-[#86A38E] border border-[#86A38E] px-2 py-1 rounded"
        >
          {isEditMode ? '完成' : '編輯'}
        </button>
      </div>

      <div className="flex overflow-x-auto gap-3 pb-2">
        {dates.map((item, index) => (
          <div
            key={item.id}
            onClick={() => handleCardClick(index)}
            className={`flex-shrink-0 w-16 rounded-2xl border px-3 py-2 text-center transition-all cursor-pointer ${
              selectedDay === index + 1 // 3. 根據 selectedDay 判斷選中狀態
                ? 'bg-[#86A38E] text-white border-transparent scale-105'
                : 'bg-white text-[#8B5E3C] border-[#E0D5D3]'
            }`}
          >
            <div className="text-xs font-medium">{item.weekday}</div>
            <div className="mt-1 text-lg font-semibold">{item.day}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DateSelector