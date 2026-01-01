import { ImageType } from '@renderer/hooks/useScreenshot';

export type FieldType = {
  imageType: ImageType;
  withBackground: boolean;
  withFooter: boolean;
  withPluginInfo: boolean;
  withSystemRole: boolean;
};
