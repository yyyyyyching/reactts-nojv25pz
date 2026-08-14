import React, { useState, useEffect, useRef } from 'react';
import { Button, HoverCard } from './App';
import { supabase } from './supabaseClient';

export default function TimelineView({ user, handleLogin }) {
  const [timelineList, setTimelineList] = useState([]);
  const [newLog, setNewLog] = useState({ date: '', title: '', scale: '中', content: '', motive: '', proof: '', reflection: '' });
  const fileInputRef = useRef(null);

  // ☁️ 當使用者登入時，從 Supabase 載入屬於他的時間軸資料
  const fetchTimeline = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('timeline_list')
      .select('*')
      .order('id', { ascending: false });
    if (!error && data) {
      setTimelineList(data.map(item => ({ ...item, isEditing: false })));
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [user]);

  // ☁️ 雲端新增時間軸
  const addTimelineLog = async () => {
    if (!user) return alert('請先登入！');
    if (!newLog.title.trim() || !newLog.date.trim()) return alert('請至少填寫時間與標題！');

    const newRecord = {
      user_id: user.id,
      ...newLog
    };

    const { data, error } = await supabase.from('timeline_list').insert([newRecord]).select();
    if (error) {
      alert('發布失敗：' + error.message);
    } else if (data) {
      setTimelineList([{ ...data[0], isEditing: false }, ...timelineList]);
      setNewLog({ date: '', title: '', scale: '中', content: '', motive: '', proof: '', reflection: '' });
    }
  };

  // 📥 1. 匯出備份 (Timeline 獨立備份)
  const handleExportTimeline = () => {
    if (timelineList.length === 0) return alert('目前沒有時間軸紀錄可備份！');
    
    // 濾除 React 狀態用的 isEditing
    const cleanData = timelineList.map(({ isEditing, ...rest }) => rest);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanData, null, 2));
    const anchor = document.createElement('a');
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", `Timeline時間軸備份_${new Date().toISOString().split('T')[0]}.json`);
    anchor.click();
    anchor.remove();
  };

  // 📤 2. 匯入還原 (智慧辨識：支援單獨 JSON 或 全站大禮包 JSON)
  const handleImportTimeline = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!user) return alert('請先登入後再進行還原！');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        let itemsToInsert = [];

        // 🧠 智慧判斷檔案格式
        if (Array.isArray(importedData)) {
          // 格式 A：單獨 Timeline 備份陣列
          itemsToInsert = importedData;
        } else if (importedData.timeline_list && Array.isArray(importedData.timeline_list)) {
          // 格式 B：全站大禮包格式
          itemsToInsert = importedData.timeline_list;
        } else {
          return alert('無效的備份檔案格式！檔案中未包含時間軸資料。');
        }

        if (itemsToInsert.length === 0) return alert('備份檔案中沒有可匯入的時間軸資料！');

        if (!window.confirm(`確定要將 ${itemsToInsert.length} 筆時間軸紀錄匯入至你的帳號嗎？`)) return;

        // 整理資料，綁定當前 user.id 並移除舊 id
        const formattedItems = itemsToInsert.map(item => {
          const { id, created_at, isEditing, ...rest } = item;
          return {
            ...rest,
            user_id: user.id
          };
        });

        // 寫入 Supabase
        const { error } = await supabase.from('timeline_list').insert(formattedItems);

        if (error) {
          alert('還原失敗：' + error.message);
        } else {
          alert('🎉 時間軸資料還原成功！');
          fetchTimeline(); // 重新整理清單
        }
      } catch (err) {
        alert('解析 JSON 檔案失敗，請確定檔案格式正確！');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // 清空 input 讓重複選取同檔案也能觸發 Change
  };

  // ☁️ 切換編輯與同步至雲端
  const toggleEdit = async (id) => {
    const targetItem = timelineList.find(item => item.id === id);
    if (targetItem && targetItem.isEditing) {
      const { error } = await supabase.from('timeline_list').update({
        date: targetItem.date,
        title: targetItem.title,
        scale: targetItem.scale,
        content: targetItem.content,
        motive: targetItem.motive,
        proof: targetItem.proof,
        reflection: targetItem.reflection
      }).eq('id', id);

      if (error) alert('儲存失敗：' + error.message);
    }

    setTimelineList(timelineList.map(item => item.id === id ? { ...item, isEditing: !item.isEditing } : item));
  };

  const handleFieldChange = (id, field, value) => {
    setTimelineList(timelineList.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // ☁️ 雲端刪除時間軸
  const deleteTimelineLog = async (id) => {
    if (window.confirm('確定要刪除這筆時間軸紀錄嗎？')) {
      const { error } = await supabase.from('timeline_list').delete().eq('id', id);
      if (error) {
        alert('刪除失敗：' + error.message);
      } else {
        setTimelineList(timelineList.filter(item => item.id !== id));
      }
    }
  };

  const getScaleStyle = (scale) => {
    switch (scale) {
      case '大': return { dot: "w-5 h-5 bg-rose-500 ring-4 ring-rose-500/20 -left-[11px]", badge: "bg-rose-500/20 text-rose-300 border-rose-500/40", label: "🔴 大里程碑" };
      case '小': return { dot: "w-3.5 h-3.5 bg-emerald-400 -left-[8px]", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", label: "🟢 小嘗試" };
      default: return { dot: "w-4 h-4 bg-amber-400 ring-2 ring-amber-400/20 -left-[9px]", badge: "bg-amber-500/20 text-amber-300 border-amber-500/40", label: "🟡 中專案" };
    }
  };

  return (
    <div className="space-y-8">
      {/* 隱藏的檔案上傳 Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportTimeline}
        accept=".json"
        className="hidden"
      />

      <HoverCard className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">📌 新增探索時間軸項目</h2>
          
          {/* 📥/📤 備份與還原按鈕群組 */}
          {user && (
            <div className="flex gap-2">
              <Button onClick={handleExportTimeline} className="!px-3 !py-1 !text-xs !bg-slate-800 hover:!bg-slate-700">
                📥 備份 Timeline
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} className="!px-3 !py-1 !text-xs !bg-slate-800 hover:!bg-slate-700">
                📤 還原 Timeline
              </Button>
            </div>
          )}
        </div>

        {!user ? (
          <div className="text-center py-6 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
            <p className="text-slate-400 text-sm">登入帳號後即可開啟時間軸雲端儲存與跨裝置同步</p>
            <Button variant="primary" onClick={handleLogin}>🔑 使用 Google 帳號登入</Button>
          </div>
        ) : (
          <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="month" value={newLog.date} onChange={(e) => setNewLog({ ...newLog, date: e.target.value })} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
              <input type="text" placeholder="標題" value={newLog.title} onChange={(e) => setNewLog({ ...newLog, title: e.target.value })} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
              <select value={newLog.scale} onChange={(e) => setNewLog({ ...newLog, scale: e.target.value })} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500">
                <option value="大">🔴 大規模</option>
                <option value="中">🟡 中規模</option>
                <option value="小">🟢 小規模</option>
              </select>
            </div>
            <textarea rows="2" placeholder="內容簡述" value={newLog.content} onChange={(e) => setNewLog({ ...newLog, content: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
            <input type="text" placeholder="動機" value={newLog.motive} onChange={(e) => setNewLog({ ...newLog, motive: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
            <input type="text" placeholder="證明連結" value={newLog.proof} onChange={(e) => setNewLog({ ...newLog, proof: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
            <textarea rows="2" placeholder="心得與收穫" value={newLog.reflection} onChange={(e) => setNewLog({ ...newLog, reflection: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
            
            <Button variant="primary" onClick={addTimelineLog} className="w-full">發布至雲端時間軸</Button>
          </div>
        )}
      </HoverCard>

      {/* 時間軸卡片清單（雲端同步） */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">⏳ 探索時間軸</h3>
        <div className="relative pl-6 md:pl-8 border-l-2 border-slate-700/80 space-y-8 my-4">
          {!user ? (
            <p className="text-slate-500 text-sm py-4">請先登入以檢視你的個人雲端時間軸。</p>
          ) : timelineList.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">目前沒有任何時間軸項目。</p>
          ) : (
            timelineList.map(item => {
              const scaleStyle = getScaleStyle(item.scale);
              return (
                <div key={item.id} className="relative group">
                  <div className={`absolute rounded-full transition-all duration-300 top-1.5 ${scaleStyle.dot}`} />
                  
                  <HoverCard className="p-4 bg-slate-900/40 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-xs text-slate-400 font-mono">📅 {item.date}</span>
                      <div className="flex gap-2">
                        <Button onClick={() => toggleEdit(item.id)} className="!px-3 !py-1 !text-xs">
                          {item.isEditing ? '💾 儲存' : '✏️ 編輯'}
                        </Button>
                        <Button variant="danger" onClick={() => deleteTimelineLog(item.id)} className="!px-3 !py-1 !text-xs">
                          🗑️ 刪除
                        </Button>
                      </div>
                    </div>

                    {item.isEditing ? (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input type="month" value={item.date} onChange={(e) => handleFieldChange(item.id, 'date', e.target.value)} className="px-3 py-1 bg-slate-800 border border-indigo-500 rounded text-sm text-white" />
                          <select value={item.scale} onChange={(e) => handleFieldChange(item.id, 'scale', e.target.value)} className="px-3 py-1 bg-slate-800 border border-indigo-500 rounded text-sm text-white">
                            <option value="大">🔴 大規模</option>
                            <option value="中">🟡 中規模</option>
                            <option value="小">🟢 小規模</option>
                          </select>
                        </div>
                        <input type="text" value={item.title} onChange={(e) => handleFieldChange(item.id, 'title', e.target.value)} className="w-full px-3 py-1 bg-slate-800 border border-indigo-500 rounded text-sm text-white" placeholder="標題" />
                        <textarea value={item.content} onChange={(e) => handleFieldChange(item.id, 'content', e.target.value)} className="w-full px-3 py-1 bg-slate-800 border border-indigo-500 rounded text-sm text-white" placeholder="內容" />
                        <input type="text" value={item.motive} onChange={(e) => handleFieldChange(item.id, 'motive', e.target.value)} className="w-full px-3 py-1 bg-slate-800 border border-indigo-500 rounded text-sm text-white" placeholder="動機" />
                        <input type="text" value={item.proof} onChange={(e) => handleFieldChange(item.id, 'proof', e.target.value)} className="w-full px-3 py-1 bg-slate-800 border border-indigo-500 rounded text-sm text-white" placeholder="證明" />
                        <textarea value={item.reflection} onChange={(e) => handleFieldChange(item.id, 'reflection', e.target.value)} className="w-full px-3 py-1 bg-slate-800 border border-indigo-500 rounded text-sm text-white" placeholder="心得" />
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm text-slate-300">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${scaleStyle.badge}`}>{scaleStyle.label}</span>
                          <h4 className="text-base font-bold text-white">{item.title}</h4>
                        </div>
                        {item.content && <p><strong className="text-slate-400">📝 內容：</strong>{item.content}</p>}
                        {item.motive && <p><strong className="text-slate-400">💡 動機：</strong>{item.motive}</p>}
                        {item.proof && <p><strong className="text-slate-400">🔗 證明：</strong><a href={item.proof} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline break-all">{item.proof}</a></p>}
                        {item.reflection && <p><strong className="text-slate-400">💭 心得：</strong>{item.reflection}</p>}
                      </div>
                    )}
                  </HoverCard>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}