const firebase = require("firebase");
// Required for side-effects
require("firebase/firestore");

const config = {
  apiKey: "AIzaSyAfsi4UtZnsioVX2Da7MQ2wAv5bgZp_T-w",
  authDomain: "scape-goats.firebaseapp.com",
  databaseURL: "https://scape-goats.firebaseio.com",
  projectId: "scape-goats",
  storageBucket: "scape-goats.appspot.com",
  messagingSenderId: "433635660176"
};

firebase.initializeApp(config);

var db = firebase.firestore();
const FieldValue = firebase.firestore.FieldValue;

module.exports = {
  db,
  FieldValue,
};
