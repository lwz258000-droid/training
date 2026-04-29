import React, { useState, useEffect } from 'react';
import { getMyCertificates, getPublicCertificates, applyPaperCertificate } from '../../../api/certificate';

export default function Certificates() {
  const [activeTab, setActiveTab] = useState('my');
  const [myCertList, setMyCertList] = useState([]);
  const [publicCertList, setPublicCertList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState(null);

  // ========== 显示提示信息 ==========
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ========== 获取我的证书列表 ==========
  const fetchMyCerts = async () => {
    try {
      const res = await getMyCertificates();
      const data = res?.data || res?.data?.records || [];
      setMyCertList(data.map((cert, index) => ({
        id: cert.id || index,
        title: cert.title || '课程结业证书',
        type: cert.type || '能力资质',
        issueDate: cert.issueDate || cert.issuedAt || '未知日期',
        certNo: cert.certNo || `CERT-${cert.id}`,
        course: cert.courseName || cert.course || `关联课程 ID: ${cert.courseId}`
      })));
    } catch (error) {
      console.error('获取我的证书失败:', error);
      showToast('获取证书列表失败，请稍后重试', 'error');
    }
  };

  // ========== 获取证书公示名单 ==========
  const fetchPublicCerts = async () => {
    try {
      const res = await getPublicCertificates();
      const data = res?.data || res?.data?.records || [];
      setPublicCertList(data.map((cert, index) => ({
        id: cert.id || index,
        userName: cert.userName || cert.name || '匿名学员',
        userId: cert.userId || '未知',
        courseId: cert.courseId || '未知',
        certNo: cert.certNo || `CERT-${cert.id}`,
        issueDate: cert.issueDate || cert.issuedAt || '-',
        status: cert.status || 'valid'
      })));
    } catch (error) {
      console.error('获取公示名单失败:', error);
      showToast('获取公示名单失败，请稍后重试', 'error');
    }
  };

  // ========== 根据 Tab 加载数据 ==========
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'my') {
          await fetchMyCerts();
        } else if (activeTab === 'public') {
          await fetchPublicCerts();
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeTab]);

  // ========== 姓名脱敏处理 ==========
  const maskName = (name) => {
    if (!name) return '未知';
    const len = name.length;
    if (len === 1) return name;
    if (len === 2) return name[0] + '*';
    if (len === 3) return name[0] + '*' + name[2];
    return name[0] + '**' + name[len - 1];
  };

  // ========== 提交纸质证书申请 ==========
  const handleApplySubmit = async (values) => {
    if (!selectedCert?.id) {
      showToast('证书信息异常', 'error');
      return;
    }

    setApplying(true);
    try {
      await applyPaperCertificate(selectedCert.id, values);
      showToast('申请成功！平台将尽快为您制作并邮寄纸质证书。', 'success');
      setApplyModalOpen(false);
      setSelectedCert(null);
    } catch (error) {
      console.error('申请失败:', error);
      showToast('申请失败：' + (error?.msg || error?.message || '系统繁忙，请稍后重试'), 'error');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      
      {/* Toast 提示组件 */}
      {toast && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[1000] px-6 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-in slide-in-from-top-2 ${
          toast.type === 'success' ? 'bg-emerald-500' : 
          toast.type === 'error' ? 'bg-red-500' : 
          'bg-blue-500'
        }`}>
          {toast.message}
        </div>
      )}
      
      {/* 头部说明区 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-2xl shadow-md text-white flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-300 text-4xl">workspace_premium</span>
            证书认证中心
          </h2>
          <p className="text-blue-100 mt-2 max-w-xl">
            在这里查看您获得的专属能力凭证，或浏览全平台的优秀学员证书公示名单，见证每一份成长与荣誉。
          </p>
        </div>
        <div className="relative z-10 flex gap-4">
          <div className="flex flex-col items-center bg-white/10 px-6 py-4 rounded-xl border border-white/20 backdrop-blur-sm">
            <span className="text-3xl font-black text-amber-300">{myCertList.length}</span>
            <span className="text-xs font-medium mt-1">我的证书</span>
          </div>
          <div className="flex flex-col items-center bg-white/10 px-6 py-4 rounded-xl border border-white/20 backdrop-blur-sm">
            <span className="text-3xl font-black text-blue-200">{publicCertList.length}</span>
            <span className="text-xs font-medium mt-1">全网颁发</span>
          </div>
        </div>
      </div>

      {/* Tab 选项卡 */}
      <div className="flex border-b border-slate-200 gap-2">
        <button onClick={() => setActiveTab('my')} className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'my' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>我的证书</button>
        <button onClick={() => setActiveTab('public')} className={`px-6 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-1 ${activeTab === 'public' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <span className="material-symbols-outlined text-[18px]">public</span>证书公示名单
        </button>
      </div>

      {/* 数据展示区 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <span className="material-symbols-outlined text-4xl animate-spin text-blue-500 mb-4">sync</span>
          <p>正在努力加载证书数据...</p>
        </div>
      ) : activeTab === 'my' ? (
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-2">
          {myCertList.length === 0 ? (
             <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-100">
               <span className="material-symbols-outlined text-6xl mb-4 opacity-50">workspace_premium</span>
               <p>您目前尚未获得任何证书，继续努力学习吧！</p>
             </div>
          ) : myCertList.map(cert => (
            <div key={cert.id} className="bg-white rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group flex flex-col">
              
              <div className="h-32 bg-slate-50 border-b border-slate-100 relative p-4 flex flex-col items-center justify-center overflow-hidden shrink-0">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#1e3a8a 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                <div className="absolute left-0 top-0 w-2 h-full bg-amber-400"></div>
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-2 z-10 border border-amber-200 shadow-sm">
                  <span className="material-symbols-outlined text-amber-600 text-2xl">verified</span>
                </div>
                <div className="text-[10px] tracking-widest text-slate-400 uppercase z-10">CERTIFICATE OF ACHIEVEMENT</div>
              </div>

              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg text-slate-800 leading-tight">{cert.title}</h3>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold shrink-0">{cert.type}</span>
                </div>
                <div className="space-y-1.5 text-sm text-slate-500 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">关联来源</span>
                    <span className="font-medium text-slate-700 truncate max-w-[150px]" title={cert.course}>{cert.course}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">证书编号</span>
                    <span className="font-mono text-slate-700">{cert.certNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">颁发日期</span>
                    <span className="text-slate-700">{cert.issueDate}</span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-slate-50 flex gap-2 shrink-0">
                <button className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 border border-slate-200">
                  <span className="material-symbols-outlined text-[16px]">visibility</span> 预览
                </button>
                <button className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 border border-slate-200">
                  <span className="material-symbols-outlined text-[16px]">download</span> 下载
                </button>
                <button 
                  onClick={() => {
                    setSelectedCert(cert);
                    setApplyModalOpen(true);
                  }} 
                  className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 border border-amber-200 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">local_shipping</span> 纸质版
                </button>
              </div>

            </div>
          ))}
        </div>
        
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {publicCertList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">format_list_bulleted</span>
              <p>暂无证书公示记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">颁发日期</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">证书编号</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">关联课程 (ID)</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">获奖学员 (ID)</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">认证状态</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {publicCertList.map((cert) => (
                    <tr key={cert.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{cert.issueDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">{cert.certNo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">课程 #{cert.courseId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 flex items-center gap-2">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${cert.userId}`} alt="avatar" className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200" />
                        {maskName(cert.userName)} ({cert.userId})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <span className="material-symbols-outlined text-[12px]">verified</span> 生效中
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {publicCertList.length > 0 && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
              <span>共检索到 {publicCertList.length} 条全网公示记录</span>
              <span>数据由企培通平台提供真实性校验</span>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 纸质证书邮寄申请弹窗 */}
      {/* ============================================================== */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                </div>
                申请纸质版证书
              </h3>
              <button onClick={() => { setApplyModalOpen(false); setSelectedCert(null); }} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleApplySubmit({
                receiverName: formData.get('receiverName'),
                phone: formData.get('phone'),
                address: formData.get('address')
              });
            }} className="p-6 space-y-5">
              
              <div className="bg-amber-50 text-amber-700 text-xs p-3 rounded-lg border border-amber-200 flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">info</span>
                <p>提交申请后，管理员将为您制作并打印纸质版证书。由于物流配送原因，请务必填写真实有效的收件信息。</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">收件人姓名 <span className="text-red-500">*</span></label>
                <input 
                  name="receiverName"
                  required
                  autoFocus
                  type="text" 
                  placeholder="例如：张三"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">联系电话 <span className="text-red-500">*</span></label>
                <input 
                  name="phone"
                  required
                  type="tel" 
                  placeholder="例如：13812345678"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">详细邮寄地址 <span className="text-red-500">*</span></label>
                <textarea 
                  name="address"
                  required
                  rows="3" 
                  placeholder="请具体到省市区、街道、小区门牌号"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => { setApplyModalOpen(false); setSelectedCert(null); }} 
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  disabled={applying} 
                  className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-all active:scale-[0.98] flex items-center gap-2 shadow-md shadow-blue-600/20"
                >
                  {applying ? <><span className="material-symbols-outlined text-[18px] animate-spin">sync</span> 提交中</> : '确认申请'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
