import React, { useEffect, useMemo, useState } from 'react'
import { X, XCircle } from 'lucide-react'

type ExpenseMember = {
  id: string
  name: string
}

export type ExpenseModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    title: string
    amount: number
    currency: 'THB' | 'TWD'
    date: string
    payerId: string
    splitWith: string[]
    category: string
  }) => void
  members: ExpenseMember[]
  exchangeRate: number // 1 TWD = exchangeRate THB
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  members,
  exchangeRate,
}) => {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'THB' | 'TWD'>('THB')
  const [date, setDate] = useState('')
  const [payerId, setPayerId] = useState('')
  const [category, setCategory] = useState('other')
  const [splitWithIds, setSplitWithIds] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen) return

    // 預設日期為今天
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    setDate(`${yyyy}-${mm}-${dd}`)

    // 預設付款人為第一位成員
    if (members.length > 0) {
      setPayerId(members[0].id)
      setSplitWithIds(members.map(m => m.id)) // 預設所有成員分攤
    } else {
      setPayerId('')
      setSplitWithIds([])
    }

    // 重置表單內容
    setTitle('')
    setAmount('')
    setCurrency('THB')
    setCategory('other')
  }, [isOpen, members])

  if (!isOpen) return null

  const amountNumber = parseFloat(amount)

  const estimatedTWD = useMemo(() => {
    if (Number.isNaN(amountNumber) || amountNumber <= 0) return 0
    if (currency === 'TWD') return amountNumber
    if (!exchangeRate) return 0
    // 1 TWD = exchangeRate THB => TWD = THB / exchangeRate
    return amountNumber / exchangeRate
  }, [amountNumber, currency, exchangeRate])

  const toggleSplitMember = (id: string) => {
    setSplitWithIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    const value = parseFloat(amount)

    if (!trimmedTitle) {
      alert('請輸入消費項目')
      return
    }
    if (Number.isNaN(value) || value <= 0) {
      alert('請輸入正確的金額')
      return
    }
    if (!date) {
      alert('請選擇日期')
      return
    }
    if (!payerId) {
      alert('請選擇付款人')
      return
    }
    if (splitWithIds.length === 0) {
      alert('至少需勾選一位分攤成員')
      return
    }

    onSubmit({
      title: trimmedTitle,
      amount: value,
      currency,
      date,
      payerId,
      splitWith: splitWithIds,
      category,
    })
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
              新增消費
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
            {/* 項目名稱 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                消費項目
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：晚餐、按摩、小費..."
                  className="w-full px-4 py-2.5 pr-10 border-2 border-[#86A38E] rounded-xl focus:outline-none focus:border-[#86A38E] focus:ring-2 focus:ring-[#86A38E]/20 transition-all"
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

            {/* 金額與幣別 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                金額
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="例如：500"
                  className="flex-1 px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'THB' | 'TWD')}
                  className="px-3 py-2 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors bg-white text-sm"
                >
                  <option value="THB">THB</option>
                  <option value="TWD">TWD</option>
                </select>
              </div>
              {estimatedTWD > 0 && (
                <p className="mt-1 text-xs">
                  約合
                  <span className="ml-1 font-semibold text-[#86A38E]">
                    {estimatedTWD.toLocaleString(undefined, { maximumFractionDigits: 0 })} TWD
                  </span>
                </p>
              )}
            </div>

            {/* 日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                日期
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
              />
            </div>

            {/* 類別 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                類別
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors bg-white"
              >
                <option value="food">餐飲</option>
                <option value="transport">交通</option>
                <option value="stay">住宿</option>
                <option value="activity">活動</option>
                <option value="shopping">購物</option>
                <option value="other">其他</option>
              </select>
            </div>

            {/* 付款人 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                付款人 (Paid By)
              </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors bg-white"
              >
                <option value="" disabled>
                  請選擇成員
                </option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 分攤對象 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  分攤對象
                </label>
                <button
                  type="button"
                  onClick={() => setSplitWithIds(members.map(m => m.id))}
                  className="text-xs text-[#86A38E] hover:underline"
                >
                  全選
                </button>
              </div>
              {members.length === 0 ? (
                <p className="text-xs text-gray-400">
                  尚未建立成員，請先到「成員」分頁新增。
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {members.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-[#E0E5D5] text-sm cursor-pointer hover:border-[#86A38E] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={splitWithIds.includes(member.id)}
                        onChange={() => toggleSplitMember(member.id)}
                        className="w-4 h-4 text-[#86A38E] rounded border-gray-300"
                      />
                      <span className="text-gray-700 truncate">{member.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

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
                新增
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default ExpenseModal

