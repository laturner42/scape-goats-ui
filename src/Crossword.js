import React, { Component } from 'react';
import axios from 'axios';

import { db } from './Firebase';
import { Button, Typography } from '@material-ui/core';

class Crossword extends Component {

  constructor(props) {
    super(props);
    

    this.state = {
      latestWord: '',
      loading: true,
      words: [
        {
          word: 'hello',
          r: 5,
          c: 5,
          vertical: false,
        }
      ],
      map: this.getFreshMap(),
      scores: [],
    }
  }

  getFreshMap = () => {
    const map = [];
    for (let i=0; i<20; i++) {
      const row = [];
      for (let h=0; h<20; h++) {
        row[h] = '';
      }
      map[i] = row;
    }
    return map;
  }

  componentDidMount() {
    const gameId = sessionStorage.getItem("gameId");
    if (gameId) {
      console.log('Game', gameId, 'found.');
      this.loadGame(gameId);
    } else {
      this.createNewGame();
    }
  }

  createNewGame = () => {
    this.setState({ key: '', loading: true });
    axios.get('https://us-central1-scape-goats.cloudfunctions.net/generateCrossword')
      .then((res) => {
        const { id } = res.data;
        console.log('New game',id);
        sessionStorage.setItem("gameId", id);
        const key = id.substring(0,4).toUpperCase();
        console.log('Setting key to', key);
        return db.collection('puzzles').doc(id).update({
          key,
        }).then(() => this.loadGame(id)).catch((err) => console.error(err.toString()));
      })
  }

  loadGame = (id) => {
    if (this.state.unsubscribe) {
      this.state.unsubscribe()
    }
    const unsubscribe = db.collection('puzzles').doc(id)
      .onSnapshot((snap) => {
        if (!snap.exists) {
          return this.createNewGame();
        }
        const data = snap.data();
        const scores = Object.keys(data)
          .filter(key => key.includes('player'))
          .map((key) => {
            return {
              name: key.split('-')[1],
              score: data[key],
            }
          })
          .sort((a, b) => b.score - a.score);
        console.log('New snapshot!');
        this.setState({ key: data.key, scores, latestWord: data.latestWord, loading: false, unsubscribe })
        this.populateMap(data.placedWords, data.foundWords);
      });
  }

  isEmpty = (map, r, c) => {
    if (!map[r][c] || map[r][c] === ' ') return true;
    return false;
  }

  populateMap = (words, foundWords) => {
    const map = this.getFreshMap();

    words.forEach((word) => {
      const foundWord = foundWords.includes(word.word);
      foundWord && console.log('Hey, you found', word.word);
      for (let i=0; i<word.word.length; i++) {
        const letter = foundWord ? word.word.split('')[i].toUpperCase() : ' ';
        if (word.vertical && this.isEmpty(map, word.r + i, word.c)) {
          map[word.r + i][word.c] = letter;
        } else if (!word.vertical && this.isEmpty(map, word.r, word.c + i)) {
          map[word.r][word.c + i] = letter;
        }
      }
    })
    this.setState({ map })
  }

  render() {
    const { map, scores, loading } = this.state;

    return (
      <div
        style={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <div>
          {
            map.map((row) => {
              return (<div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                }}
              >
                {
                  row.map((cell) => {
                    if (cell && cell !== ' ') {
                      return <div style={{ ...styles.cell, ...styles.openCell, ...styles.foundCell }}>{cell}</div>
                    } else if (cell) {
                      return <div style={{ ...styles.cell, ...styles.openCell }}>{cell}</div>
                    } else {
                      return <div style={{ ...styles.cell }}></div>
                    }
                  })
                }
              </div>)
            })
          }
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            margin: 10,
          }}
        > 
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <Typography variant="h4">Puzzle Code: {this.state.key || 'Loading...'}</Typography>
            <Typography variant="h5">{`https://scape-goats.firebaseapp.com`}</Typography>
            <Button
              onClick={this.createNewGame}
              variant="contained"
              size="large"
              color="primary"
              disabled={loading}
            >
              New puzzle
            </Button>
            <Typography
              variant="h4"
              color="secondary"
              style={{ margin: 20 }}
            >
              {this.state.latestWord}
            </Typography>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            {
              scores.map((player, i) => (
                <Typography
                  variant={`h${i < 3 ? 4 + i : 6}`}
                  style={{ margin: 5 }}
                >
                  {player.name}: {player.score}
                </Typography>
              ))
            }
          </div>
        </div>
      </div>
    );
  }
}

const styles = {
  cell: {
    width: 40,
    height: 40,
    border: '1px solid rgba(0,0,0,0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
  },
  openCell: {
    backgroundColor: '#f6f6f6',
    border: '1px solid #ccc',
    borderRadius: 10,
    fontWeight: 'bold',
    fontSize: 30,
  },
  foundCell: {
    border: '1px solid #d94202',
    backgroundColor: '#f96302',
    color: 'white',
  },
}

export default Crossword;
