// 数据控制台
import React, { useEffect, useState } from 'react';
import { getAdminCourseList } from '../../../api/admin';

export default function AdminDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  // 初始化加载课程列表
  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await getAdminCourseList({ current: 1, size: 5 }); // 取最新5条
      // 根据 api.txt，返回结构是 ResultPageCourse -> data.records
      setCourses(res.records || []);
    } catch (error) {
      console.error('获取课程列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Heading */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">控制台概览</h2>
          <p className="text-slate-500 dark:text-slate-400">欢迎回来！这是今日的数据动态。</p>
        </div>
        <button className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
          <span className="material-symbols-outlined text-sm">add</span>
          创建课程
        </button>
      </div>

      {/* Stats Grid - 静态数据演示 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg material-symbols-outlined">person</span>
            <span className="text-emerald-500 text-sm font-bold flex items-center">+12% <span className="material-symbols-outlined text-xs ml-0.5">trending_up</span></span>
          </div>
          <p className="text-slate-500 text-sm font-medium">总学员数</p>
          <p className="text-3xl font-bold mt-1">12,480</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg material-symbols-outlined">menu_book</span>
            <span className="text-emerald-500 text-sm font-bold flex items-center">+5% <span className="material-symbols-outlined text-xs ml-0.5">trending_up</span></span>
          </div>
          <p className="text-slate-500 text-sm font-medium">进行中的课程</p>
          <p className="text-3xl font-bold mt-1">42</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg material-symbols-outlined">check_circle</span>
            <span className="text-rose-500 text-sm font-bold flex items-center">-2% <span className="material-symbols-outlined text-xs ml-0.5">trending_down</span></span>
          </div>
          <p className="text-slate-500 text-sm font-medium">平均完成率</p>
          <p className="text-3xl font-bold mt-1">88.5%</p>
        </div>
      </div>

      {/* Training List Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-bold">最近的培训项目</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">课程名称</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">创建日期</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-8 text-slate-500">加载中...</td></tr>
              ) : courses.length > 0 ? (
                courses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-700/10 flex items-center justify-center text-blue-700">
                          <span className="material-symbols-outlined">class</span>
                        </div>
                        <div>
                           <span className="text-sm font-bold block">{course.name}</span>
                           <span className="text-xs text-slate-500">{course.shortDesc}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {course.status === 1 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">已发布</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">未发布</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-blue-700 transition-colors">
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" className="text-center py-8 text-slate-500">暂无课程数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}