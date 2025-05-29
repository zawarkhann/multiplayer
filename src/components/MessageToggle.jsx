import React, { useState, useEffect, useRef } from 'react';
import { usePeer } from './Peer';

const MessageToggle = ({ onClose }) => {
  window.chatOpened = true;
  const {
    messageLog,
    sendMessage,
    isConnected,
    peerId,
    peerAvatars,
    peerNames,
    setHasUnreadMessages,
  } = usePeer();
  const messageNotificationAudio = new Audio('/sounds/msg send.mp3'); // Change this path to your MP3 file
  messageNotificationAudio.preload = 'auto';
  messageNotificationAudio.volume = 0.7; // Adjust volume as needed (0.0 to 1.0)

  // Function to play notification sound
  const playMessageNotification = () => {
    const audio = messageNotificationAudio.cloneNode(); // Clone to allow multiple simultaneous plays
    audio.play().catch((error) => {
      console.log('Could not play notification sound:', error);
      // This catch handles cases where autoplay is blocked by browser
    });
  };
  const [input, setInput] = useState('');
  const messagesContainerRef = useRef(null);
  const lastScrollTopRef = useRef(0);
  useEffect(() => {
    window.chatOpened = true;
    setHasUnreadMessages(false); // ✅ Reset unread state
    return () => {
      window.chatOpened = false;
    };
  }, []);

  const handleSend = () => {
    playMessageNotification();
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput('');
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Smooth scroll to bottom
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [messageLog]);

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (container && messageLog.length > 0) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  return (
    <div className='fixed bottom-[2.5%] left-[2.5%] w-[95%] h-[35%] flex flex-col justify-end z-10 pointer-events-none'>
      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        className='flex-1 overflow-y-auto px-3 pt-3 pointer-events-auto'
        style={{
          display: 'flex',
          flexDirection: 'column-reverse', // Magic line: show newest at bottom
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 80%, black 100%)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 80%, black 100%)',
        }}
      >
        <div className='w-full'>
          {messageLog.length === 0 ? (
            <p className='text-center text-gray-300'>No messages yet</p>
          ) : (
            messageLog.map((msg, idx) => {
              const isOwn = msg.startsWith('Me:');
              const [id, ...rest] = msg.split(':');
              const text = rest.join(':').trim();
              const name = isOwn ? 'Me' : peerNames[id] || id;
              const avatarUrl =
                peerAvatars[id] ||
                (isOwn && peerAvatars[peerId]) ||
                `https://api.dicebear.com/6.x/fun-emoji/svg?seed=${isOwn ? peerId : id}`;

              return (
                <div key={idx} className='flex w-full mt-1'>
                  <div
                    className='flex items-start w-[100%] px-3 py-2 gap-2 text-white break-words whitespace-pre-wrap'
                    style={{
                      background: '#30303766',
                      borderRadius: '7px',
                      opacity: 1,
                      wordBreak: 'break-word',
                    }}
                  >
                    <img
                      src={avatarUrl}
                      alt='avatar'
                      className='w-8 h-8 rounded-full object-cover shrink-0'
                    />
                    <div>
                      <p className='text-sm font-semibold'>{name}</p>
                      <p className='text-sm break-words whitespace-pre-wrap'>{text}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className='flex items-end gap-2 mx-2 mt-2 pointer-events-auto'>
        <div className='flex flex-1 items-center bg-[#2D2E2E] rounded-full px-3 py-2 gap-2 '>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Write message'
            rows={1}
            className='flex-1 bg-transparent text-white placeholder-gray-400 text-sm resize-none outline-none max-h-[100px] overflow-hidden'
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <img
            onClick={handleSend}
            src='public/Send.svg'
            disabled={!isConnected}
            className='h-6 w-6 mb-1'
          />
          <div className='w-px h-8 bg-[#70707078] mx-1'></div>
          <div
            className='w-8 h-8 flex items-center justify-center overflow-visible'
            onClick={onClose}
          >
            <img
              src='/Cross.svg'
              alt='Close'
              className='w-6 h-6 scale-180 cursor-pointer mt-2'
              style={{ transformOrigin: 'center' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageToggle;
