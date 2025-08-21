// Authentication Debug Utility
import { AuthService } from '../firebase/auth';
import { auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

export function debugAuthState(): void {
  console.log('🔐 Debugging Authentication State...');
  
  // Check current auth state
  const currentUser = auth.currentUser;
  const userId = AuthService.getCurrentUserId();
  
  console.log('Current User Object:', currentUser);
  console.log('User ID from AuthService:', userId);
  console.log('User Email:', currentUser?.email);
  console.log('User UID:', currentUser?.uid);
  console.log('Email Verified:', currentUser?.emailVerified);
  console.log('ID Token Available:', !!currentUser?.accessToken);
  
  // Listen for auth state changes
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('✅ User is signed in:', {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName
      });
      
      // Try to get the ID token
      user.getIdToken().then(token => {
        console.log('✅ ID Token obtained (first 50 chars):', token.substring(0, 50) + '...');
      }).catch(error => {
        console.error('❌ Failed to get ID token:', error);
      });
      
    } else {
      console.log('❌ User is not signed in');
    }
  });
}

// Run automatically in development
if (import.meta.env.DEV) {
  debugAuthState();
}

export default debugAuthState;