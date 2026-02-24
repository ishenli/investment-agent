import type { AppNamespace, resources } from './index';

type ResourcesType = (typeof resources)['en-US'];

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: ResourcesType;
    ns: AppNamespace;
  }
}