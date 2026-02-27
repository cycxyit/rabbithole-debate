import posthog from 'posthog-js';

const posthogKey = process.env.REACT_APP_PUBLIC_POSTHOG_KEY;

if (posthogKey) {
    posthog.init(
        posthogKey,
        {
            api_host: process.env.REACT_APP_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
            autocapture: true
        }
    );
}

export default posthog;
