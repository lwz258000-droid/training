import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { aiGenerateExam } from '../../../../api/course'; 

export default function Papers() {
  const { courseId } = useParams(); 
  const navigate = useNavigate();

  // AI 弹窗状态
  const [aiModal, setAiModal] = useState({ isOpen: false, isGenerating: false });
  const [aiForm, setAiForm] = useState({ title: '', jobRoleTag: '', file: null });

  // 🌟 精心设计的题型配置器状态
  const [config, setConfig] = useState({
    single: { enabled: true, name: '单选', count: 5, score: 2 },
    multiple: { enabled: false, name: '多选', count: 2, score: 5 },
    judge: { enabled: false, name: '判断', count: 5, score: 2 },
    short: { enabled: false, name: '简答', count: 1, score: 10 }
  });

  // 处理文件选择
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAiForm({ ...aiForm, file: e.target.files[0] });
    }
  };

  // 提交 AI 生成请求
  const handleAIGenerate = async (e) => {
    e.preventDefault();
    if (!aiForm.title.trim()) return alert('请输入试卷标题');
    if (!aiForm.jobRoleTag.trim()) return alert('请输入目标岗位标签');
    if (!aiForm.file) return alert('请上传用于 AI 提取知识的参考文件 (PDF/Word/TXT等)');

    // 🌟 将前端的精美 UI 状态，自动转换为后端需要的 JSON 字符串
    const configObj = {};
    if (config.single.enabled) configObj['单选'] = { count: Number(config.single.count), score: Number(config.single.score) };
    if (config.multiple.enabled) configObj['多选'] = { count: Number(config.multiple.count), score: Number(config.multiple.score) };
    if (config.judge.enabled) configObj['判断'] = { count: Number(config.judge.count), score: Number(config.judge.score) };
    if (config.short.enabled) configObj['简答'] = { count: Number(config.short.count), score: Number(config.short.score) };

    if (Object.keys(configObj).length === 0) return alert('请至少勾选一种题型让 AI 生成！');

    const questionConfigStr = JSON.stringify(configObj);

    setAiModal(prev => ({ ...prev, isGenerating: true }));
    try {
      await aiGenerateExam(courseId, aiForm.title, aiForm.jobRoleTag, questionConfigStr, aiForm.file);
      alert('🎉 AI 魔法出卷成功！题目已生成并存入题库/试卷。');
      setAiModal({ isOpen: false, isGenerating: false });
      // 未来这里可以调用获取试卷列表的接口刷新页面
    } catch (error) {
      alert('生成失败，可能是文件过大或 AI 服务超时，请重试。');
      setAiModal(prev => ({ ...prev, isGenerating: false }));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative pb-10">
      
      {/* 头部区域 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/courses')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center border border-amber-100">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">试卷管理</h2>
              <p className="text-slate-500 text-xs mt-1">当前管理课程 ID: {courseId}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95">
            <span className="material-symbols-outlined text-[18px]">add</span> 手动组卷
          </button>
          {/* 🌟 核心入口：打开 AI 出卷弹窗 */}
          <button onClick={() => setAiModal({ isOpen: true, isGenerating: false })} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shadow-violet-500/30">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span> AI 一键出卷
          </button>
        </div>
      </div>

      {/* 列表占位区 (等待后续开发试卷列表 API) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-[500px] items-center justify-center">
        <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">folder_open</span>
        <p className="text-slate-500 font-medium">暂无试卷数据</p>
        <p className="text-slate-400 text-sm mt-1">点击右上角「AI 一键出卷」体验魔法生成</p>
      </div>

      {/* ========================================================= */}
      {/* 🌟 AI 魔法出卷弹窗 */}
      {/* ========================================================= */}
      {aiModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-violet-500 text-[22px]">auto_awesome</span> AI 智能解析与生成试卷
              </h3>
              <button onClick={() => !aiModal.isGenerating && setAiModal({ isOpen: false, isGenerating: false })} className="text-slate-400 hover:bg-slate-200 p-1.5 rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAIGenerate} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6 bg-white">
                
                <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-sm text-violet-800 flex items-start gap-3">
                  <span className="material-symbols-outlined text-violet-600 mt-0.5">info</span>
                  <div>
                    <strong className="block mb-1">工作原理：</strong>
                    上传您的课件、规章制度或知识文档，AI 将深度阅读并严格按照您配置的【题型分布】和【岗位需求】，自动提炼并生成一套完整的试卷。
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">试卷标题 <span className="text-red-500">*</span></label>
                    <input required type="text" value={aiForm.title} onChange={e => setAiForm({...aiForm, title: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500" placeholder="例如: 2026 第一季度安全合规考试"/>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">针对岗位标签 <span className="text-red-500">*</span></label>
                    <input required type="text" value={aiForm.jobRoleTag} onChange={e => setAiForm({...aiForm, jobRoleTag: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500" placeholder="例如: 一线操作人员"/>
                  </div>
                </div>

                {/* 🌟 核心：知识库文件上传区 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">知识库文件 (PDF/Doc/TXT) <span className="text-red-500">*</span></label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-violet-500 transition-colors bg-slate-50 group relative">
                    <div className="space-y-2 text-center">
                      <span className={`material-symbols-outlined text-4xl ${aiForm.file ? 'text-violet-500' : 'text-slate-400 group-hover:text-violet-500'}`}>
                        {aiForm.file ? 'draft' : 'upload_file'}
                      </span>
                      <div className="text-sm text-slate-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-bold text-violet-600 hover:text-violet-500 focus-within:outline-none px-1">
                          <span>点击选择文件</span>
                          <input required type="file" onChange={handleFileChange} className="sr-only" accept=".pdf,.doc,.docx,.txt" />
                        </label>
                        <span className="pl-1">或将其拖拽到此处</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {aiForm.file ? <strong className="text-slate-700">已选择: {aiForm.file.name}</strong> : '支持最大 10MB 的文本性质文件'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 🌟 核心：题型结构配置器 */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">期望的试卷结构</label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {/* 循环渲染四种题型的配置项 */}
                    {Object.keys(config).map((key) => {
                      const item = config[key];
                      return (
                        <div key={key} className={`flex items-center justify-between p-3 transition-colors ${item.enabled ? 'bg-white' : 'bg-slate-50'}`}>
                          <label className="flex items-center gap-3 cursor-pointer select-none min-w-[100px]">
                            <input type="checkbox" checked={item.enabled} onChange={e => setConfig({...config, [key]: {...item, enabled: e.target.checked}})} className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"/>
                            <span className={`text-sm font-bold ${item.enabled ? 'text-slate-800' : 'text-slate-400'}`}>{item.name}题</span>
                          </label>
                          
                          <div className={`flex items-center gap-4 transition-opacity ${item.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">生成</span>
                              <input type="number" min="1" max="50" value={item.count} onChange={e => setConfig({...config, [key]: {...item, count: e.target.value}})} className="w-16 border border-slate-300 rounded-md px-2 py-1 text-sm text-center outline-none focus:ring-2 focus:ring-violet-500"/>
                              <span className="text-xs text-slate-500">题</span>
                            </div>
                            <span className="text-slate-200">|</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">每题</span>
                              <input type="number" min="1" max="100" value={item.score} onChange={e => setConfig({...config, [key]: {...item, score: e.target.value}})} className="w-16 border border-slate-300 rounded-md px-2 py-1 text-sm text-center outline-none focus:ring-2 focus:ring-violet-500"/>
                              <span className="text-xs text-slate-500">分</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>
              
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3">
                <button type="button" disabled={aiModal.isGenerating} onClick={() => setAiModal({ isOpen: false, isGenerating: false })} className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                  取消
                </button>
                <button type="submit" disabled={aiModal.isGenerating} className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-lg disabled:opacity-80 transition-all shadow-md shadow-violet-500/40 flex items-center gap-2 w-40 justify-center">
                  {aiModal.isGenerating ? (
                    <><span className="material-symbols-outlined animate-spin text-[18px]">sync</span> 生成中...</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">magic_button</span> 开始生成</>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}