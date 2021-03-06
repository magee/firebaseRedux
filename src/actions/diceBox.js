import { database } from '../firebase';
import groupBy from 'lodash/groupBy';
import { changeStat } from './changeStat';

const game = database.ref('games/aqwewq334');

const diceOptions = {
  1: '1',
  2: '2',
  3: '3',
  4: 'energy',
  5: 'health',
  6: 'attack',
};

const defaultDice = {
  one: { val: '?', selected: false },
  two: { val: '?', selected: false },
  three: { val: '?', selected: false },
  four: { val: '?', selected: false },
  five: { val: '?', selected: false },
  six: { val: '?', selected: false },
};

const randNum = () => Math.floor((Math.random() * 6) + 1);

const updateRolls = listOfDice => ({
  type: 'UPDATE_DICEBOX',
  listOfDice,
});

const updateRollCount = newRollCount => ({
  type: 'UPDATE_ROLLCOUNT',
  newRollCount,
});

const decrementRoll = () => (dispatch, storeState) => {
  const gid = storeState().auth.gid;
  const game = database.ref(`games/${gid}`);

  game.child('/rollCount').once('value')
.then((rollCount) => {
  const newRollCount = rollCount.val() - 1;
  game.child('/rollCount').set(newRollCount);
  dispatch(updateRollCount(newRollCount));
});
};

export const rollDice = () => (dispatch, storeState) => {
  const gid = storeState().auth.gid;
  const game = database.ref(`games/${gid}`);

  // if rollCount greater than 1, {decrement} else {submit}
  game.child('/rollCount').once('value').then((rollCount) => {
    if (rollCount.val() > 0) {
      // gets the dice and changes each value
      game.child('/diceBox').once('value')
      .then((listOfDiceSnap) => {
        const listOfDice = listOfDiceSnap.val();
        for (const i in listOfDice) {
          if (listOfDice[i].selected !== true) {
            game.child(`/diceBox/${i}`).set({ val: diceOptions[randNum()], selected: false });
          }
        }
      }).then(() => {
        game.child('/diceBox').once('value').then((updatedDice) => {
          dispatch(updateRolls(updatedDice.val()));
          // dispatch(decrementRoll().then(newRollCount => dispatch(updateRollCount(newRollCount))));
          dispatch(decrementRoll());
        });
      }).then(() => {
        if (rollCount.val() == 1) {
          dispatch(submitRoll());
        }
      });
    }
  });
};


const selectDie = die => ({
  type: 'CHANGE_SELECTED_DICE',
  die,
});

export const selectDice = die => (dispatch, storeState) => {
  const gid = storeState().auth.gid;
  const game = database.ref(`games/${gid}`);

  let valueOfSelected;
  let valueOfVal;
  game.child(`/diceBox/${die}`).once('value', (snapshot) => {
    valueOfSelected = snapshot.val().selected;
    valueOfVal = snapshot.val().val;
  }).then(() => {
    if (valueOfVal !== '?') {
      game.child(`/diceBox/${die}/selected`).set(!valueOfSelected).then(() => {
        game.child('/diceBox').once('value', (snapshot) => {
          const other = {};
          for (const i in snapshot.val()) {
            other[i] = snapshot.val()[i];
          }
          dispatch(selectDie(other));
        });
      });
    }
  });
};

export const submitRoll = () => (dispatch, storeState) => {
  const gid = storeState().auth.gid;
  const game = database.ref(`games/${gid}`);

  const submittedRoll = [];
  // currentPlayer = '';

  // const { game } = getState();

  // console.log(game);
 // When submitRoll is clicked grab the user's dice and apply effects
  game.child('/diceBox').once('value', (snapshot) => {
    for (const i in snapshot.val()) {
      submittedRoll.push(snapshot.val()[i].val);
    }
  })
  .then(() => {
    game.child('chosenOne').once('value', (snapshot) => {
      const currentPlayer = snapshot.val().uid;

      console.log(currentPlayer);
      const objectifiedRolls = groupBy(submittedRoll);
    // check for heal
      if (objectifiedRolls.health) {
        game.child(`/players/${currentPlayer}/stats/health`).once('value', (snapshot) => {
          const health = snapshot.val() + objectifiedRolls.health.length;
          game.child(`/players/${currentPlayer}/stats/health`).set(health);
        });
      }

    // check power
    // console.log('these are the objectified rolls ', objectifiedRolls);
      if (objectifiedRolls.energy) {
     // console.log('energy amount ', objectifiedRolls.energy.length);
        game.child(`/players/${currentPlayer}/stats/energy`).once('value', (snapshot) => {
          const energy = snapshot.val() + objectifiedRolls.energy.length;
          game.child(`/players/${currentPlayer}/stats/energy`).set(energy);
        });
      }


    // check for numbers 3
      if (objectifiedRolls[3] && objectifiedRolls[3].length >= 3) {
      //
        const bonus = objectifiedRolls[3].length - 3;
        game.child(`/players/${currentPlayer}/stats/points`).once('value', (snapshot) => {
          const points = snapshot.val() + bonus + 3;
          game.child(`/players/${currentPlayer}/stats/points`).set(points);
        });
      }

     // check for numbers 2
      if (objectifiedRolls[2] && objectifiedRolls[2].length >= 3) {
      //
        const bonus = objectifiedRolls[2].length - 3;
        game.child(`/players/${currentPlayer}/stats/points`).once('value', (snapshot) => {
          const points = snapshot.val() + bonus + 2;
          game.child(`/players/${currentPlayer}/stats/points`).set(points);
        });
      }


     // check for numbers 1
      if (objectifiedRolls[1] && objectifiedRolls[1].length >= 3) {
      //
        const bonus = objectifiedRolls[1].length - 3;
        game.child(`/players/${currentPlayer}/stats/points`).once('value', (snapshot) => {
          const points = snapshot.val() + bonus + 1;
          game.child(`/players/${currentPlayer}/stats/points`).set(points);
        });
      }

      if (objectifiedRolls.attack) {
        const attacks = -objectifiedRolls.attack.length;
        dispatch(attack(attacks, currentPlayer));
      }


      game.child('/king').once('value', (kingSpot) => {
        if (kingSpot.val() === 'none') {
          // if not set this user as the king
          dispatch(setKing());
        }
      });
    });
  })
  .then(() => {
    game.child('/submitted').set(true)
  .then(() => {
    const setSubmittedTrueAction = { type: 'SET_SUBMITTED', hasBeenSubmitted: true };
    dispatch(setSubmittedTrueAction);
  });
  });
};


const setKing = () => (dispatch, storeState) => {
  const gid = storeState().auth.gid;
  const game = database.ref(`games/${gid}`);

  console.log('in setKing');

  game.child('/chosenOne').once('value')
  .then((currentPlayer) => {
    console.log(currentPlayer.val());
    game.child('/king').set(currentPlayer.val());
  });
};

// change redux state and restart the roll count


export const endTurn = () => (dispatch, storeState) => {
  const gid = storeState().auth.gid;
  const game = database.ref(`games/${gid}`);


  const currentTurn = game.child('/currentTurn').once('value');
  const gameSize = game.child('/gameSize').once('value');
  Promise.all([currentTurn, gameSize])
  .then((array) => {
    const nextTurn = (array[0].val() + 1) % array[1].val();
    game.child('/currentTurn').set(nextTurn);
    return nextTurn;
  })
  .then((nextTurn) => {
    game.child(`/playerPosition/${nextTurn}`).once('value')
    .then(playerID => game.child(`/players/${playerID.val()}`).once('value'))
    .then((player) => {
      const updateChosenOne = game.child('/chosenOne').set({ uid: player.val().uid, displayName: player.val().displayName });
      const updateRollCount = game.child('/rollCount').set(3);
      const submitted = game.child('/submitted').set(false);
      const resetDice = game.child('/diceBox').set(defaultDice);
      // dispatch({ type: 'UPDATE_CHOSEN_ONE', newChosenOne: updateChosenOne})
      // dispatch({ type: 'UPDATE_ROLLCOUNT', newRollCount: 3})
      // dispatch({ type: 'SET_SUBMITTED', hasBeenSubmitted: false})
      // dispatch({ type: 'DEFAULT_DICE', payload: defaultDice})
    });
  });
};


const attack = (numAttacks, currentPlayerID) => (dispatch, storeState) => {
  const gid = storeState().auth.gid;
  const game = database.ref(`games/${gid}`);

  const king = game.child('king').once('value');
  const playerPos = game.child('/playerPosition').once('value');
  const requests = [king, playerPos];
  Promise.all(requests)
  .then((snapshots) => {
    const kingID = snapshots[0].val().uid;
    const playerPosArr = snapshots[1].val();
    if (kingID === currentPlayerID) {
      const toAttack = playerPosArr.filter(uid => uid !== kingID);
      return toAttack;
    }
    const toAttack = playerPosArr.filter(uid => uid === kingID);
    return toAttack;
  })
  .then((toAttack) => {
    console.log(toAttack);
    toAttack.forEach((uid) => {
      dispatch(changeStat(uid, numAttacks, 'health'));
    });
  }).then(() => {
    dispatch(kickKing());
  });
};

export const kickKing = () => (dispatch, storeState) => {
  const gid = storeState().auth.gid;
  const game = database.ref(`games/${gid}`);

  // check to see if the current user is king
  game.once('value', (theGame) => {
    if (theGame.val().king.uid !== theGame.val().chosenOne.uid) {
      console.log('Does the king want to leave?');
    }
  });
    // if not then display message to king asking if they want to leave
      // if true
        // set current user to king
};
