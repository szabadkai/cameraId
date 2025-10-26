// Add this to the top of the file to inform TypeScript about the global 'google' variable
declare global {
  const google: any;
}

export interface User {
  name: string;
  email: string;
  picture?: string;
  token: any;
}

export const CLIENT_ID = '75639065731-e50ct69np8n9f9us0877vijv08df0por.apps.googleusercontent.com';

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const USER_KEY = 'google_auth_user';

let tokenClient: any;
let onUserChangeCallback: (user: User | null) => void;

const gisInited = new Promise<void>((resolve) => {
    const interval = setInterval(() => {
        if (typeof google !== 'undefined' && google.accounts) {
            clearInterval(interval);
            resolve();
        }
    }, 100);
});

export const initialize = async (onUserChange: (user: User | null) => void): Promise<void> => {
    onUserChangeCallback = onUserChange;
    await gisInited;

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
                // Fetch user profile info
                const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
                });
                const profile = await response.json();
                
                const user: User = {
                    name: profile.name,
                    email: profile.email,
                    picture: profile.picture,
                    token: tokenResponse
                };
                
                localStorage.setItem(USER_KEY, JSON.stringify(user));
                onUserChangeCallback(user);
            }
        },
    });
};

export const signIn = () => {
    if (!tokenClient) {
        console.error("Auth not initialized");
        return;
    }
    // Prompt the user to select a Google Account and ask for consent to share their data
    // when establishing a new session.
    tokenClient.requestAccessToken({ prompt: '' });
};

export const signOut = () => {
    const user = getCurrentUser();
    if (user && google) {
        google.accounts.oauth2.revoke(user.token.access_token, () => {
            console.log('Access token revoked.');
        });
    }
    localStorage.removeItem(USER_KEY);
    onUserChangeCallback(null);
};

export const getCurrentUser = (): User | null => {
  try {
    const userJson = localStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch {
    return null;
  }
};
