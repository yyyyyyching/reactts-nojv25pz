import React, { useState } from 'react';

export default function Sidebar({ currentPage, setCurrentPage }) {
  // 後面接原本的程式碼...
  const [isOpen, setIsOpen] = useState(false);
  const toggleSidebar = () => setIsOpen(!isOpen);

  const navigateTo = (page) => {
    setCurrentPage(page);
    setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <div onClick={toggleSidebar} className="fixed inset-0 bg-black/60 z-40 cursor-pointer" />
      )}

      <header className="sticky top-0 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-30 px-4 py-3 flex items-center justify-between">
        <button 
          onClick={toggleSidebar}
          className="bg-violet-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-violet-500 transition shadow-lg"
        >
          ☰ 選單
        </button>
        <h1 className="text-lg font-bold text-slate-200">紀錄</h1>
        <div className="w-12"></div>
      </header>

      <aside className={`fixed top-0 left-0 w-64 h-full bg-slate-800 border-r border-slate-700 z-50 transform transition-transform duration-300 shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 flex justify-between items-center border-b border-slate-700">
          <h2 className="text-xl font-bold text-white-400">🧭 紀錄選單</h2>
          <button onClick={toggleSidebar} className="text-slate-400 hover:text-white text-2xl px-2">&times;</button>
        </div>
        
        <nav className="p-4 space-y-3">
          <button 
            onClick={() => navigateTo('home')} 
            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition ${currentPage === 'home' ? 'bg-indigo-600 text-white' : 'bg-slate-700/40 hover:bg-indigo-600 text-slate-200'}`}
          >
            首頁
          </button>
          <button 
            onClick={() => navigateTo('about')} 
            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition ${currentPage === 'about' ? 'bg-indigo-600 text-white' : 'bg-slate-700/40 hover:bg-indigo-600 text-slate-200'}`}
          >
            探索大綱
          </button>
          <button 
            onClick={() => navigateTo('timeline')} 
            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition ${currentPage === 'timeline' ? 'bg-indigo-600 text-white' : 'bg-slate-700/40 hover:bg-indigo-600 text-slate-200'}`}
          >
            歷程紀錄
          </button>
          <button 
            onClick={() => navigateTo('qa')} 
            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition ${currentPage === 'qa' ? 'bg-indigo-600 text-white' : 'bg-slate-700/40 hover:bg-indigo-600 text-slate-200'}`}
          >
            探索問答
          </button>
          
          <button 
            onClick={() => navigateTo('InternshipLog')} 
            className={`w-full text-left px-4 py-3 rounded-xl font-medium transition ${currentPage === 'timeline' ? 'bg-indigo-600 text-white' : 'bg-slate-700/40 hover:bg-indigo-600 text-slate-200'}`}
          >
            實習紀錄助手
          </button>
        
        </nav>
      </aside>
    </>
  );
}