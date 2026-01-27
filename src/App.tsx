import { useState, useEffect } from 'react'
import DateSelector from './components/DateSelector'
import Timeline, { type TimelineItemType } from './components/Timeline'
import TimelineItemModal from './components/TimelineItemModal'
import { Calendar, Ticket, Wallet, ListChecks, MapPin, Utensils, Edit, ShoppingBag, Camera, AlertCircle } from 'lucide-react'
import { db } from './api/firebase'
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp, type Unsubscribe } from 'firebase/firestore'

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

type TabType = 'schedule' | 'booking' | 'accounting' | 'preparation'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('schedule')
  const [items, setItems] = useState<TimelineItem[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1. 解決 F5 跳回 30 號的關鍵：從 LocalStorage 讀取上次選的天數
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const saved = localStorage.getItem('last_selected_day');
    return saved ? parseInt(saved, 10) : 1; // 沒存過才用第 1 天
  });

  // 2. 當選中天數改變時，存入記憶體並重新抓取 Firestore 資料
  useEffect(() => {
    if (!db) return;
    setIsLoading(true);
    localStorage.setItem('last_selected_day', selectedDay.toString()); // 記住這動

    const q = query(
      collection(db, 'schedule'),
      where('day', '==', selectedDay), // 確保 3 個日期的資料分開
      orderBy('time', 'asc')
    );

    const unsubscribe: Unsubscribe = onSnapshot(q, (snapshot) => {
      setIsLoading(false);
      const fetchedItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TimelineItem[];
      setItems(fetchedItems);
    }, (err) => {
      setError("連線錯誤");
      setIsLoading(false);
    });

    return () => { unsubscribe(); };
  }, [selectedDay]);

  // 3. 刪除功能實作
  const handleDeleteItem = async (id: string) => {
    if (window.confirm("確定要刪除這個行程嗎？")) {
      try {
        await deleteDoc(doc(db, 'schedule', id));
        setIsModalOpen(false);
        setEditingItem(null);
      } catch (e) { alert("刪除失敗"); }
    }
  };

  const handleSubmitItem = async (data: any) => {
    if (!db) return;
    const itemData = {
      ...data,
      day: selectedDay, // 新增時自動標記為目前選擇的天數
      iconName: data.category === 'food' ? 'Utensils' : data.category === 'attraction' ? 'MapPin' : data.category === 'shopping' ? 'ShoppingBag' : 'Camera',
      updatedAt: serverTimestamp()
    };
    if (editingItem) {
      await updateDoc(doc(db, 'schedule', editingItem.id), itemData);
    } else {
      await addDoc(collection(db, 'schedule'), { ...itemData, createdAt: serverTimestamp() });
    }
    setIsModalOpen(false);
    setEditingItem(null);
  }

  const getIconComponentByName = (name: string) => {
    if (name === 'Utensils') return <Utensils size={20} />;
    if (name === 'ShoppingBag') return <ShoppingBag size={20} />;
    if (name === 'Camera') return <Camera size={20} />;
    return <MapPin size={20} />;
  }

  const renderTabContent = () => {
    if (activeTab !== 'schedule') return <div className="text-center py-10">功能建設中...</div>;
    return (
      <>
        <div className="flex items-center justify-between mb-6 px-4">
          <h1 className="text-3xl font-bold text-[#86A38E]">旅程日誌</h1>
          <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="p-2 bg-white border-2 border-[#86A38E] text-[#86A38E] rounded-lg">
            <Edit size={18} />
          </button>
        </div>
        <div className="mb-6 px-4">
          {/* 傳入 selectedDay 確保同步 */}
          <DateSelector selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        </div>
        {isLoading ? <div className="text-center">載入中...</div> : (
          <Timeline
            items={items.map(item => ({ ...item, icon: getIconComponentByName(item.iconName) }))}
            onItemClick={(item: any) => { setEditingItem(item); setIsModalOpen(true); }}
            onAddClick={() => { setEditingItem(null); setIsModalOpen(true); }}
            onNavigate={(item: any) => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.thaiName || item.title)}`)}
            onCopyAddress={(text: string) => navigator.clipboard.writeText(text)}
          />
        )}
        <TimelineItemModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
          onSubmit={handleSubmitItem}
          // 支援刪除按鈕
          onDelete={editingItem ? () => handleDeleteItem(editingItem.id) : undefined}
          initialData={editingItem || undefined}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EB] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden relative h-[844px]">
        <div className="bg-[#F7F4EB] overflow-y-auto h-[calc(100%-4rem)]">
          <div className="py-6 pb-24">{renderTabContent()}</div>
        </div>
        <nav className="absolute bottom-0 w-full bg-white border-t flex justify-around py-3">
          <button onClick={() => setActiveTab('schedule')} className={`flex flex-col items-center ${activeTab === 'schedule' ? 'text-[#86A38E]' : 'text-gray-400'}`}>
            <Calendar size={22} /><span className="text-[10px]">行程</span>
          </button>
          <button onClick={() => setActiveTab('booking')} className={`flex flex-col items-center ${activeTab === 'booking' ? 'text-[#86A38E]' : 'text-gray-400'}`}>
            <Ticket size={22} /><span className="text-[10px]">預訂</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export default App;