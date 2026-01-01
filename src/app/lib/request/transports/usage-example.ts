/**
 * 请求管理器使用示例
 * 展示如何在 React 组件中使用新的请求管理器
 */

import { RequestManager } from '../request-manager';

// 获取请求管理器实例
const requestManager = RequestManager.getInstance();

// 在 React 组件中使用示例
export const ExampleComponent = () => {
  // 获取数据示例
  const fetchData = async () => {
    try {
      const data = await requestManager.get('/api/data');
      console.log('Data fetched:', data);
      return data;
    } catch (error) {
      console.error('Fetch failed:', error);
      throw error;
    }
  };

  // 提交数据示例
  const submitData = async (payload: any) => {
    try {
      const result = await requestManager.post('/api/data', payload);
      console.log('Data submitted:', result);
      return result;
    } catch (error) {
      console.error('Submit failed:', error);
      throw error;
    }
  };

  // 更新数据示例
  const updateData = async (id: string, payload: any) => {
    try {
      const result = await requestManager.put(`/api/data/${id}`, payload);
      console.log('Data updated:', result);
      return result;
    } catch (error) {
      console.error('Update failed:', error);
      throw error;
    }
  };

  // 删除数据示例
  const deleteData = async (id: string) => {
    try {
      const result = await requestManager.delete(`/api/data/${id}`);
      console.log('Data deleted:', result);
      return result;
    } catch (error) {
      console.error('Delete failed:', error);
      throw error;
    }
  };

  return {
    fetchData,
    submitData,
    updateData,
    deleteData
  };
};

// 切换传输协议示例
export const switchTransport = (type: 'http' | 'ipc') => {
  requestManager.setTransport(type);
  console.log(`Transport switched to: ${type}`);
};

// 获取当前传输协议
export const getCurrentTransport = () => {
  return requestManager.getTransportType();
};