import {genkit} from 'genkit';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import {googleAI} from '@genkit-ai/google-genai';

enableFirebaseTelemetry();
export const ai = genkit({
  plugins: [
    googleAI(),
    /*firebase({
      flowAuth: {
        firebase: true,
      },
    }),*/
  ],
  model: 'googleai/gemini-pro',
});
