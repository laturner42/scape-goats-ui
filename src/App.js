import React, { Component } from 'react';
import './App.css';
import Crossword from './Crossword';
import Playspace from './Playspace';

class App extends Component {

  handleTouchMove = (e) => {
    let changedTouch = e.changedTouches[0];
    let elem = document.elementFromPoint(changedTouch.clientX, changedTouch.clientY);
    console.log(elem.id);
  }

  render() {
    return (
      <div className="App">
        {
          window.location.pathname.includes('host') ?
          <Crossword /> :
          <Playspace />
        }
      </div>
    );
  }
}

export default App;
