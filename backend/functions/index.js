const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onDocumentUpdated, onDocumentCreated} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
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
    from: "appceleri@gmail.com",
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

/**
 * Retrieves the FCM tokens array for a specific user.
 *
 * @param {string} userID - The ID of the user to fetch tokens for.
 * @return {Promise<string[] | null>} The list of FCM tokens or null if none found.
 */
async function getUserFcmTokens(userID) {
  const userSnap = await getFirestore().collection("users").doc(userID).get();
  const userData = userSnap.data();
  return userData.tokens || null;
}

// Sync Step Scheduler
exports.syncStepScheduler = onSchedule("every 5 minutes", async () => {
  const db = getFirestore();
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const usersSnap = await db.collection("users").get();

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    const userID = userDoc.id;

    // check login activity:
    if (!user.lastLogin || user.lastLogin.toDate() < sixtyDaysAgo) continue;

    // check if user in 1v1
    const isIn1v1 = user.isIn1v1;

    // if user is active in app, let frontend handle sync
    let lastAppOpen = null;
    if (user.lastLogin && typeof user.lastLogin.toDate === "function") {
      lastAppOpen = user.lastLogin.toDate();
    }
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (lastAppOpen && lastAppOpen > fiveMinutesAgo) {
      continue; // Skip backend push, app is active
    }

    let syncIntervalMs = null;

    if (isIn1v1) {
      syncIntervalMs = 1 * 60 * 60 * 1000; // 1 hour
    } else {
      // check group activity:
      let isInActiveGroup = false;
      if (user.groups && user.groups.length > 0) {
        const groupChecks = await Promise.all(
          user.groups.map(async (groupID) => {
            const groupSnap = await db.collection("groups").doc(groupID).get();
            return groupSnap.exists && groupSnap.data().isGameActive;
          }),
        );
        isInActiveGroup = groupChecks.includes(true);
      }
      if (!isInActiveGroup) continue;

      syncIntervalMs = 4 * 60 * 60 * 1000; // 4 hours
    }

    const nextSyncTime = new Date(now.getTime() + syncIntervalMs);

    // check for existing job
    const existingJobSnap = await db
      .collection("syncQueue")
      .doc(userID)
      .get();

    if (!existingJobSnap.exists || existingJobSnap.data().scheduledTime.toDate() > nextSyncTime) {
      await db.collection("syncQueue").doc(userID).set({
        userID,
        scheduledTime: nextSyncTime,
        processed: false,
      });
    }
  }

  // process due jobs
  const dueJobsSnap = await db
    .collection("syncQueue")
    .where("processed", "==", false)
    .where("scheduledTime", "<=", now)
    .get();

  for (const jobDoc of dueJobsSnap.docs) {
    const job = jobDoc.data();

    // Send silent push
    const tokens = await getUserFcmTokens(job.userID);
    for (const token of tokens) {
      const message = {
        token,
        data: {
          type: "silent",
          action: "fetchSteps",
        },
      };

      try {
        await admin.messaging().send(message);
        await jobDoc.ref.delete(); // or mark as processed
        console.log(`Sent sync for user ${job.userID}`);
      } catch (err) {
        console.error(`Failed to send sync for ${job.userID}:`, err);
      }
    }
  }
});

// function for sending daily notifs to all users
exports.sendNotif = onSchedule("every day 04:00", async (event) => {
  const today = new Date();
  const hour = today.getHours(); // Get the current hour in 24-hour format

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

    if (groupData.gameType == "weekly" && hour <= 6) {
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
    } else if (groupData.gameType == "biweekly") {
      console.log(`${groupID} is biweekly.`);
      const today = new Date().getDay();
      const secondResetDay = (groupData.resetDay + 3) % 7;
      if ((groupData.resetDay == today && hour <= 6) || (secondResetDay == today && hour >= 16)) {
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

exports.sendTestSilentNotif = onSchedule("0 1,4,16 * * *", async (event) => {
  const today = new Date();
  const hour = today.getHours(); // Get the current hour in 24-hour format
  if (hour === 5) {
    console.log("Running at night");
    // Logic for the morning run
  } else if (hour === 17) {
    console.log("Running at morning");
    // Logic for the evening run
  } else {
    console.log("Unexpected execution time:", hour);
  }

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

exports.sendNotifOnNews = onDocumentCreated("groups/{groupID}/news/{newsID}", async (event) => {
  console.log("sendNotifOnNews is running");

  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with the event");
    return;
  }

  const newNewsData = snapshot.data();
  const newsType = newNewsData.type;

  const groupID = event.params.groupID; // Extract group ID from event params
  console.log(`sendNotifOnNews is running in ${groupID}`);
  const newsRef = firestore.collection(`groups/${groupID}/news`);
  const newsDocRef = firestore.doc(`groups/${groupID}/news/${event.params.newsID}`);


  // check what priority the notif is

  // if priority zero notif, then send notif no matter what
  if (newNewsData.priority0 !== undefined) {
    console.log("priority0 exists:", newNewsData.priority0);
    const priority0UserIDs = newNewsData.priority0;
    for (const userID of priority0UserIDs) {
      try {
        console.log("priority 0 -- iterating through", userID);
        // the user who completed the challenge (who the notif is about)
        const targetUserID = newNewsData.userID;
        const targetUserDoc = await firestore.collection("users").doc(targetUserID).get();
        const targetUserData = targetUserDoc.data();

        const targetUsername = targetUserData.username;


        const userDoc = await firestore.collection("users").doc(userID).get();
        if (userDoc.exists) {
          console.log("user exists in priority 0", userID);
          const userData = userDoc.data();
          const userTokens = userData && userData.tokens;

          if (userTokens && userTokens.length > 0) {
            for (const token of userTokens) {
              let message;
              if (newsType == "recordSetter") {
                console.log("recordSetter detected for group, ", groupID, " will try to send message to ", targetUsername, "with token ", token);
                const steps = newNewsData.record;
                message = {
                  token: token,
                  notification: {
                    title: `A legend is born.`,
                    body: `${targetUsername} just broke a record -- they're the first person to hit ${steps} this week!`,
                  },
                };
              } else {
                message = {
                  token: token,
                  notification: {
                    title: `A legend is born.`,
                    body: `${targetUsername} just broke a record.`,
                  },
                };
              }

              // send the message
              try {
                const response = await admin.messaging().send(message);
                console.log("Notification sent successfully:", response);
              } catch (error) {
                console.error("Error sending notification:", error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error with priority 0 notif:", error);
      }
    }
  }

  // no need for else, can check each individually

  if (newNewsData.priority1 !== undefined) {
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);


    const newsSnapshot = await newsRef
      .where("priority1", "==", true)
      .where("createdAt", ">=", twelveHoursAgo)
      .get();

    console.log("priority1 exists: ", newNewsData.priority1);

    let userIDList = [];

    if (!newsSnapshot.empty) {
      console.log("There is a priority 1 news document in the last 12 hours");
      // make sure to not send notifs to the users in the priority 1
      const alreadyNotifiedUserIDs = new Set(); // Using Set to automatically handle uniqueness

      newsSnapshot.forEach((doc) => {
        const previousData = doc.data();
        if (previousData.priority1 && Array.isArray(previousData.priority1)) {
          previousData.priority1.forEach((userID) => alreadyNotifiedUserIDs.add(userID)); // Track notified users
        }
      });

      console.log("Already notified user IDs:", Array.from(alreadyNotifiedUserIDs));

      // Filter out users in priority1 who are in alreadyNotifiedUserIDs
      const updatedPriority1 = (newNewsData.priority1 || []).filter((userID) => !alreadyNotifiedUserIDs.has(userID));

      // If priority1 has changed, update the new document
      if (updatedPriority1.length !== newNewsData.priority1.length) {
        await newsDocRef.update({priority1: updatedPriority1});
        console.log("Updated priority1 in new news document:", updatedPriority1);
      }

      userIDList = updatedPriority1;
      console.log("userIDList is updatedPriority1", userIDList);
    } else {
      console.log("No priority 1 news found in the last 12 hours");
      userIDList = newNewsData.priority1;
      console.log("userIDList is newNewsData.priority1", userIDList);
    }

    // Send notifications only to users who were NOT in alreadyNotifiedUserIDs
    for (const userID of userIDList) {
      try {
        const userDoc = await firestore.collection("users").doc(userID).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const userTokens = userData.tokens || [];

          for (const token of userTokens) {
            let message;

            if (newsType == "racePullAheadTopThree") {
              // get information according to the newsType
              console.log("racePullAheadTopThree detected for group, ", groupID, " will try to send message to ", targetUsername, "with token ", token);
              const place = newNewsData.place;

              // the user who pulled ahead
              const targetUserID = newNewsData.userID;
              const targetUserDoc = await firestore.collection("users").doc(targetUserID).get();
              const targetUserData = targetUserDoc.data();

              const targetUsername = targetUserData.username;

              if (place == 3) {
                message = {
                  token: token,
                  notification: {
                    title: "A new challenger approaches.",
                    body: `${targetUsername} just barrelled into 3rd place!`,
                  },
                };
              } else if (place == 2) {
                message = {
                  token: token,
                  notification: {
                    title: "Damn, this race is close!",
                    body: `${targetUsername} just pulled ahead into 2nd place!`,
                  },
                };
              } else if (place == 1) {
                message = {
                  token: token,
                  notification: {
                    title: `All hail ${targetUsername}!`,
                    body: `${targetUsername} is your new race leader in 1st place!`,
                  },
                };
              }
            } else if (newsType == "headToHeadPullAhead") {
              console.log("headToHeadPullAhead detected for group, ", groupID, " will try to send message to ", targetUsername, "with token ", token);

              const targetUserID = newNewsData.opponentID;
              const targetUserDoc = await firestore.collection("users").doc(targetUserID).get();
              const targetUserData = targetUserDoc.data();

              const targetUsername = targetUserData.username;

              message = {
                token: token,
                notification: {
                  title: `You've gotta lock in.`,
                  body: `${targetUsername} just surpassed you in steps in your head to head!`,
                },
              };
            } else {
              message = {
                token: token,
                notification: {
                  title: "New Priority 1 News",
                  body: "You have an important update!",
                },
              };
            }

            try {
              const response = await admin.messaging().send(message);
              console.log("Notification sent successfully to", userID, ":", response);
            } catch (error) {
              console.error("Error sending notification to", userID, ":", error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user document for", userID, ":", error);
      }
    }
  }

  if (newNewsData.priority2 !== undefined) {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // grabs any priority 1 from the past 24 hours

    const priority1Query = newsRef
      .where("priority1", ">=", false)
      .where("createdAt", ">=", twentyFourHoursAgo)
      .get();

    // grabs any priority 2 from the past 24 hours

    const priority2Query = await newsRef
      .where("priority2", ">=", false)
      .where("createdAt", ">=", twentyFourHoursAgo)
      .get();


    console.log("priority2 exists: ", newNewsData.priority2);

    // now merge the snapshots

    const [priority1Snapshot, priority2Snapshot] = await Promise.all([
      priority1Query,
      priority2Query,
    ]);

    // Merge results, avoiding duplicates
    const newsSet = new Map();

    priority1Snapshot.forEach((doc) => newsSet.set(doc.id, doc.data()));
    priority2Snapshot.forEach((doc) => newsSet.set(doc.id, doc.data()));

    const mergedNews = Array.from(newsSet.values());

    console.log("merged news, ", mergedNews);

    let userIDList = [];

    if (mergedNews.length > 0) {
      console.log("There is a priority 1 or priority 2 news document in the last 24 hours");
      const alreadyNotifiedUserIDs = new Set(); // Using Set to automatically handle uniqueness

      mergedNews.forEach((previousData) => {
        if (previousData.priority2 && Array.isArray(previousData.priority2)) {
          previousData.priority2.forEach((userID) => alreadyNotifiedUserIDs.add(userID)); // Track notified users
        }
      });

      console.log("Already notified user IDs:", Array.from(alreadyNotifiedUserIDs));
      // Filter out users in priority2 who are in alreadyNotifiedUserIDs
      const updatedPriority2 = (newNewsData.priority2 || []).filter((userID) => !alreadyNotifiedUserIDs.has(userID));

      // If priority2 has changed, update the new document
      if (updatedPriority2.length !== newNewsData.priority2.length) {
        await newsDocRef.update({priority2: updatedPriority2});
        console.log("Updated priority2 in new news document:", updatedPriority2);
      }

      userIDList = updatedPriority2;
      console.log("userIDList is updatedPriority2", userIDList);
    } else {
      console.log("No priority 2 news or priority 1 news found in the last 12 hours");
      userIDList = newNewsData.priority2;
      console.log("userIDList is newNewsData.priority2", userIDList);
    }

    // Send notifications only to users who were NOT in alreadyNotifiedUserIDs
    for (const userID of userIDList) {
      try {
        const userDoc = await firestore.collection("users").doc(userID).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const userTokens = userData.tokens || [];
          const targetUsername = userData.username;

          for (const token of userTokens) {
            let message;

            if (newsType == "headToHeadPullAhead") {
              console.log("headToHeadPullAhead detected for group, ", groupID, " will try to send message to ", targetUsername, "with token ", token);
              // the person you bet on's opponent

              const opponentUserID = newNewsData.opponentID;
              const opponentUserDoc = await firestore.collection("users").doc(opponentUserID).get();
              const opponentUserData = opponentUserDoc.data();

              const opponentUsername = opponentUserData.username;

              // the person you bet on

              const betOnUserID = newNewsData.userID;
              const betOnUserDoc = await firestore.collection("users").doc(betOnUserID).get();
              const betOnUserData = betOnUserDoc.data();

              const betOnUsername = betOnUserData.username;

              // this targets anyone who's betting on you

              message = {
                token: token,
                notification: {
                  title: `Shucks, you're losing your bet!`,
                  body: `${opponentUsername} just surpassed ${betOnUsername} in steps in their head to head!`,
                },
              };
            } else if (newsType == "racePullAheadOfYou") {
              // the person who pulled ahea of you
              console.log("racePullAheadOfYou detected for group, ", groupID, " will try to send message to ", targetUsername, "with token ", token);

              const opponentUserID = newNewsData.userID;
              const opponentUserDoc = await firestore.collection("users").doc(opponentUserID).get();
              const opponentUserData = opponentUserDoc.data();

              const opponentUsername = opponentUserData.username;

              message = {
                token: token,
                notification: {
                  title: `Don't be left behind!`,
                  body: `${opponentUsername} just overtook you in steps! Are you just gonna sit back and let that happen?`,
                },
              };
            } else if (newsType == "headToHeadOpponentWalking") {
              console.log("headToHeadOpponentWalking detected for group, ", groupID, " will try to send message to ", targetUsername, "with token ", token);
              const opponentUserID = newNewsData.userID;
              const opponentUserDoc = await firestore.collection("users").doc(opponentUserID).get();
              const opponentUserData = opponentUserDoc.data();

              const opponentUsername = opponentUserData.username;

              const steps = newNewsData.steps;

              message = {
                token: token,
                notification: {
                  title: `Pick up the pace!`,
                  body: `Your head-to-head opponent, ${opponentUsername} just walked ${steps} in five hours. What are you up to?`,
                },
              };
            }
            try {
              const response = await admin.messaging().send(message);
              console.log("Notification sent successfully to", userID, ":", response);
            } catch (error) {
              console.error("Error sending notification to", userID, ":", error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user document for", userID, ":", error);
      }
    }
  }

  if (newNewsData.priority3 !== undefined) {
    const thirtySixHoursAgo = new Date();
    thirtySixHoursAgo.setHours(thirtySixHoursAgo.getHours() - 36);

    // grabs any priority 1 from the past 36 hours

    const priority1Query = newsRef
      .where("priority1", ">=", false)
      .where("createdAt", ">=", thirtySixHoursAgo)
      .get();

    // grabs any priority 2 from the past 36 hours

    const priority2Query = await newsRef
      .where("priority2", ">=", false)
      .where("createdAt", ">=", thirtySixHoursAgo)
      .get();

    // grabs any priority 3 from the past 36 hours

    const priority3Query = await newsRef
      .where("priority3", ">=", false)
      .where("createdAt", ">=", thirtySixHoursAgo)
      .get();

    console.log("priority3 exists: ", newNewsData.priority3);

    // now merge the snapshots

    const [priority1Snapshot, priority2Snapshot, priority3Snapshot] = await Promise.all([
      priority1Query,
      priority2Query,
      priority3Query,
    ]);

    // Merge results, avoiding duplicates
    const newsSet = new Map();

    priority1Snapshot.forEach((doc) => newsSet.set(doc.id, doc.data()));
    priority2Snapshot.forEach((doc) => newsSet.set(doc.id, doc.data()));
    priority3Snapshot.forEach((doc) => newsSet.set(doc.id, doc.data()));

    const mergedNews = Array.from(newsSet.values());

    console.log("merged news, ", mergedNews);

    let userIDList = [];

    if (mergedNews.length > 9) {
      console.log("There is a priority 3 news document in the last 36 hours");
      const alreadyNotifiedUserIDs = new Set();

      mergedNews.forEach((previousData) => {
        if (previousData.priority3 && Array.isArray(previousData.priority3)) {
          previousData.priority3.forEach((userID) => alreadyNotifiedUserIDs.add(userID)); // Track notified users
        }
      });

      console.log("Already notified user IDs:", Array.from(alreadyNotifiedUserIDs));

      // Filter out users in priority2 who are in alreadyNotifiedUserIDs
      const updatedPriority3 = (newNewsData.priority3 || []).filter((userID) => !alreadyNotifiedUserIDs.has(userID));

      // If priority3 has changed, update the new document
      if (updatedPriority3.length !== newNewsData.priority3.length) {
        await newsDocRef.update({priority2: updatedPriority3});
        console.log("Updated priority2 in new news document:", updatedPriority3);
      }

      userIDList = updatedPriority3;
      console.log("userIDList is updatedPriority3", userIDList);
    } else {
      console.log("No priority 3 news or priority 2 news or priority 1 news found in the last 12 hours");
      userIDList = newNewsData.priority2;
      console.log("userIDList is newNewsData.priority3", userIDList);
    }

    // Send notifications only to users who were NOT in alreadyNotifiedUserIDs
    for (const userID of userIDList) {
      try {
        const userDoc = await firestore.collection("users").doc(userID).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const userTokens = userData.tokens || [];
          const targetUsername = userData.username;

          for (const token of userTokens) {
            let message;

            if (newsType == "headToHeadOpponentWalking") {
              console.log("headToHeadOpponentWalking detected for group, ", groupID, " will try to send message to ", targetUsername, "with token ", token);
              const opponentUserID = newNewsData.userID;
              const opponentUserDoc = await firestore.collection("users").doc(opponentUserID).get();
              const opponentUserData = opponentUserDoc.data();

              const opponentUsername = opponentUserData.username;

              const steps = newNewsData.steps;

              message = {
                token: token,
                notification: {
                  title: `${opponentUsername}'s on a roll!`,
                  body: `They just walked ${steps}. What are you doing?`,
                },
              };
            } else if (newsType == "headToHeadPullAhead") {
              console.log("headToheadPullAhead detected for group, ", groupID, " will try to send message to ", targetUsername, "with token ", token);
              // the person you bet on's opponent

              const opponentUserID = newNewsData.userID;
              const opponentUserDoc = await firestore.collection("users").doc(opponentUserID).get();
              const opponentUserData = opponentUserDoc.data();

              const opponentUsername = opponentUserData.username;

              // the person you bet on

              const betOnUserID = newNewsData.opponentID;
              const betOnUserDoc = await firestore.collection("users").doc(betOnUserID).get();
              const betOnUserData = betOnUserDoc.data();

              const betOnUsername = betOnUserData.username;

              // this targets anyone who bet on the opponent
              message = {
                token: token,
                notification: {
                  title: `Good news!`,
                  body: `You're winning your bet! ${betOnUsername} just surpassed ${opponentUsername} in steps in their head to head!`,
                },
              };
            }

            // steps behind in race, steps in head to head, and diamond count
            // waiting on frontend

            try {
              const response = await admin.messaging().send(message);
              console.log("Notification sent successfully to", userID, ":", response);
            } catch (error) {
              console.error("Error sending notification to", userID, ":", error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user document for", userID, ":", error);
      }
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

exports.send1v1RequestNotification = onCall(async (req) => {
  const {receiverID, senderName} = req.data;
  const db = getFirestore();

  const userSnap = await db.collection("users").doc(receiverID).get();
  const tokens = userSnap.data().tokens || [];

  const message = {
    notification: {
      title: "You've been challenged!",
      body: `${senderName} has sent you a 1v1 challenge.`,
    },
    tokens: tokens,
  };

  await admin.messaging().sendEachForMulticast(message);
  return {success: true};
});

exports.send1v1StartedNotification = onCall(async (req) => {
  const {opponentID, opponentName} = req.data;
  const db = getFirestore();

  const userSnap = await db.collection("users").doc(opponentID).get();
  const tokens = userSnap.data().tokens || [];

  const message = {
    notification: {
      title: "Your 1v1 has started!",
      body: `You are now in a 1v1 with ${opponentName}. Time to walk!`,
    },
    tokens: tokens,
  };

  await admin.messaging().sendEachForMulticast(message);
  return {success: true};
});

exports.handle1v1End = onDocumentUpdated("1v1s/{duelID}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const db = getFirestore();

  const now = Date.now();
  if (
    before.endTime.toMillis() > now &&
    after.endTime.toMillis() <= now
  ) {
    const participants = after.participants || [];

    const [uid1, uid2] = participants;
    const userSnap1 = db.collection("users").doc(uid1).get();
    const userSnap2 = db.collection("users").doc(uid2).get();
    const user1 = userSnap1.data();
    const user2 = userSnap2.data();
    const name1 = user1.username || "your opponent";
    const name2 = user2.username || "your opponent";
    const tokens1 = user1.tokens || [];
    const tokens2 = user2.tokens || [];

    db.collection("users").doc(uid1).update({isIn1v1: false});
    db.collection("users").doc(uid2).update({isIn1v1: false});

    console.log(`1v1 ended for: ${uid1}, ${uid2}`);

    const message1 = {
      notification: {
        title: `1v1 with ${name2} ended`,
        body: "See the results!",
      },
      tokens: tokens1,
    };

    const message2 = {
      notification: {
        title: `1v1 with ${name1} ended`,
        body: "See the results!",
      },
      tokens: tokens2,
    };
    await admin.messaging().sendEachForMulticast(message1);
    await admin.messaging().sendEachForMulticast(message2);

    console.log(`1v1 ended notification sent for: ${participants.join(", ")}`);
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

/**
 * Function to createCyclesInGame
 * @param {Object} players - object from firebase.
 * @param {Object} numberOfOldPlayers - amount of players from the start of the cycle
 * @param {Object} roundsSoFar - amount of weeks that have passed
 * @param {Object} currentRounds - the cycleDuels from firebase
 * @return {Object} cycles
 */
function createCyclesInGame(players, numberOfOldPlayers, roundsSoFar, currentRounds) {
  console.log("Entering createCyclesInGame -- means there are new players");

  // First identify who the new players are
  // players is an array of players, ordered by which they joined
  // number of old players is current players

  const newPlayers = players.slice(numberOfOldPlayers);
  const playerCount = players.length;
  console.log(`New players: ${JSON.stringify(newPlayers)}`);

  // 1. Store past duels to avoid duplicates
  const pastDuels = new Set();
  for (let i = 0; i < roundsSoFar; i++) {
    const round = currentRounds[i];
    for (const duelKey in round) {
      if (Object.hasOwn(round, duelKey)) {
        const {player1, player2} = round[duelKey];
        pastDuels.add([player1, player2].sort().join("-"));
      }
    }
  }

  console.log("Past duels ", pastDuels);

  // 2. Generate all possible duels between players
  const allDuels = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const duelKey = [players[i], players[j]].sort().join("-");
      allDuels.push({
        player1: players[i],
        player2: players[j],
        duelKey,
        isRepeat: pastDuels.has(duelKey), // Mark if this is a repeat
      });
    }
  }

  console.log("All Duels", allDuels);

  // 3. Split duels into fresh and repeats
  const freshDuels = allDuels.filter((duel) => !duel.isRepeat);
  const repeatDuels = allDuels.filter((duel) => duel.isRepeat);

  // Shuffle for fairness
  freshDuels.sort(() => Math.random() - 0.5);

  console.log("Fresh Duels", freshDuels);
  console.log("Repeat Duels", repeatDuels);

  // 4. Re-create cycles
  const newCycles = [];
  const duelsPerRound = players.length / 2;

  if (playerCount % 2 !== 0) {
    players.push("BYE");
  }

  const rounds = players.length - 1;

  for (let round = 0; round < rounds; round++) {
    // if this is a round that has already happened, keep it the way it is
    if ( round < roundsSoFar ) {
      newCycles.push(currentRounds[round]);
    } else {
      // edit the round
      const roundMatchups = {};
      let duelCounter = 1;
      const usedPlayers = new Set();

      // Try to fill this round with fresh duels first
      for (let i = 0; i < freshDuels.length; i++) {
        if (duelCounter > duelsPerRound) break;
        const duel = freshDuels[i];

        if (usedPlayers.has(duel.player1) || usedPlayers.has(duel.player2)) {
          continue; // Skip this duel
        }

        const duelKey = `duel${duelCounter++}`;
        roundMatchups[duelKey] = {player1: duel.player1, player2: duel.player2};
        usedPlayers.add(duel.player1);
        usedPlayers.add(duel.player2);

        // Remove the used duel from freshDuels
        freshDuels.splice(i, 1);
        i--; // Decrement index because we modified the array
      }

      // If we couldn't fill the round with fresh duels, use repeats
      if (duelCounter <= duelsPerRound) {
        console.log("About to use repeatDuels");
        for (const duel of repeatDuels) {
          if (
            !usedPlayers.has(duel.player1) &&
            !usedPlayers.has(duel.player2)
          ) {
            const duelKey = `duel${duelCounter}`;
            roundMatchups[duelKey] = {
              player1: duel.player1,
              player2: duel.player2,
            };
            usedPlayers.add(duel.player1);
            usedPlayers.add(duel.player2);
            duelCounter++;
          }

          if (duelCounter > duelsPerRound) {
            break;
          }
        }
      }


      newCycles.push(roundMatchups);
    }
  }
  return newCycles;
}

exports.updateWinners = onSchedule("0 4,16 * * *", async (event) => {
  const groupRef = firestore.collection("groups");
  const userRef = firestore.collection("users");

  try {
    const userSnapshots = await userRef.get();
    const userSteps = {};
    const userAverageSteps = {};

    // Store all users' steps in memory
    userSnapshots.forEach((doc) => {
      userSteps[doc.id] = doc.data().steps || 0;
      userAverageSteps[doc.id] = doc.data().averageSteps || [0, 0, 0, 0, 0, 0, 0];
    });

    const groupSnapshots = await groupRef.where("isGameActive", "==", true).get();
    if (groupSnapshots.empty) {
      console.log("No active games found.");
      return;
    }

    console.log("Group snapshots found: ", groupSnapshots.size);

    const today = new Date();
    const hour = today.getHours(); // Get the current hour in 24-hour format
    if (hour === 5 || hour === 4) {
      console.log("Running at night");
      // Logic for the morning run
    } else if (hour === 17 || hour === 16) {
      console.log("Running at morning");
      // Logic for the evening run
    } else {
      console.log("Unexpected execution time:", hour);
    }


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
      const groupName = data.groupName;

      const groupDoc = await groupDocRef.get();
      if (!groupDoc.exists) {
        console.log(`Group document ${doc.id} not found.`);
        return;
      }

      // Don't update winners if it's a weekly game and it's not the right day
      const gameType = data.gameType;
      console.log(groupName, doc.id, ": gameType: ", data.gameType);
      if (gameType && gameType == "weekly" && hour <= 6) {
        // propogate weeklySteps, should be a map
        const weeklySteps = {};
        const users = data.users;

        // Get all users in the group and their current steps
        Object.keys(users).forEach((userID) => {
          const currentSteps = userSteps[userID] || 0;

          // Calculate users weekly steps
          let weeklyStepsData = userAverageSteps[userID];

          if (weeklyStepsData === undefined || weeklyStepsData.length !== 7) {
            weeklyStepsData = [0, 0, 0, 0, 0, 0, 0];
          }

          // Sum the steps from the past six days and add the current day's steps
          const userWeeklySteps = weeklyStepsData.slice(1).reduce((sum, steps) => sum + steps, 0) + currentSteps;
          weeklySteps[userID] = userWeeklySteps + currentSteps;
          console.log(groupName, "weeklyStep for user: ", userID, userWeeklySteps, currentSteps);
        });

        console.log(groupName, "weeklySteps: ", weeklySteps);
        console.log(groupName, "users: ", users);

        const currentDay = new Date().getDay();
        const resetDay = data.resetDay;

        // if it is the correct day of the week
        if (currentDay == resetDay) {
          console.log(groupName, doc.id, ": currentDay == resetDay, resetting now.");

          const duelsSnapshot = await duelsRef
            .where("createdAt", ">=", startOfLastWeek)
            .where("createdAt", "<", today)
            .get();

          if (duelsSnapshot.empty) {
            console.log(groupName, `No active duels found for group ${doc.id} from last week.`);
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

          console.log("Race distribution -- checkpoint one");

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
          console.log("Race distribution -- checkpoint two");

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
      // BI WEEKLY MODEL
      } else if (gameType && gameType == "biweekly") {
        // propogate weeklySteps, should be a map
        const biweeklySteps = {};
        const weeklySteps = {};
        const users = data.users;
        console.log(groupName, "inside biweekly if statement");

        // Get all users in the group and their current steps
        Object.keys(users).forEach((userID) => {
          const currentSteps = userSteps[userID] || 0;

          // Calculate users weekly steps
          let weeklyStepsData = userAverageSteps[userID];

          if (weeklyStepsData === undefined || weeklyStepsData.length !== 7) {
            weeklyStepsData = [0, 0, 0, 0, 0, 0, 0];
          }

          // Sum the steps from the past three and add the current day's steps
          const userPastThreeDaysSteps = weeklyStepsData.slice(4).reduce((sum, steps) => sum + steps, 0) + currentSteps;
          const userWeeklySteps = weeklyStepsData.slice(1).reduce((sum, steps) => sum + steps, 0) + currentSteps;
          weeklySteps[userID] = userWeeklySteps + currentSteps;
          biweeklySteps[userID] = userPastThreeDaysSteps + currentSteps;
          console.log(groupName, "past three days of steps for user: ", userID, userPastThreeDaysSteps, currentSteps);
        });

        console.log(groupName, "biweeklySteps: ", biweeklySteps);
        console.log(groupName, "users: ", users);

        const currentDay = new Date().getDay();
        const resetDayOne = data.resetDay;
        const resetDayTwo = (resetDayOne + 3) % 7;

        const startOfLastResetDay = new Date(today);
        if (currentDay == resetDayOne) {
          startOfLastResetDay.setDate(today.getDate() - 4);
        } else {
          startOfLastResetDay.setDate(today.getDate() - 3);
        }

        // startOfLastResetDay.setHours(0, 0, 0, 0);

        console.log(groupName, "currentDay", currentDay, "resetDayOne ", resetDayOne, "resetDayTwo ", resetDayTwo, "startOfLastResetDay", startOfLastResetDay);

        // if it is the correct day of the week
        if ((currentDay == resetDayOne && hour <= 6) || currentDay == resetDayTwo && hour >= 16) {
          console.log(groupName, doc.id, ": currentDay == resetDayOne or resetDayTwo, resetting now.");

          const duelsSnapshot = await duelsRef
            .where("createdAt", ">=", startOfLastResetDay)
            .where("createdAt", "<", today)
            .get();

          if (duelsSnapshot.empty) {
            console.log(groupName, `No active duels found for group ${doc.id} from last half-week.`);
            return;
          }

          console.log(groupName, `Duels found for group ${doc.id}: `, duelsSnapshot.size);

          // Create a new WriteBatch for this group
          const batch = firestore.batch();

          for (const duelDoc of duelsSnapshot.docs) {
            const duelData = duelDoc.data();
            const player1Id = duelData.player1;
            const player2Id = duelData.player2;
            let winner = "none";

            try {
              const player1BaseSteps = biweeklySteps[player1Id] || 0;
              const player2BaseSteps = biweeklySteps[player2Id] || 0;

              // Calculate additional steps from powerups
              const player1PowerupSteps = await calculatePowerupSteps(doc.id, player1Id, duelDoc.id, "biweekly");
              const player2PowerupSteps = await calculatePowerupSteps(doc.id, player2Id, duelDoc.id, "biweekly");

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

              console.log(groupName, `Duel ${duelDoc.id}: Player1 (${player1Id}) steps = ${player1TotalSteps}, Player2 (${player2Id}) steps = ${player2TotalSteps}, Winner = ${winner}`);

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

          // Now do the race distirbution -- but only if its resetDayOne
          if (currentDay == resetDayOne && hour <= 6 ) {
            console.log(groupName, "updateWinners -- race distribution starting now");
            console.log(groupName, "Right before race distribution -- Users Value:", users);

            // weeklySteps was declared much earlier
            let maxSteps = -Infinity; // Start with the lowest possible value
            let maxUser = null; // To store the key corresponding to the max value
            for (const [key, value] of Object.entries(weeklySteps)) {
              if (value > maxSteps) {
                maxSteps = value;
                maxUser = key;
              }
            }

            console.log(groupName, "Race distribution -- checkpoint one");

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
            console.log(groupName, "Race distribution -- checkpoint two");

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
          }


          // After recording all winners, reset steps for all users, but only if its the end of the week
          if (currentDay == resetDayOne && hour <= 6) {
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
          }
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
    } else if (gameType == "biweekly") {
      const pastTime = new Date();
      pastTime.setDate(pastTime.getDate() - 3); // Subtract 3 days
      pastTime.setHours(pastTime.getHours() - 12); // Subtract 12 hours

      console.log("calculatePowerups, should be 3 days and 12 hours ago", pastTime);

      const powerupsSnapshot = await powerupsCollectionRef
        .where("createdAt", ">=", pastTime)
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

exports.managePropBets = onSchedule("every day 04:00", async (event) => {
  console.log("managePropBets -- START");
  const groupRef = firestore.collection("groups");
  try {
    const groupSnapshots =
    await groupRef
      .where("isGameActive", "==", true)
      .where("gameType", "in", ["weekly", "biweekly"])
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
              steps, // Include the user's steps
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


exports.createDuels = onSchedule("0 4,16 * * *", async (event) => {
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
    const today = new Date();
    const hour = today.getUTCHours(); // Get the current hour in 24-hour format
    if (hour === 4) {
      console.log("Running at night");
      // Logic for the morning run
    } else if (hour === 16) {
      console.log("Running at morning");
      // Logic for the evening run
    } else {
      console.log("Unexpected execution time:", hour);
    }


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
        if (currentDay == resetDay && hour <= 6) {
          let cycleWeek = data.cycleWeek;
          let cycleCount = data.cycleCount;
          let cycleDuels = data.cycleDuels;
          const users = data.users;
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
          } else if (playerCount > cycleDuels.length + 1) { // cycleDuels.length because when if we did currentPlayersInGame it wouldn't update
            console.log("More people have joined the game");
            cycleDuels = createCyclesInGame(players, numberOfPlayers, cycleWeek, cycleDuels);
            cycleWeek += 1;
          } else {
            cycleWeek += 1;
            console.log(`Incrementing cycleDay to ${cycleWeek} for group ${doc.id}`);
            console.log("checkpoint four");
          }

          console.log("cycleDuels:", JSON.stringify(cycleDuels));

          if (cycleCount > data.totalCycles) {
            // create a map called viewResults of every player and whether they've viewed the results
            const viewedResults = {};

            // create a map for the results document
            const userResultsMap = {};

            players.forEach((playerId) => {
              viewedResults[playerId] = false;
              const playerData = users[playerId];
              userResultsMap[playerId] = playerData ? playerData.tokens : 0;
            });

            const currentTimestamp = admin.firestore.FieldValue.serverTimestamp();

            // Add result doc to 'results' collection to remember tokens
            const resultDocRef = admin.firestore().collection("results").doc();
            const resultDocId = resultDocRef.id;

            // Prepare the dynamic key for resultsHistory
            const resultEntry = {};
            resultEntry[`resultsHistory.${resultDocId}`] = currentTimestamp;

            groupBatch.set(resultDocRef, {
              createdAt: currentTimestamp,
              groupID: doc.id,
              results: userResultsMap,
            });

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
              viewedResults: viewedResults,
              ...resultEntry,
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
      // BI WEEKLY MODEL
      } else if (gameType && gameType == "biweekly") {
        console.log(`gameType is biweekly for group ID: ${doc.id}`);

        const currentDay = new Date().getDay();
        const resetDayOne = data.resetDay;
        const resetDayTwo = (resetDayOne + 3) % 7;

        // if it is the correct day of the week
        if ((currentDay == resetDayOne && hour <= 6) || (currentDay == resetDayTwo && hour >= 16) ) {
          console.log(doc.id, ": currentDay == resetDayOne or resetDayTwo, creating duels now.");

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
          } else if (playerCount > cycleDuels.length + 1) { // cycleDuels.length because when if we did currentPlayersInGame it wouldn't update
            console.log("More people have joined the game");
            cycleDuels = createCyclesInGame(players, numberOfPlayers, cycleWeek, cycleDuels);
            cycleWeek += 1;
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
              finishedPropBet: admin.firestore.FieldValue.delete(),
              propBets: admin.firestore.FieldValue.delete(),
              previousPlayersInGame: admin.firestore.FieldValue.delete(),
              resetDay: admin.firestore.FieldValue.delete(),
              gameType: admin.firestore.FieldValue.delete(),
            });
            // reset the tokens for each player
            const usersUpdate = {};
            players.forEach((playerID) => {
              usersUpdate[`users.${playerID}`] = {
                placedBet: false,
                tokens: 0,
                todaysBetTokens: 0,
                diamonds: 0,
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
