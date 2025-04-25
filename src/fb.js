import { initializeApp } from 'firebase/app';
import { getDatabase, ref } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
 
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
    
    let needRefresh = false;
    let firebaseUser = null;
    
    onAuthStateChanged(auth, (user) => {
		if (user != null) {
			console.log("Auth state changed " + user.uid);
			if (needRefresh) {
				window.location.reload();
			}
		} else {
			needRefresh = true;
			console.log("Auth state changed NULL");
		}

		firebaseUser = user;
	});
    
    signInAnonymously(auth).catch(function(error) {
    // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log(errorMessage + " " +errorCode);
    });

    console.log("Sign in ");

    const db = getDatabase(app);
    return ref(db, "games/game6");
} 