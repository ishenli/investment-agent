export const getSkillFileRelativePath = (file: File): string => {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
};

export const buildSkillUploadFormData = (
  uploadMethod: 'zip' | 'folder',
  files: File[],
): FormData => {
  const formData = new FormData();
  formData.append('uploadMethod', uploadMethod);

  if (uploadMethod === 'zip') {
    const file = files[0];
    if (file) {
      formData.append('files', file, file.name);
    }
    return formData;
  }

  files.forEach((file) => {
    formData.append('files', file, getSkillFileRelativePath(file));
  });

  return formData;
};
