import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getStudentCourseDetail, checkCourseCompletion } from '../../../api/student';

export default function StudentLearning() {
  const navigate = useNavigate();
  const { id } = useParams(); 

  const [activeTab, setActiveTab] = useState('intro');
  const [loading, setLoading] = useState(true);
  
  const [courseData, setCourseData] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);

  useEffect(() => {
    const fetchDetailAndProgress = async () => {
      setLoading(true);
      try {
        const [detailRes, progressRes] = await Promise.all([
          getStudentCourseDetail(id).catch(() => null),
          checkCourseCompletion(id).catch(() => null)
        ]);

        if (!detailRes) {
          setCourseData(null);
          return;
        }

        const data = detailRes?.data || detailRes;
        
        // 进度兼容处理
        const pData = progressRes?.data ?? progressRes;
        let progressVal = 0;
        if (typeof pData === 'number') {
           progressVal = pData; 
        } else if (pData && typeof pData === 'object') {
           progressVal = pData.progress ?? pData.completionRate ?? pData.percent ?? 0;
        }
        
        // 🌟 核心修复：无敌兼容后端的章节/课时结构
        let finalChapters = [];
        if (data.chapters && data.chapters.length > 0) {
          // 结构 A: 包含章节，章节里有 lessons 或 hours
          finalChapters = data.chapters.map(c => ({
            ...c,
            lessons: c.lessons || c.hours || []
          }));
        } else if (data.lessons && data.lessons.length > 0) {
          // 结构 B: 没有章节划分，直接丢过来一堆 lessons
          finalChapters = [{ id: 'default-chapter', name: '课程目录', lessons: data.lessons }];
        } else if (Array.isArray(data)) {
          // 结构 C: 整个返回值就是一个课时数组
          finalChapters = [{ id: 'default-chapter', name: '课程目录', lessons: data }];
        }
        
        const formattedData = {
          id: data.id || id,
          title: data.title || data.name || '未命名课程',
          isRequired: data.isRequired, 
          progress: progressVal, 
          intro: data.shortDesc || data.intro || data.content || '该课程暂无详细简介。',
          chapters: finalChapters
        };
        
        setCourseData(formattedData);

        // 默认选中第一节课自动准备播放
        if (formattedData.chapters.length > 0 && formattedData.chapters[0].lessons.length > 0) {
          setActiveLesson(formattedData.chapters[0].lessons[0]);
        }

      } catch (error) {
        console.error('获取课程详情或进度失败', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchDetailAndProgress();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <span className="material-symbols-outlined text-4xl animate-spin text-blue-500 mb-4">sync</span>
        <span>正在努力加载课程内容...</span>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <span className="material-symbols-outlined text-5xl mb-4 opacity-50">error</span>
        <span>课程不存在或已被下架</span>
        <button onClick={() => navigate('/student/dashboard')} className="mt-6 px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">返回学习大厅</button>
      </div>
    );
  }

  // 判断课时类型：1 是视频，其他认为是文档
  const isVideo = activeLesson?.type === 1 || !!activeLesson?.playbackUrl;

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* ================= 左侧：主学习区 ================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100">
        
        <div className="h-14 bg-slate-900 text-slate-300 flex items-center justify-between px-4 shrink-0 shadow-md z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">arrow_back_ios</span>
              <span className="text-sm font-medium">返回上一页</span>
            </button>
            <div className="w-px h-4 bg-slate-700"></div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${courseData.isRequired === 1 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                {courseData.isRequired === 1 ? '必修课' : '选修课'}
              </span>
              <h1 className="text-white font-bold truncate max-w-lg" title={courseData.title}>
                {courseData.title}
              </h1>
            </div>
          </div>
        </div>

        {/* 🌟 真实的视频播放器区域 */}
        <div className="w-full bg-black flex-shrink-0 flex items-center justify-center relative shadow-inner group" style={{ aspectRatio: '21/9', maxHeight: '60vh' }}>
          {courseData.chapters.length === 0 ? (
             <div className="text-slate-400 flex flex-col items-center">
               <span className="material-symbols-outlined text-6xl mb-2 opacity-50">videocam_off</span>
               <p className="text-lg font-medium">该课程尚未添加任何课时</p>
             </div>
          ) : activeLesson ? (
            isVideo ? (
              activeLesson.playbackUrl ? (
                <video 
                  src={activeLesson.playbackUrl} 
                  controls 
                  controlsList="nodownload"
                  autoPlay 
                  className="w-full h-full object-contain bg-black"
                >
                  您的浏览器不支持播放该视频。
                </video>
              ) : (
                <div className="text-slate-400 flex flex-col items-center">
                  <span className="material-symbols-outlined text-6xl mb-2 opacity-50">broken_image</span>
                  <p>抱歉，未获取到视频播放地址</p>
                </div>
              )
            ) : (
              <div className="text-slate-300 flex flex-col items-center justify-center p-8 bg-slate-800 w-full h-full">
                 <span className="material-symbols-outlined text-6xl mb-4 text-blue-400">description</span>
                 <p className="text-xl font-bold mb-2">图文资料：{activeLesson.name}</p>
                 <p className="text-sm opacity-70">请在下方课件资料栏目查看详情或下载附件</p>
              </div>
            )
          ) : null}

          {/* 视频右上角悬浮课时名称 */}
          {activeLesson && isVideo && activeLesson.playbackUrl && (
             <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 pointer-events-none">
               <span className="material-symbols-outlined text-[16px]">play_circle</span> {activeLesson.name}
             </div>
          )}
        </div>

        <div className="flex-1 flex flex-col bg-white overflow-hidden border-t border-slate-200">
          <div className="flex px-6 border-b border-slate-200 shrink-0">
            <button onClick={() => setActiveTab('intro')} className={`px-4 py-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'intro' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>课程简介</button>
            <button onClick={() => setActiveTab('materials')} className={`px-4 py-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'materials' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>课件资料</button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'intro' && (
              <div className="animate-in fade-in duration-300">
                <h3 className="font-bold text-slate-800 mb-4 text-lg">关于本课</h3>
                <div 
                  className="text-slate-600 leading-relaxed text-sm prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: courseData.intro }}
                />
              </div>
            )}
            {activeTab === 'materials' && (
              <div className="animate-in fade-in duration-300 py-10 flex flex-col items-center text-slate-400">
                <span className="material-symbols-outlined text-5xl mb-2 opacity-30">folder_open</span>
                <p className="text-sm">暂无附加下载资料</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= 右侧：课程目录与进度 ================= */}
      <div className="w-[380px] bg-white border-l border-slate-200 flex flex-col h-full flex-shrink-0 shadow-[-4px_0_15px_rgb(0,0,0,0.03)] z-20">
        
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex justify-between items-end mb-2">
            <h2 className="font-bold text-lg text-slate-800">课程目录</h2>
            <span className={`text-sm font-bold ${courseData.progress === 100 ? 'text-emerald-500' : 'text-blue-600'}`}>
              已学 {courseData.progress}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${courseData.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} 
              style={{ width: `${courseData.progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {courseData.chapters.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">folder_open</span>
              <p>该课程暂无课时大纲</p>
            </div>
          ) : (
            courseData.chapters.map((chapter, index) => (
              <div key={chapter.id || index} className="border-b border-slate-100">
                
                <div className="bg-slate-50/80 px-5 py-3 text-sm font-bold text-slate-700 flex items-center gap-2">
                  <span className="bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">章节</span>
                  {chapter.name}
                </div>
                
                <div className="flex flex-col">
                  {/* 🌟 修复：遍历 lessons 而不是 hours */}
                  {(chapter.lessons || []).map((lesson, lIdx) => {
                    const isPlaying = activeLesson?.id === lesson.id;
                    const isVideoType = lesson.type === 1 || !!lesson.playbackUrl;
                    
                    return (
                      <div 
                        key={lesson.id || lIdx}
                        onClick={() => setActiveLesson(lesson)}
                        className={`flex flex-col px-5 py-3 transition-colors cursor-pointer border-l-4 ${isPlaying ? 'bg-blue-50/50 border-blue-600' : 'border-transparent hover:bg-slate-50'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">
                            {isPlaying 
                              ? <span className={`material-symbols-outlined text-[18px] text-blue-600 ${isVideoType ? 'animate-pulse' : ''}`}>{isVideoType ? 'play_circle' : 'description'}</span> 
                              : <span className="material-symbols-outlined text-[18px] text-slate-400">{isVideoType ? 'play_circle' : 'article'}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm truncate ${isPlaying ? 'font-bold text-blue-700' : 'font-medium text-slate-700'}`} title={lesson.name}>
                              {lesson.name}
                            </div>
                            {lesson.duration > 0 && (
                              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">schedule</span> {lesson.duration} 分钟
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(!chapter.lessons || chapter.lessons.length === 0) && (
                    <div className="px-8 py-3 text-xs text-slate-400 italic">暂无课时内容</div>
                  )}
                </div>

              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}