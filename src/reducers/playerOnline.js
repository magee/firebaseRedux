import { database } from '../firebase';


const game = database.ref('games/aqwewq334');


export default function (state = [], action) {
  switch (action.type) {
    case 'UPDATE_PLAYERS' :
      return showOnlineUsers();
    default:
      return state;
  }
}


export const showOnlineUsers = () => {
  const array = [];

  game.child('/players').on('value', (snapshot) => {
    for (const i in snapshot.val()) {
      array.push(snapshot.val()[i]);
    }
  });

  // console.log(array);
  return array;
};
