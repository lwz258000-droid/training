// src/api/certificate.js
// 证书相关 API 接口定义
import request from './request';

/**
 * 获取我的证书列表
 * @returns {Promise<Array>} 证书列表
 */
export const getMyCertificates = () => {
  return request.get('/frontend/certificates/my');
};

/**
 * 获取证书公示名单
 * @returns {Promise<Array>} 公示证书列表
 */
export const getPublicCertificates = () => {
  return request.get('/frontend/certificates/public');
};

/**
 * 申请纸质证书邮寄
 * @param {string|number} id - 证书ID
 * @param {Object} data - 邮寄信息
 * @param {string} data.receiverName - 收件人姓名
 * @param {string} data.phone - 联系电话
 * @param {string} data.address - 详细地址
 * @returns {Promise<Object>} 申请结果
 */
export const applyPaperCertificate = (id, data) => {
  return request.post(`/frontend/certificates/${id}/requests`, data);
};
