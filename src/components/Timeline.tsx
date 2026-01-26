import { MapPin, Utensils, Camera, ShoppingBag, Navigation, Copy } from 'lucide-react'
import React from 'react'

export type TimelineItemType = 'food' | 'attraction' | 'shopping' | 'other'

export type TimelineItem = {
  id: string;
  time: string; // 如 "10:00"
  iconName: string; // 用於 Firestore 儲存的圖標名稱
  title: string; // 如 "築地市場"
  category: TimelineItemType;
  address?: string; // 地址或店名，用於 Google Maps 導航
  thaiName?: string; // 泰文名稱，方便泰國司機辨識
}

// 分類顏色映射 (仍保留，因為用於渲染標籤)
const categoryColors: Record<TimelineItemType, string> = {
  food: 'bg-orange-100 text-orange-700', // 淡橘色
  attraction: 'bg-blue-100 text-blue-700', // 淡藍色
  shopping: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-700',
}

// 分類標籤文字 (仍保留)
const categoryLabels: Record<TimelineItemType, string> = {
  food: '美食',
  attraction: '景點',
  shopping: '購物',
  other: '其他',
}

// 定義傳入 Timeline 的 props
type TimelineProps = {
  items: (TimelineItem & { icon: React.ReactNode })[]; // 從 App.tsx 傳入的 item 會帶有 icon (ReactNode)
  onItemClick?: (item: Omit<TimelineItem, 'icon' | 'thaiName'>) => void; // 點擊時不需要 icon 和 thaiName
  onAddClick?: () => void;
  onNavigate?: (item: Omit<TimelineItem, 'icon' | 'thaiName'>) => void; // 導航時不需要 icon 和 thaiName
  onCopyAddress?: (text: string) => void; // 新增複製地址的 prop
}

const Timeline = ({ items, onItemClick, onAddClick, onNavigate, onCopyAddress }: TimelineProps) => {
  return (
    <div className="relative px-4">
      {/* 時間軸虛線 */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-[#E0E5D5]"></div>

      <div className="space-y-4">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const categoryColor = categoryColors[item.category]
          const categoryLabel = categoryLabels[item.category]

          return (
            <div key={item.id} className="relative flex items-start gap-4">
              {/* 時間軸圓點 */}
              <div className="relative z-10 flex-shrink-0">
                <div className="w-4 h-4 rounded-full bg-[#86A38E] border-2 border-white shadow-sm"></div>
              </div>

              {/* 時間標籤 */}
              <div className="flex-shrink-0 w-12 text-right pt-0.5">
                <span className="text-sm font-semibold text-[#8B5E3C]">{item.time}</span>
              </div>

              {/* 卡片內容 */}
              <div className="flex-1 min-w-0">
                <div
                  className={`bg-white rounded-xl p-4 shadow-[4px_4px_0px_#E0E5D5] ${
                    onItemClick ? 'cursor-pointer hover:shadow-[6px_6px_0px_#E0E5D5] transition-shadow active:scale-95' : ''
                  }`}
                  onClick={() => onItemClick?.(item)}
                >
                  {/* 標題與圖標 */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-[#86A38E] flex-shrink-0">
                      {item.icon}
                    </div>
                    <h3
                      className={`text-base font-semibold text-gray-800 flex-1 truncate ${
                        onNavigate ? 'cursor-pointer' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onNavigate?.(item)
                      }}
                    >
                      {item.title}
                    </h3>
                    {/* 導航與複製按鈕群組 */}
                    <div className="flex items-center gap-2">
                      {onCopyAddress && (item.address || item.thaiName || item.title) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const textToCopy = item.thaiName || item.address || item.title || '';
                            onCopyAddress(textToCopy)
                          }}
                          className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 transition-colors active:scale-95 shadow-sm"
                          aria-label="複製地址"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                      {onNavigate && (item.address || item.thaiName || item.title) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onNavigate(item)
                          }}
                          className="flex-shrink-0 w-8 h-8 rounded-full bg-[#86A38E] flex items-center justify-center text-white hover:bg-[#7a9382] transition-colors active:scale-95 shadow-sm"
                          aria-label="開啟導航"
                        >
                          <Navigation size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 分類標記 */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${categoryColor}`}
                    >
                      {categoryLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* 新增行程按鈕 */}
        {onAddClick && (
          <div className="relative flex items-start gap-4">
            {/* 時間軸圓點 */}
            <div className="relative z-10 flex-shrink-0">
              <div className="w-4 h-4 rounded-full bg-[#86A38E] border-2 border-white shadow-sm"></div>
            </div>

            {/* 時間標籤（空白） */}
            <div className="flex-shrink-0 w-12"></div>

            {/* 新增按鈕卡片 */}
            <div className="flex-1 min-w-0">
              <button
                type="button"
                onClick={onAddClick}
                className="w-full bg-white rounded-xl p-4 border-2 border-dashed border-[#86A38E] text-[#86A38E] hover:bg-[#86A38E] hover:text-white transition-colors shadow-[4px_4px_0px_#E0E5D5] active:scale-95"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl font-light">＋</span>
                  <span className="text-sm font-medium">新增行程</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Timeline
