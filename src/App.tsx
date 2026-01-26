import { useState, useEffect } from 'react'
import DateSelector from './components/DateSelector'
import Timeline, { type TimelineItemType } from './components/Timeline' // 導入 TimelineItemType
import TimelineItemModal from './components/TimelineItemModal'
import { Calendar, Ticket, Wallet, ListChecks, MapPin, Utensils, Edit, ShoppingBag, Camera, AlertCircle } from 'lucide-react'
import { db } from './api/firebase' // 只保留這個導入
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore' // 添加 deleteDoc, query, where


// 定義 TimelineItem 以包含 Firestore id
interface TimelineItem {
  id: string; // Firestore document ID
  time: string;
  title: string;
  category: TimelineItemType;
  address?: string;
  thaiName?: string; // 新增泰文名稱欄位
  iconName: string; // 用於 Firestore 儲存的圖標名稱
  day?: number; // 新增 day 欄位，用於分天過濾
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
  const [isLoading, setIsLoading] = useState(true); // 新增載入狀態
  const [error, setError] = useState<string | null>(null); // 新增錯誤狀態
  const [selectedDay, setSelectedDay] = useState<number>(1); // 新增 selectedDay 狀態，預設值為 1

  // 從 Firestore 即時讀取行程資料（根據 selectedDay 過濾）
  useEffect(() => {
    if (!db) {
      console.error("Firebase Firestore is not initialized.");
      setError("Firebase 連線失敗，請檢查配置。");
      setIsLoading(false);
      return;
    }

    // 使用 query 和 where 來過濾特定天的行程
    const q = query(collection(db, 'schedule'), where("day", "==", selectedDay));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsLoading(false); // 數據載入完成
      const fetchedItems: TimelineItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        time: doc.data().time,
        title: doc.data().title,
        category: doc.data().category as TimelineItemType,
        address: doc.data().address,
        thaiName: doc.data().thaiName, // 讀取泰文名稱
        iconName: doc.data().iconName,
        day: doc.data().day, // 讀取 day 欄位
      }))
      // 按照時間排序
      fetchedItems.sort((a, b) => a.time.localeCompare(b.time));
      setItems(fetchedItems)
      setError(null); // 清除任何之前的錯誤
    }, (err) => { // onSnapshot 的錯誤回調
      console.error("Firestore onSnapshot Error: ", err);
      setError("無法載入行程資料，請檢查網路連線或稍後再試。");
      setIsLoading(false); // 載入完成，但有錯誤
    })

    return () => {
      unsubscribe(); // 清理訂閱
    }
  }, [selectedDay]) // 當 selectedDay 改變時重新訂閱

  // 根據分類獲取圖標名稱 (Firestore 儲存用)
  const getIconNameByCategory = (category: TimelineItemType): string => {
    switch (category) {
      case 'food':
        return 'Utensils'
      case 'attraction':
        return 'MapPin'
      case 'shopping':
        return 'ShoppingBag'
      case 'other':
        return 'Camera'
      default:
        return 'MapPin'
    }
  }

  // 根據圖標名稱獲取圖標組件 (前端渲染用)
  const getIconComponentByName = (iconName: string): React.ReactNode => {
    switch (iconName) {
      case 'Utensils':
        return <Utensils size={20} />
      case 'MapPin':
        return <MapPin size={20} />
      case 'ShoppingBag':
        return <ShoppingBag size={20} />
      case 'Camera':
        return <Camera size={20} />
      default:
        return <MapPin size={20} />
    }
  }

  // 處理新增/編輯行程並儲存到 Firestore
  const handleSubmitItem = async (data: {
    time: string
    title: string
    category: TimelineItemType
    address?: string
    thaiName?: string // 接收泰文名稱
  }) => {
    // 如果 db 未初始化，則阻止儲存操作並顯示錯誤
    if (!db) {
      setError("Firebase 連線失敗，無法儲存行程。");
      return;
    }

    const itemData = {
      time: data.time,
      title: data.title,
      category: data.category,
      address: data.address || null, // 儲存 null 而不是 undefined
      thaiName: data.thaiName || null, // 儲存泰文名稱
      iconName: getIconNameByCategory(data.category),
      day: editingItem ? editingItem.day : selectedDay, // 編輯時保留原 day，新增時使用 selectedDay
    }

    try {
      if (editingItem) {
        // 編輯模式: 更新現有文件
        const itemDocRef = doc(db, 'schedule', editingItem.id);
        await updateDoc(itemDocRef, itemData);
      } else {
        // 新增模式: 添加新文件，自動將 selectedDay 存入 day 欄位
        await addDoc(collection(db, 'schedule'), itemData);
      }
    } catch (e) {
      console.error("Error writing document: ", e);
      setError("儲存行程時發生錯誤，請稍後再試。");
    } finally {
      setEditingItem(null);
      setIsModalOpen(false);
    }
  }

  // 處理刪除行程
  const handleDeleteItem = async (itemId: string) => {
    // 如果 db 未初始化，則阻止刪除操作並顯示錯誤
    if (!db) {
      setError("Firebase 連線失敗，無法刪除行程。");
      return;
    }

    // 刪除前確認
    const confirmed = window.confirm("確定要刪除此行程嗎？此操作無法復原。");
    if (!confirmed) {
      return;
    }

    try {
      const itemDocRef = doc(db, 'schedule', itemId);
      await deleteDoc(itemDocRef);
      // 關閉編輯 Modal（如果正在編輯該項目）
      if (editingItem && editingItem.id === itemId) {
        setEditingItem(null);
        setIsModalOpen(false);
      }
    } catch (e) {
      console.error("Error deleting document: ", e);
      setError("刪除行程時發生錯誤，請稍後再試。");
    }
  }

  // 點擊行程卡片
  const handleItemClick = (item: TimelineItem) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  // 新增行程
  const handleAddClick = () => {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  // 處理導航 - 智能判斷網址、座標或文字
  const handleNavigate = (item: TimelineItem) => {
    const input = item.thaiName || item.address || item.title;

    if (!input) return;

    const trimmedInput = input.trim();

    // 1. 判斷是否為 Google Maps 座標 (經緯度)
    const isCoordinates = /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(trimmedInput);
    if (isCoordinates) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${trimmedInput}`, '_blank');
      return;
    }

    // 2. 判斷是否為網址 (包含 http:// 或 https://)
    const isUrl = /^https?:\/\//i.test(trimmedInput);
    if (isUrl) {
      window.open(trimmedInput, '_blank');
      return;
    }

    // 3. 如果是純文字，組成 Google Maps 搜尋 URL，優先使用泰文名稱
    const query = encodeURIComponent(trimmedInput);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(mapsUrl, '_blank');
  };

  // 複製地址到剪貼簿
  const handleCopyAddress = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => alert("地址已複製到剪貼簿"))
        .catch(err => console.error("無法複製地址: ", err));
    } else {
      // Fallback for browsers that don't support navigator.clipboard
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed'; // Prevent scrolling to bottom of page in Microsoft Edge.
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
        alert("地址已複製到剪貼簿");
      } catch (err) {
        console.error("無法複製地址 (fallback): ", err);
        alert("複製失敗，請手動複製。");
      }
      document.body.removeChild(textarea);
    }
  };

  // 分頁內容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'schedule':
        // 在渲染前加入 Firebase db 檢查
        if (!db) {
          return <ErrorMessage message="Firebase 資料庫未初始化，請檢查配置。" />;
        }
        if (isLoading) {
          return <Loading />;
        }
        if (error) {
          return <ErrorMessage message={error} />;
        }
        return (
          <>
            <div className="flex items-center justify-between mb-6 px-4">
              <h1 className="text-3xl font-bold text-[#86A38E]">
                我的 2026 旅程日誌
              </h1>
              <button
                type="button"
                onClick={() => handleAddClick()}
                className="p-2 rounded-lg bg-white border-2 border-[#86A38E] text-[#86A38E] hover:bg-[#86A38E] hover:text-white transition-colors shadow-[2px_2px_0px_#E0E5D5] active:scale-95"
                aria-label="新增行程"
              >
                <Edit size={18} />
              </button>
            </div>
            <div className="mb-6 px-4 pt-2 pr-2">
              <DateSelector 
                selectedDay={selectedDay}
                onDayChange={setSelectedDay}
              />
            </div>
            <div className="mb-6">
              <Timeline
                items={items.map(item => ({
                  ...item,
                  icon: getIconComponentByName(item.iconName)
                }))}
                onItemClick={handleItemClick}
                onAddClick={handleAddClick}
                onNavigate={handleNavigate}
                onCopyAddress={handleCopyAddress} // 傳遞複製地址的 prop
              />
            </div>
            <TimelineItemModal
              isOpen={isModalOpen}
              onClose={() => {
                setIsModalOpen(false)
                setEditingItem(null)
              }}
              onSubmit={handleSubmitItem}
              onDelete={editingItem ? () => handleDeleteItem(editingItem.id) : undefined}
              initialData={
                editingItem
                  ? {
                      time: editingItem.time,
                      title: editingItem.title,
                      category: editingItem.category,
                      address: editingItem.address,
                      thaiName: editingItem.thaiName, // 傳遞泰文名稱
                    }
                  : undefined
              }
            />
          </>
        )
      case 'booking':
        return (
          <>
            <h1 className="text-3xl font-bold text-[#86A38E] text-center mb-6 px-4">
              預訂
            </h1>
            <div className="bg-white rounded-[1.5rem] p-8 shadow-[4px_4px_0px_#E0E5D5] mx-4 text-center">
              <p className="text-gray-800 text-base">預訂頁面建設中...</p>
            </div>
          </>
        )
      case 'accounting':
        return (
          <>
            <h1 className="text-3xl font-bold text-[#86A38E] text-center mb-6 px-4">
              記帳
            </h1>
            <div className="bg-white rounded-[1.5rem] p-8 shadow-[4px_4px_0px_#E0E5D5] mx-4 text-center">
              <p className="text-gray-800 text-base">記帳頁面建設中...</p>
            </div>
          </>
        )
      case 'preparation':
        return (
          <>
            <h1 className="text-3xl font-bold text-[#86A38E] text-center mb-6 px-4">
              準備
            </h1>
            <div className="bg-white rounded-[1.5rem] p-8 shadow-[4px_4px_0px_#E0E5D5] mx-4 text-center">
              <p className="text-gray-800 text-base">準備頁面建設中...</p>
            </div>
          </>
        )
      default:
        return null
    }
  }

  // 導航項目配置
  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'schedule', label: '行程', icon: <Calendar size={22} /> },
    { id: 'booking', label: '預訂', icon: <Ticket size={22} /> },
    { id: 'accounting', label: '記帳', icon: <Wallet size={22} /> },
    { id: 'preparation', label: '準備', icon: <ListChecks size={22} /> },
  ]

  return (
    <div className="min-h-screen bg-[#F7F4EB] flex items-center justify-center p-4">
      {/* 手機框架容器 */}
      <div
        className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden relative"
        style={{ height: 'calc(100vh - 2rem)', maxHeight: '844px' }}
      >
        {/* 手機狀態列（可選） */}
        <div className="h-8 bg-[#F7F4EB] flex items-center justify-center">
          <div className="w-32 h-1.5 bg-gray-300 rounded-full"></div>
        </div>

        {/* 內容區域 */}
        <div
          className="bg-[#F7F4EB] overflow-y-auto"
          style={{ height: 'calc(100% - 8rem)' }}
        >
          <div className="min-h-full py-6 pb-24">{renderTabContent()}</div>
        </div>

        {/* 底部導航列 */}
        <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E0E5D5] shadow-[0_-4px_0px_#E0E5D5]">
          <div className="flex items-center justify-around py-2.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-lg transition-all active:scale-90 ${
                    isActive
                      ? 'text-[#86A38E]'
                      : 'text-gray-400 hover:text-[#86A38E]'
                  }`}
                  aria-label={item.label}
                >
                  {item.icon}
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}

export default App