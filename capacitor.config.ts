import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sadeem.app',
  appName: 'Sadeem',
  webDir: 'public',
  server: {
    url: 'https://ls-projects.vercel.app',
    cleartext: true
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    },
  },
};

export default config;