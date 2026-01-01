import { App } from 'antd';
import { useState } from 'react';

import { ImageType, getImageUrl } from './useScreenshot';

export const useImgToClipboard = ({
  id = '#preview',
  width,
}: { id?: string; width?: number } = {}) => {
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();

  const handleCopy = async () => {
    setLoading(true);
    try {
      const dataUrl = await getImageUrl({
        id,
        imageType: ImageType.PNG,
        width,
      });
      const blob = await fetch(dataUrl).then((res) => res.blob());
      navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setLoading(false);
      message.success('复制成功');
    } catch (error) {
      console.error('Failed to copy image', error);
      setLoading(false);
    }
  };

  return {
    loading,
    onCopy: handleCopy,
  };
};
