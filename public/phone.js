 // Initialize Firebase
 var config = {
   apiKey: "AIzaSyAlp9TIA0g3j0icy7YZreldkWaSVCJtK18",
   authDomain: "tvquiz-92dd4.firebaseapp.com",
   databaseURL: "https://tvquiz-92dd4.firebaseio.com",
   projectId: "tvquiz-92dd4",
   storageBucket: "tvquiz-92dd4.appspot.com",
   messagingSenderId: "946323037907"
};
firebase.initializeApp(config);

var gameRef = firebase.database().ref("games/game1");
var gameState = "reset";
var user = null;
var userName = "";


function setName() {	
	userName = document.getElementById("name").value;
	gameRef.child("players").child(user.uid).set(userName);
}

function buzz() {
	if(gameState === 'BUZZ_READY') {
		gameRef.child("buzzes").push(
			{"user": userName,
			 "time": firebase.database.ServerValue.TIMESTAMP});
	}
};

firebase.auth().onAuthStateChanged(function(u) {
	if(u) {
		user = u;	
	}
});

firebase.auth().signInAnonymously().catch(function(error) {
  // Handle Errors here.
  var errorCode = error.code;
  var errorMessage = error.message;
  // ...
});

gameRef.child("gameState").on('value', function(snap){
	document.getElementById("status").textContent = snap.val();
	gameState = snap.val();
});

