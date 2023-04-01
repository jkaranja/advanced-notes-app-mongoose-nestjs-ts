import * as fs from 'fs';

const deleteFiles = (files: any) => {
  try {
    if (!files?.length) return null;

    files.forEach((file) => {
      fs.unlinkSync(file.path);
    });

    return 'deleted';
  } catch (e) {
    return null;
  }
};

export default deleteFiles;
