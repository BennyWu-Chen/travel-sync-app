import { useState, useEffect } from 'react'
import { X, XCircle, Trash2 } from 'lucide-react'
import { type TimelineItemType } from './Timeline'
import React from 'react'

export type TimelineItemModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { time: string; title: string; category: TimelineItemType; address?: string; thaiName?: string }) => void
  onDelete?: () => void // 新增刪除回調
  initialData?: {
    time: string
    title: string
    category: TimelineItemType
    address?: string
    thaiName?: string
  }
}

const TimelineItemModal: React.FC<TimelineItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData,
}) => {
  const [time, setTime] = useState(initialData?.time || '10:00')
  const [title, setTitle] = useState(initialData?.title || '')
  const [address, setAddress] = useState(initialData?.address || '')
  const [thaiName, setThaiName] = useState(initialData?.thaiName || '') // 新增泰文名稱狀態
  const [category, setCategory] = useState<TimelineItemType>(
    initialData?.category || 'attraction'
  )

  // 當 initialData 改變時更新表單
  useEffect(() => {
    if (initialData) {
      setTime(initialData.time)
      setTitle(initialData.title)
      setAddress(initialData.address || '')
      setThaiName(initialData.thaiName || '') // 更新泰文名稱狀態
      setCategory(initialData.category)
    } else {
      setTime('10:00')
      setTitle('')
      setAddress('')
      setThaiName('') // 清空泰文名稱狀態
      setCategory('attraction')
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({ time, title: title.trim(), category, address: address.trim() || undefined, thaiName: thaiName.trim() || undefined })
    onClose()
  }

  const categoryOptions: { value: TimelineItemType; label: string }[] = [
    { value: 'attraction', label: '景點' },
    { value: 'food', label: '美食' },
    { value: 'shopping', label: '購物' },
    { value: 'other', label: '其他' },
  ]

  return (
    <>
      {/* 半透明背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Modal 卡片 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-[4px_4px_0px_#E0E5D5] pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 標題列 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#86A38E]">
              {initialData ? '編輯行程' : '新增行程'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
              aria-label="關閉"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* 表單 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 時間選擇器 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                時間
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                required
              />
            </div>

            {/* 地點輸入框 */}
            <div>
              <label className="block text-base font-semibold text-[#86A38E] mb-2">
                地點
              </label>
              <p className="text-xs text-gray-500 mb-3">
                可輸入名稱、地址或貼上 Google Maps 連結
              </p>
              <div className="relative">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：築地市場 或 https://maps.google.com/..."
                  className="w-full px-4 py-3 pr-10 border-2 border-[#86A38E] rounded-xl focus:outline-none focus:border-[#86A38E] focus:ring-2 focus:ring-[#86A38E]/20 transition-all text-base"
                  inputMode="text"
                  autoComplete="off"
                  required
                />
                {title && (
                  <button
                    type="button"
                    onClick={() => setTitle('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors active:scale-95"
                    aria-label="清除"
                  >
                    <XCircle size={18} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* 地址輸入框 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                地址 <span className="text-xs text-gray-500">(選填，用於導航)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="例如：東京都中央區築地5-2-1"
                  className="w-full px-4 py-2.5 pr-10 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                  inputMode="text"
                  autoComplete="off"
                />
                {address && (
                  <button
                    type="button"
                    onClick={() => setAddress('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors active:scale-95"
                    aria-label="清除"
                  >
                    <XCircle size={18} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* 泰文名稱輸入框 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                泰文名稱 <span className="text-xs text-gray-500">(選填，方便泰國司機辨識)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={thaiName}
                  onChange={(e) => setThaiName(e.target.value)}
                  placeholder="例如：ตลาดปลาซึกิจิ"
                  className="w-full px-4 py-2.5 pr-10 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                  inputMode="text"
                  autoComplete="off"
                />
                {thaiName && (
                  <button
                    type="button"
                    onClick={() => setThaiName('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors active:scale-95"
                    aria-label="清除泰文名稱"
                  >
                    <XCircle size={18} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* 分類選擇 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分類
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categoryOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCategory(option.value)}
                    className={`px-4 py-2.5 rounded-xl border-2 transition-all active:scale-95 ${
                      category === option.value
                        ? 'bg-[#86A38E] text-white border-[#86A38E] shadow-sm'
                        : 'bg-white text-gray-700 border-[#E0E5D5] hover:border-[#86A38E]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 按鈕列 */}
            <div className="flex gap-3 pt-2">
              {onDelete && initialData && (
                <button
                  type="button"
                  onClick={() => {
                    if (onDelete) {
                      onDelete();
                    }
                  }}
                  className="px-4 py-2.5 border-2 border-red-400 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors active:scale-95 flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  刪除
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`${onDelete && initialData ? 'flex-1' : 'flex-1'} px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors active:scale-95`}
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-[#86A38E] text-white rounded-xl font-medium hover:bg-[#7a9382] transition-colors shadow-sm active:scale-95"
              >
                {initialData ? '儲存' : '新增'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default TimelineItemModal
