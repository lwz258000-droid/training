import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createExam, autoGenerateExam, bindExamQuestions, getQuestionList, getExamList, updateExam, deleteExam, getExamQuestions } from '../../../../api/course';

export default function Exams() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [examList, setExamList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, size: 10, total: 0 });

  const [configModal, setConfigModal] = useState({ isOpen: false, isEditing: false, examId: null });
  const [examForm, setExamForm] = useState({
    title: '', duration: 120, 
    weightProcess: 30, weightEnd: 70, weightPractical: 0,
    passTotalScore: 60, passProcessScore: 18, passEndScore: 42, passPracticalScore: 0
  });

  const [autoModal, setAutoModal] = useState({ isOpen: false, examId: null, isSubmitting: false });
  const [autoConfig, setAutoConfig] = useState({
    single: { enabled: true, name: '单选题', count: 5, score: 2 },
    multiple: { enabled: false, name: '多选题', count: 2, score: 5 },
    judge: { enabled: false, name: '判断题', count: 5, score: 2 },
    short: { enabled: false, name: '简答题', count: 1, score: 10 }
  });

  const [bindModal, setBindModal] = useState({ isOpen: false, examId: null, isSubmitting: false });
  const [bankQuestions, setBankQuestions] = useState([]);
  const [selectedQIds, setSelectedQIds] = useState([]);
  const [loadingQs, setLoadingQs] = useState(false);

  const [previewModal, setPreviewModal] = useState({ isOpen: false, examTitle: '' });
  const [examQuestions, setExamQuestions] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    fetchExams();
  }, [courseId, pagination.current, pagination.size]);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await getExamList({ 
        courseId: parseInt(courseId, 10), 
        current: pagination.current, 
        size: pagination.size 
      });
      const records = res?.records || res?.data?.records || [];
      const total = res?.total || res?.data?.total || 0;
      setExamList(records);
      setPagination(prev => ({ ...prev, total }));
    } catch (error) {
      console.error('获取考试列表失败', error);
      setExamList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setExamForm({
      title: '', duration: 120, weightProcess: 30, weightEnd: 70, weightPractical: 0,
      passTotalScore: 60, passProcessScore: 18, passEndScore: 42, passPracticalScore: 0
    });
    setConfigModal({ isOpen: true, isEditing: false, examId: null });
  };

  const handleOpenEdit = (exam) => {
    setExamForm({
      title: exam.title || '', duration: exam.duration || 120,
      weightProcess: exam.weightProcess || 0, weightEnd: exam.weightEnd || 0, weightPractical: exam.weightPractical || 0,
      passTotalScore: exam.passTotalScore || 0, passProcessScore: exam.passProcessScore || 0, passEndScore: exam.passEndScore || 0, passPracticalScore: exam.passPracticalScore || 0
    });
    setConfigModal({ isOpen: true, isEditing: true, examId: exam.id });
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        courseId: parseInt(courseId, 10), title: examForm.title, duration: parseInt(examForm.duration),
        weightProcess: parseInt(examForm.weightProcess), weightEnd: parseInt(examForm.weightEnd), weightPractical: parseInt(examForm.weightPractical),
        passTotalScore: parseInt(examForm.passTotalScore), passProcessScore: parseInt(examForm.passProcessScore), passEndScore: parseInt(examForm.passEndScore), passPracticalScore: parseInt(examForm.passPracticalScore)
      };
      
      if (configModal.isEditing) {
        await updateExam(configModal.examId, payload);
        alert('✅ 考试配置修改成功！');
      } else {
        await createExam(payload);
        alert('✅ 考试创建成功！请在列表中为其组卷。');
      }
      
      setConfigModal({ isOpen: false, isEditing: false, examId: null });
      fetchExams();
    } catch (error) {
      alert(`${configModal.isEditing ? '修改' : '创建'}失败，请检查网络`);
    }
  };

  const handleDeleteExam = async (exam) => {
    if (window.confirm(`⚠️ 危险操作：\n您确定要彻底删除考试【${exam.title}】吗？\n删除后不可恢复！`)) {
      try {
        await deleteExam(exam.id);
        alert('✅ 考试已删除！');
        if (examList.length === 1 && pagination.current > 1) {
          setPagination(prev => ({ ...prev, current: prev.current - 1 }));
        } else {
          fetchExams();
        }
      } catch (error) {
        alert('删除失败，可能该考试已有学生答卷等关联数据。');
      }
    }
  };

  // ================= 🌟 终极修复：中英混杂的底层 Key 映射 =================
  const handleAutoGenerateSubmit = async (e) => {
    e.preventDefault();
    const configPayload = {};
    
    // ⚠️ 严格采用后端的奇葩命名法：single_choice, 多选, judge, short_answer
    if (autoConfig.single.enabled) configPayload['single_choice'] = { count: Number(autoConfig.single.count), score: Number(autoConfig.single.score) };
    if (autoConfig.multiple.enabled) configPayload['多选'] = { count: Number(autoConfig.multiple.count), score: Number(autoConfig.multiple.score) };
    if (autoConfig.judge.enabled) configPayload['judge'] = { count: Number(autoConfig.judge.count), score: Number(autoConfig.judge.score) };
    if (autoConfig.short.enabled) configPayload['short_answer'] = { count: Number(autoConfig.short.count), score: Number(autoConfig.short.score) };

    if (Object.keys(configPayload).length === 0) return alert('请至少配置一种题型！');

    setAutoModal(p => ({ ...p, isSubmitting: true }));
    try {
      await autoGenerateExam(autoModal.examId, configPayload); 
      alert('🎉 自动抽题组卷成功！点击【预览试卷】即可查看生成的题目！');
      setAutoModal({ isOpen: false, examId: null, isSubmitting: false });
    } catch (error) {
      // 捕获并展示后端返回的具体错误信息
      const backendMsg = error.response?.data?.msg || error.message || '符合条件的题目数量不足';
      alert(`组卷失败：${backendMsg}\n\n请确认该课程的题库中，对应题型的题目数量是否足够。`);
      setAutoModal(p => ({ ...p, isSubmitting: false }));
    }
  };

  const openBindModal = async (id) => {
    setBindModal({ isOpen: true, examId: id, isSubmitting: false });
    setSelectedQIds([]);
    setLoadingQs(true);
    try {
      const res = await getQuestionList({ current: 1, size: 100 });
      setBankQuestions(res?.records || res?.data?.records || []);
    } catch (e) { console.error(e); } finally { setLoadingQs(false); }
  };

  const handleBindSubmit = async () => {
    if (selectedQIds.length === 0) return alert('请至少勾选一道题目！');
    setBindModal(p => ({ ...p, isSubmitting: true }));
    try {
      await bindExamQuestions(bindModal.examId, selectedQIds); 
      alert('✅ 手动绑定题目成功！');
      setBindModal({ isOpen: false, examId: null, isSubmitting: false });
    } catch (error) {
      alert('绑定失败，请重试。');
      setBindModal(p => ({ ...p, isSubmitting: false }));
    }
  };

  const toggleQuestionSelection = (id) => {
    if (selectedQIds.includes(id)) {
      setSelectedQIds(selectedQIds.filter(qId => qId !== id));
    } else {
      setSelectedQIds([...selectedQIds, id]);
    }
  };

  const handlePreviewExam = async (exam) => {
    setPreviewModal({ isOpen: true, examTitle: exam.title });
    setLoadingPreview(true);
    try {
      const res = await getExamQuestions(exam.id);
      const questions = res?.data || res || [];
      setExamQuestions(Array.isArray(questions) ? questions : []);
    } catch (error) {
      console.error('获取试卷题目失败', error);
      alert('获取试卷题目失败，请检查网络');
      setExamQuestions([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  const renderQuestionTypeBadge = (type) => {
    switch (type) {
      case 'single_choice': case 'SINGLE': case '单选题': case '单选': return <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded bg-blue-100 text-blue-700">单选题</span>;
      case 'multiple_choice': case 'MULTIPLE': case '多选': case '多选题': return <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded bg-indigo-100 text-indigo-700">多选题</span>;
      case 'judge': case 'JUDGE': case '判断题': case '判断': return <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded bg-amber-100 text-amber-700">判断题</span>;
      case 'short_answer': case '简答题': case '简答': return <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded bg-rose-100 text-rose-700">简答题</span>;
      default: return <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded bg-slate-100 text-slate-700">{type || '未知'}</span>;
    }
  };

  const formatOptions = (optionsStr) => {
    if (!optionsStr) return null;
    try {
      const arr = JSON.parse(optionsStr);
      if (!Array.isArray(arr) || arr.length === 0) return null;
      const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      return (
        <div className="flex flex-col gap-1.5 mt-2">
          {arr.map((item, idx) => (
            <div key={idx} className="text-sm text-slate-600 flex items-start gap-2">
              <span className={`font-bold mt-0.5 ${item.is_correct ? 'text-emerald-500' : 'text-slate-400'}`}>{labels[idx] || '•'}.</span>
              <span className={item.is_correct ? 'text-emerald-700 font-bold bg-emerald-50 px-1 rounded' : ''}>{item.option}</span>
            </div>
          ))}
        </div>
      );
    } catch (e) { return null; }
  };

  const maxPage = Math.max(1, Math.ceil(pagination.total / pagination.size));

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative pb-10">
      
      {/* 头部区域 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/courses')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center border border-rose-100">
              <span className="material-symbols-outlined text-2xl">alarm_on</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">课程考试管理</h2>
              <p className="text-slate-500 text-xs mt-1">当前管理课程 ID: <strong className="text-rose-500">{courseId}</strong></p>
            </div>
          </div>
        </div>
        <button onClick={handleOpenCreate} className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shadow-rose-500/20">
          <span className="material-symbols-outlined text-[18px]">add</span> 创建新考试
        </button>
      </div>

      {/* 考试列表展示区 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px]">
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-inner">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">考试信息</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">及格线要求</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">创建时间</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">试卷管理 (组卷)</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-16 text-center text-slate-500"><span className="material-symbols-outlined animate-spin text-3xl mb-2 text-rose-200">sync</span><p>加载考试列表中...</p></td></tr>
              ) : examList.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-16 text-center text-slate-500"><span className="material-symbols-outlined text-5xl opacity-30 mb-2">edit_document</span><p className="font-medium text-lg">当前课程尚未配置考试</p><p className="text-sm mt-1">请点击右上角「创建新考试」初始化考试空壳</p></td></tr>
              ) : examList.map((exam) => (
                <tr key={exam.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div onClick={() => handlePreviewExam(exam)} className="text-sm font-bold text-rose-600 hover:text-rose-700 cursor-pointer mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      {exam.title}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">ID: {exam.id}</span>
                      <span>时长: {exam.duration} 分钟</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex flex-col gap-1">
                       <span className="text-sm font-bold text-slate-700">总分及格线: <span className="text-rose-600">{exam.passTotalScore}</span> 分</span>
                       <span className="text-xs text-slate-400">权重: 平时{exam.weightProcess}% | 期末{exam.weightEnd}% | 实操{exam.weightPractical}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(exam.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => handlePreviewExam(exam)} className="px-3 py-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 rounded-md text-xs font-bold shadow-sm transition-colors flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">plagiarism</span> 预览试卷
                       </button>
                       <button onClick={() => openBindModal(exam.id)} className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 text-blue-600 rounded-md text-xs font-bold shadow-sm transition-colors flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">checklist</span> 选卷
                       </button>
                       <button onClick={() => setAutoModal({ isOpen: true, examId: exam.id, isSubmitting: false })} className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold shadow-sm transition-colors flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">casino</span> 抽题
                       </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleOpenEdit(exam)} className="text-slate-400 hover:text-blue-600 mr-3 transition-colors p-1" title="修改配置">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onClick={() => handleDeleteExam(exam)} className="text-slate-400 hover:text-red-600 transition-colors p-1" title="删除考试">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 底部精美分页 */}
        {!loading && pagination.total > 0 && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between items-center shrunk-0">
             <span className="text-sm text-slate-500 font-medium">共 {pagination.total} 场考试，第 {pagination.current} 页</span>
             <div className="flex gap-2.5">
               <button onClick={() => setPagination(p => ({...p, current: Math.max(1, p.current - 1)}))} disabled={pagination.current === 1} className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-slate-50 transition-colors shadow-sm">上一页</button>
               <span className="px-4 py-1.5 text-sm text-slate-800 font-black flex items-center bg-white border border-slate-200 rounded-lg shadow-inner">{pagination.current} / {maxPage}</span>
               <button onClick={() => setPagination(p => ({...p, current: Math.min(maxPage, p.current + 1)}))} disabled={pagination.current >= maxPage} className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-slate-50 transition-colors shadow-sm">下一页</button>
             </div>
          </div>
        )}
      </div>

      {/* ================= 🌟 预览试卷题目的弹窗 ================= */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="px-6 py-4 border-b border-rose-100 bg-rose-50 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-rose-800 flex items-center gap-2">
                <span className="material-symbols-outlined">plagiarism</span> 
                试卷预览：{previewModal.examTitle}
              </h3>
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-rose-600 bg-white px-3 py-1 rounded-full shadow-sm">
                  共 {examQuestions.length} 题
                </span>
                <button onClick={() => setPreviewModal({ isOpen: false, examTitle: '' })} className="text-rose-400 hover:bg-rose-200 p-1.5 rounded-lg transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50">
              {loadingPreview ? (
                <div className="flex flex-col items-center justify-center h-full py-10">
                  <span className="material-symbols-outlined animate-spin text-4xl text-rose-300 mb-4">sync</span>
                  <p className="text-slate-500 font-medium">正在获取试卷题目...</p>
                </div>
              ) : examQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 bg-white rounded-xl border border-slate-200 border-dashed">
                  <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">find_in_page</span>
                  <p className="text-slate-500 font-medium text-lg">该试卷尚未绑定任何题目</p>
                  <p className="text-slate-400 text-sm mt-1">请关闭弹窗，点击「选卷」或「抽题」进行组卷</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {examQuestions.map((q, index) => (
                    <div key={q.id || index} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-rose-300 transition-colors">
                      <div className="flex gap-3 items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-black text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="mb-2">
                            {renderQuestionTypeBadge(q.questionType)}
                          </div>
                          <div className="text-base font-bold text-slate-800 leading-relaxed mb-3">
                            {q.content}
                          </div>
                          
                          <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            {formatOptions(q.options)}
                          </div>
                          
                          <div className="flex flex-col gap-2 text-sm bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-emerald-700 whitespace-nowrap">标准答案：</span>
                              <span className="text-emerald-600 font-medium">{q.standardAnswer || '未设置'}</span>
                            </div>
                            {q.analysis && (
                              <div className="flex items-start gap-2 border-t border-emerald-100/50 pt-2 mt-1">
                                <span className="font-bold text-emerald-700 whitespace-nowrap">题目解析：</span>
                                <span className="text-emerald-600">{q.analysis}</span>
                              </div>
                            )}
                          </div>
                          
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0 flex justify-end">
               <button onClick={() => setPreviewModal({ isOpen: false, examTitle: '' })} className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm">
                 关闭预览
               </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 🌟 配置弹窗 (新建 / 编辑共用) ================= */}
      {configModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-500 text-[22px]">
                  {configModal.isEditing ? 'edit_note' : 'add_circle'}
                </span>
                {configModal.isEditing ? '修改考试基本配置' : '创建考试基本信息'}
              </h3>
              <button onClick={() => setConfigModal({ isOpen: false, isEditing: false, examId: null })} className="text-slate-400 hover:bg-slate-200 p-1.5 rounded-lg"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleConfigSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">考试标题 <span className="text-red-500">*</span></label>
                  <input required autoFocus type="text" value={examForm.title} onChange={e => setExamForm({...examForm, title: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500" placeholder="例：期末大考"/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">考试时长 (分钟)</label>
                  <input type="number" required value={examForm.duration} onChange={e => setExamForm({...examForm, duration: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"/>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                <p className="text-sm font-bold text-slate-800">成绩权重配置 (%)</p>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="text-xs text-slate-500 mb-1 block">平时分权重</label><input type="number" value={examForm.weightProcess} onChange={e => setExamForm({...examForm, weightProcess: e.target.value})} className="w-full border rounded p-2 text-sm"/></div>
                  <div><label className="text-xs text-slate-500 mb-1 block">期末分权重</label><input type="number" value={examForm.weightEnd} onChange={e => setExamForm({...examForm, weightEnd: e.target.value})} className="w-full border rounded p-2 text-sm"/></div>
                  <div><label className="text-xs text-slate-500 mb-1 block">实操分权重</label><input type="number" value={examForm.weightPractical} onChange={e => setExamForm({...examForm, weightPractical: e.target.value})} className="w-full border rounded p-2 text-sm"/></div>
                </div>
              </div>

              <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 space-y-4">
                <p className="text-sm font-bold text-rose-800">及格分数线要求</p>
                <div className="grid grid-cols-4 gap-4">
                  <div><label className="text-xs text-rose-600 mb-1 block">总及格线</label><input type="number" value={examForm.passTotalScore} onChange={e => setExamForm({...examForm, passTotalScore: e.target.value})} className="w-full border-rose-200 rounded p-2 text-sm"/></div>
                  <div><label className="text-xs text-rose-600 mb-1 block">平时分要求</label><input type="number" value={examForm.passProcessScore} onChange={e => setExamForm({...examForm, passProcessScore: e.target.value})} className="w-full border-rose-200 rounded p-2 text-sm"/></div>
                  <div><label className="text-xs text-rose-600 mb-1 block">期末分要求</label><input type="number" value={examForm.passEndScore} onChange={e => setExamForm({...examForm, passEndScore: e.target.value})} className="w-full border-rose-200 rounded p-2 text-sm"/></div>
                  <div><label className="text-xs text-rose-600 mb-1 block">实操分要求</label><input type="number" value={examForm.passPracticalScore} onChange={e => setExamForm({...examForm, passPracticalScore: e.target.value})} className="w-full border-rose-200 rounded p-2 text-sm"/></div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setConfigModal({ isOpen: false, isEditing: false, examId: null })} className="px-5 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-lg">取消</button>
                <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg shadow-md shadow-rose-500/20">
                  {configModal.isEditing ? '保存修改' : '生成空壳试卷'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 2. 自动规则组卷弹窗 ================= */}
      {autoModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-indigo-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-indigo-800 flex items-center gap-2"><span className="material-symbols-outlined">casino</span> 传统规则自动抽题</h3>
              <button onClick={() => setAutoModal({ isOpen: false, examId: null, isSubmitting: false })} className="text-indigo-400 hover:bg-indigo-200 p-1.5 rounded-lg"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleAutoGenerateSubmit} className="p-6 space-y-4">
              <p className="text-sm text-slate-500 mb-4">系统将根据您在此处配置的规则，去题库中随机抽取题目放入该试卷。</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {Object.keys(autoConfig).map((key) => {
                  const item = autoConfig[key];
                  return (
                    <div key={key} className={`flex items-center justify-between p-3 ${item.enabled ? 'bg-white' : 'bg-slate-50'}`}>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={item.enabled} onChange={e => setAutoConfig({...autoConfig, [key]: {...item, enabled: e.target.checked}})} className="w-4 h-4 text-indigo-600 rounded"/>
                        <span className={`text-sm font-bold ${item.enabled ? 'text-slate-800' : 'text-slate-400'}`}>{item.name}</span>
                      </label>
                      <div className={`flex items-center gap-3 ${item.enabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                        <span className="text-xs text-slate-500">数量:</span>
                        <input type="number" min="1" value={item.count} onChange={e => setAutoConfig({...autoConfig, [key]: {...item, count: e.target.value}})} className="w-14 border rounded p-1 text-sm text-center outline-none focus:border-indigo-500"/>
                        <span className="text-xs text-slate-500">分值:</span>
                        <input type="number" min="1" value={item.score} onChange={e => setAutoConfig({...autoConfig, [key]: {...item, score: e.target.value}})} className="w-14 border rounded p-1 text-sm text-center outline-none focus:border-indigo-500"/>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="submit" disabled={autoModal.isSubmitting} className="w-full py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md disabled:opacity-50">
                  {autoModal.isSubmitting ? '抽题中...' : '开始随机抽题'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 3. 手动选题绑定弹窗 ================= */}
      {bindModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-blue-50 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2"><span className="material-symbols-outlined">checklist</span> 从题库中手动选题</h3>
              <button onClick={() => setBindModal({ isOpen: false, examId: null, isSubmitting: false })} className="text-blue-400 hover:bg-blue-200 p-1.5 rounded-lg"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <span className="text-sm font-bold text-slate-600">已选中 <strong className="text-blue-600 text-lg">{selectedQIds.length}</strong> 道题目</span>
            </div>

            <div className="flex-1 overflow-auto p-2">
              {loadingQs ? <p className="text-center text-slate-400 py-10">加载题库中...</p> : (
                <div className="space-y-2">
                  {bankQuestions.map(q => (
                    <label key={q.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedQIds.includes(q.id) ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={selectedQIds.includes(q.id)} onChange={() => toggleQuestionSelection(q.id)} className="mt-1 w-4 h-4 text-blue-600 rounded"/>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-800 line-clamp-2">{q.content}</div>
                        <div className="text-xs text-slate-400 mt-1">题型: {q.questionType} | 标签: {q.jobRoleTag || '无'}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0 flex justify-end">
               <button onClick={handleBindSubmit} disabled={bindModal.isSubmitting || selectedQIds.length === 0} className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md disabled:opacity-50">
                 {bindModal.isSubmitting ? '保存绑定中...' : '确认绑定所选题目'}
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}