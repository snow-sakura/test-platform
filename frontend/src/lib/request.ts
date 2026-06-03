import axios from 'axios';
import { message } from 'antd';
import { useAuthStore } from '@/stores/auth-store';

const request = axios.create({
  baseURL: '',
  timeout: 15000,
});

// 请求拦截器：注入 Bearer token
request.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：401 时自动刷新令牌
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

request.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 且不是刷新令牌接口本身 -> 尝试刷新
    if (error.response?.status === 401
      && !originalRequest._retry
      && !originalRequest.url?.includes('/auth/token/refresh')
      && !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(request(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const success = await useAuthStore.getState().refreshAuth();
        if (success) {
          const newToken = useAuthStore.getState().accessToken;
          onRefreshed(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return request(originalRequest);
        } else {
          // 刷新失败，跳转到登录页
          useAuthStore.getState().logout();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } catch {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } finally {
        isRefreshing = false;
      }

      return Promise.reject(error);
    }

    // 显示错误消息
    if (error.response) {
      const msg = error.response.data?.detail || error.response.statusText;
      // 登录页不显示 401 错误
      if (error.response.status !== 401) {
        message.error(msg);
      }
    } else if (error.request) {
      message.error('网络错误，请检查网络连接');
    } else {
      message.error(error.message);
    }

    return Promise.reject(error);
  }
);

export default request;
