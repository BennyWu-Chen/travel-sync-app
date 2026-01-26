import { useState, useEffect } from 'react'
import DateSelector from './components/DateSelector'
import Timeline, { type TimelineItemType } from './components/Timeline'
import TimelineItemModal from './components/TimelineItemModal'
import { Calendar, Ticket, Wallet, ListChecks, MapPin, Utensils, Edit, ShoppingBag, Camera, AlertCircle } from 'lucide-react'
import { db } from './api/firebase'
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where, orderBy } from 'firebase/firestore'

// 定義 TimelineItem 以包含 Firestore id
interface TimelineItem {
  id: string;
  time: string;
  title: string;
  category: TimelineItemType;
  address?: string;
  thaiName?: string;
  iconName: string;
  day: number; // 新增天數欄位
}

type TabType = 'schedule' | 'booking' | 'accounting' | 'preparation'

const Loading = () => (
  <div className="text-center text-[#86A38E] text-lg font-medium py-4">載入中...</div>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center p-4 text-red-700 bg-red-100 rounded-lg shadow-sm mx-4">
    <AlertCircle size={20} className="mr-2" />
    <p className="text-base font-medium">錯誤: {message}</p>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('schedule')
  const [items, setItems] = useState<TimelineItem[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState(1) // 1. 管理目前選中的天數

  // 從 Firestore 即時讀取行程資料 (依據選中天數過濾)
  useEffect(() => {
    if (!db) {
      setError("Firebase 連線失敗，請檢查配置。");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // 2. 建立帶有過濾條件的查詢
    const q = query(
      collection(db, 'schedule'),
      where('day', '==', selectedDay), // 只抓取目前選定天數的資料
      orderBy('time', 'asc')           // 依照時間排序
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsLoading(false);
      const fetchedItems: TimelineItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data() as any
      }))
      setItems(fetchedItems)
      setError(null);
    }, (err) => {
      console.error("Firestore Error: ", err);
      setError("無法載入行程資料。");
      setIsLoading(false);
    })

    return () => unsubscribe
  }, [selectedDay]) // 3. 當切換天數時，重新執行監聽

  const getIconNameByCategory = (category: TimelineItemType): string => {
    switch (category) {
      case 'food': return 'Utensils'
      case 'attraction': return 'MapPin'
      case 'shopping': return 'ShoppingBag'
      case 'other': return 'Camera'
      default: return 'MapPin'
    }
  }

  const getIconComponentByName = (iconName: string): React.ReactNode => {
    switch (iconName) {
      case 'Utensils': return <Utensils size={20} />
      case 'MapPin': return <MapPin size={20} />
      case 'ShoppingBag': return <ShoppingBag size={20} />
      case 'Camera': return <Camera size={20} />
      default: return <MapPin size={20} />
    }
  }

  // 處理新增/編輯行程
  const handleSubmitItem = async (data: {
    time: string
    title: string
    category: TimelineItemType
    address?: string
    thaiName?: string
  }) => {
    if (!db) return;

    const itemData = {
      time: data.time,
      title: data.title,
      category: data.category,
      address: data.address || null,
      thaiName: data.thaiName || null,
      iconName: getIconNameByCategory(data.category),
      day: selectedDay, // 4. 儲存時自動帶入目前選中的天數
    }

    try {
      if (editingItem) {
        const itemDocRef = doc(db, 'schedule', editingItem.id);
        await updateDoc(itemDocRef, itemData);
      } else {
        await addDoc(collection(db, 'schedule'), itemData);
      }
    } catch (e) {
      setError("儲存行程時發生錯誤。");
    } finally {
      setEditingItem(null);
      setIsModalOpen(false);
    }
  }

  const handleItemClick = (item: TimelineItem) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleAddClick = () => {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const handleNavigate = (item: TimelineItem) => {
    const input = item.thaiName || item.address || item.title;
    if (!input) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(input)}`, '_blank');
  };

  const handleCopyAddress = (text: string) => {
    navigator.clipboard.writeText(text).then(() => alert("地址已複製"));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'schedule':
        if (!db) return <ErrorMessage message="資料庫未連線" />;
        return (
          <>
            <div className="flex items-center justify-between mb-6 px-4">
              <h1 className="text-3xl font-bold text-[#86A38E]">旅程日誌</h1>
              <button onClick={handleAddClick} className="p-2 rounded-lg bg-white border-2 border-[#86A38E] text-[#86A38E] shadow-[2px_2px_0px_#E0E5D5]">
                <Edit size={18} />
              </button>
            </div>
            <div className="mb-6 px-4">
              {/* 5. 傳入選中天數與切換函數 */}
              <DateSelector 
                selectedDay={selectedDay} 
                onSelectDay={(day: number) => setSelectedDay(day)} 
              />
            </div>
            {isLoading ? <Loading /> : (
              <Timeline
                items={items.map(item => ({ ...item, icon: getIconComponentByName(item.iconName) }))}
                onItemClick={handleItemClick}
                onAddClick={handleAddClick}
                onNavigate={handleNavigate}
                onCopyAddress={handleCopyAddress}
              />
            )}
            <TimelineItemModal
              isOpen={isModalOpen}
              onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
              onSubmit={handleSubmitItem}
              initialData={editingItem || undefined}
            />
          </>
        )
      default:
        return <div className="text-center py-10">功能建設中...</div>
    }
  }

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'schedule', label: '行程', icon: <Calendar size={22} /> },
    { id: 'booking', label: '預訂', icon: <Ticket size={22} /> },
    { id: 'accounting', label: '記帳', icon: <Wallet size={22} /> },
    { id: 'preparation', label: '準備', icon: <ListChecks size={22} /> },
  ]

  return (
    <div className="min-h-screen bg-[#F7F4EB] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden relative" style={{ height: 'calc(100vh - 2rem)', maxHeight: '844px' }}>
        <div className="h-8 bg-[#F7F4EB] flex items-center justify-center">
          <div className="w-32 h-1.5 bg-gray-300 rounded-full"></div>
        </div>
        <div className="bg-[#F7F4EB] overflow-y-auto" style={{ height: 'calc(100% - 8rem)' }}>
          <div className="min-h-full py-6 pb-24">{renderTabContent()}</div>
        </div>
        <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E0E5D5] shadow-[0_-4px_0px_#E0E5D5]">
          <div className="flex items-center justify-around py-2.5">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 px-3 py-1.5 ${activeTab === item.id ? 'text-[#86A38E]' : 'text-gray-400'}`}>
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}

export default App