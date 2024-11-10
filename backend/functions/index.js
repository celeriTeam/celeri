// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
// const {logger} = require("firebase-functions");
// const {functions} = require("firebase-functions");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
// const {onRequest, onCall, HttpsError} =
// require("firebase-functions/v2/https");
// const {onDocumentCreated,
//       Change,
//       FirestoreEvent} = require("firebase-functions/v2/firestore");

// The Firebase Admin SDK to access Firestore.
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
// const {getFirestore,
//   doc,
//   updateDoc} = require("firebase-admin/firestore");
// const {getMessaging} = require("firebase-admin/messaging");
// const {getDatabase} = require("firebase-admin/database");
const admin = require("firebase-admin");

initializeApp();

// const messaging = getMessaging();
const firestore = getFirestore();
// function for sending notifs
exports.sendNotif = onSchedule("every day 05:00", async (event) => {
  const message = {
    notification: {
      title: "It's bettin' time.",
      body: "Who's going to win their head to head? " +
      "You've got 24 hours to make your bet!",
    },
    topic: "allUsers",
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Successfully sent message:", response);
  } catch (error) {
    console.error("Error sending message:", error);
  }
});

exports.sendTestNotif = onSchedule("every day 05:00", async (event) => {
  const directMessage = {
    notification: {
      title: "Test Notification",
      body: "This is a direct test notification",
    },
    token: "eDywtjqNqUd7t19P0SKQ_J:APA91bGXOuXTqjYTTThLUC_tM-IrgCyWiiP1hMjFNnLEqRdJjRGgHV_za-66alxXddpwrNXpkCwoT6X6X9rzkVQJCL7IX6wWGIRy2LQvo7ACyUcmV-sJNkY",
  };

  try {
    const response = await admin.messaging().send(directMessage);
    console.log("Successfully sent direct message:", response);
  } catch (error) {
    console.error("Error sending direct message:", error);
  }
});

exports.sendNotifOnBet = onDocumentUpdated("groups/{groupID}/duels/{duelID}", async (event) => {
  console.log("sendNotifOnBet is running");
  const newValue = event.data.after.data();
  const previousValue = event.data.before.data();
  console.log(newValue);
  console.log("checkpoint one");
  if (newValue && newValue.bets.length > previousValue.bets.length) {
    // Find the newly added bet
    console.log("checkpoint two");
    const newBet = newValue.bets[newValue.bets.length-1];
    const {betOnUserID, wager} = newBet;

    let betAgainstUserID;
    if (betOnUserID == newValue.player1) {
      betAgainstUserID = newValue.player2;
    } else {
      betAgainstUserID = newValue.player1;
    }
    // Fetch target user token from Firebase -- the player you bet on
    try {
      const userDoc = await firestore.collection("users").doc(betOnUserID).get();
      console.log("checkpoint three");
      if (userDoc.exists) {
        console.log("checkpoint four");
        const userData = userDoc.data();
        const username = userData && userData.username;
        const userTokens = userData && userData.tokens;

        if (userTokens && userTokens.length > 0) {
          console.log("checkpoint five");
          // send notif for each token
          for (const token of userTokens) {
            console.log("checkpoint six");
            const message = {
              token: token,
              notification: {
                title: `${username} believes in you`,
                body: `They just placed a bet on you for ${wager} tokens!`,
              },
            };

            try {
              const response = await admin.messaging().send(message);
              console.log("Notification sent successfully:", response);
            } catch (error) {
              console.error("Error sending notification:", error);
            }
          }
        } else {
          console.log("No tokens found for user:", betOnUserID);
        }
      } else {
        console.log("User document not found:", betOnUserID);
      }
    } catch (error) {
      console.error("Error fetching user document:", error);
    }

    // Fetch target user token for the user you bet against
    try {
      const userDoc = await firestore.collection("users").doc(betAgainstUserID).get();
      console.log("checkpoint three-two");
      if (userDoc.exists) {
        console.log("checkpoint four-two");
        const userData = userDoc.data();
        const username = userData && userData.username;
        const userTokens = userData && userData.tokens;

        if (userTokens && userTokens.length > 0) {
          console.log("checkpoint five-two");
          // send notif for each token
          for (const token of userTokens) {
            console.log("checkpoint six-two");
            const message = {
              token: token,
              notification: {
                title: `Prove ${username} wrong.`,
                body: `They just bet against you for ${wager} tokens!`,
              },
            };

            try {
              const response = await admin.messaging().send(message);
              console.log("Notification sent successfully:", response);
            } catch (error) {
              console.error("Error sending notification:", error);
            }
          }
        } else {
          console.log("No tokens found for user:", betOnUserID);
        }
      } else {
        console.log("User document not found:", betOnUserID);
      }
    } catch (error) {
      console.error("Error fetching user document:", error);
    }
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


exports.updateWinners = onSchedule("every day 05:00", async (event) => {
  console.log("updateWinners is running");
  const groupRef = firestore.collection("groups");
  const userRef = firestore.collection("users");

  try {
    const userSnapshots = await userRef.get();
    const userSteps = {};

    // Store all users' steps in memory
    userSnapshots.forEach((doc) => {
      userSteps[doc.id] = doc.data().steps || 0;
    });

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

    groupSnapshots.docs.forEach(async (doc) => {
      const groupDocRef = doc.ref;
      const duelsRef = groupDocRef.collection("duels");

      const groupDoc = await groupDocRef.get();
      if (!groupDoc.exists) {
        console.log(`Group document ${doc.id} not found.`);
        return;
      }
      // let groupCycleCount = groupDoc.data().cycleCount;
      // let groupCycleDay = groupDoc.data().cycleDay;
      // const numberOfPlayers = groupDoc.data().order.length;

      // if (groupCycleDay === 1 && groupCycleCount === 1) {
      //   console.log("error: No duels found for yesterday");
      //   return undefined;
      // } else if (groupCycleDay === 1) {
      //   groupCycleCount -= 1;
      //   groupCycleDay = numberOfPlayers-1;
      // } else {
      //   groupCycleDay -= 1;
      // }

      // console.log(`cycleCount: ${groupCycleCount}, cycleDay: ${groupCycleDay}`);

      duelsRef
        .where("createdAt", ">=", startOfYesterday)
        .where("createdAt", "<", endOfYesterday)
      // .where("winner", "==", "empty")
      // .where("cycleCount", "==", groupCycleCount)
      // .where("cycleDay", "==", groupCycleDay)
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
              const player1Steps = userSteps[player1Id] || 0;
              const player2Steps = userSteps[player2Id] || 0;

              if (player1Steps > player2Steps) {
                winner = player1Id;
              } else if (player1Steps === player2Steps) {
                winner = "draw";
              } else {
                winner = player2Id;
              }

              console.log("player1, " + player1Id + " steps is " + player1Steps);
              console.log("player2, " + player2Id + " steps is " + player2Steps);
              console.log("winner is " + winner);

              // now, distribute earnings
              // if player1 wins, grab the bets
              let totalWagers = 0;
              let totalWagersOnWinner = 0;

              // iterate through it once to find out what the total wagers were
              if (duelData.bets != null) {
                for (let i = 0; i < duelData.bets.length; i++) {
                  totalWagers += duelData.bets[i].wager;
                  if (duelData.bets[i].betOnUserID == winner) {
                    totalWagersOnWinner += duelData.bets[i].wager;
                  }
                }
              } else {
                console.log("there were no bets");
              }
              console.log("total wagers: " + totalWagers);
              console.log("totalWagersOnWinner: " + totalWagersOnWinner);

              if (duelData.bets != null) {
              // iterate through it again now that you have total wagers
                for (let i = 0; i < duelData.bets.length; i++) {
                  let amountWon = 0.0;
                  let percentage = 0.0;
                  if (duelData.bets[i].betOnUserID == winner) {
                    percentage = duelData.bets[i].wager / totalWagersOnWinner;
                    amountWon = Math.floor(percentage * totalWagers);
                    // add the amount won
                    groupDocRef.update({
                      [`users.${duelData.bets[i].userID}.placedBet`]: true,
                      [`users.${duelData.bets[i].userID}.tokens`]: FieldValue.increment(amountWon + groupDoc.data().dailyTokens),
                      [`users.${duelData.bets[i].userID}.todaysBetTokens`]: 0,
                    }).then(() => {
                      console.log(`Successfully updated tokens for user ${duelData.bets[i].userID}`);
                    }).catch((error) => {
                      console.error(`Failed to update tokens for user ${duelData.bets[i].userID}: `, error);
                    });
                  } else if (winner == "draw") {
                    groupDocRef.update({
                      [`users.${duelData.bets[i].userID}.placedBet`]: true,
                      [`users.${duelData.bets[i].userID}.tokens`]: FieldValue.increment(groupDoc.data().dailyTokens),
                    }).then(() => {
                      console.log(`Successfully updated tokens for user ${duelData.bets[i].userID}`);
                    }).catch((error) => {
                      console.error(`Failed to update tokens for user ${duelData.bets[i].userID}: `, error);
                    });
                  } else { // if they lose, they lose what they wagered
                    groupDocRef.update({
                      [`users.${duelData.bets[i].userID}.placedBet`]: true,
                      [`users.${duelData.bets[i].userID}.tokens`]: FieldValue.increment(groupDoc.data().dailyTokens - duelData.bets[i].wager),
                    }).then(() => {
                      console.log(`Successfully updated tokens for user ${duelData.bets[i].userID}`);
                    }).catch((error) => {
                      console.error(`Failed to update tokens for user ${duelData.bets[i].userID}: `, error);
                    });
                  }
                }
              } else {
                console.log("no tokens were updated because there were no bets");
              }

              // Update the 'ended' field to true in the duel document
              batch.update(duelDoc.ref, {
                ended: true,
                winner: winner,
                playerOneSteps: player1Steps,
                playerTwoSteps: player2Steps,
              });
            } catch (error) {
              console.error(`Error fetching player steps for duel 
                  ${duelDoc.id}:`, error);
            }
          }
          // Add the batch to the array to commit later
          allBatches.push(batch.commit());
        });

      // Wait for all batches to be committed
      await Promise.all(allBatches);

      // After recording all winners, reset steps for all users
      const resetBatch = firestore.batch();
      userSnapshots.forEach((doc) => {
        resetBatch.update(userRef.doc(doc.id), {steps: 0});
      });
      await resetBatch.commit();
      console.log("Batch update completed successfully.");
    });
  } catch (error) {
    console.error("Error querying Firestore:", error);
  }
});

exports.createDuels = onSchedule("every day 05:00", async (event) =>{
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

    // const allBatches = [];

    const groupBatch = firestore.batch();
    console.log("checkpoint one");
    groupSnapshots.docs.forEach(async (doc) => {
      const data = doc.data();
      const groupDocRef = doc.ref;

      // if the cycleDay is equal to the number of players-1,
      // then create a new cycle and reset the day
      let cycleDay = data.cycleDay;
      let cycleCount = data.cycleCount;
      let cycleDuels = data.cycleDuels;
      const players = data.order;
      const numberOfPlayers = data.currentPlayersInGame;

      console.log("data.order:", data.order);
      console.log("players.length:", players.length);
      const playerCount = players.reduce((count, playerId) => {
        return playerId ? count + 1 : count;
      }, 0);
      console.log("playercount: ", playerCount);

      console.log("checkpoint two");

      if (data.cycleDay >= numberOfPlayers-1) {
        cycleDay = 1;
        cycleCount += 1;
        console.log(`Updating cycleDay to 1 and increasing 
          cycleCount to ${cycleCount} for group: ${doc.id}`);

        cycleDuels = createCycle(players);
        groupBatch.update(groupDocRef, {
          currentPlayersInGame: playerCount,
        });
        console.log("checkpoint three");
      } else {
        cycleDay += 1;
        console.log(`Incrementing cycleDay to ${cycleDay} for group ${doc.id}`);
        console.log("checkpoint four");
      }

      console.log("cycleDuels:", JSON.stringify(cycleDuels));

      if (data.cycleCount > data.totalCycles) {
        // end the game
        groupBatch.update(groupDocRef, {
          isGameActive: false,
          cycleDay: 0,
          cycleCount: 0,
          currentPlayersInGame: admin.firestore.FieldValue.delete(),
          cycleDuels: admin.firestore.FieldValue.delete(),
          dailyTokens: admin.firestore.FieldValue.delete(),
          defaultBetOnSelf: admin.firestore.FieldValue.delete(),
          totalCycles: admin.firestore.FieldValue.delete(),
          finishedBetting: admin.firestore.FieldValue.delete(),
          finishedRecap: admin.firestore.FieldValue.delete(),
        });
        // reset the tokens for each player
        const usersUpdate = {};
        players.forEach((playerID) => {
          usersUpdate[`users.${playerID}`] = {
            placedBet: true,
            tokens: 0,
            todaysBetTokens: 0,
          };
        });
        groupBatch.update(groupDocRef, usersUpdate);
        console.log("Game has ended");
      } else {
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

        const usersInDuels = [];

        // Create new duel documents for each matchup in duelsForToday
        Object.entries(duelsForToday).forEach(([key, duel]) => {
          console.log("checkpoint 5.5");
          console.log(duel.player1);
          console.log(duel.player2);
          usersInDuels.push(duel.player1);
          usersInDuels.push(duel.player2);
          if (!duel.player1 || !duel.player2) {
            console.error(`Invalid duel entry: ${duel} for key: ${key}`);
            return;
            // Skip this iteration if player1 or player2 is undefined
          }

          const player1Bet = {
            userID: duel.player1,
            wager: data.defaultBetOnSelf,
            betOnUserID: duel.player1,
          };

          const player2Bet = {
            userID: duel.player2,
            wager: data.defaultBetOnSelf,
            betOnUserID: duel.player2,
          };

          const duelData = {
            player1: duel.player1,
            player2: duel.player2,
            cycleDay: cycleDay,
            cycleCount: cycleCount,
            createdAt:
            admin.firestore.FieldValue.serverTimestamp(), // Update this
            ended: false,
            winner: "empty",
            bets: [player1Bet, player2Bet],
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

        // update the bet tokens for each player
        const usersUpdate = {};
        players.forEach((playerID) => {
          const currentUserData = data.users[playerID];
          usersUpdate[`users.${playerID}`] = {
            placedBet: true,
            tokens: currentUserData.tokens,
            todaysBetTokens: usersInDuels.includes(playerID) ? data.defaultBetOnSelf : 0,
          };
        });
        groupBatch.update(groupDocRef, usersUpdate);
      }
      // Add the batch to the array to commit later
      // allBatches.push(groupBatch.commit());
    });

    // Wait for all batches to be committed
    console.log("checkpoint seven");
    // await Promise.all(allBatches);
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
