
import {genkit} from 'genkit';
import {firebase} from '@genkit-ai/firebase';
import {googleAI} from '@genkit-ai/google-genai';
import { firebaseConfig } from '@/firebase/config';

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
