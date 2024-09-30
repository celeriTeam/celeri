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
const {getFirestore} = require("firebase-admin/firestore");
// const {getFirestore,
//   doc,
//   updateDoc} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");
// const {getDatabase} = require("firebase-admin/database");
const admin = require("firebase-admin");

initializeApp();

const messaging = getMessaging();
const firestore = getFirestore();
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


/**
 * Function to createCycle
 * @param {Object} players - object from firebase.
 * @return {Object} cycles
 */
function createCycle(players) {
  const cycles = [];
  const playerCount = players.length;

  // If there's an odd number of players, add a 'bye' player
  if (playerCount % 2 !== 0) {
    players.push("BYE");
  }

  const rounds = players.length - 1;
  // Total rounds needed for all players to face each other once

  for (let round = 0; round < rounds; round++) {
    const roundMatchups = {};
    // Create an object to store matchups for the round
    let duelCounter = 1;
    for (let i = 0; i < players.length / 2; i++) {
      const player1 = players[i];
      const player2 = players[players.length - 1 - i];

      if (player1 !== "BYE" && player2 !== "BYE") {
        const duelKey = `duel${duelCounter}`;
        roundMatchups[duelKey] = {
          player1: player1,
          player2: player2,
        };
        duelCounter++;
      }
    }

    // Rotate players for the next round except for the first one
    players.splice(1, 0, players.pop());

    cycles.push(roundMatchups);
    // Push the object with matchups into the cycles array
  }

  return cycles;
  // Return the array of objects, each representing a round
}

exports.updateWinners = onSchedule("every day 04:00", async (event) => {
  console.log("updateWinners is running");
  const groupRef = firestore.collection("groups");

  try {
    const groupSnapshots = await groupRef.where("isGameActive", "==", true).get();
    if (groupSnapshots.empty) {
      console.log("No active games found.");
      return;
    }

    console.log("Group snapshots found: ", groupSnapshots.size);

    const endOfYesterday = new Date();
    endOfYesterday.setHours(0, 0, 0, 0); // Midnight today
    const startOfYesterday = new Date(endOfYesterday);
    startOfYesterday.setDate(endOfYesterday.getDate() - 1); // Go back one day

    const allBatches = [];

    groupSnapshots.docs.forEach((doc) => {
      const groupDocRef = doc.ref;
      const duelsRef = groupDocRef.collection("duels");

      duelsRef
        .where("createdAt", ">=", startOfYesterday)
        .where("createdAt", "<", endOfYesterday)
        .get()
        .then(async (duelsSnapshot) => {
          if (duelsSnapshot.empty) {
            console.log(`No active duels found for group ${doc.id} from yesterday.`);
            return;
          }

          console.log(`Duels found for group ${doc.id}: `, duelsSnapshot.size);

          // Create a new WriteBatch for this group
          const batch = firestore.batch();

          for (const duelDoc of duelsSnapshot.docs) {
            const duelData = duelDoc.data();
            const player1Id = duelData.player1;
            const player2Id = duelData.player2;
            let winner = "none";

            try {
              const player1Doc = await firestore.collection("users").doc(player1Id).get();
              const player2Doc = await firestore.collection("users").doc(player2Id).get();

              const player1Steps = player1Doc.exists && player1Doc.data().steps != undefined ? player1Doc.data().steps : 0;
              const player2Steps = player2Doc.exists && player2Doc.data().steps != undefined ? player2Doc.data().steps : 0;

              if (player1Steps > player2Steps) {
                winner = player1Id;
              } else if (player1Steps === player2Steps) {
                winner = "draw";
              } else {
                winner = player2Id;
              }

                //now, distribute earnings
                //if player1 wins, grab the bets 
                let totalWagers = 0;
                let totalWagersOnWinner = 0;

                //iterate through it once to find out what the total wagers were 
                for(let i = 0; i < duelData.bets.length; i++){
                  totalWagers += duelData.bets[i].wager;
                  if(duelData.bets[i].betOnUserID == winner){
                    totalWagersOnWinner += duelData.bets[i].wager;
                  }
                }
                console.log('total wagers: ' + totalWagers);
                console.log('totalWagersOnWinner: ' + totalWagersOnWinner);

                //iterate through it again now that you have total wagers
                for(let i = 0; i < duelData.bets.length; i++){
                  let amountWon = 0.0;
                  let percentage = 0.0;
                  if(duelData.bets[i].betOnUserID == winner){
                    percentage = duelData.bets[i].wager / totalWagersOnWinner;
                    amountWon = percentage * totalWagers;
                    //add the amount won 
                    const userRef = firestore.collection("users").doc(duelData.bets[i].userID);
                    userRef.update({
                      tokens: firestore.FieldValue.increment(amountWon) // Increment the tokens by amountWon
                    }).then(() => {
                        console.log(`Successfully updated tokens for user ${duelData.bets[i].userID}`);
                    }).catch((error) => {
                        console.error(`Failed to update tokens for user ${duelData.bets[i].userID}: `, error);
                    });
                  }
                  else {
                    const userRef = firestore.collection("users").doc(duelData.bets[i].userID);
                    userRef.update({
                      tokens: firestore.FieldValue.decrement(amountWon) // Increment the tokens by amountWon
                    }).then(() => {
                        console.log(`Successfully updated tokens for user ${duelData.bets[i].userID}`);
                    }).catch((error) => {
                        console.error(`Failed to update tokens for user ${duelData.bets[i].userID}: `, error);
                    });
                  }
                }

                // Update the 'ended' field to true in the duel document
                batch.update(duelDoc.ref, {ended: true, winner: winner});
              } catch (error) {
                console.error(`Error fetching player steps for duel 
                  ${duelDoc.id}:`, error);
              }
            };
          })
          .catch((error) => {
            console.error(`Error fetching duels for group ${doc.id}:`, error);
          });
    });

    // Wait for all batches to be committed
    await Promise.all(allBatches);
    console.log("Batch update completed successfully.");
  } catch (error) {
    console.error("Error querying Firestore:", error);
  }
});

exports.createDuels = onSchedule("every day 04:00", async (event) =>{
  console.log("createDuels is running");
  const groupRef = firestore.collection("groups");

  try {
    const groupSnapshots =
    await groupRef.where("isGameActive", "==", true).get();
    if (groupSnapshots.empty) {
      console.log("No active games found.");
      return; // Exit if there are no active games
    }

    console.log("Group snapshots found:", groupSnapshots.size);
    const groupBatch = firestore.batch();
    console.log("checkpoint one");
    groupSnapshots.docs.forEach((doc) => {
      const data = doc.data();
      const groupDocRef = doc.ref;

      // if the cycleDay is equal to the number of players-1,
      // then create a new cycle and reset the day
      let cycleDay = data.cycleDay;
      let cycleCount = data.cycleCount;
      let cycleDuels = data.cycleDuels;
      const players = data.order;
      const numberOfPlayers = players.length;

      console.log("checkpoint two");

      if (data.cycleDay >= numberOfPlayers-1) {
        cycleDay = 1;
        cycleCount += 1;
        console.log(`Updating cycleDay to 1 and increasing 
          cycleCount to ${cycleCount} for group: ${doc.id}`);

        cycleDuels = createCycle(players);
        console.log("checkpoint three");
      } else {
        cycleDay += 1;
        console.log(`Incrementing cycleDay to ${cycleDay} for group ${doc.id}`);
        console.log("checkpoint four");
      }

      console.log("cycleDuels:", JSON.stringify(cycleDuels));

      // create new duels

      const duelsForToday = cycleDuels[cycleDay - 1]; // 0-based index
      if (!duelsForToday || typeof duelsForToday !== "object") {
        console.error(`duelsForToday is undefined or
          not an object for cycleDay: ${cycleDay}`);
        return; // Exit early if no duels are available
      }
      console.log("checkpoint five");
      console.log(duelsForToday);
      console.log(cycleDay - 1);

      // Create new duel documents for each matchup in duelsForToday
      Object.entries(duelsForToday).forEach(([key, duel]) => {
        console.log("checkpoint 5.5");
        console.log(duel.player1);
        console.log(duel.player2);
        if (!duel.player1 || !duel.player2) {
          console.error(`Invalid duel entry: ${duel} for key: ${key}`);
          return;
          // Skip this iteration if player1 or player2 is undefined
        }

        const duelData = {
          player1: duel.player1,
          player2: duel.player2,
          cycleDay: cycleDay,
          cycleCount: cycleCount,
          createdAt:
          admin.firestore.FieldValue.serverTimestamp(), // Update this
          ended: false,
          winner: "empty",
        };
        // Add a new duel document inside the `duels` subcollection
        // Auto-generate a new document ID
        const duelDocRef = groupDocRef.collection("duels").doc();
        groupBatch.set(duelDocRef, duelData);
        console.log("checkpoint six");
      });

      groupBatch.update(groupDocRef, {
        cycleDay: cycleDay,
        cycleCount: cycleCount,
        cycleDuels: cycleDuels,
        finishedBetting: admin.firestore.FieldValue.delete(),
        finishedRecap: admin.firestore.FieldValue.delete(),
      });
    });
    // Commit the batch operation to Firestore
    console.log("checkpoint seven");
    await groupBatch.commit();

    console.log("Duels created and cycle updated successfully.");
  } catch (error) {
    console.error("Error querying Firestore:", error);
  }
});

// exports.createDuels = onSchedule("every day 04:00", async (event) => {
//   console.log("createDuels is running");
//   const groupRef = firestore.collection("groups");

//   try {
//     const groupSnapshots =
//     await groupRef.where("isGameActive", "==", true).get();
//     if (groupSnapshots.empty) {
//       console.log("No active games found.");
//       return; // Exit if there are no active games
//     }

//     console.log("Group snapshots found:", groupSnapshots.size);

//     for (const doc of groupSnapshots.docs) {
//       const data = doc.data();
//       const groupDocRef = doc.ref;

//       // if the cycleDay is equal to the number of players-1, reset the day
//       let cycleDay = data.cycleDay;
//       let cycleCount = data.cycleCount;
//       let cycleDuels = data.cycleDuels;
//       const players = data.order;
//       const numberOfPlayers = players.length;

//       console.log("checkpoint two");

//       if (cycleDay >= numberOfPlayers - 1) {
//         cycleDay = 1;
//         cycleCount += 1;
//         console.log(`Updating cycleDay to 1 and increasing
//           cycleCount to ${cycleCount} for group: ${doc.id}`);

//         cycleDuels = createCycle(players);
//         console.log("checkpoint three");
//       } else {
//         cycleDay += 1;
//         console.log(`Incrementing cycleDay to
// ${cycleDay} for group ${doc.id}`);
//         console.log("checkpoint four");
//       }

//       console.log("cycleDuels:", JSON.stringify(cycleDuels));

//       // **First batch**: Update cycleDay, cycleCount, cycleDuels
//       const updateBatch = firestore.batch();
//       updateBatch.update(groupDocRef, {
//         cycleDay: cycleDay,
//         cycleCount: cycleCount,
//         cycleDuels: cycleDuels,
//       });

//       // Commit the first update batch
//       await updateBatch.commit();
//       console.log("Cycle updated successfully for group:", doc.id);

//       // Fetch the updated data after committing the first batch
//       const updatedDoc = await groupDocRef.get();
//       const updatedData = updatedDoc.data();
//       const updatedCycleDuels = updatedData.cycleDuels;

//       const duelsForToday = updatedCycleDuels[cycleDay - 1]; // 0-based index
//       if (!duelsForToday || typeof duelsForToday !== "object") {
//         console.error(`duelsForToday is undefined
//           or not an object for cycleDay: ${cycleDay}`);
//         continue; // Skip to the next group if no duels are available
//       }

//       // **Second batch**:
//       // Create new duel documents for each matchup in duelsForToday
//       const duelBatch = firestore.batch();
//       Object.entries(duelsForToday).forEach(([key, duel]) => {
//         if (!duel[0] || !duel[1]) {
//           console.error(`Invalid duel entry: ${duel} for key: ${key}`);
//           return; // Skip this iteration if player1 or player2 is undefined
//         }

//         const duelData = {
//           player1: duel[0],
//           player2: duel[1],
//           cycleDay: cycleDay,
//           cycleCount: cycleCount,
//           createdAt: admin.firestore.FieldValue.serverTimestamp(),
//           ended: false,
//           winner: "empty",
//         };

//         // Add a new duel document inside the `duels` subcollection
//         const duelDocRef = groupDocRef.collection("duels").doc();
//         duelBatch.set(duelDocRef, duelData);
//         console.log(`Duel created: ${duel[0]} vs
//            ${duel[1]} for cycleDay ${cycleDay}`);
//       });

//       // Commit the second batch
//       await duelBatch.commit();
//       console.log("Duels created successfully for group:", doc.id);
//     }

//     console.log("All groups processed successfully.");
//   } catch (error) {
//     console.error("Error querying Firestore:", error);
//   }
// });
