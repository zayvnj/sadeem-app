export const Media = {
  getAlbums: jest.fn(() => Promise.resolve({ albums: [] })),
  getMedias: jest.fn(() => Promise.resolve({ medias: [] }))
};