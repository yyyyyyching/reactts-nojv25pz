import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TimelineView from './TimelineView';
import { supabase } from './supabaseClient';
import InternshipLog from './InternshipLog';

// 🌟 1. 通用按鈕
export function Button({ children, onClick, variant = 'secondary', className = '' }) {
  const styles = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-500",
    danger: "bg-rose-900/60 hover:bg-rose-700 text-rose-200 border border-rose-700/60"
  };
  return (
    <button onClick={onClick} className={`px-5 py-2.5 text-base font-medium rounded-xl transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 shrink-0 shadow-md cursor-pointer ${styles[variant] || styles.secondary} ${className}`}>
      {children}
    </button>
  );
}

// 🌟 2. 通用懸浮外框
export function HoverCard({ children, className = '', onClick, id }) {
  return (
    <div id={id} onClick={onClick} className={`bg-slate-800/50 border border-slate-700/60 p-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-slate-500/80 ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  );
}

// 🌟 3. 通用可編輯/刪除卡片
export function EditableCard({ id, date, isEditing, onToggleEdit, onDelete, children, editInputs }) {
  return (
    <HoverCard className="p-4 bg-slate-900/40 space-y-3">
      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
        <span className="text-xs text-slate-400 font-mono">📅 {date}</span>
        <div className="flex gap-2">
          <Button onClick={() => onToggleEdit(id)} className="!px-3 !py-1 !text-xs">
            {isEditing ? '💾 儲存' : '✏️ 編輯'}
          </Button>
          <Button variant="danger" onClick={() => onDelete(id)} className="!px-3 !py-1 !text-xs">
            🗑️ 刪除
          </Button>
        </div>
      </div>

      {isEditing ? editInputs : children}
    </HoverCard>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [user, setUser] = useState(null);
  
  // Q&A 狀態
  const [qaList, setQaList] = useState([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const manifestoContent = "就像去吃無菜單料理，今天廚師準備什麼，你就好好品嚐什麼。人生也是一樣。走到什麼環境，就認真投入那個環境；碰到什麼問題，就認真解決那個問題。不是漫無目的地什麼都學，而是在真實的人生、工作與機會中，學習當下真正需要的東西。你不知道今天學到的東西，十年、二十年後會不會跟其他經驗串起來。";

  // 🔐 1. 監聽與取得登入狀態
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error("Session 讀取失敗:", error.message);
      setUser(session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        setQaList([]);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // ☁️ 2. 從 Supabase 撈取 Q&A 資料
  useEffect(() => {
    if (!user) return;
    async function fetchQA() {
      const { data, error } = await supabase
        .from('qa_list')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: false });

      if (!error && data) {
        setQaList(data.map(item => ({ ...item, isEditing: false })));
      } else if (error) {
        console.error("撈取 QA 失敗:", error.message);
      }
    }
    fetchQA();
  }, [user]);

  // 🎁 3. 備份全站大禮包邏輯（新增）
  const handleFullBackup = async () => {
    if (!user) return alert('請先登入！');

    try {
      // 同時向 Supabase 抓取相關表格
      const { data: logs } = await supabase.from('internship_logs').select('*').eq('user_id', user.id);
      const { data: timeline } = await supabase.from('timeline_list').select('*').eq('user_id', user.id);
      const { data: qas } = await supabase.from('qa_list').select('*').eq('user_id', user.id);

      // 打包成大禮包物件
      const fullBackupData = {
        backup_date: new Date().toISOString(),
        user_email: user.email,
        internship_logs: logs || [],
        timeline_list: timeline || [],
        qa_list: qas || []
      };

      // 觸發瀏覽器下載 JSON 檔案
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackupData, null, 2));
      const anchor = document.createElement('a');
      anchor.setAttribute("href", dataStr);
      anchor.setAttribute("download", `全站完整備份_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      alert('打包失敗：' + err.message);
    }
  };

  // 頁面切換
  const handlePageChange = (page) => {
    if (page === 'about') {
      setCurrentPage('home');
      setTimeout(() => document.getElementById('manifesto-section')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } else setCurrentPage(page);
  };

  // 🔑 Google 登入 (PKCE 模式)
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
        flowType: 'pkce',
      },
    });
    if (error) alert("登入跳轉失敗：" + error.message);
  };

  // 🚪 登出
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setQaList([]);
  };

  // ☁️ 4. 新增 QA
  const addQA = async () => {
    if (!user) return alert('請先登入！');
    if (!question.trim() || !answer.trim()) return alert('請填寫完整內容！');
    
    const newRecord = {
      user_id: user.id,
      question,
      answer,
      date: new Date().toLocaleDateString()
    };

    const { data, error } = await supabase.from('qa_list').insert([newRecord]).select();
    if (error) {
      alert('新增失敗：' + error.message);
    } else if (data) {
      setQaList([{ ...data[0], isEditing: false }, ...qaList]);
      setQuestion(''); 
      setAnswer('');
    }
  };

  // 切換編輯並儲存至雲端
  const toggleQAEdit = async (id) => {
    const targetItem = qaList.find(item => item.id === id);
    if (targetItem && targetItem.isEditing) {
      const { error } = await supabase.from('qa_list').update({
        question: targetItem.question,
        answer: targetItem.answer
      }).eq('id', id);

      if (error) alert('儲存失敗：' + error.message);
    }

    setQaList(qaList.map(item => item.id === id ? { ...item, isEditing: !item.isEditing } : item));
  };

  const handleQAChange = (id, field, value) => {
    setQaList(qaList.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // ☁️ 5. 刪除 QA
  const deleteQA = async (id) => {
    if (confirm('確定要刪除這筆問答嗎？')) {
      const { error } = await supabase.from('qa_list').delete().eq('id', id);
      if (error) {
        alert('刪除失敗：' + error.message);
      } else {
        setQaList(qaList.filter(item => item.id !== id));
      }
    }
  };

  return (
    <div 
      style={{ fontFamily: "'Noto Serif TC', sans-serif" }} 
      className="bg-slate-900 text-slate-100 min-h-screen flex flex-col [text-shadow:_0_2px_4px_rgba(0,0,0,0.8)] tracking-wide"
    >
      <Sidebar currentPage={currentPage} setCurrentPage={handlePageChange} />

      {/* 頂部狀態列 */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-6 py-3 flex justify-between items-center text-xs text-slate-400 relative z-10 shrink-0">
        
        <div>
          {user ? <span>🟢 雲端同步中：{user.email}</span> : <span>🔴 未登入（目前無法同步至其他裝置）</span>}
        </div>
        
        {/* 🎯 大禮包備份按鈕加在這裡！ */}
        <div className="flex items-center gap-4">
          {user && (
            <button 
              onClick={handleFullBackup} 
              className="bg-indigo-600/80 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1 border border-indigo-400/40"
            >
              🎁 全站打包備份
            </button>
          )}

          {user ? (
            <button onClick={handleLogout} className="hover:text-rose-400 underline cursor-pointer">登出帳號</button>
          ) : (
            <button onClick={handleLogin} className="text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer">🔑 使用 Google 登入</button>
          )}
        </div>
      </div>

      {currentPage === 'home' && (
        <main className="max-w-4xl mx-auto px-4 py-8 flex-grow w-full space-y-8">
          <HoverCard className="py-12 px-4 bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-900 text-center border-slate-800">
            <div className="mb-4 inline-block animate-bounce text-5xl">🧭</div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-3">無菜單料理</h2>
            <p className="text-slate-300 text-sm md:text-base max-w-md mx-auto">Future × Talent × Social Needs → My Role / My Calling</p>
          </HoverCard>

          <HoverCard id="manifesto-section" className="space-y-3 scroll-mt-20">
            <h3 className="text-lg font-bold text-indigo-400 border-b border-slate-700/80 pb-3">🌱 探索起源</h3>
            <p className="text-slate-200 text-sm md:text-base leading-relaxed whitespace-pre-line">{manifestoContent}</p>
          </HoverCard>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          {[
            { id: 'timeline', icon: '⏳', title: '探索時間軸', desc: '以時間軸呈現個人嘗試與里程碑。' },
            { id: 'qa', icon: '💬', title: '探索問答', desc: '透過自我提問與回答，釐清內心想法。' },
            { id: 'intern', icon: '📝', title: '實習紀錄助手', desc: '撰寫每日/每週日誌，一鍵匯出 Word 與 PDF。' }
          ].map(card => (
              <HoverCard key={card.id} onClick={() => handlePageChange(card.id)} className="p-5 text-center space-y-1">
                <span className="text-2xl block mb-1">{card.icon}</span>
                <h4 className="text-sm font-bold text-slate-200">{card.title}</h4>
                <p className="text-xs text-slate-400">{card.desc}</p>
              </HoverCard>
            ))}
          </div>
        </main>
      )}

      {currentPage === 'timeline' && (
        <main className="max-w-3xl mx-auto px-4 py-8 flex-grow w-full space-y-6">
          <Button onClick={() => handlePageChange('home')}>← 返回首頁</Button>
          <TimelineView user={user} handleLogin={handleLogin} />
        </main>
      )}

      {currentPage === 'my-feature' && (
        <main className="max-w-3xl mx-auto px-4 py-8 flex-grow w-full space-y-6">
          <Button onClick={() => handlePageChange('home')}>← 返回首頁</Button>
          <MyNewFeature user={user} />
        </main>
      )}

      {currentPage === 'intern' && (
        <main className="max-w-5xl mx-auto px-4 py-8 flex-grow w-full space-y-6">
          <Button onClick={() => handlePageChange('home')}>← 返回首頁</Button>
          <InternshipLog user={user} />
        </main>
      )}

      {currentPage === 'qa' && (
        <main className="max-w-3xl mx-auto px-4 py-8 flex-grow w-full space-y-6">
          <Button onClick={() => handlePageChange('home')}>← 返回首頁</Button>
          <HoverCard className="space-y-6">
            <h2 className="text-xl font-bold text-white">💬 生涯開放式問答</h2>

            {!user ? (
              <div className="text-center py-8 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
                <p className="text-slate-400 text-sm">登入帳號後即可跨裝置儲存與同步你的問答紀錄</p>
                <Button variant="primary" onClick={handleLogin}>🔑 使用 Google 帳號登入</Button>
              </div>
            ) : (
              <>
                <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
                  <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="寫下你的探索提問..." className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
                  <textarea rows="2" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="寫下你目前的想法..." className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
                  <Button variant="primary" onClick={addQA} className="w-full">儲存至雲端資料庫</Button>
                </div>
                
                <div className="space-y-4">
                  {qaList.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4 text-center">雲端目前沒有問答紀錄，來新增第一筆吧！</p>
                  ) : (
                    qaList.map(item => (
                      <EditableCard
                        key={item.id}
                        id={item.id}
                        date={item.date}
                        isEditing={item.isEditing}
                        onToggleEdit={toggleQAEdit}
                        onDelete={deleteQA}
                        editInputs={
                          <div className="space-y-2 pt-1">
                            <input type="text" value={item.question} onChange={(e) => handleQAChange(item.id, 'question', e.target.value)} className="w-full px-3 py-1 bg-slate-800 border border-indigo-500 rounded text-sm text-white" />
                            <textarea rows="2" value={item.answer} onChange={(e) => handleQAChange(item.id, 'answer', e.target.value)} className="w-full px-3 py-1 bg-slate-800 border border-indigo-500 rounded text-sm text-white" />
                          </div>
                        }
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-indigo-300 text-sm">Q: {item.question}</div>
                          <p className="text-slate-200 text-sm whitespace-pre-line">A: {item.answer}</p>
                        </div>
                      </EditableCard>
                    ))
                  )}
                </div>
              </>
            )}
          </HoverCard>
        </main>
      )}

      <footer className="bg-slate-950 border-t border-slate-800 py-6 text-center text-slate-400 text-sm">
        © 個人生涯探索網站 - Powered by React + Supabase 雲端同步
      </footer>
    </div>
  );
}