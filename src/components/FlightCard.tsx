import React from 'react'
import { Plane, X } from 'lucide-react'

export interface FlightCardProps {
  airline?: string
  flightNo?: string
  depTime?: string
  arrTime?: string
  depCity?: string
  arrCity?: string
  bookingRef?: string
  onDelete?: () => void
  onClick?: () => void
  showDelete?: boolean
}

const FlightCard: React.FC<FlightCardProps> = ({
  airline,
  flightNo,
  depTime,
  arrTime,
  depCity,
  arrCity,
  bookingRef,
  onDelete,
  onClick,
  showDelete = false,
}) => {
  return (
    <div 
      className="relative bg-gradient-to-br from-[#86A38E]/10 to-[#86A38E]/20 rounded-2xl p-5 shadow-[4px_4px_0px_#E0E5D5] border-2 border-[#86A38E]/30 cursor-pointer hover:shadow-[6px_6px_0px_#E0E5D5] transition-all active:scale-[0.98]"
      onClick={onClick}
    >
      {/* 左側打孔 */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#F7F4EB] border-2 border-gray-300"></div>
      
      {/* 右側打孔 */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-[#F7F4EB] border-2 border-gray-300"></div>

      {/* 刪除按鈕（僅在工程師模式顯示） */}
      {showDelete && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors active:scale-95 z-10 shadow-sm"
          aria-label="刪除"
        >
          <X size={14} />
        </button>
      )}

      {/* 內容 */}
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Plane size={24} className="text-[#86A38E]" />
            </div>
            <div>
              <div className="text-sm text-gray-600">{airline || '航空公司'}</div>
              <div className="text-lg font-bold text-gray-800">{flightNo || 'FL1234'}</div>
            </div>
          </div>
          {bookingRef && (
            <div className="text-right">
              <div className="text-xs text-gray-500">預訂編號</div>
              <div className="text-sm font-mono text-gray-700">{bookingRef}</div>
            </div>
          )}
        </div>

        {/* 起飛/抵達資訊 */}
        <div className="flex items-center justify-between pt-3 border-t-2 border-dashed border-[#86A38E]/30">
          <div className="text-center flex-1">
            <div className="text-xs text-gray-600 mb-1">起飛</div>
            <div className="text-lg font-bold text-gray-800">{depTime || '--:--'}</div>
            <div className="text-sm font-semibold text-[#86A38E]">{depCity || 'TPE'}</div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-2xl text-[#86A38E]">➔</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-xs text-gray-600 mb-1">抵達</div>
            <div className="text-lg font-bold text-gray-800">{arrTime || '--:--'}</div>
            <div className="text-sm font-semibold text-[#86A38E]">{arrCity || 'BKK'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FlightCard
