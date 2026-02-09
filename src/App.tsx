import { useState, useEffect } from 'react'
import DateSelector from './components/DateSelector'
import Timeline, { type TimelineItemType } from './components/Timeline'
import TimelineItemModal from './components/TimelineItemModal'
import FlightCard from './components/FlightCard'
import HotelCard from './components/HotelCard'
import BookingModal from './components/BookingModal'
import { Calendar, Ticket, Wallet, ListChecks, MapPin, Utensils, Edit, ShoppingBag, Camera, AlertCircle, Users, Plus, X, Languages, Copy, Plane, Hotel, Car, FileText, Navigation, ExternalLink, Trash2 } from 'lucide-react'
import { db } from './api/firebase'
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  getDocs,
  type Unsubscribe 
} from 'firebase/firestore'

interface TimelineItem {
  id: string;
  time: string;
  title: string;
  category: TimelineItemType;
  address?: string;
  thaiName?: string;
  notes?: string;
  iconName: string;
  day: number;
}

interface Member {
  id: string;
  name: string;
}

interface AccountingRecord {
  id: string;
  item: string;
  amountTHB: number;
  date: string;
  paidByMemberId: string;
  paidByName: string;
  createdAt?: any;
}

type FxCurrency = 'KRW' | 'TWD' | 'USD' | 'THB'

interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: FxCurrency;
  amountTWD: number;
  date: string;
  paymentMethod: 'cash' | 'card';
  location?: string;
  payerId: string;
  payerName: string;
  // 參與分攤的成員 ID 陣列（Firestore 欄位：splitWith）
  splitWith: string[];
  rateToTWD: number;
  createdAt?: any;
}

interface ExpenseEditPayload {
  date: string;
  currency: FxCurrency;
  amount: number;
  paymentMethod: 'cash' | 'card';
  location: string;
  title: string;
  payerId: string;
  splitWith: string[];
}

interface ExpenseEditModalProps {
  isOpen: boolean;
  expense: Expense | null;
  members: Member[];
  onClose: () => void;
  onSave: (payload: ExpenseEditPayload) => void;
  onDelete: (id: string) => void;
}

const ExpenseEditModal = ({
  isOpen,
  expense,
  members,
  onClose,
  onSave,
  onDelete,
}: ExpenseEditModalProps) => {
  const [date, setDate] = useState('');
  const [currency, setCurrency] = useState<FxCurrency>('KRW');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [location, setLocation] = useState('');
  const [title, setTitle] = useState('');
  const [payerId, setPayerId] = useState<string>('');
  const [participants, setParticipants] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !expense) return;
    setDate(expense.date || '');
    setCurrency(expense.currency);
    setAmount(expense.amount ? String(expense.amount) : '');
    setPaymentMethod(expense.paymentMethod);
    setLocation(expense.location || '');
    setTitle(expense.title || '');
    setPayerId(expense.payerId);
    setParticipants(
      expense.splitWith && expense.splitWith.length > 0
        ? expense.splitWith
        : members.map((m) => m.id)
    );
  }, [isOpen, expense, members]);

  if (!isOpen || !expense) return null;

  const handleSaveClick = () => {
    const amountNum = parseFloat(amount || '0');
    if (!title.trim()) {
      alert('請輸入消費項目');
      return;
    }
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      alert('請輸入正確的金額');
      return;
    }
    if (!date) {
      alert('請選擇日期');
      return;
    }
    if (!payerId) {
      alert('請選擇付款人');
      return;
    }
    if (participants.length === 0) {
      alert('請至少選擇一位分攤成員');
      return;
    }

    onSave({
      date,
      currency,
      amount: amountNum,
      paymentMethod,
      location,
      title: title.trim(),
      payerId,
      splitWith: participants,
    });
  };

  const handleDeleteClick = () => {
    onDelete(expense.id);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-[4px_4px_0px_#E0E5D5] pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#86A38E]">編輯記帳</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
              aria-label="關閉"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* 日期 */}
            <div>
              <div className="text-xs text-gray-500 mb-1">日期</div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F7F4EB] border border-[#E0E5D5] text-sm"
              />
            </div>

            {/* 幣別 */}
            <div>
              <div className="text-xs text-gray-500 mb-1">幣別</div>
              <div className="grid grid-cols-4 gap-2">
                {(['KRW', 'TWD', 'USD', 'THB'] as FxCurrency[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCurrency(code)}
                    className={`py-2 text-xs rounded-xl border-2 transition-colors ${
                      currency === code
                        ? 'bg-[#86A38E] text-white border-[#86A38E] shadow-sm'
                        : 'bg-white text-gray-700 border-[#E0E5D5]'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            {/* 金額 */}
            <div>
              <div className="text-xs text-gray-500 mb-1">金額</div>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl text-sm focus:outline-none focus:border-[#86A38E]"
              />
            </div>

            {/* 地點 */}
            <div>
              <div className="text-xs text-gray-500 mb-1">地點（選填）</div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例如：便利商店"
                className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl text-sm focus:outline-none focus:border-[#86A38E]"
              />
            </div>

            {/* 消費項目 */}
            <div>
              <div className="text-xs text-gray-500 mb-1">消費項目</div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：午餐"
                className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl text-sm focus:outline-none focus:border-[#86A38E]"
              />
            </div>

            {/* 支付方式 */}
            <div>
              <div className="text-xs text-gray-500 mb-1">支付方式</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'cash', label: '現金' },
                  { value: 'card', label: '信用卡' },
                ].map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setPaymentMethod(o.value as 'cash' | 'card')}
                    className={`py-2 text-xs rounded-xl border-2 transition-colors ${
                      paymentMethod === o.value
                        ? 'bg-[#FFB84D] border-[#FFB84D] text-white'
                        : 'bg-white border-[#E0E5D5] text-gray-700'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 付款人 */}
            <div>
              <div className="text-xs text-gray-500 mb-2">付款人</div>
              <div className="flex gap-2 overflow-x-auto">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayerId(m.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                      payerId === m.id
                        ? 'border-[#86A38E] bg-[#E0F1E3]'
                        : 'border-transparent bg-transparent'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold">
                      {m.name[0]}
                    </div>
                    <span className="text-xs text-gray-800 whitespace-nowrap">
                      {m.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 分攤對象 */}
            <div>
              <div className="text-xs text-gray-500 mb-2">分攤對象（可多選）</div>
              <div className="flex gap-2 overflow-x-auto">
                {members.map((m) => {
                  const selected = participants.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setParticipants((prev) =>
                          prev.includes(m.id)
                            ? prev.filter((id) => id !== m.id)
                            : [...prev, m.id]
                        );
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border relative ${
                        selected
                          ? 'border-[#86A38E] bg-[#E0F1E3]'
                          : 'border-[#E0E5D5] bg-white'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold">
                        {m.name[0]}
                      </div>
                      <span className="text-xs text-gray-800 whitespace-nowrap">
                        {m.name}
                      </span>
                      {selected && (
                        <span className="ml-1 text-[10px] text-[#86A38E] font-semibold">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 底部按鈕區：左下刪除、右側儲存/取消 */}
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDeleteClick}
              className="text-xs text-red-500 font-medium hover:text-red-600 active:scale-95"
            >
              刪除此筆紀錄
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors active:scale-95"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveClick}
                className="px-4 py-2.5 bg-[#86A38E] text-white rounded-xl text-sm font-medium hover:bg-[#7a9382] transition-colors active:scale-95"
              >
                儲存修改
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// 預訂資料型別
export type BookingType = 'flight' | 'hotel' | 'transport' | 'voucher'

export interface Booking {
  id: string;
  type: BookingType;
  title?: string; // 通用標題
  imageUrl?: string; // 通用圖片 URL
  price?: number; // 通用價格
  // 航空機票欄位 (type === 'flight')
  airline?: string;
  flightNo?: string;
  depTime?: string;
  arrTime?: string;
  depCity?: string;
  arrCity?: string;
  bookingRef?: string;
  // 住宿飯店欄位 (type === 'hotel')
  hotelName?: string;
  hotelAddress?: string;
  checkIn?: string;
  checkOut?: string;
  // 交通/租車欄位 (type === 'transport')
  transportType?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupTime?: string;
  dropoffTime?: string;
  // 憑證欄位 (type === 'voucher')
  voucherName?: string;
  voucherUrl?: string;
  voucherType?: 'pdf' | 'image';
  createdAt?: any;
  updatedAt?: any;
}

type TabType = 'schedule' | 'booking' | 'translation' | 'accounting' | 'members'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('schedule')
  const [items, setItems] = useState<TimelineItem[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1. 狀態管理：目前選擇的天數與旅行起點日期
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('last_selected_day');
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });

  // 強化 selectedDay 的持久化：當 selectedDay 改變時立即寫入 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_selected_day', selectedDay.toString());
    }
  }, [selectedDay]);
  // 從 localStorage 讀取 startDate 作為初始值（備援機制）
  const [startDate, setStartDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trip_start_date');
      // 驗證日期格式是否正確 (YYYY-MM-DD)
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
        return saved;
      }
    }
    return '2026-01-30'; // 預設值
  });
  const [journeyTitle, setJourneyTitle] = useState('旅程日誌');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isStartDateLoaded, setIsStartDateLoaded] = useState(false); // 追蹤是否已從 Firebase 載入
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnectBar, setShowReconnectBar] = useState(false);
  
  // 階段二：工程師模式狀態
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  
  // 階段一：成員管理狀態
  const [members, setMembers] = useState<Member[]>([]);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

  // 記帳分頁狀態（新 Expense Tab）
  const [accountingSubTab, setAccountingSubTab] = useState<'form' | 'list'>('form');
  const [accountingMessage, setAccountingMessage] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  // 明細日期摺疊：true 代表該日期目前是「收起」
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
  const [expandAllDates, setExpandAllDates] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // 內嵌記帳表單狀態
  const [expDate, setExpDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate() + 0).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [expCurrency, setExpCurrency] = useState<FxCurrency>('KRW');
  const [expAmount, setExpAmount] = useState('');
  const [expPaymentMethod, setExpPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [expLocation, setExpLocation] = useState('');
  const [expTitle, setExpTitle] = useState('');
  const [expPayerId, setExpPayerId] = useState<string>('');
  const [expParticipants, setExpParticipants] = useState<string[]>([]);

  // 即時匯率：1 外幣 = ? TWD（今日快取）
  const [fxRates, setFxRates] = useState<Record<FxCurrency, number>>({
    KRW: 0,
    TWD: 1,
    USD: 0,
    THB: 0,
  });

  // 即時翻譯功能狀態（用於行程頁面的翻譯預覽）
  const [targetLang, setTargetLang] = useState<'th' | 'en' | 'ja' | 'ko'>('th');
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});
  
  // 翻譯工具狀態（用於與人溝通的翻譯）
  const [translationInput, setTranslationInput] = useState('');
  const [translationResult, setTranslationResult] = useState('');
  const [sourceLang, setSourceLang] = useState<'zh-TW' | 'th' | 'en' | 'ja' | 'ko'>('zh-TW');
  const [targetLangForTool, setTargetLangForTool] = useState<'th' | 'en' | 'ja' | 'ko' | 'zh-TW'>('th');
  const [isTranslating, setIsTranslating] = useState(false);

  // 預訂資料狀態
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  // 2. 監聽資料庫中的「旅行起點日期」和「旅程標題」設定（第一優先執行）
  useEffect(() => {
    if (!db) {
      setIsStartDateLoaded(true); // 即使沒有 db，也標記為已載入，使用 localStorage 備援
      return;
    }
    
    const unsubConfig = onSnapshot(doc(db, 'config', 'trip_settings'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.startDate) {
          const newStartDate = data.startDate;
          // 驗證日期格式
          if (/^\d{4}-\d{2}-\d{2}$/.test(newStartDate)) {
            setStartDate(newStartDate);
            // 同時存入 localStorage 作為備援
            if (typeof window !== 'undefined') {
              localStorage.setItem('trip_start_date', newStartDate);
            }
          } else {
            console.error('Invalid date format from Firebase:', newStartDate);
          }
        }
        if (data.journeyTitle) {
          setJourneyTitle(data.journeyTitle);
        }
      } else {
        // 如果資料庫中沒有資料，使用 localStorage 備援
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('trip_start_date');
          if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
            setStartDate(saved);
          }
        }
      }
      setIsStartDateLoaded(true); // 標記為已載入
    }, (err) => {
      console.error("Firestore config onSnapshot Error: ", err);
      // 錯誤時使用 localStorage 備援
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('trip_start_date');
        if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
          setStartDate(saved);
        }
      }
      setIsStartDateLoaded(true);
    });
    
    return () => unsubConfig();
  }, [db]);

  // 監聽瀏覽器 online / offline 事件，控制 OfflineBar 顯示
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectBar(true);
      // 3 秒後自動收起綠色提示
      setTimeout(() => setShowReconnectBar(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectBar(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 3. 監聽資料庫中的「行程內容」，根據選中天數過濾
  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    // 確保 selectedDay 有有效值
    const currentDay = selectedDay || 1;
    setIsLoading(true);

    // 使用 where 查詢並在客戶端排序（避免索引問題）
    const q = query(
      collection(db, 'schedule'),
      where('day', '==', currentDay)
    );

    const unsubscribe: Unsubscribe = onSnapshot(q, (snapshot) => {
      setIsLoading(false);
      const fetchedItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TimelineItem[];
      console.log("Current Schedule Data:", fetchedItems);
      // 在客戶端按時間排序
      fetchedItems.sort((a, b) => a.time.localeCompare(b.time));
      setItems(fetchedItems);
      setError(null);
    }, (err: any) => {
      console.error("Firestore onSnapshot Error: ", err);
      setError("資料載入失敗，請檢查網路連線或稍後再試。");
      setIsLoading(false);
    });

    // 確保正確清理舊的監聽器
    return () => {
      unsubscribe();
    };
  }, [selectedDay, db]);

  // 階段一：監聽 Firebase 的 members 集合
  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, 'members'), (snapshot) => {
      const fetchedMembers: Member[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setMembers(fetchedMembers);
    }, (err) => {
      console.error("Firestore members onSnapshot Error: ", err);
    });
    return () => unsubscribe();
  }, []);

  // 監聽 Firebase 的 expenses 集合（記帳明細）
  useEffect(() => {
    if (!db) {
      setIsLoadingExpenses(false);
      return;
    }

    setIsLoadingExpenses(true);
    const q = query(
      collection(db, 'expenses'),
      orderBy('date', 'desc'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: Expense[] = snapshot.docs.map((doc) => {
          const raw = doc.data() as any;
          const splitWith: string[] =
            (raw.splitWith as string[] | undefined) ??
            (raw.participants as string[] | undefined) ??
            [];
          return {
            id: doc.id,
            ...raw,
            splitWith,
          } as Expense;
        });

        setExpenses(fetched);
        setIsLoadingExpenses(false);

        // 初始化日期摺疊：預設只展開最後一天 / 今天
        const dates = Array.from(new Set(fetched.map((e) => e.date))).sort();
        if (dates.length > 0) {
          const todayStr = new Date().toISOString().slice(0, 10);
          const lastDate = dates[dates.length - 1];
          const expandedDate = dates.includes(todayStr) ? todayStr : lastDate;
          setCollapsedDates(
            dates.reduce<Record<string, boolean>>((acc, d) => {
              acc[d] = d !== expandedDate;
              return acc;
            }, {})
          );
        } else {
          setCollapsedDates({});
        }
      },
      (err) => {
        console.error('Firestore expenses onSnapshot Error: ', err);
        setIsLoadingExpenses(false);
      }
    );

    return () => unsubscribe();
  }, [db]);

  // 監聽 Firebase 的 bookings 集合
  useEffect(() => {
    if (!db) {
      setIsLoadingBookings(false);
      return;
    }
    
    setIsLoadingBookings(true);
    const unsubscribe = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const fetchedBookings: Booking[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Booking));
      setBookings(fetchedBookings);
      setIsLoadingBookings(false);
    }, (err) => {
      console.error("Firestore bookings onSnapshot Error: ", err);
      setIsLoadingBookings(false);
    });
    
    return () => unsubscribe();
  }, []);

  // 處理新增/編輯預訂
  const handleSubmitBooking = async (data: Partial<Booking>) => {
    if (!db) {
      setError("Firebase 連線失敗，無法儲存預訂。");
      return;
    }

    // 確保所有欄位都有預設值，避免 Firestore undefined 錯誤
    const bookingData: any = {
      type: data.type || "",
      title: data.title || "",
      imageUrl: data.imageUrl || "",
      price: data.price || 0,
      updatedAt: serverTimestamp()
    };

    // 根據類型填充對應欄位
    if (data.type === 'flight') {
      bookingData.airline = data.airline || "";
      bookingData.flightNo = data.flightNo || "";
      bookingData.depTime = data.depTime || "";
      bookingData.arrTime = data.arrTime || "";
      bookingData.depCity = data.depCity || "";
      bookingData.arrCity = data.arrCity || "";
      bookingData.bookingRef = data.bookingRef || "";
    } else if (data.type === 'hotel') {
      bookingData.hotelName = data.hotelName || "";
      bookingData.hotelAddress = data.hotelAddress || "";
      bookingData.checkIn = data.checkIn || "";
      bookingData.checkOut = data.checkOut || "";
      bookingData.imageUrl = data.imageUrl || "";
      bookingData.price = data.price || 0; // 住宿必須有 price
    } else if (data.type === 'transport') {
      bookingData.transportType = data.transportType || data.title || "";
      bookingData.pickupLocation = data.pickupLocation || "";
      bookingData.dropoffLocation = data.dropoffLocation || "";
      bookingData.pickupTime = data.pickupTime || "";
      bookingData.dropoffTime = data.dropoffTime || "";
    } else if (data.type === 'voucher') {
      bookingData.voucherName = data.voucherName || data.title || "";
      bookingData.voucherUrl = data.voucherUrl || "";
      bookingData.voucherType = data.voucherType || "pdf";
    }

    try {
      if (editingBooking) {
        // 編輯模式
        await updateDoc(doc(db, 'bookings', editingBooking.id), bookingData);
      } else {
        // 新增模式
        await addDoc(collection(db, 'bookings'), {
          ...bookingData,
          createdAt: serverTimestamp()
        });
      }
      setIsBookingModalOpen(false);
      setEditingBooking(null);
      setError(null);
    } catch (e) {
      console.error("Error writing booking: ", e);
      setError("儲存預訂時發生錯誤，請稍後再試。");
    }
  };

  // 4. 更新旅行起點日期並回傳資料庫
  const handleUpdateStartDate = async (newDate: string) => {
    // 驗證日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      console.error('Invalid date format:', newDate);
      return;
    }
    
    // 先更新本地狀態和 localStorage（立即生效）
    setStartDate(newDate);
    if (typeof window !== 'undefined') {
      localStorage.setItem('trip_start_date', newDate);
    }
    
    // 然後同步到 Firebase
    if (!db) return;
    try {
      await setDoc(doc(db, 'config', 'trip_settings'), {
        startDate: newDate,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("更新日期失敗:", e);
    }
  };

  // 更新旅程標題並回傳資料庫
  const handleUpdateTitle = async (newTitle: string) => {
    if (!db) return;
    try {
      await setDoc(doc(db, 'config', 'trip_settings'), {
        journeyTitle: newTitle,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setJourneyTitle(newTitle);
      setIsEditingTitle(false);
    } catch (e) {
      console.error("更新標題失敗:", e);
    }
  };

  // ---- 新記帳分頁：匯率取得（open.er-api，當日快取） ----
  const fetchFxRates = async () => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const cacheKey = `fx_rates_${today}`;
    if (typeof window !== 'undefined') {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as Record<FxCurrency, number>;
        setFxRates(parsed);
        return parsed;
      }
    }

    try {
      const res = await fetch('https://open.er-api.com/v6/latest/TWD');
      const data = await res.json();
      const r: Record<FxCurrency, number> = {
        KRW: data.rates?.KRW ? 1 / data.rates.KRW : 0,
        TWD: 1,
        USD: data.rates?.USD ? 1 / data.rates.USD : 0,
        THB: data.rates?.THB ? 1 / data.rates.THB : 0,
      };
      setFxRates(r);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(cacheKey, JSON.stringify(r));
      }
      return r;
    } catch (e) {
      console.error('fetchFxRates error', e);
      return fxRates;
    }
  };

  useEffect(() => {
    // 初次掛載時抓一次匯率
    fetchFxRates().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 成員載入後，預設付款人 & 分攤對象為全部成員
  useEffect(() => {
    if (members.length === 0) return;
    const allIds = members.map((m) => m.id);
    if (!expPayerId) {
      setExpPayerId(allIds[0]);
    }
    if (expParticipants.length === 0) {
      setExpParticipants(allIds);
    }
  }, [members, expPayerId, expParticipants.length]);

  useEffect(() => {
    // 切換幣別時若沒有對應匯率就再抓一次
    if (!fxRates[expCurrency]) {
      fetchFxRates().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expCurrency]);

  // 刪除行程功能（一般成員也可以刪除）
  const handleDeleteItem = async (id: string) => {
    if (!db) return;
    if (window.confirm("確定要刪除這個行程嗎？")) {
      try {
        await deleteDoc(doc(db, 'schedule', id));
        setIsModalOpen(false);
        setEditingItem(null);
      } catch (e) {
        alert("刪除失敗");
      }
    }
  };

  // 階段一：新增成員功能
  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      alert("請輸入成員名稱");
      return;
    }
    if (!db) return;
    try {
      await addDoc(collection(db, 'members'), {
        name: newMemberName.trim(),
        createdAt: serverTimestamp()
      });
      setNewMemberName('');
      setIsMemberModalOpen(false);
    } catch (e) {
      console.error("新增成員失敗:", e);
      alert("新增成員失敗");
    }
  };

  // 刪除成員功能（一般成員也可以刪除）
  const handleDeleteMember = async (id: string) => {
    if (!db) return;
    if (window.confirm("確定要刪除此成員嗎？")) {
      try {
        await deleteDoc(doc(db, 'members', id));
      } catch (e) {
        alert("刪除失敗");
      }
    }
  };

  // 工程師模式驗證
  const handleAdminLogin = () => {
    if (adminPassword === '840831') {
      setIsAdmin(true);
      setAdminPassword('');
      alert("已進入工程師模式");
    } else if (adminPassword.trim() !== '') {
      alert("密碼錯誤");
      setAdminPassword('');
    }
  };

  // 工程師模式：一鍵刪除所有成員
  const handleDeleteAllMembers = async () => {
    if (!isAdmin) {
      alert("請先進入工程師模式");
      return;
    }
    if (!db) return;
    if (window.confirm("⚠️ 警告：確定要刪除所有成員嗎？此操作無法復原！")) {
      try {
        const deletePromises = members.map(member => 
          deleteDoc(doc(db, 'members', member.id))
        );
        await Promise.all(deletePromises);
        alert("已刪除所有成員");
      } catch (e) {
        console.error("批量刪除失敗:", e);
        alert("刪除失敗");
      }
    }
  };

  // 工程師模式：一鍵刪除所有記帳（expenses）
  const handleDeleteAllExpenses = async () => {
    if (!isAdmin) {
      alert("請先進入工程師模式");
      return;
    }
    if (!db) return;
    if (window.confirm("⚠️ 警告：確定要刪除所有記帳紀錄嗎？此操作無法復原！")) {
      try {
        const snapshot = await getDocs(collection(db, 'expenses'));
        const docsToDelete = snapshot.docs;

        if (docsToDelete.length === 0) {
          alert("沒有記帳紀錄可刪除");
          return;
        }

        const deletePromises = docsToDelete.map((docSnap) =>
          deleteDoc(doc(db, 'expenses', docSnap.id))
        );
        await Promise.all(deletePromises);
        alert(`已刪除所有記帳（共 ${docsToDelete.length} 筆）`);
      } catch (e) {
        console.error("批量刪除記帳失敗:", e);
        alert("刪除記帳失敗");
      }
    }
  };

  // 工程師模式：一鍵刪除所有行程（所有天的行程）
  const handleDeleteAllItems = async () => {
    if (!isAdmin) {
      alert("請先進入工程師模式");
      return;
    }
    if (!db) return;
    if (window.confirm("⚠️ 警告：確定要刪除所有行程嗎？此操作無法復原！")) {
      try {
        // 獲取所有天的行程，而不只是當前選中天的
        const allItemsSnapshot = await getDocs(collection(db, 'schedule'));
        const allItems = allItemsSnapshot.docs;
        
        if (allItems.length === 0) {
          alert("沒有行程可刪除");
          return;
        }
        
        const deletePromises = allItems.map(docSnap => 
          deleteDoc(doc(db, 'schedule', docSnap.id))
        );
        await Promise.all(deletePromises);
        alert(`已刪除所有行程（共 ${allItems.length} 筆）`);
      } catch (e) {
        console.error("批量刪除失敗:", e);
        alert("刪除失敗");
      }
    }
  };

  // 工程師模式：一鍵刪除所有預訂（bookings）
  const handleDeleteAllBookings = async () => {
    if (!isAdmin) {
      alert("請先進入工程師模式");
      return;
    }
    if (!db) return;
    if (window.confirm("⚠️ 警告：確定要刪除所有預訂嗎？此操作無法復原！")) {
      try {
        const snapshot = await getDocs(collection(db, 'bookings'));
        const docsToDelete = snapshot.docs;

        if (docsToDelete.length === 0) {
          alert("沒有預訂可刪除");
          return;
        }

        const deletePromises = docsToDelete.map((docSnap) =>
          deleteDoc(doc(db, 'bookings', docSnap.id))
        );
        await Promise.all(deletePromises);
        alert(`已刪除所有預訂（共 ${docsToDelete.length} 筆）`);
      } catch (e) {
        console.error("批量刪除預訂失敗:", e);
        alert("刪除預訂失敗");
      }
    }
  };

  // 即時翻譯函數（使用 Google Translate 免費端點）
  const translateText = async (text: string, targetLang: 'th' | 'en' | 'ja' | 'ko' | 'zh-TW', sourceLang: 'zh-TW' | 'th' | 'en' | 'ja' | 'ko' = 'zh-TW'): Promise<string> => {
    if (!text.trim()) return '';
    
    // 檢查 cache
    const cacheKey = `${text}_${sourceLang}_${targetLang}`;
    if (translationCache[cacheKey]) {
      return translationCache[cacheKey];
    }

    try {
      // 使用 Google Translate 免費端點
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
      );
      
      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      const translatedText = data[0]?.[0]?.[0] || text;

      // 存入 cache
      setTranslationCache(prev => ({
        ...prev,
        [cacheKey]: translatedText
      }));

      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // 翻譯失敗時返回原文
    }
  };

  // 翻譯工具：執行翻譯
  const handleTranslate = async () => {
    if (!translationInput.trim()) {
      setTranslationResult('');
      return;
    }

    setIsTranslating(true);
    try {
      const result = await translateText(translationInput, targetLangForTool, sourceLang);
      setTranslationResult(result);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationResult('翻譯失敗，請稍後再試');
    } finally {
      setIsTranslating(false);
    }
  };

  // 複製翻譯結果
  const handleCopyTranslation = () => {
    if (translationResult) {
      navigator.clipboard.writeText(translationResult).then(() => {
        alert('已複製到剪貼簿');
      }).catch(() => {
        alert('複製失敗');
      });
    }
  };

  const handleSubmitItem = async (data: {
    time: string;
    title: string;
    category: TimelineItemType;
    address?: string;
    thaiName?: string;
    notes?: string;
  }) => {
    if (!db) {
      setError("Firebase 連線失敗，無法儲存行程。");
      return;
    }
    
    // 確保 selectedDay 有有效值，避免 undefined
    const currentDay = editingItem ? (editingItem.day || 1) : (selectedDay || 1);
    
    const itemData = {
      time: data.time,
      title: data.title,
      category: data.category,
      address: data.address || null,
      thaiName: data.thaiName || null,
      notes: data.notes || null,
      day: currentDay, // 編輯時保留原 day，新增時使用 selectedDay（確保有預設值 1）
      iconName: data.category === 'food' ? 'Utensils' : data.category === 'attraction' ? 'MapPin' : data.category === 'shopping' ? 'ShoppingBag' : 'Camera',
      updatedAt: serverTimestamp()
    };
    
    try {
      if (editingItem) {
        // 編輯模式: 更新現有文件
        await updateDoc(doc(db, 'schedule', editingItem.id), itemData);
      } else {
        // 新增模式: 添加新文件
        await addDoc(collection(db, 'schedule'), { 
          ...itemData, 
          createdAt: serverTimestamp() 
        });
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setError(null);
    } catch (e) {
      console.error("Error writing document: ", e);
      setError("儲存行程時發生錯誤，請稍後再試。");
    }
  }

  // 內嵌記帳表單送出：寫入 expenses 集合
  const handleAddExpense = async () => {
    if (!db) {
      setError("Firebase 連線失敗，無法儲存記帳紀錄。");
      return;
    }

    setAccountingMessage(null);

    const amountNum = parseFloat(expAmount || '0');
    if (!expTitle.trim()) {
      setAccountingMessage('請輸入消費項目');
      alert('請輸入消費項目');
      return;
    }
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setAccountingMessage('請輸入正確的金額');
      alert('請輸入正確的金額');
      return;
    }
    if (!expDate) {
      setAccountingMessage('請選擇日期');
      alert('請選擇日期');
      return;
    }
    if (!expPayerId) {
      setAccountingMessage('請選擇付款人');
      alert('請選擇付款人');
      return;
    }
    if (expParticipants.length === 0) {
      setAccountingMessage('請至少選擇一位分攤成員');
      alert('請至少選擇一位分攤成員');
      return;
    }

    const rateToTWD = fxRates[expCurrency];
    if (!rateToTWD) {
      setAccountingMessage('匯率載入中，請稍後再試');
      alert('匯率載入中，請稍後再試');
      return;
    }

    const payer = members.find((m) => m.id === expPayerId);
    const splitIds = expParticipants;

    try {
      await addDoc(collection(db, 'expenses'), {
        title: expTitle.trim(),
        amount: amountNum,
        currency: expCurrency,
        amountTWD: amountNum * rateToTWD,
        rateToTWD,
        date: expDate,
        paymentMethod: expPaymentMethod,
        location: expLocation.trim() || null,
        payerId: expPayerId,
        payerName: payer?.name || '',
        // 實際 Firestore 欄位名稱：splitWith
        splitWith: splitIds,
        // 兼容舊資料（舊欄位 participants）
        participants: splitIds,
        createdAt: serverTimestamp(),
      });

      // 顯示新增成功訊息
      setAccountingMessage('記帳新增成功！');
      alert('記帳新增成功！');

      // 清空表單，切換到明細分頁
      setExpAmount('');
      setExpTitle('');
      setExpLocation('');
      setAccountingSubTab('list');
      setError(null);
    } catch (e) {
      console.error("Error writing expense: ", e);
      setError("儲存記帳紀錄時發生錯誤，請稍後再試。");
    }
  };

  // 刪除單筆記帳（任何人都可刪除，但會跳確認）
  const handleDeleteExpense = async (id: string) => {
    if (!db) return;
    const ok = window.confirm('確定要刪除此筆記帳紀錄嗎？');
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'expenses', id));
      setIsExpenseModalOpen(false);
      setEditingExpense(null);
    } catch (e) {
      console.error('刪除記帳紀錄失敗:', e);
      alert('刪除失敗，請稍後再試一次');
    }
  };

  const handleSaveExpense = async (payload: ExpenseEditPayload) => {
    if (!db || !editingExpense) return;

    // 取得對應匯率，若當前 fxRates 沒有，退回原紀錄的 rateToTWD
    let rateToTWD = fxRates[payload.currency];
    if (!rateToTWD || rateToTWD <= 0) {
      rateToTWD = editingExpense.rateToTWD || 0;
    }

    if (!rateToTWD || rateToTWD <= 0) {
      alert('匯率尚未載入，暫時無法更新此筆紀錄。');
      return;
    }

    const payer = members.find((m) => m.id === payload.payerId);

    try {
      await updateDoc(doc(db, 'expenses', editingExpense.id), {
        title: payload.title,
        amount: payload.amount,
        currency: payload.currency,
        amountTWD: payload.amount * rateToTWD,
        rateToTWD,
        date: payload.date,
        paymentMethod: payload.paymentMethod,
        location: payload.location.trim() || null,
        payerId: payload.payerId,
        payerName: payer?.name || '',
        splitWith: payload.splitWith,
        participants: payload.splitWith,
        updatedAt: serverTimestamp(),
      });

      setIsExpenseModalOpen(false);
      setEditingExpense(null);
      setError(null);
    } catch (e) {
      console.error('更新記帳紀錄失敗:', e);
      alert('更新記帳紀錄時發生錯誤，請稍後再試。');
    }
  };

// 確保檔案最上方有 import React from 'react'

const getIconComponentByName = (name: string) => {
  // 將 JSX.Element 改為 React.ReactNode，這更通用且不會報錯
  const icons: Record<string, React.ReactNode> = {
    Utensils: <Utensils size={20} />,
    ShoppingBag: <ShoppingBag size={20} />,
    Camera: <Camera size={20} />,
    MapPin: <MapPin size={20} />
  };
  return icons[name] || <MapPin size={20} />;
}

  const renderTabContent = () => {
    switch (activeTab) {
      case 'schedule':
        return (
      <>
        {/* Offline / Reconnect Bar */}
        {(!isOnline || showReconnectBar) && (
          <div
            className={`mx-4 mb-2 px-3 py-2 rounded-xl text-[11px] flex items-center gap-2 transition-all duration-300 ${
              !isOnline
                ? 'bg-orange-50 border border-orange-300 text-orange-800'
                : 'bg-green-50 border border-green-300 text-green-800'
            }`}
          >
            <span>{!isOnline ? '📶' : '✅'}</span>
            <span>
              {!isOnline
                ? '目前為離線模式：資料將於連網後自動同步'
                : '網路已恢復，資料同步中...'}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-6 px-4">
          {isEditingTitle ? (
            <input
              type="text"
              value={journeyTitle}
              onChange={(e) => setJourneyTitle(e.target.value)}
              onBlur={() => {
                if (journeyTitle.trim()) {
                  handleUpdateTitle(journeyTitle.trim());
                } else {
                  setJourneyTitle('旅程日誌');
                  setIsEditingTitle(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                } else if (e.key === 'Escape') {
                  setJourneyTitle('旅程日誌');
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="text-3xl font-bold text-[#86A38E] bg-transparent border-b-2 border-[#86A38E] focus:outline-none focus:border-[#7a9382] flex-1 mr-2"
            />
          ) : (
            <h1 className="text-3xl font-bold text-[#86A38E]">{journeyTitle}</h1>
          )}
          <button 
            onClick={() => {
              if (isEditingTitle) {
                // 如果正在編輯，保存並退出編輯模式
                if (journeyTitle.trim()) {
                  handleUpdateTitle(journeyTitle.trim());
                } else {
                  setJourneyTitle('旅程日誌');
                  setIsEditingTitle(false);
                }
              } else {
                // 如果沒有在編輯，進入編輯模式
                setIsEditingTitle(true);
              }
            }} 
            className="p-2 bg-white border-2 border-[#86A38E] text-[#86A38E] rounded-xl shadow-sm active:scale-95 transition-all"
          >
            <Edit size={18} />
          </button>
        </div>
        <div className="mb-6 px-4">
          {!isStartDateLoaded ? (
            <div className="text-center py-4 text-[#86A38E] text-sm">載入日期中...</div>
          ) : (
            <DateSelector 
              selectedDay={selectedDay} 
              onSelectDay={setSelectedDay}
              startDate={startDate}
              onUpdateStartDate={handleUpdateStartDate}
            />
          )}
        </div>

        {/* 語言選擇器 */}
        <div className="mb-4 px-4">
          <div className="bg-white rounded-xl p-3 shadow-[4px_4px_0px_#E0E5D5]">
            <label className="block text-xs text-gray-500 mb-2">翻譯語言</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as 'th' | 'en' | 'ja' | 'ko')}
              className="w-full px-3 py-2 border-2 border-[#E0E5D5] rounded-lg focus:outline-none focus:border-[#86A38E] transition-colors text-sm"
            >
              <option value="th">泰文</option>
              <option value="en">英文</option>
              <option value="ja">日文</option>
              <option value="ko">韓文</option>
            </select>
          </div>
        </div>
        
        {isLoading ? <div className="text-center py-10 text-[#86A38E]">載入中...</div> : (
          <Timeline
            items={items.map(item => ({ ...item, icon: getIconComponentByName(item.iconName) }))}
            onItemClick={(item: any) => { setEditingItem(item); setIsModalOpen(true); }}
            onAddClick={() => { setEditingItem(null); setIsModalOpen(true); }}
            onNavigate={(item: any) => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.thaiName || item.title)}`)}
            onCopyAddress={(text: string) => navigator.clipboard.writeText(text)}
            targetLang={targetLang}
            translateText={(text: string, lang: 'th' | 'en' | 'ja' | 'ko') => translateText(text, lang, 'zh-TW')}
          />
        )}
          <TimelineItemModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
          onSubmit={handleSubmitItem}
          onDelete={editingItem ? () => handleDeleteItem(editingItem.id) : undefined}
          initialData={editingItem || undefined}
        />
      </>
    );
      case 'booking':
        return (
          <div className="px-4 py-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-[#86A38E]">預訂</h1>
              <button
                onClick={() => {
                  setEditingBooking(null);
                  setIsBookingModalOpen(true);
                }}
                className="p-2 bg-white border-2 border-[#86A38E] text-[#86A38E] rounded-xl shadow-sm active:scale-95 transition-all"
                aria-label="新增預訂"
              >
                <Plus size={18} />
              </button>
            </div>
            
            {isLoadingBookings ? (
              <div className="text-center py-10 text-[#86A38E]">載入中...</div>
            ) : bookings.length === 0 ? (
              <div className="bg-white rounded-xl p-8 shadow-[4px_4px_0px_#E0E5D5] text-center">
                <Ticket size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">尚無預訂資料</p>
                <button
                  onClick={() => {
                    setEditingBooking(null);
                    setIsBookingModalOpen(true);
                  }}
                  className="mt-4 px-4 py-2 bg-[#86A38E] text-white rounded-lg hover:bg-[#7a9382] transition-colors active:scale-95"
                >
                  新增預訂
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 航空機票 */}
                {bookings.filter(b => b.type === 'flight').map((booking) => (
                  <FlightCard
                    key={booking.id}
                    airline={booking.airline}
                    flightNo={booking.flightNo}
                    depTime={booking.depTime}
                    arrTime={booking.arrTime}
                    depCity={booking.depCity}
                    arrCity={booking.arrCity}
                    bookingRef={booking.bookingRef}
                    showDelete={true}
                    onClick={() => {
                      setEditingBooking(booking);
                      setIsBookingModalOpen(true);
                    }}
                    onDelete={async () => {
                      if (window.confirm('確定要刪除此預訂嗎？')) {
                        if (!db) return;
                        try {
                          await deleteDoc(doc(db, 'bookings', booking.id));
                        } catch (e) {
                          console.error("Error deleting booking: ", e);
                          setError("刪除預訂時發生錯誤，請稍後再試。");
                        }
                      }
                    }}
                  />
                ))}

                {/* 住宿飯店 */}
                {bookings.filter(b => b.type === 'hotel').map((booking) => (
                  <HotelCard
                    key={booking.id}
                    hotelName={booking.hotelName}
                    hotelAddress={booking.hotelAddress}
                    imageUrl={booking.imageUrl}
                    checkIn={booking.checkIn}
                    checkOut={booking.checkOut}
                    price={booking.price}
                    memberCount={members.length || 1}
                    showDelete={true}
                    onClick={() => {
                      setEditingBooking(booking);
                      setIsBookingModalOpen(true);
                    }}
                    onDelete={async () => {
                      if (window.confirm('確定要刪除此預訂嗎？')) {
                        if (!db) return;
                        try {
                          await deleteDoc(doc(db, 'bookings', booking.id));
                        } catch (e) {
                          console.error("Error deleting booking: ", e);
                          setError("刪除預訂時發生錯誤，請稍後再試。");
                        }
                      }
                    }}
                  />
                ))}

                {/* 交通/租車 */}
                {bookings.filter(b => b.type === 'transport').map((booking) => (
                  <div 
                    key={booking.id} 
                    className="bg-white rounded-xl p-4 shadow-[4px_4px_0px_#E0E5D5] cursor-pointer hover:shadow-[6px_6px_0px_#E0E5D5] transition-all active:scale-[0.98] relative"
                    onClick={() => {
                      setEditingBooking(booking);
                      setIsBookingModalOpen(true);
                    }}
                  >
                    {/* 刪除按鈕 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('確定要刪除此預訂嗎？')) {
                          if (!db) return;
                          deleteDoc(doc(db, 'bookings', booking.id)).catch((e) => {
                            console.error("Error deleting booking: ", e);
                            setError("刪除預訂時發生錯誤，請稍後再試。");
                          });
                        }
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors active:scale-95 z-10 shadow-sm"
                      aria-label="刪除"
                    >
                      <X size={14} />
                    </button>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[#86A38E] flex items-center justify-center flex-shrink-0">
                        <Car size={20} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 mb-2">{booking.transportType || booking.title || '交通方式'}</div>
                        <div className="space-y-1.5 text-sm text-gray-600">
                          {booking.pickupTime && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              <span className="font-medium">取車：</span>
                              <span>{booking.pickupTime}</span>
                              {booking.pickupLocation && (
                                <span className="text-gray-400">@ {booking.pickupLocation}</span>
                              )}
                            </div>
                          )}
                          {booking.dropoffTime && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                              <span className="font-medium">還車：</span>
                              <span>{booking.dropoffTime}</span>
                              {booking.dropoffLocation && (
                                <span className="text-gray-400">@ {booking.dropoffLocation}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 憑證清單 */}
                {bookings.filter(b => b.type === 'voucher').length > 0 && (
                  <div className="bg-white rounded-xl p-4 shadow-[4px_4px_0px_#E0E5D5]">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={20} className="text-[#86A38E]" />
                      <h3 className="text-lg font-bold text-gray-800">憑證清單</h3>
                    </div>
                    <div className="space-y-2">
                      {bookings.filter(b => b.type === 'voucher').map((booking) => (
                        <div
                          key={booking.id}
                          className="relative flex items-center justify-between p-3 bg-[#F7F4EB] rounded-lg hover:bg-[#E0E5D5] transition-colors cursor-pointer active:scale-95"
                          onClick={() => {
                            if (booking.voucherUrl) {
                              window.open(booking.voucherUrl, '_blank');
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {booking.voucherType === 'pdf' ? (
                              <FileText size={18} className="text-red-500" />
                            ) : (
                              <Camera size={18} className="text-blue-500" />
                            )}
                            <span className="text-gray-800 font-medium">{booking.voucherName || booking.title || '未命名憑證'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {booking.voucherUrl && (
                              <ExternalLink size={16} className="text-gray-400" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('確定要刪除此憑證嗎？')) {
                                  if (!db) return;
                                  deleteDoc(doc(db, 'bookings', booking.id)).catch((e) => {
                                    console.error("Error deleting booking: ", e);
                                    setError("刪除預訂時發生錯誤，請稍後再試。");
                                  });
                                }
                              }}
                              className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors active:scale-95 z-10 shadow-sm"
                              aria-label="刪除"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 預訂 Modal */}
            <BookingModal
              isOpen={isBookingModalOpen}
              onClose={() => {
                setIsBookingModalOpen(false);
                setEditingBooking(null);
              }}
              onSubmit={handleSubmitBooking}
              initialData={editingBooking}
            />
          </div>
        );
      case 'translation':
        return (
          <div className="px-4 py-6">
            <h1 className="text-3xl font-bold text-[#86A38E] mb-6">翻譯工具</h1>
            
            {/* 語言選擇 */}
            <div className="bg-white rounded-xl p-4 shadow-[4px_4px_0px_#E0E5D5] mb-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 源語言 */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">從</label>
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value as 'zh-TW' | 'th' | 'en' | 'ja' | 'ko')}
                    className="w-full px-3 py-2 border-2 border-[#E0E5D5] rounded-lg focus:outline-none focus:border-[#86A38E] transition-colors text-sm"
                  >
                    <option value="zh-TW">中文</option>
                    <option value="th">泰文</option>
                    <option value="en">英文</option>
                    <option value="ja">日文</option>
                    <option value="ko">韓文</option>
                  </select>
                </div>
                
                {/* 目標語言 */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">到</label>
                  <select
                    value={targetLangForTool}
                    onChange={(e) => setTargetLangForTool(e.target.value as 'th' | 'en' | 'ja' | 'ko' | 'zh-TW')}
                    className="w-full px-3 py-2 border-2 border-[#E0E5D5] rounded-lg focus:outline-none focus:border-[#86A38E] transition-colors text-sm"
                  >
                    <option value="th">泰文</option>
                    <option value="en">英文</option>
                    <option value="ja">日文</option>
                    <option value="ko">韓文</option>
                    <option value="zh-TW">中文</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 輸入框 */}
            <div className="bg-white rounded-xl p-4 shadow-[4px_4px_0px_#E0E5D5] mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                輸入要翻譯的文字
              </label>
              <textarea
                value={translationInput}
                onChange={(e) => setTranslationInput(e.target.value)}
                placeholder="請輸入要翻譯的文字..."
                className="w-full px-4 py-3 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors resize-none"
                rows={4}
              />
              <button
                onClick={handleTranslate}
                disabled={isTranslating || !translationInput.trim()}
                className="w-full mt-3 px-4 py-2.5 bg-[#86A38E] text-white rounded-xl font-medium hover:bg-[#7a9382] transition-colors shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTranslating ? '翻譯中...' : '翻譯'}
              </button>
            </div>

            {/* 翻譯結果 */}
            {translationResult && (
              <div className="bg-white rounded-xl p-4 shadow-[4px_4px_0px_#E0E5D5]">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    翻譯結果
                  </label>
                  <button
                    onClick={handleCopyTranslation}
                    className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors active:scale-95 flex items-center gap-1"
                  >
                    <Copy size={14} />
                    複製
                  </button>
                </div>
                <div className="px-4 py-3 bg-[#F7F4EB] rounded-lg text-gray-800 min-h-[60px]">
                  {translationResult}
                </div>
              </div>
            )}
          </div>
        );
      case 'accounting': {
        const amountNum = parseFloat(expAmount || '0');
        const approxTWD =
          !Number.isNaN(amountNum) && amountNum > 0
            ? Math.round(amountNum * (fxRates[expCurrency] || 0))
            : 0;

        // ===== 結算邏輯（重新實作）：依據 expenses 精準計算每人 Paid / Owed / Net =====
        const settlementStats = members.map((member) => {
          // 代墊總額：所有由他付款的台幣總和
          const paid = expenses.reduce((sum, e) => {
            if (!e.amountTWD || e.amountTWD <= 0) return sum;
            return e.payerId === member.id ? sum + e.amountTWD : sum;
          }, 0);

          // 應付總額：他身為分攤對象時，依照 splitWith 平均分攤
          const owed = expenses.reduce((sum, e) => {
            if (!e.amountTWD || e.amountTWD <= 0) return sum;
            const participantIds =
              e.splitWith && e.splitWith.length > 0
                ? e.splitWith
                : members.map((m) => m.id);
            if (participantIds.length === 0) return sum;
            if (!participantIds.includes(member.id)) return sum;

            const share = e.amountTWD / participantIds.length;
            return sum + share;
          }, 0);

          const net = paid - owed;
          return { member, paid, owed, net };
        });

        // 依據最終淨額產生「誰給誰」的轉帳指令
        const creditors = settlementStats
          .filter((s) => s.net > 1) // > 1 TWD 避免浮點誤差
          .map((s) => ({ ...s }));
        const debtors = settlementStats
          .filter((s) => s.net < -1)
          .map((s) => ({ ...s }));

        // 債權人由大到小，債務人由絕對值大到小
        creditors.sort((a, b) => b.net - a.net);
        debtors.sort((a, b) => a.net - b.net);

        type Transfer = { from: string; to: string; amount: number };
        const transfers: Transfer[] = [];

        let i = 0;
        let j = 0;
        while (i < creditors.length && j < debtors.length) {
          const cred = creditors[i];
          const debt = debtors[j];
          const amount = Math.min(cred.net, -debt.net);

          if (amount > 1) {
            transfers.push({
              from: debt.member.name,
              to: cred.member.name,
              // 顯示一律取整數
              amount: Math.round(amount),
            });
          }

          cred.net -= amount;
          debt.net += amount;

          if (cred.net <= 1) i += 1;
          if (debt.net >= -1) j += 1;
        }

        const settlementText =
          transfers.length === 0
            ? '大家目前已經平均，沒有需要額外結算的金額。'
            : transfers
                .map(
                  (t) =>
                    `${t.from} ➔ ${t.to}：${t.amount.toLocaleString()} TWD`
                )
                .join('\n');

        return (
          <div className="px-4 py-6">
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-[#86A38E]">記帳</h1>
            </div>

            {/* 訊息提示列 */}
            {accountingMessage && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-yellow-50 border border-yellow-300 text-xs text-yellow-800">
                {accountingMessage}
              </div>
            )}

            {/* 上方 Segmented Control：記帳 / 明細 */}
            <div className="mb-4">
              <div className="bg-[#F7F4EB] rounded-full p-1 flex">
                <button
                  type="button"
                  onClick={() => setAccountingSubTab('form')}
                  className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${
                    accountingSubTab === 'form'
                      ? 'bg-[#86A38E] text-white shadow-sm'
                      : 'bg-transparent text-gray-600'
                  }`}
                >
                  記帳
                </button>
                <button
                  type="button"
                  onClick={() => setAccountingSubTab('list')}
                  className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${
                    accountingSubTab === 'list'
                      ? 'bg-[#86A38E] text-white shadow-sm'
                      : 'bg-transparent text-gray-600'
                  }`}
                >
                  明細
                </button>
              </div>
            </div>

            {/* 內嵌記帳表單 */}
            {accountingSubTab === 'form' && (
              <div className="bg-white rounded-3xl p-4 shadow-[4px_4px_0px_#E0E5D5] space-y-4">
                {/* 日期 */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">日期</div>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F7F4EB] border border-[#E0E5D5] text-sm"
                  />
                </div>

                {/* 幣別 */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">幣別</div>
                  <div className="grid grid-cols-4 gap-2">
                    {(['KRW', 'TWD', 'USD', 'THB'] as FxCurrency[]).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setExpCurrency(code)}
                        className={`py-2 text-xs rounded-xl border-2 transition-colors ${
                          expCurrency === code
                            ? 'bg-[#86A38E] text-white border-[#86A38E] shadow-sm'
                            : 'bg-white text-gray-700 border-[#E0E5D5]'
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 金額 + 約合台幣 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">金額</div>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl text-sm focus:outline-none focus:border-[#86A38E]"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">約合台幣</div>
                    <div className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl bg-[#F7F4EB] text-sm text-right font-bold text-[#86A38E]">
                      {approxTWD > 0 ? `${approxTWD.toLocaleString()} TWD` : '—'}
                    </div>
                  </div>
                </div>

                {/* 支付方式 */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">支付方式</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'cash', label: '現金' },
                      { value: 'card', label: '信用卡' },
                    ].map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setExpPaymentMethod(o.value as 'cash' | 'card')}
                        className={`py-2 text-xs rounded-xl border-2 transition-colors ${
                          expPaymentMethod === o.value
                            ? 'bg-[#FFB84D] border-[#FFB84D] text-white'
                            : 'bg-white border-[#E0E5D5] text-gray-700'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 地點 */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">地點（選填）</div>
                  <input
                    type="text"
                    value={expLocation}
                    onChange={(e) => setExpLocation(e.target.value)}
                    placeholder="例如：便利商店"
                    className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl text-sm focus:outline-none focus:border-[#86A38E]"
                  />
                </div>

                {/* 消費項目 */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">消費項目</div>
                  <input
                    type="text"
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    placeholder="例如：午餐"
                    className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl text-sm focus:outline-none focus:border-[#86A38E]"
                  />
                </div>

                {/* 付款人頭像選取器 */}
                <div>
                  <div className="text-xs text-gray-500 mb-2">付款人</div>
                  <div className="flex gap-2 overflow-x-auto">
                    {members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setExpPayerId(m.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                          expPayerId === m.id
                            ? 'border-[#86A38E] bg-[#E0F1E3]'
                            : 'border-transparent bg-transparent'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold">
                          {m.name[0]}
                        </div>
                        <span className="text-xs text-gray-800 whitespace-nowrap">
                          {m.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 分攤對象（多選） */}
                <div>
                  <div className="text-xs text-gray-500 mb-2">分攤對象（可多選）</div>
                  <div className="flex gap-2 overflow-x-auto">
                    {members.map((m) => {
                      const selected = expParticipants.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setExpParticipants((prev) =>
                              prev.includes(m.id)
                                ? prev.filter((id) => id !== m.id)
                                : [...prev, m.id]
                            );
                          }}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border relative ${
                            selected
                              ? 'border-[#86A38E] bg-[#E0F1E3]'
                              : 'border-[#E0E5D5] bg-white'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold">
                            {m.name[0]}
                          </div>
                          <span className="text-xs text-gray-800 whitespace-nowrap">
                            {m.name}
                          </span>
                          {selected && (
                            <span className="ml-1 text-[10px] text-[#86A38E] font-semibold">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 記帳按鈕 */}
                <button
                  type="button"
                  onClick={handleAddExpense}
                  className="w-full mt-2 py-2.5 bg-[#86A38E] text-white rounded-xl font-medium hover:bg-[#7a9382] transition-colors active:scale-95"
                >
                  記帳
                </button>
              </div>
            )}

            {/* 明細列表（使用 expenses 狀態，依日期分組 + 摺疊） */}
            {accountingSubTab === 'list' && (
              <div className="space-y-4">
                {/* 全部展開 / 全部縮小 開關 */}
                <div className="flex justify-end mb-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (expenses.length === 0) return;
                      const dates = Array.from(new Set(expenses.map((e) => e.date))).sort();
                      const nextExpandAll = !expandAllDates;
                      setExpandAllDates(nextExpandAll);
                      setCollapsedDates(
                        dates.reduce<Record<string, boolean>>((acc, d) => {
                          acc[d] = !nextExpandAll;
                          return acc;
                        }, {})
                      );
                    }}
                    className="px-3 py-1.5 text-xs rounded-full border border-[#86A38E] text-[#86A38E]"
                  >
                    {expandAllDates ? '全部縮小' : '全部展開'}
                  </button>
                </div>

                {/* 分組明細列表 */}
                <div className="space-y-3">
                  {isLoadingExpenses ? (
                    <div className="bg-white rounded-xl p-6 text-center text-[#86A38E] shadow-[4px_4px_0px_#E0E5D5]">
                      載入中…
                    </div>
                  ) : expenses.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center shadow-[4px_4px_0px_#E0E5D5]">
                      <p className="text-gray-600 mb-2">尚無記帳紀錄</p>
                      <p className="text-xs text-gray-400">請先在「記帳」分頁新增。</p>
                    </div>
                  ) : (
                    (() => {
                      // 依日期分組
                      const groups: Record<string, Expense[]> = {};
                      expenses.forEach((e) => {
                        const key = e.date || '未填日期';
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(e);
                      });

                      const sortedDates = Object.keys(groups).sort(); // 由舊到新

                      const formatDateLabel = (dateStr: string) => {
                        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                          return dateStr || '未填日期';
                        }

                        const [y, m, d] = dateStr.split('-');
                        const dateObj = new Date(dateStr + 'T00:00:00');
                        const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
                        const weekday = weekdays[dateObj.getDay()];

                        // 計算 Day X：使用「該筆帳單日期 - 行程開始日期 + 1」，只在差值 >= 0 時顯示
                        let dayLabel = '';
                        if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
                          const start = new Date(startDate + 'T00:00:00');
                          const diffDays = Math.floor(
                            (dateObj.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                          );
                          if (!Number.isNaN(diffDays) && diffDays >= 0) {
                            dayLabel = ` Day ${diffDays + 1}`;
                          }
                        }

                        return `${y}/${m}/${d} (${weekday})${dayLabel}`;
                      };

                      return sortedDates.map((dateStr) => {
                        const items = groups[dateStr];
                        const dailyTotal = Math.round(
                          items.reduce((sum, e) => sum + (e.amountTWD || 0), 0)
                        );
                        const isCollapsed = collapsedDates[dateStr] ?? false;

                        return (
                          <div key={dateStr} className="space-y-2">
                            {/* 日期標題列 */}
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedDates((prev) => ({
                                  ...prev,
                                  [dateStr]: !isCollapsed,
                                }))
                              }
                              className="w-full px-3 py-2 rounded-xl bg-[#E6F0E9] flex items-center justify-between text-xs font-medium text-[#355844]"
                            >
                              <span>{formatDateLabel(dateStr)}</span>
                              <span className="flex items-center gap-2">
                                <span className="text-[11px] text-[#4B6B57]">
                                  當日合計：{dailyTotal.toLocaleString()} TWD
                                </span>
                                <span>{isCollapsed ? '＋' : '－'}</span>
                              </span>
                            </button>

                            {/* 日期內的明細項目 */}
                            {!isCollapsed && (
                              <div className="space-y-2">
                                {items.map((e) => {
                                  const splitNames =
                                    e.splitWith && e.splitWith.length > 0
                                      ? e.splitWith
                                          .map((id) => members.find((m) => m.id === id)?.name)
                                          .filter(Boolean)
                                          .join('、')
                                      : '';

                                  return (
                                    <div
                                      key={e.id}
                                      className="relative bg-white rounded-xl p-4 shadow-[4px_4px_0px_#E0E5D5]"
                                    >
                                      {/* 編輯按鈕（任何人都可見） */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingExpense(e);
                                          setIsExpenseModalOpen(true);
                                        }}
                                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white border border-[#E0E5D5] text-gray-500 flex items-center justify-center hover:bg-[#F7F4EB] hover:text-[#86A38E] transition-colors active:scale-95"
                                        aria-label="編輯此筆記帳"
                                      >
                                        <Edit size={14} />
                                      </button>

                                      <div className="flex justify-between mb-1 text-sm pr-8">
                                        <span className="font-medium text-gray-800">
                                          {e.title}
                                        </span>
                                        <span className="font-semibold text-[#86A38E]">
                                          {e.amount.toLocaleString()} {e.currency} ·{' '}
                                          {Math.round(e.amountTWD).toLocaleString()} TWD
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-gray-500 flex justify-between pr-8">
                                        <span>{e.date}</span>
                                        <span>
                                          付款人：{e.payerName}
                                          {splitNames && ` ／ 分攤：${splitNames}`}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()
                  )}
                </div>

                {/* 結算總覽 */}
                <div className="bg-white rounded-xl p-4 shadow-[4px_4px_0px_#E0E5D5] space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-800">結算總覽</h2>
                    <button
                      type="button"
                      disabled={transfers.length === 0}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(settlementText);
                          alert('已複製結算結果到剪貼簿');
                        } catch (e) {
                          console.error(e);
                          alert('複製失敗，請手動選取文字複製');
                        }
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg border border-[#86A38E] text-[#86A38E] disabled:opacity-50 disabled:border-gray-300 disabled:text-gray-400"
                    >
                      複製結算文字
                    </button>
                  </div>

                  {/* 每人淨額摘要 */}
                  {members.length > 0 && (
                    <div className="space-y-1 text-xs text-gray-700">
                      {settlementStats.map((s) => (
                        <div key={s.member.id} className="flex justify-between">
                          <span>{s.member.name}</span>
                          <span>
                            代墊 {Math.round(s.paid).toLocaleString()} − 應付{' '}
                            {Math.round(s.owed).toLocaleString()} ={' '}
                            <span
                              className={
                                s.net > 1
                                  ? 'text-[#86A38E] font-semibold'
                                  : s.net < -1
                                  ? 'text-red-500 font-semibold'
                                  : 'text-gray-400'
                              }
                            >
                              {Math.round(s.net).toLocaleString()} TWD
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 最終結算清單 */}
                  <div className="mt-2">
                    {transfers.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        大家目前已經平均，沒有需要額外結算的金額。
                      </p>
                    ) : (
                      <ul className="space-y-1 text-xs text-gray-800">
                        {transfers.map((t, idx) => (
                          <li key={`${t.from}-${t.to}-${idx}`}>
                            {t.from} ➔ {t.to}：{t.amount.toLocaleString()} TWD
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'members':
        return (
          <div className="px-4 py-6">
            <h1 className="text-3xl font-bold text-[#86A38E] mb-6">成員</h1>
            
            {/* 新增成員按鈕 */}
            <button
              onClick={() => setIsMemberModalOpen(true)}
              className="w-full mb-4 bg-white rounded-xl p-4 border-2 border-dashed border-[#86A38E] text-[#86A38E] hover:bg-[#86A38E] hover:text-white transition-colors shadow-[4px_4px_0px_#E0E5D5] active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              <span className="font-medium">新增成員</span>
            </button>

            {/* 成員列表 */}
            <div className="space-y-3">
              {members.length === 0 ? (
                <div className="bg-white rounded-xl p-8 shadow-[4px_4px_0px_#E0E5D5] text-center">
                  <p className="text-gray-500 text-sm">尚無成員，請新增成員</p>
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="bg-white rounded-xl p-4 shadow-[4px_4px_0px_#E0E5D5] flex items-center justify-between"
                  >
                    <span className="text-gray-800 font-medium">{member.name}</span>
                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors active:scale-95"
                      aria-label="刪除成員"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* 工程師模式區域 */}
            <div className="mt-8 pt-4 border-t border-[#E0E5D5]">
              <div className="text-xs text-gray-500 mb-2">工程師模式</div>
              
              {!isAdmin ? (
                <div className="space-y-2">
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAdminLogin();
                      }
                    }}
                    placeholder="請輸入工程師密碼"
                    className="w-full px-4 py-2 border-2 border-[#E0E5D5] rounded-lg focus:outline-none focus:border-[#86A38E] transition-colors text-sm"
                  />
                  <button
                    onClick={handleAdminLogin}
                    className="w-full py-2 px-4 bg-[#86A38E] text-white rounded-lg text-sm font-medium hover:bg-[#7a9382] transition-colors active:scale-95"
                  >
                    確認
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-[#86A38E] mb-2">✓ 工程師模式已啟用</div>
                  <button
                    onClick={handleDeleteAllMembers}
                    className="w-full py-2 px-4 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors active:scale-95"
                  >
                    ⚠️ 一鍵刪除所有成員
                  </button>
                  <button
                    onClick={handleDeleteAllItems}
                    className="w-full py-2 px-4 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors active:scale-95"
                  >
                    ⚠️ 一鍵刪除所有行程
                  </button>
                  <button
                    onClick={handleDeleteAllExpenses}
                    className="w-full py-2 px-4 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors active:scale-95"
                  >
                    ⚠️ 一鍵刪除所有記帳
                  </button>
                  <button
                    onClick={handleDeleteAllBookings}
                    className="w-full py-2 px-4 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors active:scale-95"
                  >
                    ⚠️ 一鍵刪除所有預訂
                  </button>
                </div>
              )}
            </div>

            {/* 新增成員 Modal */}
            {isMemberModalOpen && (
              <>
                <div
                  className="fixed inset-0 bg-black/30 z-40"
                  onClick={() => {
                    setIsMemberModalOpen(false);
                    setNewMemberName('');
                  }}
                />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                  <div
                    className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-[4px_4px_0px_#E0E5D5] pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-[#86A38E]">新增成員</h2>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMemberModalOpen(false);
                          setNewMemberName('');
                        }}
                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
                        aria-label="關閉"
                      >
                        <X size={20} className="text-gray-500" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          成員名稱
                        </label>
                        <input
                          type="text"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddMember();
                            }
                          }}
                          placeholder="請輸入成員名稱"
                          className="w-full px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl focus:outline-none focus:border-[#86A38E] transition-colors"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMemberModalOpen(false);
                            setNewMemberName('');
                          }}
                          className="flex-1 px-4 py-2.5 border-2 border-[#E0E5D5] rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors active:scale-95"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={handleAddMember}
                          className="flex-1 px-4 py-2.5 bg-[#86A38E] text-white rounded-xl font-medium hover:bg-[#7a9382] transition-colors shadow-sm active:scale-95"
                        >
                          新增
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F4EB] flex items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-sm bg-white shadow-2xl overflow-hidden relative h-screen sm:h-[844px] sm:rounded-[2.5rem]">
        <div className="bg-[#F7F4EB] overflow-y-auto h-[calc(100%-5rem)]">
          <div className="py-6 pb-24">{renderTabContent()}</div>
        </div>
        <nav className="absolute bottom-0 w-full bg-white/80 backdrop-blur-md border-t flex justify-around py-4 pb-8 sm:pb-4">
          <button onClick={() => setActiveTab('schedule')} className={`flex flex-col items-center gap-1 transition-colors active:scale-90 ${activeTab === 'schedule' ? 'text-[#86A38E]' : 'text-gray-400'}`}>
            <Calendar size={24} /><span className="text-[10px] font-bold">行程</span>
          </button>
          <button onClick={() => setActiveTab('booking')} className={`flex flex-col items-center gap-1 transition-colors active:scale-90 ${activeTab === 'booking' ? 'text-[#86A38E]' : 'text-gray-400'}`}>
            <Ticket size={24} /><span className="text-[10px] font-bold">預訂</span>
          </button>
          <button onClick={() => setActiveTab('translation')} className={`flex flex-col items-center gap-1 transition-colors active:scale-90 ${activeTab === 'translation' ? 'text-[#86A38E]' : 'text-gray-400'}`}>
            <Languages size={24} /><span className="text-[10px] font-bold">翻譯</span>
          </button>
          <button onClick={() => setActiveTab('accounting')} className={`flex flex-col items-center gap-1 transition-colors active:scale-90 ${activeTab === 'accounting' ? 'text-[#86A38E]' : 'text-gray-400'}`}>
            <Wallet size={24} /><span className="text-[10px] font-bold">記帳</span>
          </button>
          <button onClick={() => setActiveTab('members')} className={`flex flex-col items-center gap-1 transition-colors active:scale-90 ${activeTab === 'members' ? 'text-[#86A38E]' : 'text-gray-400'}`}>
            <Users size={24} /><span className="text-[10px] font-bold">成員</span>
          </button>
        </nav>
        {/* 全域記帳編輯視窗：固定在最上層，避免被分頁結構限制 */}
        <ExpenseEditModal
          isOpen={isExpenseModalOpen}
          expense={editingExpense}
          members={members}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          onSave={handleSaveExpense}
          onDelete={handleDeleteExpense}
        />
      </div>
    </div>
  );
}

export default App;