import { useState, useRef, useEffect } from 'react'
import { Edit, Check } from 'lucide-react'

type DateItem = {
  id: string
  weekday: string
  day: string
  dateValue: string // YYYY-MM-DD 格式，用於 date input
}

const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const dayFormatter = new Intl.DateTimeFormat('en-US', { day: '2-digit' })

const DateSelector = () => {
  // 初始化 3 個日期
  const getInitialDates = (): DateItem[] => {
    const today = new Date()
    return Array.from({ length: 3 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() + index)
      const dateValue = date.toISOString().slice(0, 10) // YYYY-MM-DD
      return {
        id: dateValue + '-' + index,
        weekday: weekdayFormatter.format(date),
        day: dayFormatter.format(date),
        dateValue,
      }
    })
  }

  const [dates, setDates] = useState<DateItem[]>(getInitialDates())
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isEditMode, setIsEditMode] = useState(false)
  const dateInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  const [weatherText, setWeatherText] = useState('')
  const [isLoadingWeather, setIsLoadingWeather] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  // 進入編輯模式時，抓取手機所在地天氣
  useEffect(() => {
    if (!isEditMode) return
    // 若已經有資料或錯誤，就不重複請求
    if (weatherText || weatherError || isLoadingWeather) return

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
              setWeatherText(`當前位置 ${rounded}°C`)
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
  }, [isEditMode, isLoadingWeather, weatherError, weatherText])

  // 新增日期卡片
  const handleAddDate = () => {
    const today = new Date()
    const dateValue = today.toISOString().slice(0, 10)
    const newDate: DateItem = {
      id: `new-${Date.now()}`,
      weekday: weekdayFormatter.format(today),
      day: dayFormatter.format(today),
      dateValue,
    }
    setDates([...dates, newDate])
    setSelectedIndex(dates.length) // 選中新加入的日期
  }

  // 刪除日期卡片
  const handleDeleteDate = (id: string, index: number) => {
    setDates(dates.filter((_, i) => i !== index))
    // 如果刪除的是選中的日期，調整選中索引
    if (index === selectedIndex) {
      setSelectedIndex(Math.max(0, selectedIndex - 1))
    } else if (index < selectedIndex) {
      setSelectedIndex(selectedIndex - 1)
    }
    // 清理 ref
    delete dateInputRefs.current[id]
  }

  // 處理日期選擇
  const handleDateChange = (id: string, dateValue: string) => {
    if (!dateValue) return

    const selectedDate = new Date(dateValue + 'T00:00:00')
    const weekday = weekdayFormatter.format(selectedDate)
    const day = dayFormatter.format(selectedDate)

    setDates(
      dates.map((item) =>
        item.id === id
          ? {
              ...item,
              dateValue,
              weekday,
              day,
            }
          : item
      )
    )
  }

  // 點擊卡片時的處理
  const handleCardClick = (id: string, index: number) => {
    setSelectedIndex(index)
    
    // 只有在編輯模式下才觸發日曆選擇器
    if (isEditMode) {
      const input = dateInputRefs.current[id]
      if (input) {
        input.showPicker?.() // 現代瀏覽器支援
        input.click() // 備用方案
      }
    }
  }

  return (
    <div className="relative">
      {/* 上方列：左側顯示天氣，右側為編輯模式按鈕 */}
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-1 text-[11px] text-[#8B5E3C]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#86A38E]" />
          {isLoadingWeather && <span>讀取當前位置天氣中...</span>}
          {!isLoadingWeather && weatherText && <span>{weatherText}</span>}
          {!isLoadingWeather && !weatherText && weatherError && (
            <span className="text-gray-400">{weatherError}</span>
          )}
          {!isLoadingWeather && !weatherText && !weatherError && (
            <span className="text-gray-400">進入編輯後會顯示當前位置天氣</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsEditMode(!isEditMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95 ${
            isEditMode
              ? 'bg-[#86A38E] text-white shadow-sm'
              : 'bg-white text-[#86A38E] border border-[#86A38E] hover:bg-[#86A38E] hover:text-white'
          }`}
          aria-label={isEditMode ? '完成編輯' : '編輯日期'}
        >
          {isEditMode ? (
            <>
              <Check size={16} />
              <span>完成</span>
            </>
          ) : (
            <>
              <Edit size={16} />
              <span>編輯</span>
            </>
          )}
        </button>
      </div>

      <div className="flex overflow-x-auto gap-3 px-1 pb-4 -mx-1 pt-2 pr-2">
        {dates.map((item, index) => {
          const isSelected = index === selectedIndex

          return (
            <div
              key={item.id}
              className="relative flex-shrink-0 group"
            >
              {/* 刪除按鈕 - 編輯模式下顯示，非編輯模式下 hover 顯示 */}
              {isEditMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteDate(item.id, index)
                  }}
                  className="absolute top-0 right-0 w-5 h-5 rounded-full bg-red-400 text-white text-xs font-bold opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500 z-10 shadow-sm"
                  aria-label="刪除日期"
                >
                  ×
                </button>
              )}
              {!isEditMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteDate(item.id, index)
                  }}
                  className="absolute top-0 right-0 w-5 h-5 rounded-full bg-red-400 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500 z-10 shadow-sm"
                  aria-label="刪除日期"
                >
                  ×
                </button>
              )}

              {/* 隱藏的日期輸入框 */}
              <input
                ref={(el) => {
                  dateInputRefs.current[item.id] = el
                }}
                type="date"
                value={item.dateValue}
                onChange={(e) => handleDateChange(item.id, e.target.value)}
                className="absolute opacity-0 pointer-events-none w-0 h-0"
                aria-label="選擇日期"
              />

              {/* 日期卡片 */}
              <div
                className={`relative flex-shrink-0 w-16 rounded-2xl border px-3 py-2 text-center transition-all ${
                  isEditMode
                    ? 'cursor-pointer'
                    : 'cursor-default'
                } ${
                  isSelected
                    ? 'bg-[#86A38E] text-white border-transparent shadow-sm scale-105'
                    : 'bg-transparent text-[#8B5E3C] border-[#E0D5D3] hover:border-[#86A38E] hover:shadow-sm'
                }`}
                onClick={() => handleCardClick(item.id, index)}
              >
                {/* 星期文字 */}
                <div className="text-xs font-medium">{item.weekday}</div>

                {/* 日期數字 */}
                <div className="mt-1 text-lg font-semibold">{item.day}</div>
              </div>
            </div>
          )
        })}

        {/* 新增按鈕 - 只在編輯模式下顯示 */}
        {isEditMode && (
          <button
            type="button"
            onClick={handleAddDate}
            className="flex-shrink-0 w-16 h-16 rounded-2xl border-2 border-dashed border-[#86A38E] text-[#86A38E] flex items-center justify-center text-2xl font-light hover:bg-[#86A38E] hover:text-white transition-colors"
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
