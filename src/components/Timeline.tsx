import { MapPin, Utensils, Camera, ShoppingBag, Navigation, Copy, X } from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'

export type TimelineItemType = 'food' | 'attraction' | 'shopping' | 'other'

export type TimelineItem = {
  id: string;
  time: string; // 如 "10:00"
  iconName: string; // 用於 Firestore 儲存的圖標名稱
  title: string; // 如 "築地市場"
  category: TimelineItemType;
  address?: string; // 地址或店名，用於 Google Maps 導航
  thaiName?: string; // 泰文名稱，方便泰國司機辨識
  notes?: string; // 備註
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
export type TimelineProps = {
  items: (TimelineItem & { icon: React.ReactNode })[]; // 從 App.tsx 傳入的 item 會帶有 icon (ReactNode)
  onItemClick?: (item: Omit<TimelineItem, 'icon' | 'thaiName'>) => void; // 點擊時不需要 icon 和 thaiName
  onAddClick?: () => void;
  onNavigate?: (item: Omit<TimelineItem, 'icon' | 'thaiName'>) => void; // 導航時不需要 icon 和 thaiName
  onCopyAddress?: (text: string) => void; // 新增複製地址的 prop
  onDelete?: (item: Omit<TimelineItem, 'icon' | 'thaiName'>) => void; // 刪除行程
  targetLang?: 'th' | 'en' | 'ja' | 'ko'; // 目標語言
  translateText?: (text: string, lang: 'th' | 'en' | 'ja' | 'ko') => Promise<string>; // 翻譯函數
}

// 重新導出 TimelineItem 類型，確保與 App.tsx 兼容
export type { TimelineItem }

const Timeline = ({ items, onItemClick, onAddClick, onNavigate, onCopyAddress, onDelete, targetLang, translateText }: TimelineProps) => {
  // 翻譯狀態管理
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loadingTranslations, setLoadingTranslations] = useState<Set<string>>(new Set());
  const translationCacheRef = useRef<Record<string, string>>({});

  // 當 targetLang 或 items 改變時，重新翻譯
  useEffect(() => {
    if (!targetLang || !translateText) return;

    const translateItems = async () => {
      const newTranslations: Record<string, string> = {};
      const loadingSet = new Set<string>();

      for (const item of items) {
        const cacheKey = `${item.title}_${targetLang}`;
        
        // 檢查 cache（使用 ref 避免依賴問題）
        if (translationCacheRef.current[cacheKey]) {
          newTranslations[cacheKey] = translationCacheRef.current[cacheKey];
          continue;
        }

        // 標記為載入中
        loadingSet.add(item.id);
        setLoadingTranslations(new Set(loadingSet));

        try {
          const translated = await translateText(item.title, targetLang);
          newTranslations[cacheKey] = translated;
          // 存入 cache ref
          translationCacheRef.current[cacheKey] = translated;
        } catch (error) {
          console.error('Translation error:', error);
          newTranslations[cacheKey] = item.title; // 失敗時使用原文
          translationCacheRef.current[cacheKey] = item.title;
        }

        loadingSet.delete(item.id);
        setLoadingTranslations(new Set(loadingSet));
      }

      setTranslations(prev => ({ ...prev, ...newTranslations }));
    };

    translateItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLang, items.map(i => `${i.id}_${i.title}`).join(',')]);

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
                  className={`relative bg-white rounded-xl p-4 shadow-[4px_4px_0px_#E0E5D5] ${
                    onItemClick ? 'cursor-pointer hover:shadow-[6px_6px_0px_#E0E5D5] transition-shadow active:scale-95' : ''
                  }`}
                  onClick={() => onItemClick?.(item)}
                >
                  {/* 標題與圖標 */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-[#86A38E] flex-shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* 原始中文標題（第一行） */}
                      <h3
                        className={`text-base font-semibold text-gray-800 truncate ${
                          onNavigate ? 'cursor-pointer' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onNavigate?.(item)
                        }}
                      >
                        {item.title}
                      </h3>
                      {/* 翻譯標題（第二行，墨綠色） */}
                      {targetLang && translateText && (
                        <div className="text-sm text-[#2d5016] mt-0.5 truncate">
                          {loadingTranslations.has(item.id) ? (
                            <span className="text-gray-400 italic">翻譯中...</span>
                          ) : (
                            translations[`${item.title}_${targetLang}`] || item.title
                          )}
                        </div>
                      )}
                    </div>
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
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${categoryColor}`}
                    >
                      {categoryLabel}
                    </span>
                  </div>

                  {/* 地址 */}
                  {item.address && (
                    <div className="text-xs text-gray-600 mb-1">
                      {item.address}
                    </div>
                  )}

                  {/* 備註 */}
                  {item.notes && (
                    <div className="mt-1 pl-2 border-l border-gray-200 text-xs text-gray-500 whitespace-pre-line">
                      {item.notes}
                    </div>
                  )}
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
