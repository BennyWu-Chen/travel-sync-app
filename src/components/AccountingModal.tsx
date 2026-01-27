import React, { useEffect, useState } from 'react'
import { X, XCircle } from 'lucide-react'

type AccountingMember = {
  id: string
  name: string
}

export type AccountingModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    item: string
    amountTHB: number
    date: string
    paidByMemberId: string
    paidByName: string
  }) => void
  members: AccountingMember[]
}

const AccountingModal: React.FC<AccountingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  members,
}) => {
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [paidById, setPaidById] = useState('')

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
      setPaidById(members[0].id)
    }
  }, [isOpen, members])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedItem = item.trim()
    const value = parseFloat(amount)

    if (!trimmedItem) {
      alert('請輸入消費項目')
      return
    }
    if (Number.isNaN(value) || value <= 0) {
      alert('請輸入正確的金額（THB）')
      return
    }
    if (!date) {
      alert('請選擇日期')
      return
    }
    if (!paidById) {
      alert('請選擇付款人')
      return
    }

    const member = members.find(m => m.id === paidById)
    const paidByName = member?.name ?? ''

    onSubmit({
      item: trimmedItem,
      amountTHB: value,
      date,
      paidByMemberId: paidById,
      paidByName,
    })
    onClose()

    // 清空
    setItem('')
    setAmount('')
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
              新增消費紀錄
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                消費項目
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder="例如：晚餐、按摩、小費..."
                  className="w-full px-4 py-2.5 pr-10 border-2 border-[#86A38E] rounded-xl focus:outline-none focus:border-[#86A38E] focus:ring-2 focus:ring-[#86A38E]/20 transition-all"
                />
                {item && (
                  <button
                    type="button"
                    onClick={() => setItem('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors active:scale-95"
                    aria-label="清除"
                  >
                    <XCircle size={18} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                金額 (THB)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="例如：500"
                className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
              />
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                付款人 (Paid By)
              </label>
              <select
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
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

export default AccountingModal

