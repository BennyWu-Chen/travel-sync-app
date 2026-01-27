import { useState, useEffect } from 'react'
import { X, XCircle } from 'lucide-react'
import React from 'react'
import { type Booking, type BookingType } from '../App'

export type BookingModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Partial<Booking>) => void
  initialData?: Booking | null
}

const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [type, setType] = useState<BookingType>('flight')
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [price, setPrice] = useState('')
  
  // 航空機票欄位
  const [airline, setAirline] = useState('')
  const [flightNo, setFlightNo] = useState('')
  const [depTime, setDepTime] = useState('')
  const [arrTime, setArrTime] = useState('')
  const [depCity, setDepCity] = useState('')
  const [arrCity, setArrCity] = useState('')
  const [bookingRef, setBookingRef] = useState('')
  
  // 住宿飯店欄位
  const [hotelName, setHotelName] = useState('')
  const [hotelAddress, setHotelAddress] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  
  // 交通欄位
  const [transportType, setTransportType] = useState('')
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  const [dropoffTime, setDropoffTime] = useState('')

  useEffect(() => {
    if (initialData) {
      setType(initialData.type)
      setTitle(initialData.title || '')
      setImageUrl(initialData.imageUrl || '')
      setPrice(initialData.price?.toString() || '')
      setAirline(initialData.airline || '')
      setFlightNo(initialData.flightNo || '')
      setDepTime(initialData.depTime || '')
      setArrTime(initialData.arrTime || '')
      setDepCity(initialData.depCity || '')
      setArrCity(initialData.arrCity || '')
      setBookingRef(initialData.bookingRef || '')
      setHotelName(initialData.hotelName || '')
      setHotelAddress(initialData.hotelAddress || '')
      setCheckIn(initialData.checkIn || '')
      setCheckOut(initialData.checkOut || '')
      setTransportType(initialData.transportType || '')
      setPickupLocation(initialData.pickupLocation || '')
      setDropoffLocation(initialData.dropoffLocation || '')
      setPickupTime(initialData.pickupTime || '')
      setDropoffTime(initialData.dropoffTime || '')
    } else {
      // 重置表單
      setType('flight')
      setTitle('')
      setImageUrl('')
      setPrice('')
      setAirline('')
      setFlightNo('')
      setDepTime('')
      setArrTime('')
      setDepCity('')
      setArrCity('')
      setBookingRef('')
      setHotelName('')
      setHotelAddress('')
      setCheckIn('')
      setCheckOut('')
      setTransportType('')
      setPickupLocation('')
      setDropoffLocation('')
      setPickupTime('')
      setDropoffTime('')
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const bookingData: Partial<Booking> = {
      type,
      title: title.trim() || "",
      imageUrl: imageUrl.trim() || "",
      price: price ? parseFloat(price) : 0,
    }

    if (type === 'flight') {
      bookingData.airline = airline.trim() || ""
      bookingData.flightNo = flightNo.trim() || ""
      bookingData.depTime = depTime.trim() || ""
      bookingData.arrTime = arrTime.trim() || ""
      bookingData.depCity = depCity.trim() || ""
      bookingData.arrCity = arrCity.trim() || ""
      bookingData.bookingRef = bookingRef.trim() || ""
    } else if (type === 'hotel') {
      bookingData.hotelName = hotelName.trim() || ""
      bookingData.hotelAddress = hotelAddress.trim() || ""
      bookingData.checkIn = checkIn.trim() || ""
      bookingData.checkOut = checkOut.trim() || ""
      bookingData.imageUrl = imageUrl.trim() || ""
      // 確保住宿類型有 price 欄位
      bookingData.price = price ? parseFloat(price) : 0
    } else if (type === 'transport') {
      bookingData.transportType = transportType.trim() || title.trim() || ""
      bookingData.pickupLocation = pickupLocation.trim() || ""
      bookingData.dropoffLocation = dropoffLocation.trim() || ""
      bookingData.pickupTime = pickupTime.trim() || ""
      bookingData.dropoffTime = dropoffTime.trim() || ""
    }

    onSubmit(bookingData)
    onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-[4px_4px_0px_#E0E5D5] pointer-events-auto max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#86A38E]">
              {initialData ? '編輯預訂' : '新增預訂'}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 類型選擇 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                類型
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'flight', label: '航空機票' },
                  { value: 'hotel', label: '住宿飯店' },
                  { value: 'transport', label: '交通' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value as BookingType)}
                    className={`px-4 py-2.5 rounded-xl border-2 transition-all active:scale-95 ${
                      type === option.value
                        ? 'bg-[#86A38E] text-white border-[#86A38E] shadow-sm'
                        : 'bg-white text-gray-700 border-[#E0E5D5] hover:border-[#86A38E]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 通用欄位 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                標題 <span className="text-xs text-gray-500">(選填)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：去程機票"
                className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
              />
            </div>

            {/* 航空機票欄位 */}
            {type === 'flight' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    航空公司
                  </label>
                  <input
                    type="text"
                    value={airline}
                    onChange={(e) => setAirline(e.target.value)}
                    placeholder="例如：Thai Airways"
                    className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    航班編號
                  </label>
                  <input
                    type="text"
                    value={flightNo}
                    onChange={(e) => setFlightNo(e.target.value)}
                    placeholder="例如：TG635"
                    className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      起飛城市
                    </label>
                    <input
                      type="text"
                      value={depCity}
                      onChange={(e) => setDepCity(e.target.value)}
                      placeholder="TPE"
                      className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      抵達城市
                    </label>
                    <input
                      type="text"
                      value={arrCity}
                      onChange={(e) => setArrCity(e.target.value)}
                      placeholder="BKK"
                      className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      起飛時間
                    </label>
                    <input
                      type="time"
                      value={depTime}
                      onChange={(e) => setDepTime(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      抵達時間
                    </label>
                    <input
                      type="time"
                      value={arrTime}
                      onChange={(e) => setArrTime(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    預訂編號 <span className="text-xs text-gray-500">(選填)</span>
                  </label>
                  <input
                    type="text"
                    value={bookingRef}
                    onChange={(e) => setBookingRef(e.target.value)}
                    placeholder="例如：ABC123"
                    className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                  />
                </div>
              </>
            )}

            {/* 住宿飯店欄位 */}
            {type === 'hotel' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    飯店名稱
                  </label>
                  <input
                    type="text"
                    value={hotelName}
                    onChange={(e) => setHotelName(e.target.value)}
                    placeholder="例如：曼谷文華東方酒店"
                    className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    飯店地址 <span className="text-xs text-gray-500">(選填)</span>
                  </label>
                  <input
                    type="text"
                    value={hotelAddress}
                    onChange={(e) => setHotelAddress(e.target.value)}
                    placeholder="例如：48 Oriental Ave, Bangkok"
                    className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    圖片網址 <span className="text-xs text-gray-500">(選填)</span>
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      入住日期
                    </label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      退房日期
                    </label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    總價 <span className="text-xs text-gray-500">(用於分攤計算)</span>
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="例如：5000"
                    className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                  />
                </div>
              </>
            )}

            {/* 交通欄位 */}
            {type === 'transport' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    交通方式
                  </label>
                  <input
                    type="text"
                    value={transportType}
                    onChange={(e) => setTransportType(e.target.value)}
                    placeholder="例如：租車、包車"
                    className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      取車地點
                    </label>
                    <input
                      type="text"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      placeholder="例如：機場"
                      className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      還車地點
                    </label>
                    <input
                      type="text"
                      value={dropoffLocation}
                      onChange={(e) => setDropoffLocation(e.target.value)}
                      placeholder="例如：飯店"
                      className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      取車時間
                    </label>
                    <input
                      type="datetime-local"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      還車時間
                    </label>
                    <input
                      type="datetime-local"
                      value={dropoffTime}
                      onChange={(e) => setDropoffTime(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 通用價格欄位（非住宿類型） */}
            {type !== 'hotel' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  價格 <span className="text-xs text-gray-500">(選填)</span>
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="例如：5000"
                  className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors active:scale-95"
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

export default BookingModal
