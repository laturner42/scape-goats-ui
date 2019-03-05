import React, { Component } from 'react';

import { db, FieldValue } from './Firebase';
import Button from '@material-ui/core/Button';
import { Typography, TextField, IconButton, Fab } from '@material-ui/core';
import BackArrow from '@material-ui/icons/ArrowBackRounded';
import ShuffleIcon from '@material-ui/icons/ShuffleRounded';
import * as _ from 'lodash';
import axios from 'axios';

const STYPES = {
  WAITING: 1,
  NOT_FOUND: 2,
  FOUND: 3,
  ALREADY_FOUND: 4,
  BONUS_FOUND: 5,
}

class Playspace extends Component {

  state = {
    letters: [],
    selected: [],
    foundWords: [],
    typedWord: '',
    submissions: [{ word: 'hello', status: STYPES.FOUND }],
    screenWidth: 0,
    allWords: [],
    lastFourFound: [],
    puzzleCode: '',
    gameId: '',
    name: '',
    submitId: 0,
    myScore: 0,
  }
  _element = React.createRef();

  componentDidMount () {
    window.addEventListener('touchmove', (e) => e.preventDefault(), {passive: false});
    this.setState({
      screenWidth: this._element.current.clientWidth,
      name: sessionStorage.getItem("myName") || '',
      puzzleCode: (sessionStorage.getItem("gameId") || '').substring(0,4).toUpperCase(),
    });
  }

  lookupWord = (word) => {
    axios.get(`https://us-central1-scape-goats.cloudfunctions.net/getDefinition?word=${word}`)
      .then((res) => {
        const definitions = res.data;
        alert(`${word} : ${definitions.join('<br />')}`);
      })
      .catch((err) => {
        console.error(err);
        alert(`Couldn't look up ${word}. ${err.toString()}`);
      })
  }

  findGame = () => {
    const { puzzleCode } = this.state;
    db.collection('puzzles').where('key', '==', puzzleCode.toUpperCase()).get()
      .then((snap) => {
        let gameId = undefined;
        snap.forEach((doc) => {
          gameId = doc.id;
        });
        if (gameId) {
          this.loadGame(gameId);
        } else {
          alert('Couldn\'t find a game with that Puzzle Code.');
        }
      });
  }

  leaveGame = () => {
    sessionStorage.setItem("gameId", '');
    this.setState({
      gameId: '',
      letters: [],
      foundWords: [],
      submissions: [],
    })
  }

  getPlayerId = () => {
    const { name } = this.state;
    return `player-${name.replace(' ', '-')}`;
  }

  loadGame = (gameId) => {
    this.setState({ gameId })
    const ref = db.collection('puzzles').doc(gameId)
    ref.get()
      .then((snap) => {
        sessionStorage.setItem("gameId", snap.id);
        sessionStorage.setItem("myName", this.state.name);
        const data = snap.data();
        if (!data[this.getPlayerId()]) {
          ref.update({
            latestWord: `${this.state.name} Joined`,
            [this.getPlayerId()]: 0,
          });
        } else {
          this.setState({
            myScore: data[this.getPlayerId()],
          })
        }
        this.setState({
          allWords: data.placedWords.map(w => w.word),
          bonusWords: data.bonusWords,
          letters: data.lettersToUse,
          foundWords: [],
          submissions: [],
          myScore: 0,
        });
      });
  }

  handleTouchMove = (e) => {
    const { selected } = this.state;
    let { typedWord } = this.state;
    const changedTouch = e.changedTouches[0];
    const elem = document.elementFromPoint(changedTouch.clientX, changedTouch.clientY);
    const id = elem.id.split('-');
    if (id[0].includes('letter') && !selected.includes(id[0])) {
      selected.push(id[0]);
      typedWord += id[1];
      this.setState({ selected, typedWord });
    }
  }

  addSubmittedWord = (word) => {
    const { submissions, submitId } = this.state;
    submissions[submitId] = {
      word, submitId, status: STYPES.WAITING,
    };
    this.setState({
      submissions,
      submitId: submitId + 1,
    });
    return submitId;
  }

  updateSubmittedWord = (sId, status) => {
    const { submissions } = this.state;
    submissions[sId].status = status;
    this.setState({ submissions });
  }

  addFoundWord = (word) => {
    const { foundWords } = this.state;
    foundWords.push(word);
    this.setState({ foundWords });
  }

  handleTouchEnd = () => {
    const { allWords, typedWord, foundWords, bonusWords, myScore } = this.state;

    const ref = db.collection('puzzles').doc(this.state.gameId);

    if (typedWord.length >= 3) {
      const submitId = this.addSubmittedWord(typedWord);
      if (foundWords.includes(typedWord)) {
        this.updateSubmittedWord(submitId, STYPES.ALREADY_FOUND);
      } else if (allWords.includes(typedWord)) {
        ref.update({
          foundWords: FieldValue.arrayUnion(typedWord),
          latestWord: typedWord,
          [this.getPlayerId()]: myScore + typedWord.length,
        })
          .then(() => {
            this.updateSubmittedWord(submitId, STYPES.FOUND);
            this.setState({
              myScore: this.state.myScore + typedWord.length,
            });
          })
          .catch((err) => {
            this.updateSubmittedWord(submitId, STYPES.ALREADY_FOUND);
          })
          .then(() => this.addFoundWord(typedWord));
      } else if (bonusWords.includes(typedWord)) {
        db.collection('puzzles').doc(this.state.gameId).update({
          foundWords: FieldValue.arrayUnion(typedWord),
          latestWord: typedWord,
          [this.getPlayerId()]: myScore + 1,
        }).then(() => {
            this.updateSubmittedWord(submitId, STYPES.BONUS_FOUND);
            this.setState({
              myScore: this.state.myScore + 1,
            });
          })
          .catch((err) => {
            this.updateSubmittedWord(submitId, STYPES.ALREADY_FOUND);
          })
          .then(() => this.addFoundWord(typedWord));
      } else {
        this.updateSubmittedWord(submitId, STYPES.NOT_FOUND);
      }
    }

    this.setState({
      typedWord: '',
      selected: [],
    })
  }
  
  refCallback = element => {
    if (element) {
      console.log(this.props.getSize(element.getBoundingClientRect()));
    }
  };

  render() {
    const { selected, screenWidth, letters, submissions, typedWord, gameId } = this.state;

    const dotSize = (screenWidth * 0.21) - (letters.length * 3);
    const playWidth = Math.min(screenWidth ? screenWidth * 0.65 : 100, 700);
    const center = ((playWidth || 1)/2) - (dotSize/2);
    const step = (Math.PI * 2) / letters.length;

    const foundColor = {
      [STYPES.WAITING]: '#bbb',
      [STYPES.FOUND]: '#1f6',
      [STYPES.BONUS_FOUND]: 'cyan',
      [STYPES.ALREADY_FOUND]: 'gold',
      [STYPES.NOT_FOUND]: '#f66',
    }

    return (
      <div
        ref={this._element}
        style={{
          position: 'absolute',
          left: 0, right: 0, top: 0, bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: !!gameId ? 'flex-end' : 'center',
          backgroundColor: '#28c',
        }}
      >
        <meta 
          name='viewport' 
          content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' 
        />
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {
            !gameId &&
            <div>

              <div
                style={{
                  backgroundColor: '#eee',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 40,
                  margin: 20,
                  padding: '0.5rem',
                }}
              >
                <Typography variant="h5" style={{ margin: '0.5rem' }}>Scape Goats</Typography>
                <TextField
                  style={{ margin: '0.5rem' }}
                  variant="outlined"
                  label="Your Name"
                  value={this.state.name}
                  onChange={({ target }) => this.setState({ name: target.value })} />
                <TextField
                  autoComplete="off"
                  style={{ margin: '0.5rem' }}
                  variant="outlined"
                  label="Puzzle Code"
                  value={this.state.puzzleCode}
                  onChange={({ target }) => this.setState({ puzzleCode: target.value.toUpperCase() })} />
                <div
                  style={{ marginBottom: '0.5rem' }}
                >
                  <Button
                    variant="contained"
                    onClick={this.findGame}
                    color="secondary"
                    size="large"
                    disabled={!this.state.name || !this.state.puzzleCode}
                  >
                    Join Game
                  </Button>
                </div>
              </div>
              <Button variant="body1" style={{ margin: '0.5rem' }}>or, click here to Host a Game</Button>
            </div>
          }
          {
            submissions.slice(-4).map((obj, i) => (
              <div
                style={{
                  backgroundColor: foundColor[obj.status],
                  borderRadius: 40,
                  padding: 10,
                  display: 'flex',
                  fontSize: 20,
                  opacity: `${((i+1)/Math.min(submissions.length, 4))}`,
                  margin: 5,
                }}
                onClick={() => this.lookupWord(obj.word)}
              >
                {obj.word.toUpperCase()}
              </div>
            ))
          }
        </div>
        {
          !!gameId &&
          <div
            style={{
              height: (dotSize * 0.7),
              fontSize: (dotSize * 0.65),
              fontWeight: 'bold',
              backgroundColor: typedWord.length > 0 ? 'orange' : null,
              borderRadius: 50,
              minWidth: (dotSize * 0.7),
              padding: 10,
              paddingLeft: 20,
              paddingRight: 20,
              margin: 5,
              color: 'white',
            }}
          >
            {typedWord.toUpperCase()}
          </div>
        }
        {
          !!gameId &&
          <div
            style={{
              position: 'relative',
              width: playWidth,
              height: playWidth,
              borderRadius: playWidth/2,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              marginBottom: 20,
            }}
          >
            {
              letters.map((letter, i) => (
                <div
                  id={`letter${i}-${letter}`}
                  style={{
                    position: 'absolute',
                    left: center + (Math.sin(step * i) * center * 0.95),
                    top: center + (Math.cos(step * i) * center * 0.95),
                    width: dotSize,
                    height: dotSize,
                    backgroundColor: selected.includes(`letter${i}`) ? 'orange' : null,
                    border: '1px solid rgba(0,0,0,0)',
                    borderRadius: dotSize/2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: dotSize,
                    fontWeight: 'bold',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    KhtmlUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    userSelect: 'none',
                  }}
                  onTouchStart={this.handleTouchMove}
                  onTouchMove={this.handleTouchMove}
                  onTouchEnd={this.handleTouchEnd}
                >
                  {letter.toUpperCase()}
                </div>
              ))
            }
            <Fab
              style={{
                position: 'absolute',
                left: -40, top: 0,
              }}
              size={screenWidth < 370 ? 'small' : 'medium'}
              onClick={() => this.setState({ letters: _.shuffle(letters) })}
            >
              <ShuffleIcon />
            </Fab>
            <Fab
              style={{
                position: 'absolute',
                left: -40, bottom: 0,
              }}
              size={screenWidth < 370 ? 'small' : 'medium'}
              aria-label="Go Back"
              onClick={this.leaveGame}
            >
              <BackArrow />
            </Fab>
          </div>
        }
      </div>
    );
  }
}

export default Playspace;
