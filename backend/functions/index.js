// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
// const {logger} = require("firebase-functions");
// const {functions} = require("firebase-functions");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onDocumentUpdated, onDocumentCreated} = require("firebase-functions/v2/firestore");
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

// Initialize SendGrid for email sending
const {onCall} = require("firebase-functions/v2/https");
const sgMail = require("@sendgrid/mail");

// Define config parameter
const API_KEY = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(API_KEY);

// Create email sending function
exports.sendEmail = onCall(async (request) => {
  const {data} = request;

  const msg = {
    to: data.to,
    from: "lukaschin000@gmail.com",
    subject: data.subject,
    text: data.text,
  };

  try {
    await sgMail.send(msg);
    return {success: true};
  } catch (error) {
    console.error("Email error:", error);
    throw new Error("Error sending email");
  }
});

// function for sending daily notifs to all users
exports.sendNotif = onSchedule("every day 05:00", async (event) => {
  // get the groups
  const groupsRef = firestore.collection("groups");
  const activeGroupsSnapshot = await groupsRef.where("isGameActive", "==", true).get();
  let message = "";

  // Check if there are any active groups
  if (activeGroupsSnapshot.empty) {
    console.log("No active groups found.");
    return;
  }

  console.log(`Found ${activeGroupsSnapshot.size} active groups.`);

  for (const groupDoc of activeGroupsSnapshot.docs) {
    const groupData = groupDoc.data();
    const groupID = groupDoc.id;

    if (groupData.gameType == "weekly") {
      console.log(`${groupID} is weekly.`);
      const today = new Date().getDay();
      if (groupData.resetDay == today) {
        console.log(`${groupID} resetDay is today.`);
        message = {
          notification: {
            title: `It's bettin' time for ${groupData.groupName}.`,
            body: "Who's going to win their head to head? " +
            "You've got a week to make your bet!",
          },
          topic: groupID,
        };
      } else {
        console.log(`${groupID} resetDay is not today.`);
        message = {
          notification: {
            title: `You've got a new prop bet for ${groupData.groupName}.`,
            body: "Ready to make your over-under?" +
            "You've got 24 hours to win a diamond!",
          },
          topic: groupID,
        };
      }
    } else {
      // daily groups
      console.log(`${groupID} is daily.`);
      message = {
        notification: {
          title: `It's bettin' time for ${groupData.groupName}`,
          body: "Who's going to win their head to head? " +
          "You've got 24 hours to make your bet!",
        },
        topic: groupID,
      };
    }

    // now send the message
    try {
      const response = await admin.messaging().send(message);
      console.log("Successfully sent message:", response);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }
});

exports.sendTestSilentNotif = onSchedule("every day 05:00", async (event) => {
  const message = {
    data: {
      "type": "silent",
      "action": "fetchSteps",
    },
    apns: {
      payload: {
        aps: {
          contentAvailable: true,
        },
      },
      headers: {
        "apns-priority": "5",
        "apns-push-type": "background",
      },
    },
    topic: "allUsers",
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Successfully sent silent notification:", response);
  } catch (error) {
    console.error("Error sending silent notification:", error);
  }
});

exports.sendTestNotif = onSchedule("every day 05:00", async (event) => {
  const directMessage = {
    notification: {
      title: "Test Notification",
      body: "This is a direct test notification",
    },
    token: "cQJVXePbF0n3u1gljn6pnA:APA91bHfsQcKlAoaxHkh_eBo7HZEUYjCGuOxqPrpSOz0t1ymY1Dbhu123eD9-7xiNKCHsu5uYuuZjkdmC3whCJX98Dpd-ZNNoNCEv58Y9gRiEG6d3_gW0Sk",
  };

  try {
    const response = await admin.messaging().send(directMessage);
    console.log("Successfully sent direct message:", response);
  } catch (error) {
    console.error("Error sending direct message:", error);
  }
});

exports.sendTestNotiftoAll = onSchedule("every day 05:00", async (event) => {
  const message = {
    notification: {
      title: "Testing notif.",
      body: "This is a test",
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

exports.sendNotifOnNudge = onDocumentCreated("nudges/{nudgeId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with the event");
    return;
  }
  const data = snapshot.data();

  const username = data.username;
  const message = data.message;
  const tokens = data.tokens;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const notifMessage = {
      token: token,
      notification: {
        title: `${username} nudged you`,
        body: message,
      },
    };

    try {
      const response = await admin.messaging().send(notifMessage);
      console.log("Notification sent successfully:", response);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
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
    const {betOnUserID, userID, wager} = newBet;

    let betAgainstUserID;
    if (betOnUserID == newValue.player1) {
      betAgainstUserID = newValue.player2;
    } else {
      betAgainstUserID = newValue.player1;
    }
    // Fetch target user token from Firebase -- the player you bet on
    try {
      const userDoc = await firestore.collection("users").doc(betOnUserID).get();
      const betUserDoc = await firestore.collection("users").doc(userID).get();
      console.log("checkpoint three");
      if (userDoc.exists) {
        console.log("checkpoint four");
        const userData = userDoc.data();
        const betUserData = betUserDoc.data();
        const username = betUserData && betUserData.username;
        const userTokens = userData && userData.tokens;

        if (userTokens && userTokens.length > 0) {
          console.log("checkpoint five");
          // send notif for each token
          for (const token of userTokens) {
            console.log("checkpoint six");
            const messages = [
              {
                token: token,
                notification: {
                  title: `${username} believes in you!`,
                  body: `They just placed a bet on you for ${wager} tokens!`,
                },
              },
              {
                token: token,
                notification: {
                  title: `${username} is your biggest fan!`,
                  body: `They just bet ${wager} tokens on you!`,
                },
              },
              {
                token: token,
                notification: {
                  title: `Don't let ${username} down.`,
                  body: `They wagered ${wager} tokens because they know you'll win!`,
                },
              },
            ];

            // Select a random message
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];

            try {
              const response = await admin.messaging().send(randomMessage);
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
      const betUserDoc = await firestore.collection("users").doc(userID).get();
      console.log("checkpoint three-two");
      if (userDoc.exists) {
        console.log("checkpoint four-two");
        const userData = userDoc.data();
        const betUserData = betUserDoc.data();
        const username = betUserData && betUserData.username;
        const userTokens = userData && userData.tokens;

        if (userTokens && userTokens.length > 0) {
          console.log("checkpoint five-two");
          // send notif for each token
          for (const token of userTokens) {
            console.log("checkpoint six-two");

            const messages = [
              {
                token: token,
                notification: {
                  title: `Prove ${username} wrong.`,
                  body: `They just bet against you for ${wager} tokens!`,
                },
              },
              {
                token: token,
                notification: {
                  title: `${username} thinks you're a couch potato.`,
                  body: `They just bet ${wager} against you!`,
                },
              },
              {
                token: token,
                notification: {
                  title: `${username} has got to be wrong, right?`,
                  body: `They wagered ${wager} tokens against you because they're sure you'll lose.`,
                },
              },
            ];

            // Select a random message
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];

            try {
              const response = await admin.messaging().send(randomMessage);
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

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Midnight today
    const startOfYesterday = new Date(today);
    startOfYesterday.setDate(today.getDate() - 1); // Go back one day
    const startOfLastWeek = new Date(today);
    startOfLastWeek.setDate(today.getDate() - 7); // Go back seven days

    const allBatches = [];

    groupSnapshots.docs.forEach(async (doc) => {
      const groupDocRef = doc.ref;
      const duelsRef = groupDocRef.collection("duels");
      const data = doc.data();

      const groupDoc = await groupDocRef.get();
      if (!groupDoc.exists) {
        console.log(`Group document ${doc.id} not found.`);
        return;
      }

      // Don't update winners if it's a weekly game and it's not the right day
      const gameType = data.gameType;
      console.log(doc.id, ": gameType: ", data.gameType);
      if (gameType && gameType == "weekly") {
        // propogate weeklySteps, should be a map
        const weeklySteps = {};
        const users = data.users;

        // Get all users in the group and their current steps
        Object.keys(users).forEach((userID) => {
          const currentSteps = userSteps[userID] || 0;

          // Calculate users weekly steps
          let weeklyStepsData = users[userID].averageSteps ? users[userID].averageSteps : users[userID].averageStepsTemp;

          if (weeklyStepsData === undefined || weeklyStepsData.length !== 7) {
            weeklyStepsData = [0, 0, 0, 0, 0, 0, 0];
          }

          // Sum the steps from the past six days and add the current day's steps
          const userWeeklySteps = weeklyStepsData.slice(1).reduce((sum, steps) => sum + steps, 0) + currentSteps;
          weeklySteps[userID] = userWeeklySteps + currentSteps;
        });

        console.log("weeklySteps: ", weeklySteps);
        console.log("users: ", users);

        const currentDay = new Date().getDay();
        const resetDay = data.resetDay;

        // if it is the correct day of the week
        if (currentDay == resetDay) {
          console.log(doc.id, ": currentDay == resetDay, resetting now.");

          const duelsSnapshot = await duelsRef
            .where("createdAt", ">=", startOfLastWeek)
            .where("createdAt", "<", today)
            .get();

          if (duelsSnapshot.empty) {
            console.log(`No active duels found for group ${doc.id} from last week.`);
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
              const player1BaseSteps = weeklySteps[player1Id] || 0;
              const player2BaseSteps = weeklySteps[player2Id] || 0;

              // Calculate additional steps from powerups
              const player1PowerupSteps = await calculatePowerupSteps(doc.id, player1Id, duelDoc.id, "weekly");
              const player2PowerupSteps = await calculatePowerupSteps(doc.id, player2Id, duelDoc.id, "weekly");

              // Total steps for each player
              const player1TotalSteps = player1BaseSteps + player1PowerupSteps;
              const player2TotalSteps = player2BaseSteps + player2PowerupSteps;


              if (player1TotalSteps > player2TotalSteps) {
                winner = player1Id;
              } else if (player1TotalSteps === player2TotalSteps) {
                winner = "draw";
              } else {
                winner = player2Id;
              }

              console.log(`Duel ${duelDoc.id}: Player1 (${player1Id}) steps = ${player1TotalSteps}, Player2 (${player2Id}) steps = ${player2TotalSteps}, Winner = ${winner}`);

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
              console.log("Duel: ", duelDoc.id, " total wagers: " + totalWagers);
              console.log("totalWagersOnWinner: " + totalWagersOnWinner);

              if (duelData.bets != null) {
                // iterate through it again now that you have total wagers
                for (let i = 0; i < duelData.bets.length; i++) {
                  let amountWon = 0.0;
                  let percentage = 0.0;
                  let diamonds = 0;
                  if (duelData.bets[i].betOnUserID == winner) {
                  // if they are the winner and there were no bets on them, they get 100%
                    if (duelData.bets[i].userID === winner && totalWagersOnWinner == 0) {
                      percentage = 1.0;
                      amountWon = Math.floor(totalWagers);
                      diamonds = 1;
                    } else if (duelData.bets[i].userID === winner) {
                    // if they are the winner, then they automatically get 50%
                      percentage = 0.5;
                      amountWon = Math.floor(percentage * (totalWagers - totalWagersOnWinner));
                      diamonds = 1;
                    } else {
                    // divided by two because the winner will get 50%
                      percentage = (duelData.bets[i].wager / totalWagersOnWinner) / 2;
                      amountWon = Math.floor(percentage * (totalWagers - totalWagersOnWinner));
                    }
                    // add the amount won
                    groupDocRef.update({
                      [`users.${duelData.bets[i].userID}.placedBet`]: false,
                      // this was the issue: you need to subtract by the amount you bet because of the math above
                      [`users.${duelData.bets[i].userID}.tokens`]: FieldValue.increment(amountWon),
                      // no longer doing daily tokens: [`users.${duelData.bets[i].userID}.tokens`]: FieldValue.increment(amountWon + groupDoc.data().dailyTokens),
                      [`users.${duelData.bets[i].userID}.diamonds`]: FieldValue.increment(diamonds),
                      [`users.${duelData.bets[i].userID}.todaysBetTokens`]: 0,
                    }).then(() => {
                      console.log(`Successfully updated tokens for user ${duelData.bets[i].userID} by ${amountWon} addded`);
                      console.log(`Successfully updated diamonds for user ${duelData.bets[i].userID} by ${diamonds} addded`);
                    }).catch((error) => {
                      console.error(`Failed to update tokens for user ${duelData.bets[i].userID}: `, error);
                    });
                  } else if (winner == "draw") {
                    groupDocRef.update({
                      [`users.${duelData.bets[i].userID}.placedBet`]: false,
                    // [`users.${duelData.bets[i].userID}.tokens`]: FieldValue.increment(groupDoc.data().dailyTokens),
                    }).then(() => {
                      console.log(`Successfully updated tokens for user ${duelData.bets[i].userID}, was a draw`);
                    }).catch((error) => {
                      console.error(`Failed to update tokens for user ${duelData.bets[i].userID}: `, error);
                    });
                  } else { // if they lose, they lose what they wagered
                    groupDocRef.update({
                      [`users.${duelData.bets[i].userID}.placedBet`]: false,
                      [`users.${duelData.bets[i].userID}.tokens`]: FieldValue.increment(-duelData.bets[i].wager),
                    // [`users.${duelData.bets[i].userID}.tokens`]: FieldValue.increment(groupDoc.data().dailyTokens - duelData.bets[i].wager),
                    }).then(() => {
                      console.log(`Successfully updated tokens for user ${duelData.bets[i].userID}, lost ${duelData.bets[i].wager}`);
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
                playerOneSteps: player1TotalSteps,
                playerTwoSteps: player2TotalSteps,
              });
            } catch (error) {
              console.error(`Error fetching player steps for duel 
                ${duelDoc.id}:`, error);
            }
          }
          // Add the batch to the array to commit later
          allBatches.push(batch.commit());


          // Wait for all batches to be committed
          await Promise.all(allBatches);

          let resetBatch = firestore.batch();

          await resetBatch.commit();
          resetBatch = firestore.batch();

          // Now do the race distirbution
          console.log("updateWinners -- race distribution starting now");
          console.log("Right before race distribution -- Users Value:", users);

          // weeklySteps was declared much earlier
          let maxSteps = -Infinity; // Start with the lowest possible value
          let maxUser = null; // To store the key corresponding to the max value
          for (const [key, value] of Object.entries(weeklySteps)) {
            if (value > maxSteps) {
              maxSteps = value;
              maxUser = key;
            }
          }

          let totalDecrease = 0; // Track total token decrease
          // To reset operations count per batch:
          let operationCount = 1;
          const MAX_OPERATIONS = 500;
          const gains = {};

          // Iterate over each user to calculate decreases and updates
          for (const [userID, userData] of Object.entries(users)) {
            if (operationCount >= MAX_OPERATIONS) {
              await resetBatch.commit();
              resetBatch = firestore.batch();
              operationCount = 0;
            }

            // If not the maxUser, calculate and decrease tokens
            if (userID !== maxUser) {
              const decrease = Math.floor(userData.tokens * 0.05); // Calculate 5% decrease, rounding down
              totalDecrease += decrease; // Accumulate total decrease
              resetBatch.update(groupDocRef, {
                [`users.${userID}.tokens`]: FieldValue.increment(-decrease),
              });
              operationCount++;
              gains[userID] = -decrease;
            }
          }

          // Add the total decrease to the maxUser's tokens
          if (users[maxUser]) {
            resetBatch.update(groupDocRef, {
              [`users.${maxUser}.tokens`]: FieldValue.increment(totalDecrease),
            });
            operationCount++;
            gains[maxUser] = totalDecrease;
          }

          // Make a race document for recordkeeping
          const racesCollectionRef = groupDocRef.collection("races"); // Access the subcollection

          // Add a new document
          await racesCollectionRef.add({
            createdAt: FieldValue.serverTimestamp(), // Firestore's server timestamp for consistency
            winner: maxUser,
            steps: weeklySteps,
            gains: gains,

          });

          console.log("updateWinners -- Successfully updated tokens for all users after race.");


          // After recording all winners, reset steps for all users
          userSnapshots.forEach((doc) => {
            const userData = doc.data();
            let updatedSteps;

            if (userData.averageSteps && Array.isArray(userData.averageSteps)) {
              // Remove first number and add 0 to the end
              updatedSteps = [...userData.averageSteps.slice(1), userData.steps];
            } else {
              // Initialize with seven zeros
              updatedSteps = [0, 0, 0, 0, 0, 0, 0];
            }

            resetBatch.update(userRef.doc(doc.id), {
              // steps: 0,
              averageSteps: updatedSteps,
            });
            resetBatch.update(userRef.doc(doc.id), {steps: 0});
          });
          await resetBatch.commit();

          console.log("Batch update completed successfully.");
        } else {
          return;
        }
      } else { // DAILY
        duelsRef
          .where("createdAt", ">=", startOfYesterday)
          .where("createdAt", "<", today)
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
                const player1BaseSteps = userSteps[player1Id] || 0;
                const player2BaseSteps = userSteps[player2Id] || 0;

                // Calculate additional steps from powerups
                const player1PowerupSteps = await calculatePowerupSteps(doc.id, player1Id, duelDoc.id, "daily");
                const player2PowerupSteps = await calculatePowerupSteps(doc.id, player2Id, duelDoc.id, "daily");

                // Total steps for each player
                const player1TotalSteps = player1BaseSteps + player1PowerupSteps;
                const player2TotalSteps = player2BaseSteps + player2PowerupSteps;


                if (player1TotalSteps > player2TotalSteps) {
                  winner = player1Id;
                } else if (player1TotalSteps === player2TotalSteps) {
                  winner = "draw";
                } else {
                  winner = player2Id;
                }

                console.log(`Duel ${duelDoc.id}: Player1 (${player1Id}) steps = ${player1TotalSteps}, Player2 (${player2Id}) steps = ${player2TotalSteps}, Winner = ${winner}`);

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
                    let diamonds = 0;
                    if (duelData.bets[i].betOnUserID == winner) {
                      // if they are the winner and there were no bets on them, they get 100%
                      if (duelData.bets[i].userID === winner && totalWagersOnWinner == 0) {
                        percentage = 1.0;
                        amountWon = Math.floor(totalWagers);
                        diamonds = 1;
                      } else if (duelData.bets[i].userID === winner) {
                        // if they are the winner, then they automatically get 50%
                        percentage = 0.5;
                        amountWon = Math.floor(percentage * (totalWagers - totalWagersOnWinner));
                        diamonds = 1;
                      } else {
                        // divided by two because the winner will get 50%
                        percentage = (duelData.bets[i].wager / totalWagersOnWinner) / 2;
                        amountWon = Math.floor(percentage * (totalWagers - totalWagersOnWinner));
                      }
                      // add the amount won
                      groupDocRef.update({
                        [`users.${duelData.bets[i].userID}.placedBet`]: false,
                        // this was the issue: you need to subtract by the amount you bet because of the math above
                        [`users.${duelData.bets[i].userID}.tokens`]: FieldValue.increment(amountWon),
                        // no longer doing daily tokens: [`users.${duelData.bets[i].userID}.tokens`]: FieldValue.increment(amountWon + groupDoc.data().dailyTokens),
                        [`users.${duelData.bets[i].userID}.diamonds`]: FieldValue.increment(diamonds),
                        [`users.${duelData.bets[i].userID}.todaysBetTokens`]: 0,
                      }).then(() => {
                        console.log(`Successfully updated tokens for user ${duelData.bets[i].userID} by ${amountWon} addded`);
                        console.log(`Successfully updated diamonds for user ${duelData.bets[i].userID} by ${diamonds} addded`);
                      }).catch((error) => {
                        console.error(`Failed to update tokens for user ${duelData.bets[i].userID}: `, error);
                      });
                    } else if (winner == "draw") {
                      groupDocRef.update({
                        [`users.${duelData.bets[i].userID}.placedBet`]: false,
                        // [`users.${duelData.bets[i].userID}.tokens`]: FieldValue.increment(groupDoc.data().dailyTokens),
                      }).then(() => {
                        console.log(`Successfully updated tokens for user ${duelData.bets[i].userID}, was a draw`);
                      }).catch((error) => {
                        console.error(`Failed to update tokens for user ${duelData.bets[i].userID}: `, error);
                      });
                    } else { // if they lose, they lose what they wagered
                      groupDocRef.update({
                        [`users.${duelData.bets[i].userID}.placedBet`]: false,
                        [`users.${duelData.bets[i].userID}.tokens`]: FieldValue.increment(-duelData.bets[i].wager),
                        // [`users.${duelData.bets[i].userID}.tokens`]: FieldValue.increment(groupDoc.data().dailyTokens - duelData.bets[i].wager),
                      }).then(() => {
                        console.log(`Successfully updated tokens for user ${duelData.bets[i].userID}, lost ${duelData.bets[i].wager}`);
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
                  playerOneSteps: player1TotalSteps,
                  playerTwoSteps: player2TotalSteps,
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
      }
    });
  } catch (error) {
    console.error("Error querying Firestore:", error);
  }
});

const calculatePowerupSteps = async (groupID, userID, duelID, gameType) => {
  const groupDocRef = firestore.collection("groups").doc(groupID);
  const powerupsCollectionRef = groupDocRef.collection("powerups");

  try {
    // Get the timestamp for 24 hours ago
    // Get the timestamp for 24 hours ago

    if (gameType == "weekly") {
      const pastSevenDays = new Date();
      pastSevenDays.setDate(pastSevenDays.getDate() - 7);
      pastSevenDays.setHours(0, 0, 0, 0);

      const powerupsSnapshot = await powerupsCollectionRef
        .where("createdAt", ">=", pastSevenDays)
        .where("duelID", "==", duelID)
        .where("targetUserID", "==", userID)
        .get();

      if (powerupsSnapshot.empty) {
        console.log(`No powerups found for user ${userID} in group ${groupID} for duel ${duelID}`);
        return 0; // No steps to add
      }

      // Calculate total steps added from 'secondWind' powerups
      let totalAddedSteps = 0;
      powerupsSnapshot.forEach((doc) => {
        const powerup = doc.data();
        if (powerup.type === "secondWind") {
          totalAddedSteps += 200; // Each secondWind adds 200 steps
        }
      });

      console.log(`Total added steps for user ${userID}: ${totalAddedSteps}`);
      return totalAddedSteps;
    } else {
      const now = new Date();
      const past24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const startOfDayTimestamp = admin.firestore.Timestamp.fromDate(past24Hours);

      // Query powerups created in the past 24 hours
      const powerupsSnapshot = await powerupsCollectionRef
        .where("createdAt", ">=", startOfDayTimestamp)
        .where("duelID", "==", duelID)
        .where("targetUserID", "==", userID)
        .get();

      if (powerupsSnapshot.empty) {
        console.log(`No powerups found for user ${userID} in group ${groupID} for duel ${duelID}`);
        return 0; // No steps to add
      }

      // Calculate total steps added from 'secondWind' powerups
      let totalAddedSteps = 0;
      powerupsSnapshot.forEach((doc) => {
        const powerup = doc.data();
        if (powerup.type === "secondWind") {
          totalAddedSteps += 200; // Each secondWind adds 200 steps
        }
      });

      console.log(`Total added steps for user ${userID}: ${totalAddedSteps}`);
      return totalAddedSteps;
    }
  } catch (error) {
    console.error(`Error fetching powerups for user ${userID}:`, error);
    return 0; // Default to no steps added on error
  }
};

exports.managePropBets = onSchedule("every day 05:00", async (event) => {
  console.log("managePropBets -- START");
  const groupRef = firestore.collection("groups");
  try {
    const groupSnapshots =
    await groupRef
      .where("isGameActive", "==", true)
      .where("gameType", "==", "weekly")
      .get();
    if (groupSnapshots.empty) {
      console.log("No active games found.");
      return;
    }

    console.log("Group snapshots found: ", groupSnapshots.size);
    const groupBatch = firestore.batch();
    groupSnapshots.docs.forEach(async (doc) => {
      const data = doc.data();
      const groupDocRef = doc.ref;

      const propBetsArray = data.propBets || [];

      // Iterate through the array and fetch steps for each betOnUserID
      propBetsArray.map(async (bet) => {
        const betOnUserID = bet.betOnUserID;
        const userID = bet.userID;
        const averageStepCount = (bet.averageStepCount !== undefined && bet.averageStepCount !== null) ?
          bet.averageStepCount :
          bet.averageSteps;
        const overUnder = bet.overUnder;
        if (betOnUserID) {
          const userDoc = await firestore.collection("users").doc(userID).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            const steps = userData.steps;

            let win = false;
            if (overUnder === "under" && averageStepCount >= steps) {
              win = true;
            } else if (overUnder === "over" && averageStepCount < steps) {
              win = true;
            }

            // if player won the propBet
            if (win) {
              await groupDocRef.update({
                [`users.${userID}.diamonds`]: FieldValue.increment(1),
              }).then(() => {
                console.log(`Successfully updated diamonds for user ${userID} by 1 addded`);
              }).catch((error) => {
                console.error(`Failed to update tokens for user ${userID}: `, error);
              });
            }
            // Add a document to the `propBets` subcollection
            await groupDocRef.collection("propBets").add({
              ...bet, // Include all bet data
              win, // Include the win status
              createdAt: FieldValue.serverTimestamp(), // Add the timestamp
            });
            console.log(`Added propBet record for user ${userID} in group ${groupDocRef.id}.`);
          }
        }
      });


      // Delete finishedPropBet and propBets fields in the group
      groupBatch.update(groupDocRef, {
        finishedPropBet: admin.firestore.FieldValue.delete(),
        propBets: admin.firestore.FieldValue.delete(),
      });
      console.log(`Prepared field deletions for group ${groupDocRef.id}.`);


      // No need to check for gameType because propBets are only in weekly
    });
    // Commit the batch
    await groupBatch.commit();
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

      // Check if gameType exists and is valid
      const gameType = data.gameType;
      if (gameType && gameType == "weekly") {
        console.log(`gameType is weekly for group ID: ${doc.id}`);

        const currentDay = new Date().getDay();
        const resetDay = data.resetDay;

        // if it is the correct day of the week
        if (currentDay == resetDay) {
          let cycleWeek = data.cycleWeek;
          let cycleCount = data.cycleCount;
          let cycleDuels = data.cycleDuels;
          const players = data.order;
          const numberOfPlayers = data.currentPlayersInGame;

          const playerCount = players.reduce((count, playerId) => {
            return playerId ? count + 1 : count;
          }, 0);
          console.log("playercount: ", playerCount);

          console.log("checkpoint two");

          //  make sure that when people are adde to the group, it wont mess up recap (which relies on previousplayersInGame)
          if (cycleWeek == 1) {
            //  maybe also add a check where cycleCount is greater than 1 but prolly doesnt matter
            groupBatch.update(groupDocRef, {
              previousPlayersInGame: numberOfPlayers,
            });
          }

          if (cycleWeek >= numberOfPlayers-1) {
            cycleWeek = 1;
            cycleCount += 1;
            console.log(`Updating cycleWeek to 1 and increasing 
              cycleCount to ${cycleCount} for group: ${doc.id}`);

            cycleDuels = createCycle(players);
            groupBatch.update(groupDocRef, {
              currentPlayersInGame: playerCount,
            });
            console.log("checkpoint three");
          } else {
            cycleWeek += 1;
            console.log(`Incrementing cycleDay to ${cycleWeek} for group ${doc.id}`);
            console.log("checkpoint four");
          }

          console.log("cycleDuels:", JSON.stringify(cycleDuels));

          if (cycleCount > data.totalCycles) {
            // end the game
            groupBatch.update(groupDocRef, {
              isGameActive: false,
              cycleWeek: 0,
              cycleCount: 0,
              currentPlayersInGame: admin.firestore.FieldValue.delete(),
              cycleDuels: admin.firestore.FieldValue.delete(),
              dailyTokens: admin.firestore.FieldValue.delete(),
              totalCycles: admin.firestore.FieldValue.delete(),
              finishedBetting: admin.firestore.FieldValue.delete(),
              finishedRecap: admin.firestore.FieldValue.delete(),
              finishedTutorial: admin.firestore.FieldValue.delete(),
              startingTokens: admin.firestore.FieldValue.delete(),
            });
            // reset the tokens for each player
            const usersUpdate = {};
            players.forEach((playerID) => {
              usersUpdate[`users.${playerID}`] = {
                placedBet: false,
                tokens: 0,
                todaysBetTokens: 0,
              };
            });
            groupBatch.update(groupDocRef, usersUpdate);
            console.log("Game has ended");
          } else {
            // create new duels
            const duelsForToday = cycleDuels[cycleWeek - 1]; // 0-based index
            if (!duelsForToday || typeof duelsForToday !== "object") {
              console.error(`duelsForToday is undefined or
                not an object for cycleDay: ${cycleWeek}`);
              return; // Exit early if no duels are available
            }
            console.log("checkpoint five");
            console.log(duelsForToday);
            console.log(cycleWeek - 1);

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
                wager: 0,
                // wager: data.defaultBetOnSelf,
                betOnUserID: duel.player1,
              };

              const player2Bet = {
                userID: duel.player2,
                wager: 0,
                // wager: data.defaultBetOnSelf,
                betOnUserID: duel.player2,
              };

              const duelData = {
                player1: duel.player1,
                player2: duel.player2,
                cycleWeek: cycleWeek,
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
              cycleWeek: cycleWeek,
              cycleCount: cycleCount,
              cycleDuels: cycleDuels,
              finishedBetting: admin.firestore.FieldValue.delete(),
              finishedRecap: admin.firestore.FieldValue.delete(),
            });

            // update the bet tokens for each player
            const usersUpdate = {};
            players.forEach((playerID) => {
              const currentUserData = data.users[playerID];
              usersUpdate[`users.${playerID}.placedBet`] = false;
              usersUpdate[`users.${playerID}.tokens`] = currentUserData ? currentUserData.tokens : 0;
              usersUpdate[`users.${playerID}.todaysBetTokens`] = 0; // usersInDuels.includes(playerID) ? data.defaultBetOnSelf : 0;
            });
            groupBatch.update(groupDocRef, usersUpdate);
          }
          // Add the batch to the array to commit later
          // allBatches.push(groupBatch.commit());
        } else {
          return; // not the correct day to be creating new duels
        }
      } else { // IF THIS IS THE DAILY DUELS, NOT THE WEEKLY DUELS
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

        //  make sure that when people are adde to the group, it wont mess up recap (which relies on previousplayersInGame)
        if (data.cycleDay == 1) {
          //  maybe also add a check where cycleCount is greater than 1 but prolly doesnt matter
          groupBatch.update(groupDocRef, {
            previousPlayersInGame: numberOfPlayers,
          });
        }

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

        if (cycleCount > data.totalCycles) {
          // end the game
          groupBatch.update(groupDocRef, {
            isGameActive: false,
            cycleDay: 0,
            cycleCount: 0,
            currentPlayersInGame: admin.firestore.FieldValue.delete(),
            cycleDuels: admin.firestore.FieldValue.delete(),
            dailyTokens: admin.firestore.FieldValue.delete(),
            // defaultBetOnSelf: admin.firestore.FieldValue.delete(),
            totalCycles: admin.firestore.FieldValue.delete(),
            finishedBetting: admin.firestore.FieldValue.delete(),
            finishedRecap: admin.firestore.FieldValue.delete(),
            finishedTutorial: admin.firestore.FieldValue.delete(),
            startingTokens: admin.firestore.FieldValue.delete(),
          });
          // reset the tokens for each player
          const usersUpdate = {};
          players.forEach((playerID) => {
            usersUpdate[`users.${playerID}`] = {
              placedBet: false,
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
              wager: 0,
              // wager: data.defaultBetOnSelf,
              betOnUserID: duel.player1,
            };

            const player2Bet = {
              userID: duel.player2,
              wager: 0,
              // wager: data.defaultBetOnSelf,
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
            usersUpdate[`users.${playerID}.placedBet`] = false;
            usersUpdate[`users.${playerID}.tokens`] = currentUserData ? currentUserData.tokens : 0;
            usersUpdate[`users.${playerID}.todaysBetTokens`] = 0; // usersInDuels.includes(playerID) ? data.defaultBetOnSelf : 0;
          });
          groupBatch.update(groupDocRef, usersUpdate);
        }
        // Add the batch to the array to commit later
        // allBatches.push(groupBatch.commit());
      }
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
