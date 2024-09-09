// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
// const {logger} = require("firebase-functions");
// const {functions} = require("firebase-functions");
const {onSchedule} = require("firebase-functions/v2/scheduler");
// const {onRequest, onCall, HttpsError} =
// require("firebase-functions/v2/https");
// const {onDocumentCreated,
//       Change,
//       FirestoreEvent} = require("firebase-functions/v2/firestore");

// The Firebase Admin SDK to access Firestore.
const {initializeApp} = require("firebase-admin/app");
// const {getFirestore,
//   doc,
//   updateDoc} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");
// const {getDatabase} = require("firebase-admin/database");

initializeApp();

// const firestore = getFirestore();
const messaging = getMessaging();
// function for sending notifs
exports.sendNotif = onSchedule("every day 04:00", async (event) => {
  const message = {
    notification: {
      title: "It's bettin' time.",
      body: "Who's going to win their head to head? " +
      "You've got 24 hours to make your bet!",
    },
    topic: "allUsers",
  };

  try {
    const response = await messaging.send(message);
    console.log("Successfully sent message:", response);
  } catch (error) {
    console.error("Error sending message:", error);
  }
});

function createCycle(players) {
  const cycles = [];
  const playerCount = players.length;

  // If there's an odd number of players, add a 'bye' player
  if (playerCount % 2 !== 0) {
      players.push('BYE');
  }

  const rounds = players.length - 1; // Total rounds needed for all players to face each other once

  for (let round = 0; round < rounds; round++) {
      const roundMatchups = [];
      for (let i = 0; i < players.length / 2; i++) {
          const player1 = players[i];
          const player2 = players[players.length - 1 - i];

          if (player1 !== 'BYE' && player2 !== 'BYE') {
              roundMatchups.push([player1, player2]);
          }
      }

      // Rotate players for the next round except for the first one
      players.splice(1, 0, players.pop());

      cycles.push(roundMatchups);
  }

  return cycles;
}

exports.createDuels = onSchedule('every day 04:00', async (event) =>{

    const groupRef = firestore.collection('groups')

    const groupSnapshots = await groupRef.where('isGameActive', '==', true).get();

    const groupBatch = firestore.batch();

    groupSnapshots.docs.forEach(doc => {
      const data = doc.data();
      const groupDocRef = doc.ref;

      //if the cycleDay is equal to the number of players-1, then create a new cycle and reset the day 
      let cycleDay = data.cycleDay;
      let cycleCount = data.cycleCount;
      let cycleDuels = data.cycleDuels;
      let players = data.order;
      let numberOfPlayers = players.length;

      if(data.cycleDay >= numberOfPlayers-1){
        cycleDay = 1;
        cycleCount += 1;
        console.log(`Updating cycleDay to 1 and increasing cycleCount to ${cycle} for group: ${doc.id}`);

        cycleDuels = createCycle(players)

        //incomplete function -- need to still create the initial duels 
      } else {
        cycleDay += 1;
        console.log(`Incrementing cycleDay to ${cycleDay} for group: ${doc.id}`);

      }

      //create new duels

      const duelsForToday = cycleDuels[cycleDay - 1]; // 0-based index

        // Create new duel documents for each matchup in duelsForToday
        duelsForToday.forEach((duel) => {
            const duelData = {
                player1: duel[0],
                player2: duel[1],
                cycleDay: cycleDay,
                cycleCount: cycleCount,
                date: admin.firestore.FieldValue.serverTimestamp() // Add a timestamp
            };
            // Add a new duel document inside the `duels` subcollection
            const duelDocRef = groupDocRef.collection('duels').doc(); // Auto-generate a new document ID
            groupBatch.set(duelDocRef, duelData);
        });

      groupBatch.update(groupDocRef, {
        cycleDay: cycleDay,
        cycleCount: cycleCount,
        cycleDuels: cycleDuels,
      })
      
    });
    // Commit the batch operation to Firestore
    await groupBatch.commit();
    console.log("Duels created and cycle updated successfully.");
});