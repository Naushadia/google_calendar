async function loadCredentials() {
    const credentialsPath = path.join(__dirname, '../credentials.json');
    const credentials = await fs.readFile(credentialsPath);
    return JSON.parse(credentials);
  }

  // Authorize a client with credentials
  async function authorize(credentials) {
    const auth = await authenticate({
      keyfilePath: path.join(__dirname, '../credentials.json'),
      scopes: SCOPES,
    });
    return google.calendar({version: 'v3', auth});
  }

  // List the next 10 events on the user's primary calendar
  async function listEvents(calendar) {
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    const events = res.data.items;
    if (events.length) {
      console.log('Upcoming 10 events:');
      events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
      });
    } else {
      console.log('No upcoming events found.');
    }
  }

  // Create a new event on the user's primary calendar
  async function createEvent(calendar) {
    // Define event data
    const event = {
      summary: 'Google I/O 2023',
      location: '800 Howard St., San Francisco, CA 94103',
      description: 'A chance to hear more about Google\'s developer products.',
      start: {
        dateTime: '2023-05-28T09:00:00-07:00',
        timeZone: 'America/Los_Angeles',
      },
      end: {
        dateTime: '2023-05-28T17:00:00-07:00',
        timeZone: 'America/Los_Angeles',
      },
      recurrence: [
        'RRULE:FREQ=DAILY;COUNT=2'
      ],
      attendees: [
        {email: 'lpage@example.com'},
        {email: 'sbrin@example.com'},
      ],
      reminders: {
        useDefault: false,
        overrides: [
          {'method': 'email', 'minutes': 24 * 60},
          {'method': 'popup', 'minutes': 10},
        ],
      },
    };

    // Insert event
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
    console.log('Event created: %s', res.data.htmlLink);
  }

  // Main function
  async function main() {
    try {
      // Load credentials
      const credentials = await loadCredentials();
      // Authorize client
      const calendar = await authorize(credentials);
      // List events
      await listEvents(calendar);
      // Create event
      await createEvent(calendar);
    } catch (err) {
      console.error(err);
    }
  }

  // Run the main function
  main();