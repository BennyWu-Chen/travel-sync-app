import { useState, useEffect } from 'react'
import DateSelector from './components/DateSelector'
import Timeline, { type TimelineItemType } from './components/Timeline'
import TimelineItemModal from './components/TimelineItemModal'
import FlightCard from './components/FlightCard'
import HotelCard from './components/HotelCard'
import BookingModal from './components/BookingModal'
import { Calendar, Ticket, Wallet, ListChecks, MapPin, Utensils, Edit, ShoppingBag, Camera, AlertCircle, Users, Plus, X, Languages, Copy, Plane, Hotel, Car, FileText, Navigation, ExternalLink } from 'lucide-react'
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
  iconName: string;
  day: number;
}

interface Member {
  id: string;
  name: string;
}

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
    const saved = localStorage.getItem('last_selected_day');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [startDate, setStartDate] = useState('2026-01-30');
  const [journeyTitle, setJourneyTitle] = useState('旅程日誌');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  // 階段二：工程師模式狀態
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  
  // 階段一：成員管理狀態
  const [members, setMembers] = useState<Member[]>([]);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');

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

  // 2. 監聽資料庫中的「旅行起點日期」和「旅程標題」設定
  useEffect(() => {
    if (!db) return;
    const unsubConfig = onSnapshot(doc(db, 'config', 'trip_settings'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.startDate) {
          setStartDate(data.startDate);
        }
        if (data.journeyTitle) {
          setJourneyTitle(data.journeyTitle);
        }
      }
    });
    return () => unsubConfig();
  }, []);

  // 3. 監聽資料庫中的「行程內容」，根據選中天數過濾
  useEffect(() => {
    if (!db) return;
    setIsLoading(true);
    localStorage.setItem('last_selected_day', selectedDay.toString());

    // 使用 where 查詢並在客戶端排序（避免索引問題）
    const q = query(
      collection(db, 'schedule'),
      where('day', '==', selectedDay)
    );

    const unsubscribe: Unsubscribe = onSnapshot(q, (snapshot) => {
      setIsLoading(false);
      const fetchedItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TimelineItem[];
      // 在客戶端按時間排序
      fetchedItems.sort((a, b) => a.time.localeCompare(b.time));
      setItems(fetchedItems);
      setError(null);
    }, (err: any) => {
      console.error("Firestore onSnapshot Error: ", err);
      setError("資料載入失敗，請檢查網路連線或稍後再試。");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDay]);

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
  }) => {
    if (!db) {
      setError("Firebase 連線失敗，無法儲存行程。");
      return;
    }
    
    const itemData = {
      time: data.time,
      title: data.title,
      category: data.category,
      address: data.address || null,
      thaiName: data.thaiName || null,
      day: editingItem ? editingItem.day : selectedDay, // 編輯時保留原 day，新增時使用 selectedDay
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
          <DateSelector 
            selectedDay={selectedDay} 
            onSelectDay={setSelectedDay}
            startDate={startDate}
            onUpdateStartDate={handleUpdateStartDate}
          />
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
      case 'accounting':
        return (
          <div className="px-4 py-6">
            <h1 className="text-3xl font-bold text-[#86A38E] mb-6">記帳</h1>
            <div className="bg-white rounded-[1.5rem] p-8 shadow-[4px_4px_0px_#E0E5D5] text-center">
              <p className="text-gray-800 text-base">記帳頁面建設中...</p>
            </div>
          </div>
        );
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
      </div>
    </div>
  );
}

export default App;