import React from 'react';
import firebase from 'firebase'

var config = {
    apiKey: "AIzaSyAlp9TIA0g3j0icy7YZreldkWaSVCJtK18",
    authDomain: "tvquiz-92dd4.firebaseapp.com",
    databaseURL: "https://tvquiz-92dd4.firebaseio.com",
    projectId: "tvquiz-92dd4",
    storageBucket: "tvquiz-92dd4.appspot.com",
    messagingSenderId: "946323037907"
};
firebase.initializeApp(config); 
firebase.auth().onAuthStateChanged(function(u) {
  // if(u) {
  //   user = u;   
  // }
});

firebase.auth().signInAnonymously().catch(function(error) {
  // Handle Errors here.
  var errorCode = error.code;
  var errorMessage = error.message;
  // ...
});

/**
 * A counter button: tap the button to increase the count.
 */
class Counter extends React.Component {
  mixins: [ReactFireMixin]
  constructor() {
    super();
    this.state = {
      count: 0,
    };
  }

  componentWillMount() {
    console.log('hiwooo');
    let ref = firebase.database().ref("count");
    ref.on("value", function(snap) {
      console.log('wooo');
      this.setState({count: snap.val()});
    }.bind(this));    
  }

  render() {
    return (
      <button
        onClick={() => {
              let ref = firebase.database().ref("count");
              ref.set(this.state.count + 1);          
        }}
      >
        Count: {this.state.count}
      </button>
    );
  }
}
export default Counter;
