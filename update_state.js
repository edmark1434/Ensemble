const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/ui/chat_bubble/chat_state.ts', 'utf8');

const regex = /socket\.on\("googleMeetingUpdated", \(event: GoogleMeetingEvent\) => \{[\s\S]*?\}\)\);/m;

const replacement = `socket.on("googleMeetingUpdated", (event: GoogleMeetingEvent) => {
      if (event.status === "ended") {
        useChatState.setState((state) => {
          const meetings = { ...state.googleMeetingsByConversation };
          delete meetings[String(event.conversation_id)];
          return { googleMeetingsByConversation: meetings };
        });
      } else {
        useChatState.setState((state) => ({
          googleMeetingsByConversation: {
            ...state.googleMeetingsByConversation,
            [String(event.conversation_id)]: event,
          },
        }));
      }`;

content = content.replace(regex, replacement);

// And we also need to fix `selectConversation` and `fetchConversations` polling:
// if activeGoogleMeeting is null OR activeGoogleMeeting.status === 'ended', we should delete it.
const activeMeetingRegex = /if \(activeGoogleMeeting\) meetings\[id\] = activeGoogleMeeting;/g;
content = content.replace(activeMeetingRegex, `if (activeGoogleMeeting && activeGoogleMeeting.status !== "ended") meetings[id] = activeGoogleMeeting;`);

fs.writeFileSync('frontend/src/components/ui/chat_bubble/chat_state.ts', content);
