export interface ContactConversationTurn {
  bodyText: string;
  direction: 'inbound' | 'outbound';
  occurredAt: string;
  senderEmail: string;
  subject: string;
}

const MAX_CONVERSATION_TURNS = 20;
const MAX_CONVERSATION_CHARACTERS = 24_000;

export const limitContactConversation = (turns: ContactConversationTurn[]) => {
  const selected: ContactConversationTurn[] = [];
  let characters = 0;

  for (const turn of turns.slice(-MAX_CONVERSATION_TURNS).reverse()) {
    const nextCharacters = turn.bodyText.length + turn.subject.length;
    if (
      selected.length &&
      characters + nextCharacters > MAX_CONVERSATION_CHARACTERS
    ) {
      break;
    }
    characters += nextCharacters;
    selected.push(turn);
  }

  return selected.reverse();
};
