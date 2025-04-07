import { initializeApp } from 'firebase/app';
import { getDatabase, ref } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

const config = {
  apiKey: "AIzaSyAlp9TIA0g3j0icy7YZreldkWaSVCJtK18",
  authDomain: "tvquiz-92dd4.firebaseapp.com",
  databaseURL: "https://tvquiz-92dd4.firebaseio.com",
  projectId: "tvquiz-92dd4",
  storageBucket: "tvquiz-92dd4.appspot.com",
  messagingSenderId: "946323037907"
}; 

export const init = function() {
    const app = initializeApp(config);
    const auth = getAuth(app);
    
    signInAnonymously(auth).catch(function(error) {
    // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log(errorMessage + " " +errorCode);
    });

    const db = getDatabase(app);
    return ref(db, "games/game5");
} 