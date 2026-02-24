import './globals.css';
import { Providers } from './providers';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './const/languages';

// 从统一配置获取支持的语言列表（用于内联脚本）
const supportedLanguagesList = Object.keys(SUPPORTED_LANGUAGES);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={DEFAULT_LANGUAGE} suppressHydrationWarning>
      <head>
        {/* 内联脚本：在 React hydrate 之前同步设置语言，避免闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const supportedLanguages = ${JSON.stringify(supportedLanguagesList)};
                let lang = '${DEFAULT_LANGUAGE}';
                
                try {
                  const stored = localStorage.getItem('LOBE_PREFERENCE');
                  if (stored) {
                    const preference = JSON.parse(stored);
                    if (preference?.language && supportedLanguages.includes(preference.language)) {
                      lang = preference.language;
                    }
                  }
                } catch (e) {
                  // Ignore errors
                }
                
                // 设置 html lang 属性
                document.documentElement.lang = lang;
                
                // 将语言存储在 window 对象上，供 i18n 初始化使用
                window.__INITIAL_LANGUAGE__ = lang;
                
                // 标记语言已初始化，可以显示内容
                document.documentElement.setAttribute('data-i18n-ready', 'true');
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased" id="app">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

// 添加全局类型声明
declare global {
  interface Window {
    __INITIAL_LANGUAGE__: string;
  }
}
