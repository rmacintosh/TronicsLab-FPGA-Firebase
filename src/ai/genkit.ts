
import {genkit} from 'genkit';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import {googleAI} from '@genkit-ai/google-genai';
import { firebaseConfig } from '@/firebase/config';

enableFirebaseTelemetry();
export const ai = genkit({
  plugins: [
    googleAI(),
    firebase({
      projectId: firebaseConfig.projectId,
      flowAuth: {
        // This enables the client to authenticate with Firebase Auth.
        // The client will automatically attach the current user's ID token.
        firebase: true,
      },
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
  enableDotEnv: true,
});
function firebase(arg0: {
  projectId: string; flowAuth: {
    // This enables the client to authenticate with Firebase Auth.
    // The client will automatically attach the current user's ID token.
    firebase: boolean;
  };
}): import("genkit/plugin").GenkitPlugin | import("genkit/plugin").GenkitPluginV2 {
  throw new Error('Function not implemented.');
}

