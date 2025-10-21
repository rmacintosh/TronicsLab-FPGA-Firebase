import {genkit} from 'genkit';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import {googleAI} from '@genkit-ai/google-genai';
import { firebaseConfig } from '@/firebase/config';

enableFirebaseTelemetry();
export const ai = genkit({
  plugins: [
    googleAI(),
    /*firebase({
      projectId: firebaseConfig.projectId,
      flowAuth: {
        firebase: true,
      },
    }),*/
  ],
  model: 'googleai/gemini-2.5-flash',
});
