import React, { useState, useEffect } from 'react';
import { useChat } from 'ai';

const FloatingAIWidget = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const { sendMessage, messages: chatMessages } = useChat();

  useEffect(() => {
    setMessages(chatMessages);
  }, [chatMessages]);

  const handleSendMessage = async () => {
    await sendMessage(input);
    setInput('');
  };

  return (
    <div className='floating-ai-widget'>
      <div className='chat-log'>
        {messages.map((message, index) => (
          <p key={index}>{message}</p>
        ))}
      </div>
      <input
        type='text'
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='Type a message...'
      />
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
};

export default FloatingAIWidget;
