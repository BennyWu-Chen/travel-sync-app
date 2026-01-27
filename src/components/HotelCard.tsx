import React from 'react'
import { Hotel, Navigation, X } from 'lucide-react'

export interface HotelCardProps {
  hotelName?: string
  hotelAddress?: string
  imageUrl?: string
  checkIn?: string
  checkOut?: string
  price?: number
  memberCount: number
  onDelete?: () => void
  onClick?: () => void
  showDelete?: boolean
}

const HotelCard: React.FC<HotelCardProps> = ({
  hotelName,
  hotelAddress,
  imageUrl,
  checkIn,
  checkOut,
  price,
  memberCount,
  onDelete,
  onClick,
  showDelete = false,
}) => {
  const pricePerPerson = price && memberCount > 0 ? (price / memberCount).toFixed(0) : '0'

  return (
    <div 
      className="relative bg-white rounded-2xl overflow-hidden shadow-[4px_4px_0px_#E0E5D5] cursor-pointer hover:shadow-[6px_6px_0px_#E0E5D5] transition-all active:scale-[0.98]"
      onClick={onClick}
    >
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
      <div className="flex">
        {/* 左側：飯店預覽圖 */}
        <div className="w-32 h-32 flex-shrink-0 bg-gray-200 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={hotelName} className="w-full h-full object-cover" />
          ) : (
            <Hotel size={40} className="text-gray-400" />
          )}
        </div>
        
        {/* 右側：詳細資訊 */}
        <div className="flex-1 p-4 min-w-0">
          <h3 className="text-lg font-bold text-gray-800 mb-2 truncate">{hotelName || '飯店名稱'}</h3>
          
          {hotelAddress && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{hotelAddress}</p>
          )}

          <div className="space-y-1.5 text-sm text-gray-600 mb-3">
            {checkIn && (
              <div className="flex items-center gap-2">
                <span className="font-medium">入住：</span>
                <span>{checkIn}</span>
              </div>
            )}
            {checkOut && (
              <div className="flex items-center gap-2">
                <span className="font-medium">退房：</span>
                <span>{checkOut}</span>
              </div>
            )}
            {price && price > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-medium">每人應付：</span>
                <span className="text-[#86A38E] font-bold text-base">฿{pricePerPerson}</span>
                <span className="text-xs text-gray-400">(總價 ฿{price} / {memberCount}人)</span>
              </div>
            )}
          </div>

          {hotelAddress && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelAddress)}`, '_blank');
              }}
              className="flex items-center gap-1 text-xs text-[#86A38E] hover:text-[#7a9382] transition-colors active:scale-95"
            >
              <Navigation size={14} />
              <span>查看地圖</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default HotelCard
