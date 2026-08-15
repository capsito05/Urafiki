import { ChatWindow } from '../components/ChatWindow';

interface ChatPageProps {
  userId: string;
  coupleId: string | null;
}

export function ChatPage({ userId, coupleId }: ChatPageProps) {
  if (!coupleId) return <p>Le chat n'est disponible qu'en mode Couple ou Ami·e·s.</p>;
  return (
    <div className="chat-page">
      <h1>Discussion</h1>
      <ChatWindow coupleId={coupleId} userId={userId} />
    </div>
  );
}
