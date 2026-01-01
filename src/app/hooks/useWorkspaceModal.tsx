import useMergeState from 'use-merge-value';

export const useWorkspaceModal = (
  value?: boolean,
  onChange?: (v: boolean) => void,
): [boolean, (v: boolean) => void] => {
  const [isModalOpen, setIsModalOpen] = useMergeState(false, {
    defaultValue: false,
    onChange,
    value,
  });

  return [isModalOpen, setIsModalOpen];
};
