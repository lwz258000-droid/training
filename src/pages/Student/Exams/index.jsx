import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyCourses, getCourseExams } from '../../../api/student';

export default function StudentExamsIndex() {
  const navigate = useNavigate();

  // 状态管理
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [exams, setExams] = useState([]);
  
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingExams, setLoadingExams] = useState(false);

  // 1. 页面初始化：拉取“我的课程”
  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await getMyCourses({ current: 1, size: 100 });
      
      // 🌟 终极解析模式：无论后端返回纯数组、还是包在 data、还是包在 records 里，统统拿下！
      let courseList = [];
      if (Array.isArray(res)) {
        courseList = res;
      } else if (Array.isArray(res?.data)) {
        courseList = res.data;
      } else if (Array.isArray(res?.records)) {
        courseList = res.records;
      } else if (Array.isArray(res?.data?.records)) {
        courseList = res.data.records;
      }

      setCourses(courseList);
      
      // 如果学员有课程，默认选中第一门课，这会自动触发第二步的 useEffect
      if (courseList.length > 0) {
        // 兼容有的后端叫 id，有的叫 courseId
        const firstCourseId = courseList[0].courseId || courseList[0].id;
        setSelectedCourseId(firstCourseId);
      }
    } catch (error) {
      console.error('获取我的课程列表失败', error);
    } finally {
      setLoadingCourses(false);
    }
  };

  // 2. 监听 courseId 变化，动态拉取该课程名下的考试
  useEffect(() => {
    if (selectedCourseId) {
      fetchExamsByCourse(selectedCourseId);
    }
  }, [selectedCourseId]);

  const fetchExamsByCourse = async (courseId) => {
    setLoadingExams(true);
    try {
      const res = await getCourseExams(courseId);
      // 同样做一下终极兼容解析
      let examList = [];
      if (Array.isArray(res)) examList = res;
      else if (Array.isArray(res?.data)) examList = res.data;
      else if (Array.isArray(res?.records)) examList = res.records;
      else if (Array.isArray(res?.data?.records)) examList = res.data.records;

      setExams(examList);
    } catch (error) {
      console.error('获取考试列表失败', error);
      setExams([]);
    } finally {
      setLoadingExams(false);
    }
  };

  // 3. 点击去考试，跳转到答题页面
  const handleStartExam = (examId) => {
    navigate(`/student/exams/take/${examId}`); 
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative pb-10">
      
      {/* 大厅头部 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-2xl shadow-sm border border-blue-500 flex items-center justify-between">
        <div className="flex items-center gap-5 text-white">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
            <span className="material-symbols-outlined text-3xl text-white">edit_document</span>
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-wide">我的考试大厅</h2>
            <p className="text-blue-100 text-sm mt-1">请先在左侧选择课程，即可查看并参与名下测验。</p>
          </div>
        </div>
      </div>

      {/* 左右分栏布局 */}
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* 左侧：我的课程列表 */}
        <div className="w-full md:w-1/3 lg:w-1/4 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden sticky top-6">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">library_books</span>
                已报课程 ({courses.length})
              </h2>
            </div>
            
            <div className="p-3 max-h-[600px] overflow-y-auto space-y-2">
              {loadingCourses ? (
                <div className="py-10 text-center text-slate-400">
                  <span className="material-symbols-outlined animate-spin text-3xl mb-2">sync</span>
                  <p className="text-sm">加载课程中...</p>
                </div>
              ) : courses.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl opacity-30 mb-2">inbox</span>
                  <p className="text-sm">您暂未报名任何课程</p>
                </div>
              ) : (
                courses.map(course => (
                  <div 
                    key={course.courseId || course.id}
                    onClick={() => setSelectedCourseId(course.courseId || course.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border-2 ${
                      selectedCourseId === (course.courseId || course.id) 
                        ? 'border-blue-500 bg-blue-50 shadow-sm' 
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                      {course.thumb ? (
                        <img src={course.thumb} alt="cover" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                          <span className="material-symbols-outlined">image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className={`text-sm font-bold truncate ${selectedCourseId === (course.courseId || course.id) ? 'text-blue-700' : 'text-slate-800'}`}>
                        {course.title || course.name}
                      </h3>
                      <p className="text-xs text-slate-500 truncate mt-1">学时: {course.creditHours || 0}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 右侧：考试卡片列表 */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[400px]">
            <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500">assignment</span>
              待办测验任务
            </h3>

            {loadingExams ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <span className="material-symbols-outlined animate-spin text-4xl mb-4 text-blue-300">sync</span>
                <p>正在获取考试列表...</p>
              </div>
            ) : exams.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-20">assignment_turned_in</span>
                <p className="text-lg font-medium text-slate-600">当前课程暂无考试</p>
                <p className="text-sm mt-1">您可以先前往【我的课程】继续学习视频</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {exams.map(exam => (
                  <div key={exam.id || exam.examId} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all flex flex-col group relative overflow-hidden">
                    {/* 左侧蓝色高亮条 */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded text-xs font-bold border border-amber-200">
                        {exam.status || '待考'}
                      </span>
                      <span className="text-slate-400 text-xs font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {exam.duration || 120} 分钟
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2 flex-1 group-hover:text-blue-600 transition-colors">
                      {exam.title || exam.examName || '未命名考试'}
                    </h3>

                    <div className="text-xs text-slate-500 mb-5 flex items-center gap-4">
                      <span>及格线: <strong className="text-slate-700">{exam.passTotalScore || 60} 分</strong></span>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">考试ID: {exam.id || exam.examId}</span>
                      <button 
                        onClick={() => handleStartExam(exam.id || exam.examId)}
                        className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-5 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 flex items-center gap-1"
                      >
                        进入考场 <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}