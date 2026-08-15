import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { ChatMessage } from '../types';

interface ChatWindowProps {
  coupleId: string;
  userId: string;
}

export function ChatWindow({ coupleId, userId }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: true });
      setMessages((data ?? []) as ChatMessage[]);
    };
    fetchMessages();

    const channel = supabase
      .channel(`chat_${coupleId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!draft.trim()) return;
    await supabase.from('messages').insert({ couple_id: coupleId, sender_id: userId, content: draft.trim() });
    setDraft('');
  };

  return (
    <div className="chat-window">
      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-message ${m.sender_id === userId ? 'is-self' : ''}`}>
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Écris un message..."
        />
        <button onClick={sendMessage}>Envoyer</button>
      </div>
    </div>
  );
}
