import React, { useState } from 'react';
import { usePeer } from './Peer';

const ActiveUsersPanel = ({ show }) => {
  const {
    peerId,
    peerAvatars,
    roomId,
    roomPeerMap,
    // Audio control functions from the PeerProvider
    togglePeerAudio,
    mutePeerAudio,
    unmutePeerAudio,
    isPeerMuted,
  } = usePeer();

  const peers = roomPeerMap[roomId] || [];
  const allPeers = [peerId, ...peers.filter((id) => id !== peerId)];
  const [selectedUser, setSelectedUser] = useState(null);

  const handleUserClick = (id) => {
    setSelectedUser((prev) => (prev === id ? null : id));
  };

  // Handle mute/unmute action
  const handleAudioToggle = (id, event) => {
    event.stopPropagation(); // Prevent menu from closing

    if (id === peerId) {
      // For local user, we'd use different methods to mute/unmute
      // This is typically handled through muteMicrophone/unmuteMicrophone
      return;
    }

    // Toggle mute state for remote peer
    togglePeerAudio(id);
  };

  return (
    <div
      className={`fixed right-0 bottom-[10vh] flex flex-col gap-3 z-50 transition-all duration-300
        ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
      `}
      style={{
        background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7), rgba(0,0,0,0))',
        borderRadius: '12px 0px 0px 12px',
        backdropFilter: 'blur(50px)',
        WebkitBackdropFilter: 'blur(50px)',
        padding: '15px',
        boxShadow: '0px -4px 12px rgba(0, 0, 0, 0.2)',
      }}
    >
      {allPeers.map((id, index) => {
        const isSelected = selectedUser === id;
        const avatarSrc =
          peerAvatars[id] || `https://api.dicebear.com/6.x/fun-emoji/svg?seed=${id}`;
        const isMuted = id !== peerId && isPeerMuted(id);

        return (
          <div key={id + index} className='relative flex flex-col items-center'>
            {/* Toggle between avatar and cross */}
            <div
              onClick={() => handleUserClick(id)}
              className='w-12 h-12 rounded-full flex items-center justify-center cursor-pointer relative'
            >
              {isSelected ? (
                <div className='w-12 h-12 rounded-full bg-[#2D2E2E42] flex items-center justify-center'>
                  <span className='text-white text-lg font-bold'>✕</span>
                </div>
              ) : (
                <>
                  <img
                    src={avatarSrc}
                    alt='avatar'
                    className={`w-12 h-12 rounded-full ${isMuted ? 'opacity-50' : ''}`}
                  />

                  {/* Mute indicator for remote peers */}
                  {id !== peerId && isMuted && (
                    <div className='absolute bottom-0 right-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center'>
                      <svg
                        width='14'
                        height='14'
                        viewBox='0 0 24 24'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <path
                          d='M3 9L21 21M12 5V19M9 8.8V4.2C9 3.08 8.257 3 7.8 3H4.2C3.08 3 3 3.743 3 4.2V7.8C3 8.92 3.08 9 4.2 9H7.8C8.92 9 9 8.257 9 7.8z'
                          stroke='white'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    </div>
                  )}
                </>
              )}
            </div>
            {/* Name */}
            <span className='text-white text-xs mt-1'>{id === peerId ? 'You' : 'HEllo'}</span>

            {/* Action Menu */}
            {isSelected && id !== peerId && (
              <div
                className='absolute top-1 mr-60 rounded-xl overflow-hidden text-sm z-10'
                style={{
                  background: 'linear-gradient(to right, rgba(0, 0, 0, 0.5), rgba(0,0,0,0.5))',
                  borderRadius: '12px 12px 12px 12px',
                  backdropFilter: 'blur(50px)',
                  WebkitBackdropFilter: 'blur(50px)',
                  width: '140px',
                }}
              >
                <div
                  className='p-2 flex items-center gap-2 cursor-pointer hover:bg-white/10 text-white'
                  onClick={(e) => handleAudioToggle(id, e)}
                >
                  <img
                    src={isMuted ? '/mic-on.svg' : '/mic.svg'}
                    className='w-4 h-4'
                    alt={isMuted ? 'Unmute' : 'Mute'}
                  />
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </div>
                <div className='h-[1px] bg-white/20 mx-2'></div>
              </div>
            )}
            {/* Special menu for yourself */}
            {isSelected && id === peerId && (
              <div
                className='absolute top-1 mr-60 rounded-xl overflow-hidden text-sm z-10'
                style={{
                  background: 'linear-gradient(to right, rgba(0, 0, 0, 0.5), rgba(0,0,0,0.5))',
                  borderRadius: '12px 12px 12px 12px',
                  backdropFilter: 'blur(50px)',
                  WebkitBackdropFilter: 'blur(50px)',
                  width: '140px',
                }}
              >
                <div className='p-2 flex items-center gap-2 cursor-pointer hover:bg-white/10 text-white'>
                  <img src='/mic.svg' className='w-4 h-4' alt='Mute' />
                  <span>Mute Microphone</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ActiveUsersPanel;
