// 全局通知工具
export interface NotificationOptions {
  title?: string;
  text: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  showProgress?: boolean;
}

export function showNotification(options: NotificationOptions | string) {
  // 如果传入字符串，则转换为简单对象
  if (typeof options === 'string') {
    options = { text: options };
  }

  const { title, text, type = 'info', duration = 4000, showProgress = false } = options;

  // 简单的 toast 通知 fallback
  if (typeof window !== 'undefined') {
    // 创建或获取通知容器
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
      `;
      document.body.appendChild(container);
    }

    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'notification-item';

    const colorMap = {
      success: '#52c41a',
      error: '#ff4d4f',
      info: '#1890ff',
      warning: '#faad14',
    };

    notification.style.cssText = `
      padding: 12px 16px;
      background: white;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      min-width: 300px;
      max-width: 400px;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      border-left: 4px solid ${colorMap[type]};
      color: rgba(0, 0, 0, 0.85);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // 添加内容
    const content = document.createElement('div');
    if (title) {
      const titleEl = document.createElement('div');
      titleEl.style.fontWeight = 'bold';
      titleEl.style.marginBottom = '4px';
      titleEl.textContent = title;
      content.appendChild(titleEl);
    }

    const textEl = document.createElement('div');
    textEl.textContent = text;
    content.appendChild(textEl);

    if (showProgress && duration) {
      const progressBar = document.createElement('div');
      progressBar.style.cssText = `
        height: 2px;
        background: ${colorMap[type]};
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        transform-origin: left;
        animation: progress ${duration}ms linear forwards;
      `;
      notification.appendChild(progressBar);
    }

    notification.appendChild(content);

    // 添加动画
    const style = document.createElement('style');
    if (!document.getElementById('notification-styles')) {
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          to {
            transform: translateX(0);
          }
        }
        @keyframes slideOut {
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        @keyframes progress {
          to {
            transform: scaleX(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // 添加事件监听器
    container.appendChild(notification);

    // 触发动画
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s forwards';
    }, 10);

    // 自动移除
    const removeNotification = () => {
      notification.style.animation = 'slideOut 0.3s forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    };

    // 设置定时器
    let timer: NodeJS.Timeout;
    if (duration && duration > 0) {
      timer = setTimeout(removeNotification, duration);
    }

    // 点击手动关闭
    notification.style.cursor = 'pointer';
    notification.addEventListener('click', () => {
      if (timer) clearTimeout(timer);
      removeNotification();
    });

    return {
      notification,
      remove: removeNotification,
    };
  }

  return null;
}

// 添加 window 类型声明
declare global {
  interface Window {
    showNotification: typeof showNotification;
  }
}

// 挂载到 window，便于全局使用
if (typeof window !== 'undefined') {
  window.showNotification = showNotification;
}