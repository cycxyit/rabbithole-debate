import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import posthog from './posthog';
import { PostHogProvider } from 'posthog-js/react';


const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <PostHogProvider client={posthog}>
      <App />
    </PostHogProvider>
  </React.StrictMode>
);
