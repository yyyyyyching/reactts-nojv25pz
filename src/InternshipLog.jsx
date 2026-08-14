import React, { useState, useEffect, useRef } from 'react';
import { Button, HoverCard } from './App';
import { supabase } from './supabaseClient';
import { 
  Document, 
  Packer, 
  Paragraph, 
  HeadingLevel, 
  AlignmentType, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  PageOrientation 
} from 'docx';
import { saveAs } from 'file-saver';

// 🌸 5 種專屬柔和淡色系（供不同週或不同天自動循環套用）
const PALETTES = [
  { name: '莫蘭迪藍', bg: 'bg-indigo-50/60', header: 'bg-indigo-100 text-indigo-900', border: 'border-indigo-200', wordHex: 'E0E7FF' },
  { name: '莫蘭迪綠', bg: 'bg-emerald-50/60', header: 'bg-emerald-100 text-emerald-900', border: 'border-emerald-200', wordHex: 'D1FAE5' },
  { name: '莫蘭迪黃', bg: 'bg-amber-50/60', header: 'bg-amber-100 text-amber-900', border: 'border-amber-200', wordHex: 'FEF3C7' },
  { name: '莫蘭迪粉', bg: 'bg-rose-50/60', header: 'bg-rose-100 text-rose-900', border: 'border-rose-200', wordHex: 'FFE4E6' },
  { name: '莫蘭迪天藍', bg: 'bg-sky-50/60', header: 'bg-sky-100 text-sky-900', border: 'border-sky-200', wordHex: 'E0F2FE' },
];

// 🗓️ 計算日期屬於第幾週的輔助函式 (以週一為第一天)
const getWeekKey = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
};

export default function InternshipLog({ user }) {
  const [logs, setLogs] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [exportMode, setExportMode] = useState('weekly'); 
  const [orientation, setOrientation] = useState('landscape'); 
  const [editingId, setEditingId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [exportType, setExportType] = useState('word');
  
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    date: new Date().toISOString().split('T')[0],
    tasks: '',
    learnings: '',
    reflection: ''
  });

  useEffect(() => {
    if (user) fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('internship_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (!error && data) {
      setLogs(data);
      setSelectedIds(data.map(l => l.id));
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!user) return alert('請先登入！');
    if (!formData.tasks.trim()) return alert('請至少填寫完成事項！');

    if (editingId) {
      const { error } = await supabase
        .from('internship_logs')
        .update(formData)
        .eq('id', editingId);

      if (error) alert('更新失敗：' + error.message);
      else {
        resetForm();
        fetchLogs();
      }
    } else {
      const { error } = await supabase
        .from('internship_logs')
        .insert([{ ...formData, user_id: user.id }]);

      if (error) alert('儲存失敗：' + error.message);
      else {
        resetForm();
        fetchLogs();
      }
    }
  };

  const handleEdit = (log) => {
    setEditingId(log.id);
    setFormData({
      name: log.name || '',
      company: log.company || '',
      date: log.date,
      tasks: log.tasks || '',
      learnings: log.learnings || '',
      reflection: log.reflection || ''
    });
  };

  const handleDelete = async (id) => {
    if (confirm('確定要刪除這筆紀錄嗎？')) {
      const { error } = await supabase.from('internship_logs').delete().eq('id', id);
      if (!error) {
        setSelectedIds(selectedIds.filter(i => i !== id));
        fetchLogs();
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: formData.name,
      company: formData.company,
      date: new Date().toISOString().split('T')[0],
      tasks: '',
      learnings: '',
      reflection: ''
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
  };

  // 🛡️ 保護機制 1：一鍵下載 JSON 全站完整備份檔
  const handleDownloadBackup = () => {
    if (logs.length === 0) return alert('目前尚無資料可供備份！');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `實習紀錄全站備份_${today}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 🛡️ 保護機制 2：上傳 JSON 備份檔還原資料
  const handleRestoreBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedLogs = JSON.parse(event.target.result);
        if (!Array.isArray(importedLogs)) throw new Error("檔案格式不符！");

        if (confirm(`確認要匯入 ${importedLogs.length} 筆備份資料嗎？這將會同步至您的雲端帳號。`)) {
          // 清理匯入資料，準備批次寫入 Supabase
          const formattedLogs = importedLogs.map(item => ({
            user_id: user.id,
            name: item.name || formData.name,
            company: item.company || formData.company,
            date: item.date,
            tasks: item.tasks || '',
            learnings: item.learnings || '',
            reflection: item.reflection || ''
          }));

          const { error } = await supabase.from('internship_logs').insert(formattedLogs);
          if (error) {
            alert('還原失敗：' + error.message);
          } else {
            alert('🎉 成功還原備份資料！');
            fetchLogs();
          }
        }
      } catch (err) {
        alert("無法解析此檔案，請確定選取的是正確的備份 JSON 檔。");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // 重置 input
  };

  const selectedLogs = logs.filter(l => selectedIds.includes(l.id));

  // 按週分組
  const groupedWeeks = selectedLogs.reduce((acc, log) => {
    const weekKey = getWeekKey(log.date);
    if (!acc[weekKey]) acc[weekKey] = [];
    acc[weekKey].push(log);
    return acc;
  }, {});

  const weekKeys = Object.keys(groupedWeeks).sort();

  const triggerExportConfirm = (type) => {
    if (selectedLogs.length === 0) return alert('請至少勾選一筆紀錄！');
    setExportType(type);
    setShowConfirmModal(true);
  };

  // 📄 PDF 匯出
  const executePDFExport = () => {
    setShowConfirmModal(false);
    const element = document.getElementById('multi-log-preview');
    if (!element) return;

    import('html2pdf.js').then((html2pdf) => {
      const opt = {
        margin:       6,
        filename:     `${formData.company || '實習'}_${exportMode === 'weekly' ? '週誌總表' : '日誌'}_${formData.date}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: orientation }
      };
      html2pdf.default().set(opt).from(element).save();
    });
  };

  // 📝 Word 匯出
  const executeWordExport = () => {
    setShowConfirmModal(false);

    const docChildren = [
      new Paragraph({
        text: exportMode === 'weekly' ? "📊 實習週誌總覽表" : "📝 實習每日紀錄報告",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: `實習生：${formData.name || '未填寫'}   單位：${formData.company || '未填寫'}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      })
    ];

    if (exportMode === 'weekly') {
      weekKeys.forEach((wKey, wIdx) => {
        const weekLogs = groupedWeeks[wKey];
        const weekColor = PALETTES[wIdx % PALETTES.length];

        docChildren.push(
          new Paragraph({
            text: `📌 第 ${wIdx + 1} 週紀錄（週一起始日：${wKey}）`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          })
        );

        const headerRow = new TableRow({
          children: [
            new TableCell({ shading: { fill: "F1F5F9" }, children: [new Paragraph({ text: "項目 / 日期", bold: true, alignment: AlignmentType.CENTER })] }),
            ...weekLogs.map((log, idx) => new TableCell({
              shading: { fill: weekColor.wordHex },
              children: [
                new Paragraph({ text: `Day ${idx + 1}`, bold: true, alignment: AlignmentType.CENTER }),
                new Paragraph({ text: log.date, size: 16, alignment: AlignmentType.CENTER })
              ]
            }))
          ]
        });

        const buildRow = (title, fieldKey) => new TableRow({
          children: [
            new TableCell({ shading: { fill: "F8FAFC" }, children: [new Paragraph({ text: title, bold: true })] }),
            ...weekLogs.map((log) => new TableCell({
              children: (log[fieldKey] || '無').split('\n').map(line => new Paragraph({ text: line, size: 18 }))
            }))
          ]
        });

        const weekTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            headerRow,
            buildRow("📋 完成事項", "tasks"),
            buildRow("💡 學習與收穫", "learnings"),
            buildRow("💭 心得與反思", "reflection"),
          ]
        });

        docChildren.push(weekTable);
      });
    } else {
      const dayTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: selectedLogs.map((log, idx) => {
          const dayColor = PALETTES[idx % PALETTES.length];
          return new TableRow({
            children: [
              new TableCell({
                shading: { fill: dayColor.wordHex },
                children: [
                  new Paragraph({ text: `📅 日期：${log.date}`, bold: true }),
                  new Paragraph({ text: `📋 完成事項：\n${log.tasks || '無'}` }),
                  new Paragraph({ text: `💡 學習與收穫：\n${log.learnings || '無'}` }),
                  new Paragraph({ text: `💭 心得與反思：\n${log.reflection || '無'}` }),
                ]
              })
            ]
          });
        })
      });
      docChildren.push(dayTable);
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: {
              orientation: orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT
            }
          }
        },
        children: docChildren
      }]
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, `實習紀錄_${exportMode === 'weekly' ? '多週週誌表格' : '日誌'}.docx`);
    });
  };

  return (
    <div className="space-y-6">
      {/* 頂部操作列 */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
        <div className="flex flex-wrap items-center gap-6">
          {/* 1. 模式選擇 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">類型：</span>
            <label className="flex items-center gap-1 cursor-pointer text-xs text-white">
              <input type="radio" name="exportMode" value="weekly" checked={exportMode === 'weekly'} onChange={() => setExportMode('weekly')} className="accent-indigo-500" />
              📊 多週週誌
            </label>
            <label className="flex items-center gap-1 cursor-pointer text-xs text-white ml-2">
              <input type="radio" name="exportMode" value="daily" checked={exportMode === 'daily'} onChange={() => setExportMode('daily')} className="accent-indigo-500" />
              📝 日誌
            </label>
          </div>

          {/* 2. 版面方向 */}
          <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
            <span className="text-xs font-bold text-slate-400">方向：</span>
            <label className="flex items-center gap-1 cursor-pointer text-xs text-white">
              <input type="radio" name="orientation" value="landscape" checked={orientation === 'landscape'} onChange={() => setOrientation('landscape')} className="accent-indigo-500" />
              📜 橫式
            </label>
            <label className="flex items-center gap-1 cursor-pointer text-xs text-white ml-2">
              <input type="radio" name="orientation" value="portrait" checked={orientation === 'portrait'} onChange={() => setOrientation('portrait')} className="accent-indigo-500" />
              📄 直式
            </label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="hover:bg-indigo-600 hover:text-white transition duration-200" onClick={() => triggerExportConfirm('word')}>📝 匯出 Word</Button>
          <Button variant="secondary" className="hover:bg-indigo-600 hover:text-white transition duration-200" onClick={() => triggerExportConfirm('pdf')}>📄 匯出 PDF</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* 左側表單 (佔 4 欄) */}
        <div className="lg:col-span-4 space-y-4">
          <HoverCard className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h3 className="text-base font-bold text-indigo-400">
                {editingId ? '✏️ 編輯實習紀錄' : '➕ 新增實習紀錄'}
              </h3>
              {editingId && (
                <button onClick={resetForm} className="text-xs text-slate-400 underline">取消編輯</button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="姓名" className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
              <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder="實習公司" className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
            </div>

            <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />

            <div>
              <label className="text-xs text-slate-400 block mb-1">📋 完成事項</label>
              <textarea name="tasks" rows="3" value={formData.tasks} onChange={handleChange} placeholder="寫下今天完成的工作..." className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">💡 學習收穫</label>
              <textarea name="learnings" rows="2" value={formData.learnings} onChange={handleChange} placeholder="學到了什麼新知識..." className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">💭 心得反思</label>
              <textarea name="reflection" rows="2" value={formData.reflection} onChange={handleChange} placeholder="心路歷程與自我檢討..." className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white" />
            </div>

            <Button variant="primary" onClick={handleSave} className="w-full !py-2 !text-sm">
              {editingId ? '💾 儲存修改' : '☁️ 儲存至雲端列表'}
            </Button>
          </HoverCard>

          {/* 🛡️ 備份與保護專區 */}
          <HoverCard className="space-y-3 bg-slate-900/60 border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 border-b border-slate-700 pb-2 flex justify-between items-center">
              <span>🛡️ 資料保護與備份</span>
              <span className="text-[10px] text-indigo-400 font-normal">本地雙重保險</span>
            </h4>
            <div className="flex gap-2">
              <button 
                onClick={handleDownloadBackup} 
                className="w-1/2 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[11px] text-slate-200 transition"
              >
                💾 備份 JSON 檔
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="w-1/2 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[11px] text-slate-200 transition"
              >
                📥 還原備份檔
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleRestoreBackup} 
                accept=".json" 
                className="hidden" 
              />
            </div>
          </HoverCard>

          {/* 紀錄勾選列表 */}
          <HoverCard className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 border-b border-slate-700 pb-2">🗂️ 勾選欲匯出的日期</h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">尚無儲存的紀錄</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-2 bg-slate-900/80 rounded border border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(log.id)} 
                        onChange={() => toggleSelect(log.id)}
                        className="cursor-pointer accent-indigo-500"
                      />
                      <span className="font-mono text-indigo-300">{log.date}</span>
                      <span className="text-slate-300 truncate max-w-[90px]">{log.tasks}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleEdit(log)} className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[10px]">✏️</button>
                      <button onClick={() => handleDelete(log.id)} className="px-2 py-0.5 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px]">🗑️</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </HoverCard>
        </div>

        {/* 右側：即時預覽區 (佔 8 欄) */}
        <div className="lg:col-span-8 space-y-2">
          <span className="text-xs text-slate-400 pl-1">
            👀 即時預覽（{exportMode === 'weekly' ? `共辨識出 ${weekKeys.length} 個週次表格` : '日誌模式'} / {orientation === 'landscape' ? '📜 橫式' : '📄 直式'}）：
          </span>
          
          <div 
            id="multi-log-preview" 
            className={`bg-white text-slate-800 p-6 rounded-2xl border border-slate-200 font-sans space-y-6 overflow-x-auto antialiased [filter:none] [text-shadow:none] [font-family:inherit] ${
              orientation === 'landscape' ? 'min-w-[650px]' : 'w-full'
            }`}
          >
            <div className="text-center border-b pb-3">
              <h2 className="text-xl font-bold text-slate-900">
                {exportMode === 'weekly' ? '📊 實習週誌總覽表' : '📝 實習每日紀錄報告'}
              </h2>
              <div className="flex justify-center gap-6 text-xs text-slate-500 mt-1">
                <span>實習生：{formData.name || '未填寫'}</span>
                <span>單位：{formData.company || '未填寫'}</span>
                <span>選擇總天數：{selectedLogs.length} 天</span>
              </div>
            </div>

            {selectedLogs.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">請在左側勾選欲匯出的紀錄</p>
            ) : exportMode === 'weekly' ? (
              <div className="space-y-8">
                {weekKeys.map((wKey, wIdx) => {
                  const weekLogs = groupedWeeks[wKey];
                  const weekColor = PALETTES[wIdx % PALETTES.length];

                  return (
                    <div key={wKey} className="space-y-2">
                      <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded inline-block">
                        📌 第 {wIdx + 1} 週紀錄（週一起始：{wKey}）
                      </div>

                      <table className="w-full text-xs border-collapse border border-slate-200">
                        <thead>
                          <tr>
                            <th className="border border-slate-200 p-2 bg-slate-100 font-bold text-slate-700 w-24">項目 \ 日期</th>
                            {weekLogs.map((log, idx) => (
                              <th key={log.id} className={`border border-slate-200 p-2 font-bold ${weekColor.header}`}>
                                Day {idx + 1} ({log.date})
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-slate-200 p-2 font-bold bg-slate-50 text-slate-700">📋 完成事項</td>
                            {weekLogs.map((log) => (
                              <td key={log.id} className={`border border-slate-200 p-2 align-top ${weekColor.bg}`}>
                                <p className="whitespace-pre-line text-slate-800">{log.tasks || '無'}</p>
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="border border-slate-200 p-2 font-bold bg-slate-50 text-slate-700">💡 學習收穫</td>
                            {weekLogs.map((log) => (
                              <td key={log.id} className={`border border-slate-200 p-2 align-top ${weekColor.bg}`}>
                                <p className="whitespace-pre-line text-slate-800">{log.learnings || '無'}</p>
                              </td>
                            ))}
                          </tr>
                          <tr>
                            <td className="border border-slate-200 p-2 font-bold bg-slate-50 text-slate-700">💭 心得反思</td>
                            {weekLogs.map((log) => (
                              <td key={log.id} className={`border border-slate-200 p-2 align-top ${weekColor.bg}`}>
                                <p className="whitespace-pre-line text-slate-800">{log.reflection || '無'}</p>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedLogs.map((log, idx) => {
                  const dayColor = PALETTES[idx % PALETTES.length];
                  return (
                    <div key={log.id} className={`border ${dayColor.border} ${dayColor.bg} rounded-lg p-3 text-xs space-y-2`}>
                      <div className={`font-bold p-1 rounded ${dayColor.header}`}>📅 日期：{log.date}</div>
                      <p><strong>📋 完成事項：</strong><br/>{log.tasks}</p>
                      {log.learnings && <p><strong>💡 學習收穫：</strong><br/>{log.learnings}</p>}
                      {log.reflection && <p><strong>💭 心得反思：</strong><br/>{log.reflection}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 匯出確認 Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 text-center shadow-2xl">
            <div className="text-4xl">📄</div>
            <h3 className="text-xl font-bold text-white">確認要匯出報告嗎？</h3>
            <p className="text-sm text-slate-300">
              你選擇了 <span className="text-indigo-400 font-bold">{selectedLogs.length} 筆紀錄</span>
              {exportMode === 'weekly' && <span>（跨越 <span className="text-indigo-300 font-bold">{weekKeys.length} 個週次</span>）</span>}
              ，將以 <span className="text-white font-bold">{orientation === 'landscape' ? '📜 橫式' : '📄 直式'} {exportMode === 'weekly' ? '多週週誌' : '日誌清單'}</span> 匯出為 <span className="text-indigo-300 font-bold">{exportType.toUpperCase()}</span>。
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowConfirmModal(false)} className="w-1/2">取消</Button>
              <Button variant="primary" onClick={exportType === 'pdf' ? executePDFExport : executeWordExport} className="w-1/2">
                確認匯出
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}