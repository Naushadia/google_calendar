const fs = require("fs").promises;
var moment = require("moment");
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const { validationResult } = require("express-validator");
const db = require("../models");
const addEvents = db.event;

exports.addEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const SCOPES = ["https://www.googleapis.com/auth/calendar"];
    var TOKEN_PATH = path.join(__dirname, "../token.json");
    var CREDENTIALS_PATH = path.join(__dirname, "../credentials.json");

    /**
     * Reads previously authorized credentials from the save file.
     *
     * @return {Promise<OAuth2Client|null>}
     */
    async function loadSavedCredentialsIfExist() {
      try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
      } catch (err) {
        return null;
      }
    }

    /**
     * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
     *
     * @param {OAuth2Client} client
     * @return {Promise<void>}
     */
    async function saveCredentials(client) {
      const content = await fs.readFile(CREDENTIALS_PATH);
      const keys = JSON.parse(content);
      const key = keys.installed || keys.web;
      const payload = JSON.stringify({
        type: "authorized_user",
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
      });
      await fs.writeFile(TOKEN_PATH, payload);
    }

    async function authorize() {
      let client = await loadSavedCredentialsIfExist();
      if (client) {
        return client;
      }
      client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
      });
      if (client.credentials) {
        await saveCredentials(client);
      }
      return client;
    }

    /**
     * Lists the next 10 events on the user's primary calendar.
     * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
     */
    result = [];
    async function listEvents(auth) {
      const calendar = google.calendar({ version: "v3", auth });
      const res = await calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
      });
      const events = res.data.items;
      if (!events || events.length === 0) {
        console.log("No upcoming events found.");
        return;
      }
      console.log("Upcoming 10 events:");
      events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        result.push(`${start} - ${event.summary} -${event.id}`);
        console.log(`${start} - ${event.summary} -${event.id}`);
      });
    }

    var link;
    async function createEvents(auth) {
      var emailInput = req.body.email.split(",");

      // Map each email to an object
      var emailObjects = emailInput.map(function (email) {
        return { email: email.trim() };
      });
      var date = req.body.date;
      var starttime = req.body.starttime;
      var endtime = req.body.endtime;
      var startdatetime = moment(
        date + " " + starttime,
        "YYYY-MM-DDTHH:mm:ssZ"
      );
      var endDateTime = moment(date + " " + endtime, "YYYY-MM-DDTHH:mm:ssZ");
      const event = {
        summary: req.body.summary,
        location: req.body.location,
        description: req.body.description,
        start: {
          dateTime: startdatetime.format("YYYY-MM-DDTHH:mm:ssZ"),
          // dateTime: req.body.start.dateTime,
          timeZone: "UTC+5:30",
        },
        end: {
          dateTime: endDateTime.format("YYYY-MM-DDTHH:mm:ssZ"),
          // dateTime: req.body.end.dateTime,
          timeZone: "UTC+5:30",
        },
        recurrence: ["RRULE:FREQ=DAILY;COUNT=2"],
        attendees: emailObjects,
        // attendees: req.body.attendees,
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 10 },
          ],
        },
      };

      const calendar = google.calendar({ version: "v3", auth });
      const res = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
      });
      link = res.data.htmlLink;
      const events = res.data;
      await addEvents.create({
        eventid: events.id,
        summary: req.body.summary,
        location: req.body.location,
        description: req.body.description,
        date,
        endtime,
        starttime,
        attendees: emailObjects,
        // attendees: req.body.attendees,
        link,
      });
      console.log("Event created: %s", res.data.htmlLink);
    }
    async function main() {
      const auth = await authorize();
      await listEvents(auth);
      // await createEvents(auth);
      // return res.redirect(link);
      // if (result.length > 0) {
      //   res.status(200).json({
      //     message:
      //       "Event Created Sucessfully Please Check your calendar for more details",
      //     "upcoming events": result,
      //     "Link for the created Event": link,
      //   });
      // } else {
      //   res.status(200).json({
      //     message:
      //       "Event Created Sucessfully Please Check your calendar for more details",
      //     "upcoming events": "No upcoming events found",
      //     "Link for the created Event": link,
      //   });
      // }
      if (result.length>0){
        res.status(200).json({"message":"List Of Events Please Check your calendar for more details","events":result});
      } else {
        res.status(200).json({"message":"No upcoming events found"});
      }
    }
    main();
  } catch (e) {
    console.log(e);
    return res.status(400).json({ message: "something went wrong" });
  }
};
