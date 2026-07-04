import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sadeem.app',
  appName: 'Sadeem',
  webDir: 'out',
  server: {
    url: 'http://192.168.0.124:3000', // هذا راح يخلي التطبيق يتصل بسيرفر حاسبتك
    cleartext: true // هاي ضرورية حتى يشتغل رابط http العادي بدون مشاكل
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    },
  },
};

export default config;