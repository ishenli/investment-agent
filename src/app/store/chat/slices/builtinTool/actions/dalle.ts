import { produce } from 'immer';
import pMap from 'p-map';
import { SWRResponse } from 'swr';
import { StateCreator } from 'zustand/vanilla';

import { chatSelectors } from '@/app/store/chat/selectors';
import { ChatStore } from '@/app/store/chat/store';
import { DallEImageItem } from '@/types/tool/dalle';

const setNamespace = (namespace: string) => (name: string) => `${namespace}/${name}`;

const n = setNamespace('tool');

const SWR_FETCH_KEY = 'FetchImageItem';

export interface ChatDallEAction {
  generateImageFromPrompts: (items: DallEImageItem[], id: string) => Promise<void>;
  text2image: (id: string, data: DallEImageItem[]) => Promise<void>;
  toggleDallEImageLoading: (key: string, value: boolean) => void;
  updateImageItem: (id: string, updater: (data: DallEImageItem[]) => void) => Promise<void>;
  useFetchDalleImageItem: (id: string) => SWRResponse;
}

export const dalleSlice: StateCreator<
  ChatStore,
  [['zustand/devtools', never]],
  [],
  ChatDallEAction
> = (set, get) => ({
  generateImageFromPrompts: async (items, messageId) => {
    const { toggleDallEImageLoading, updateImageItem } = get();
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const getMessageById = (id: string) => chatSelectors.getMessageById(id)(get());

    const message = getMessageById(messageId);
    if (!message) return;

    const parent = getMessageById(message!.parentId!);
    const originPrompt = parent?.content;
    let errorArray: any[] = [];

    // TODO: Implement image generation service
    // For now, we'll just simulate the process
    await pMap(items, async (params, index) => {
      toggleDallEImageLoading(messageId + params.prompt, true);

      let url = '';
      try {
        // Simulate image generation
        // url = await imageGenerationService.generateImage(params);
        url = `https://placehold.co/512x512?text=${encodeURIComponent(params.prompt)}`;
      } catch (e) {
        toggleDallEImageLoading(messageId + params.prompt, false);
        errorArray[index] = e;

        // await get().updatePluginState(messageId, { error: errorArray });
      }

      if (!url) return;

      await updateImageItem(messageId, (draft) => {
        draft[index].previewUrl = url;
      });

      toggleDallEImageLoading(messageId + params.prompt, false);
      
      // Simulate upload process
      // const imageFile = await uploadService.getImageFileByUrlWithCORS(
      //   url,
      //   `${originPrompt || params.prompt}_${index}.png`,
      // );
      // 
      // const data = await useFileStore.getState().uploadWithProgress({
      //   file: imageFile,
      // });
      
      // For now, simulate an ID
      const data = { id: `image_${Date.now()}_${index}` };

      if (!data) return;

      await updateImageItem(messageId, (draft) => {
        draft[index].imageId = data.id;
        draft[index].previewUrl = undefined;
      });
    });
  },
  text2image: async (id, data) => {
    // const isAutoGen = settingsSelectors.isDalleAutoGenerating(useGlobalStore.getState());
    // if (!isAutoGen) return;

    await get().generateImageFromPrompts(data, id);
  },

  toggleDallEImageLoading: (key, value) => {
    set(
      { dalleImageLoading: { ...get().dalleImageLoading, [key]: value } },
      false,
      n('toggleDallEImageLoading'),
    );
  },

  updateImageItem: async (id, updater) => {
    const message = chatSelectors.getMessageById(id)(get());
    if (!message) return;

    const data: DallEImageItem[] = JSON.parse(message.content);

    const nextContent = produce(data, updater);
    await get().internal_updateMessageContent(id, JSON.stringify(nextContent));
  },

  useFetchDalleImageItem: (id) => {
    // TODO: Implement proper SWR hook
    // For now, return a mock response
    return {
      data: null,
      error: null,
      isLoading: false,
      mutate: async () => {},
    } as any;
  },
});
