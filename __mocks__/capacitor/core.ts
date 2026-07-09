export const Capacitor = {
  isNativePlatform: () => false,
  convertFileSrc: (src: string) => src,
  registerPlugin: jest.fn()
};