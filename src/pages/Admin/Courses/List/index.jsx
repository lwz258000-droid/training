import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { 
  getCourseCategoryTree, 
  createCourseCategory,  
  updateCourseCategory,  
  deleteCourseCategory,  
  getCourseList, 
  getCourseDetail, 
  createCourse, 
  updateCourse, 
  deleteCourse,
  updateCourseStatus,
  publishAssignment // 🌟 这里只引入你确认已有的真实接口
} from '../../../../api/course';

export default function CourseList() {
  const navigate = useNavigate(); 

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [queryKeyword, setQueryKeyword] = useState('');
  const [pagination, setPagination] = useState({ current: 1, size: 10, total: 0 });
  const maxPage = Math.max(1, Math.ceil(pagination.total / pagination.size));

  // 1. 分类管理状态
  const [catModal, setCatModal] = useState({ isOpen: false, isEdit: false });
  const [catFormData, setCatFormData] = useState({ id: null, parentId: 0, name: '', sort: 0 });
  const [catSubmitting, setCatSubmitting] = useState(false);

  // 2. 课程编辑状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  // 🌟 3. 发布作业状态 (点击表格行内[作业]按钮打开)
  const [assignmentModal, setAssignmentModal] = useState({ isOpen: false, courseId: null, courseName: '' });
  const [assignFormData, setAssignFormData] = useState({ title: '', content: '', attachmentUrl: '', deadline: '' });
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // 🌟 4. 考试操作中枢弹窗状态 (点击表格行内[考试]按钮打开)
  const [examHubModal, setExamHubModal] = useState({ isOpen: false, courseId: null, courseName: '' });

  const initialFormData = { 
    id: 0, name: '', title: '', thumb: '', shortDesc: '', isRequired: 0, status: 0, 
    categoryId: '', creditHours: 0, targetRoles: '', trainingBatch: '', courseMode: 0, 
    offlineLocation: '', chapters: [] 
  };
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => {
    fetchCourses(pagination.current, pagination.size, queryKeyword, selectedCategoryId);
  }, [pagination.current, pagination.size, queryKeyword, selectedCategoryId]);

  const fetchCategories = async () => {
    try {
      const res = await getCourseCategoryTree();
      setCategories(res || []);
    } catch (error) { console.error('获取分类树失败', error); }
  };

  const fetchCourses = async (current, size, keyword, categoryId) => {
    setLoading(true);
    try {
      const params = { current, size };
      if (keyword && keyword.trim() !== '') params.name = keyword.trim();
      if (categoryId) params.categoryId = categoryId; 

      const res = await getCourseList(params);
      setCourses(res.records || []);
      setPagination(prev => ({ ...prev, total: res.total || 0, current: res.current || current, size: res.size || size }));
    } catch (error) { console.error('获取课程失败', error); } 
    finally { setLoading(false); }
  };

  const flattenCategories = (nodes, level = 0) => {
    let result = [];
    if (!nodes || nodes.length === 0) return result;
    nodes.forEach(node => {
      result.push({ ...node, level });
      if (node.children && node.children.length > 0) result = result.concat(flattenCategories(node.children, level + 1));
    });
    return result;
  };
  const flatCategories = flattenCategories(categories);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    setQueryKeyword(searchKeyword);
  };

  const handleCategorySelect = (id) => {
    setSelectedCategoryId(id === selectedCategoryId ? null : id); 
    setPagination(prev => ({ ...prev, current: 1 })); 
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    if (!catFormData.name.trim()) return alert('分类名称不能为空');
    if (catModal.isEdit && catFormData.id === parseInt(catFormData.parentId)) return alert('不能将上级分类设置为自己！');

    setCatSubmitting(true);
    try {
      const payload = { parentId: parseInt(catFormData.parentId), name: catFormData.name, sort: parseInt(catFormData.sort || 0) };
      if (catModal.isEdit) {
        payload.id = catFormData.id;
        await updateCourseCategory(payload);
        alert('分类修改成功！');
      } else {
        await createCourseCategory(payload);
        alert('新增分类成功！');
      }
      setCatModal({ isOpen: false, isEdit: false });
      fetchCategories(); 
    } catch (error) { alert('保存失败，请检查网络'); } 
    finally { setCatSubmitting(false); }
  };

  const handleDeleteCat = async (id, name, e) => {
    e.stopPropagation(); 
    if (window.confirm(`确定要删除分类【${name}】吗？请确保其下没有课程数据。`)) {
      try {
        await deleteCourseCategory(id);
        alert('删除成功');
        if (selectedCategoryId === id) {
          setSelectedCategoryId(null);
          setPagination(prev => ({ ...prev, current: 1 }));
        }
        fetchCategories();
      } catch (error) { alert('删除失败，该分类下可能还有课程或子分类'); }
    }
  };

  const handleStatusChange = async (course) => {
    const newStatus = course.status === 1 ? 0 : 1;
    const actionText = newStatus === 1 ? '上架发布' : '下架为草稿';
    if (window.confirm(`确定要将《${course.name}》${actionText}吗？`)) {
      try {
        await updateCourseStatus({ id: course.id, status: newStatus });
        alert(`${actionText}成功！`);
        fetchCourses(pagination.current, pagination.size, queryKeyword, selectedCategoryId);
      } catch (e) { alert('状态更新失败，请重试'); }
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`确定要删除课程《${name}》吗？此操作不可恢复！`)) {
      try {
        await deleteCourse(id);
        alert('删除成功');
        fetchCourses(pagination.current, pagination.size, queryKeyword, selectedCategoryId);
      } catch (e) { alert('删除失败，可能有关联的章节数据未清理'); }
    }
  };

  const handleEditClick = async (courseId) => {
    setFetchingDetail(true);
    try {
      const detailData = await getCourseDetail(courseId);
      setFormData({ ...initialFormData, ...detailData, chapters: detailData.chapters || [] });
      setIsEdit(true);
      setIsModalOpen(true);
    } catch (error) { alert('获取课程详情失败，请检查网络'); } 
    finally { setFetchingDetail(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.categoryId) return alert('请填写完整的必填项（名称、分类）！'); 
    
    const payload = {
      ...formData,
      categoryId: parseInt(formData.categoryId),
      isRequired: parseInt(formData.isRequired),
      courseMode: parseInt(formData.courseMode),
      creditHours: parseFloat(formData.creditHours || 0)
    };

    setSubmitting(true);
    try {
      if (isEdit) { await updateCourse(payload); alert('课程基本信息更新成功！'); } 
      else { await createCourse(payload); alert('新课程创建成功！'); }
      setIsModalOpen(false);
      fetchCourses(pagination.current, pagination.size, queryKeyword, selectedCategoryId);
    } catch (error) { alert('保存失败，请检查数据格式是否正确'); } 
    finally { setSubmitting(false); }
  };

  // 🌟 --- 发布作业逻辑 ---
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignFormData.title || !assignFormData.deadline) return alert('作业标题和截止时间为必填项！');

    setAssignSubmitting(true);
    try {
      const isoDeadline = new Date(assignFormData.deadline).toISOString();
      const payload = {
        courseId: assignmentModal.courseId,
        title: assignFormData.title,
        content: assignFormData.content || '',
        attachmentUrl: assignFormData.attachmentUrl || '',
        deadline: isoDeadline
      };

      await publishAssignment(payload); // 真实接口
      alert('作业发布成功！');
      setAssignmentModal({ isOpen: false, courseId: null, courseName: '' });
    } catch (error) {
      alert('作业发布失败，请检查网络或时间格式');
    } finally {
      setAssignSubmitting(false);
    }
  };


  const renderCategoryNode = (node) => {
    const isSelected = selectedCategoryId === node.id;
    return (
      <div key={node.id} className="w-full">
        <div onClick={() => handleCategorySelect(node.id)} className={`flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors group ${isSelected ? 'bg-blue-100/70 text-blue-700 font-bold dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
          <span className={`material-symbols-outlined text-[18px] ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>folder</span>
          <span className="text-sm truncate flex-1">{node.name}</span>
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); setCatFormData({ id: null, parentId: node.id, name: '', sort: 0 }); setCatModal({ isOpen: true, isEdit: false }); }} className="text-slate-400 hover:text-emerald-600 p-0.5" title="添加子分类">
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); setCatFormData({ id: node.id, parentId: node.parentId || 0, name: node.name, sort: node.sort || 0 }); setCatModal({ isOpen: true, isEdit: true }); }} className="text-slate-400 hover:text-blue-600 p-0.5" title="编辑分类">
              <span className="material-symbols-outlined text-[16px]">edit</span>
            </button>
            <button onClick={(e) => handleDeleteCat(node.id, node.name, e)} className="text-slate-400 hover:text-red-500 p-0.5" title="删除分类">
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="pl-4 border-l border-slate-200 dark:border-slate-700 ml-2.5 mt-0.5 space-y-0.5">{node.children.map(renderCategoryNode)}</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-8rem)] animate-in fade-in duration-300">
      
      {/* ================= 左侧：分类树 ================= */}
      <div className="w-full md:w-64 flex-shrink-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500 text-[18px]">account_tree</span> 课程分类
          </h3>
          <button onClick={() => { setCatFormData({ id: null, parentId: selectedCategoryId || 0, name: '', sort: 0 }); setCatModal({ isOpen: true, isEdit: false }); }} className="text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 p-1 rounded transition-colors" title="添加分类">
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </div>
        <div className="p-3 overflow-y-auto flex-1">
          <div onClick={() => handleCategorySelect(null)} className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors mb-2 ${selectedCategoryId === null ? 'bg-blue-100/70 text-blue-700 font-bold dark:bg-blue-900/50 dark:text-blue-400' : 'hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
            <span className={`material-symbols-outlined text-[18px] ${selectedCategoryId === null ? 'text-blue-600' : 'text-slate-400'}`}>apps</span>
            <span className="text-sm">全部分类</span>
          </div>
          <div className="space-y-0.5">
            {categories.length > 0 ? categories.map(renderCategoryNode) : <p className="text-sm text-slate-400 text-center py-4">暂无分类</p>}
          </div>
        </div>
      </div>

      {/* ================= 右侧：课程列表 ================= */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center gap-4">
          <div className="flex gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="搜索课程名称..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 w-64"/>
            </div>
            <button onClick={handleSearch} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium">查询</button>
          </div>
          <button onClick={() => { setIsEdit(false); setFormData({ ...initialFormData, categoryId: selectedCategoryId || '' }); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-sm">add</span> 创建新课程
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">课程信息</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">属性</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">状态</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">管理操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200 dark:bg-slate-900 dark:divide-slate-800">
              {loading ? <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500">加载课程中...</td></tr> : courses.length === 0 ? <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500">暂无课程数据</td></tr> : courses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-20 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                           {course.thumb ? <img src={course.thumb} className="w-full h-full object-cover" alt="封面" /> : <span className="material-symbols-outlined text-slate-300">image</span>}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">{course.name}</div>
                          <div className="text-xs text-slate-500 line-clamp-1 max-w-xs">{course.shortDesc || '暂无简介'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
                         <span>学分: {course.creditHours || 0}</span>
                         <span>{course.isRequired === 1 ? '必修课' : '选修课'} | {course.courseMode === 0 ? '线上' : course.courseMode === 1 ? '线下' : '混合'}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full cursor-pointer transition-colors ${course.status === 1 ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} onClick={() => handleStatusChange(course)} title="点击切换状态">
                        {course.status === 1 ? '已发布' : '草稿箱'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => navigate(`/admin/courses/build/${course.id}`)} className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-xs transition-colors shadow-sm">
                        排课
                      </button>
                      
                      {/* 🌟 核心拆分：[作业] 按钮和 [考试] 按钮 */}
                      <button 
                        onClick={() => { setAssignmentModal({ isOpen: true, courseId: course.id, courseName: course.name }); setAssignFormData({ title: '', content: '', attachmentUrl: '', deadline: '' }); }} 
                        className="text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded text-xs transition-colors shadow-sm"
                      >
                        作业
                      </button>

                      <button 
                        onClick={() => setExamHubModal({ isOpen: true, courseId: course.id, courseName: course.name })} 
                        className="text-white bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded text-xs mr-4 transition-colors shadow-sm inline-flex items-center gap-1"
                      >
                        考试 <span className="material-symbols-outlined text-[12px] leading-none">expand_more</span>
                      </button>

                      <button disabled={fetchingDetail} onClick={() => handleEditClick(course.id)} className="text-slate-500 hover:text-blue-600 mr-2 disabled:opacity-50">
                        编辑
                      </button>
                      <button onClick={() => handleDelete(course.id, course.name)} className="text-slate-500 hover:text-red-600">删除</button>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {!loading && pagination.total > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
             <span className="text-sm text-slate-500 dark:text-slate-400">共 {pagination.total} 门课程</span>
             <div className="flex gap-2">
               <button onClick={() => setPagination(p => ({...p, current: Math.max(1, p.current - 1)}))} disabled={pagination.current === 1} className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm disabled:opacity-50 dark:text-slate-300">上一页</button>
               <span className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 flex items-center">{pagination.current} / {maxPage}</span>
               <button onClick={() => setPagination(p => ({...p, current: Math.min(maxPage, p.current + 1)}))} disabled={pagination.current >= maxPage} className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm disabled:opacity-50 dark:text-slate-300">下一页</button>
             </div>
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* 以下全部是弹窗区域：分类、建课、发布作业、考试系统中枢 */}
      {/* ========================================================== */}

      {/* 1. 分类管理弹窗 */}
      {catModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2 dark:text-white"><span className="material-symbols-outlined text-blue-500">folder</span>{catModal.isEdit ? '编辑分类' : '新增分类'}</h3>
              <button onClick={() => setCatModal({ isOpen: false })} className="text-slate-400 hover:text-slate-600 p-1 rounded-full transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleCatSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">上级分类</label>
                <select value={catFormData.parentId} onChange={e => setCatFormData({...catFormData, parentId: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-shadow">
                  <option value={0}>作为顶级分类 (无上级)</option>
                  {flatCategories.map(cat => <option key={cat.id} value={cat.id} disabled={catModal.isEdit && cat.id === catFormData.id}>{'　'.repeat(cat.level)} {cat.level > 0 ? '├ ' : ''} {cat.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">分类名称 <span className="text-red-500">*</span></label>
                <input required autoFocus type="text" value={catFormData.name} onChange={e => setCatFormData({...catFormData, name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-shadow" placeholder="例如: 基础技能培训" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">排序 (越小越前)</label>
                <input type="number" value={catFormData.sort} onChange={e => setCatFormData({...catFormData, sort: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-shadow" placeholder="0" />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 mt-6 shrinking-0">
                <button type="button" onClick={() => setCatModal({ isOpen: false })} className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">取消</button>
                <button type="submit" disabled={catSubmitting} className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 shadow-sm transition-colors">
                  {catSubmitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. 课程基础信息弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><span className="material-symbols-outlined text-blue-500">settings</span>{isEdit ? '编辑课程基础信息' : '创建新课程'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">所属分类 <span className="text-red-500">*</span></label>
                    <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-shadow">
                      <option value="">请选择分类</option>
                      {flatCategories.map(cat => <option key={cat.id} value={cat.id}>{'　'.repeat(cat.level)} {cat.level > 0 ? '├ ' : ''} {cat.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">课程名称 <span className="text-red-500">*</span></label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-shadow" placeholder="请输入直观的课程名称" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">封面图片 URL</label>
                    <input type="text" value={formData.thumb} onChange={e => setFormData({...formData, thumb: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-shadow" placeholder="http://..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">课程学分</label>
                    <input type="number" step="0.5" value={formData.creditHours} onChange={e => setFormData({...formData, creditHours: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-shadow" placeholder="0.0" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">修读要求</label>
                    <select value={formData.isRequired} onChange={e => setFormData({...formData, isRequired: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-shadow">
                      <option value={0}>选修课</option>
                      <option value={1}>必修课</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">授课方式</label>
                    <select value={formData.courseMode} onChange={e => setFormData({...formData, courseMode: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-shadow">
                      <option value={0}>纯线上视频</option>
                      <option value={1}>纯线下授课</option>
                      <option value={2}>线上线下混合</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">课程简介</label>
                  <textarea rows="3" value={formData.shortDesc} onChange={e => setFormData({...formData, shortDesc: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-shadow resize-none" placeholder="简要描述课程目标和内容（限200字）" />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0 bg-slate-50 dark:bg-slate-800/50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors">取消</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 shadow-sm transition-colors">
                  {submitting ? '保存中...' : '保存基础信息'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 3. 发布作业表单弹窗 (保留你指定的 4 个核心字段) */}
      {assignmentModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrinking-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><span className="material-symbols-outlined text-indigo-500">assignment_add</span>发布课程作业</h3>
              <button onClick={() => setAssignmentModal({ isOpen: false, courseId: null, courseName: '' })} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleAssignSubmit} className="flex flex-col overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-2.5 rounded-lg text-sm flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] mt-0.5">info</span>
                  <div>正在为课程 <strong>《{assignmentModal.courseName}》</strong> 发布全局作业。学员将在课程主页查看到此作业。</div>
                </div>
                
                {/* 字段 1：作业标题 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">作业标题 <span className="text-red-500">*</span></label>
                  <input required autoFocus type="text" value={assignFormData.title} onChange={e => setAssignFormData({...assignFormData, title: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="例如: 期末结课大作业" />
                </div>
                
                {/* 字段 2：作业内容说明 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">作业内容说明</label>
                  <textarea rows="4" value={assignFormData.content} onChange={e => setAssignFormData({...assignFormData, content: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="请详细描述作业要求、评分标准等..." />
                </div>
                
                {/* 字段 3：附件 URL */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">附件 URL (选填)</label>
                  <input type="text" value={assignFormData.attachmentUrl} onChange={e => setAssignFormData({...assignFormData, attachmentUrl: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="如果有参考资料、多媒体素材可填入链接" />
                </div>
                
                {/* 字段 4：提交截止时间 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">提交截止时间 <span className="text-red-500">*</span></label>
                  <input required type="datetime-local" value={assignFormData.deadline} onChange={e => setAssignFormData({...assignFormData, deadline: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

              </div>
              <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 shrink-0">
                <button type="button" onClick={() => setAssignmentModal({ isOpen: false, courseId: null, courseName: '' })} className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors">取消</button>
                <button type="submit" disabled={assignSubmitting} className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 shadow-sm transition-colors flex items-center gap-1.5">
                  {assignSubmitting ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : null}
                  {assignSubmitting ? '发布中...' : '确认发布'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 4. 考试系统【操作中枢面板】 (点击表格行内[考试]按钮打开) */}
      {examHubModal.isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-500 text-[22px]">timer</span> 考试系统管理
                </h3>
                <p className="text-xs text-slate-500 mt-1">当前管理课程：《{examHubModal.courseName}》</p>
              </div>
              <button onClick={() => setExamHubModal({ isOpen: false, courseId: null, courseName: '' })} className="text-slate-400 hover:bg-slate-200 p-1.5 rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 bg-slate-50/30 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* 模块1：题库管理 */}
                <div 
                  onClick={() => {
                    setExamHubModal({ isOpen: false, courseId: null, courseName: '' });
                    navigate(`/admin/courses/questions/${examHubModal.courseId}`); // ⚠️ 注意路由路径
                  }}
                  className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md p-6 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center text-center group"
                >
                  <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[28px]">dataset</span>
                  </div>
                  <div className="font-bold text-slate-800 text-base">题库管理</div>
                  <div className="text-xs text-slate-400 mt-1.5">单选/多选/判断题录入</div>
                </div>

                {/* 模块2：试卷管理 */}
                <div 
                  onClick={() => {
                    setExamHubModal({ isOpen: false, courseId: null, courseName: '' });
                    navigate(`/admin/courses/papers/${examHubModal.courseId}`); // ⚠️ 注意路由路径
                  }}
                  className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md p-6 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center text-center group"
                >
                  <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[28px]">description</span>
                  </div>
                  <div className="font-bold text-slate-800 text-base">试卷管理</div>
                  <div className="text-xs text-slate-400 mt-1.5">从题库抽题组成试卷</div>
                </div>

                {/* 模块3：考试管理 */}
                <div 
                  onClick={() => {
                    setExamHubModal({ isOpen: false, courseId: null, courseName: '' });
                    navigate(`/admin/courses/exams/${examHubModal.courseId}`); // ⚠️ 注意路由路径
                  }}
                  className="bg-white border border-slate-200 hover:border-rose-400 hover:shadow-md p-6 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center text-center group"
                >
                  <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[28px]">alarm_on</span>
                  </div>
                  <div className="font-bold text-slate-800 text-base">考试管理</div>
                  <div className="text-xs text-slate-400 mt-1.5">发布考试与监考</div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}