/**
 *
 * @param files - Raw File[]: req.files
 * @returns  - Clean File[]
 */
const cleanFiles = (files: any) => {
  return files?.map((file: any) => ({
    path: `${file.destination}/${file.filename}`,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
  }));
};

export default cleanFiles;
