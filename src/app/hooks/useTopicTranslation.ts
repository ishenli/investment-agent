import { useTranslation } from 'react-i18next';

export const useTopicTranslation = () => {
  const { t } = useTranslation('topic');
  
  return {
    // Actions
    autoRename: t('actions.autoRename'),
    confirmRemoveAll: t('actions.confirmRemoveAll'),
    confirmRemoveTopic: t('actions.confirmRemoveTopic'),
    confirmRemoveUnstarred: t('actions.confirmRemoveUnstarred'),
    duplicate: t('actions.duplicate'),
    export: t('actions.export'),
    removeAll: t('actions.removeAll'),
    removeUnstarred: t('actions.removeUnstarred'),
    
    // Basic texts
    defaultTitle: t('defaultTitle'),
    duplicateLoading: t('duplicateLoading'),
    duplicateSuccess: t('duplicateSuccess'),
    favorite: t('favorite'),
    searchPlaceholder: t('searchPlaceholder'),
    searchResultEmpty: t('searchResultEmpty'),
    temp: t('temp'),
    title: t('title'),
    
    // Group modes
    groupMode: {
      ascMessages: t('groupMode.ascMessages'),
      byTime: t('groupMode.byTime'),
      descMessages: t('groupMode.descMessages'),
      flat: t('groupMode.flat'),
    },
    
    // Group titles
    groupTitle: {
      byTime: {
        month: t('groupTitle.byTime.month'),
        today: t('groupTitle.byTime.today'),
        week: t('groupTitle.byTime.week'),
        yesterday: t('groupTitle.byTime.yesterday'),
      },
    },
    
    // Guide
    guide: {
      desc: t('guide.desc'),
      title: t('guide.title'),
    },
  };
};