import { useState, useEffect } from 'react'
import DateSelector from './components/DateSelector'
import Timeline, { type TimelineItemType } from './components/Timeline'
import TimelineItemModal from './components/TimelineItemModal'
import { Calendar, Ticket, Wallet, ListChecks, MapPin, Utensils, Edit, ShoppingBag, Camera, AlertCircle } from 'lucide-react'
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

type TabType = 'schedule' | 'booking' | 'accounting' | 'preparation'

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

  // 2. 監聽資料庫中的「旅行起點日期」設定
  useEffect(() => {
    if (!db) return;
    const unsubConfig = onSnapshot(doc(db, 'config', 'trip_settings'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().startDate) {
        setStartDate(docSnap.data().startDate);
      }
    });
    return () => unsubConfig();
  }, []);

  // 3. 監聽資料庫中的「行程內容」，根據選中天數過濾
  useEffect(() => {
    if (!db) return;
    setIsLoading(true);
    localStorage.setItem('last_selected_day', selectedDay.toString());

    const q = query(
      collection(db, 'schedule'),
      where('day', '==', selectedDay), // 分天顯示關鍵
      orderBy('time', 'asc')
    );

    const unsubscribe: Unsubscribe = onSnapshot(q, (snapshot) => {
      setIsLoading(false);
      const fetchedItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TimelineItem[];
      setItems(fetchedItems);
      setError(null);
    }, (err) => {
      console.error(err);
      setError("資料載入失敗，請檢查網路或索引設定。");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDay]);

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

  // 5. 刪除行程功能
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

  const handleSubmitItem = async (data: any) => {
    if (!db) return;
    const itemData = {
      ...data,
      day: selectedDay,
      iconName: data.category === 'food' ? 'Utensils' : data.category === 'attraction' ? 'MapPin' : data.category === 'shopping' ? 'ShoppingBag' : 'Camera',
      updatedAt: serverTimestamp()
    };
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'schedule', editingItem.id), itemData);
      } else {
        await addDoc(collection(db, 'schedule'), { ...itemData, createdAt: serverTimestamp() });
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (e) { console.error(e); }
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
    if (activeTab !== 'schedule') return <div className="text-center py-20 text-gray-400">功能建設中...</div>;
    return (
      <>
        <div className="flex items-center justify-between mb-6 px-4">
          <h1 className="text-3xl font-bold text-[#86A38E]">旅程日誌</h1>
          <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="p-2 bg-white border-2 border-[#86A38E] text-[#86A38E] rounded-xl shadow-sm">
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
  }

  return (
    <div className="min-h-screen bg-[#F7F4EB] flex items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-sm bg-white shadow-2xl overflow-hidden relative h-screen sm:h-[844px] sm:rounded-[2.5rem]">
        <div className="bg-[#F7F4EB] overflow-y-auto h-[calc(100%-5rem)]">
          <div className="py-6 pb-24">{renderTabContent()}</div>
        </div>
        <nav className="absolute bottom-0 w-full bg-white/80 backdrop-blur-md border-t flex justify-around py-4 pb-8 sm:pb-4">
          <button onClick={() => setActiveTab('schedule')} className={`flex flex-col items-center gap-1 ${activeTab === 'schedule' ? 'text-[#86A38E]' : 'text-gray-400'}`}>
            <Calendar size={24} /><span className="text-[10px] font-bold">行程</span>
          </button>
          <button onClick={() => setActiveTab('booking')} className={`flex flex-col items-center gap-1 ${activeTab === 'booking' ? 'text-[#86A38E]' : 'text-gray-400'}`}>
            <Ticket size={24} /><span className="text-[10px] font-bold">預訂</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export default App;