import React, { useEffect, useState } from 'react';
import { usePeer } from './Peer';
import ActiveUsersPanel from './ActiveUsersPanel';
import VideoChat from './VideoChat';

const BottomControlBar = ({ activeUsers = 1, onOpenChat }) => {
  const {
    roomPeerMap,
    roomId,
    muteMicrophone,
    unmuteMicrophone,
    toggleMicrophone,
    localAudioEnabled,
    toggleLocalVideo,
    localVideoEnabled,
    hasUnreadMessages,
  } = usePeer(); // Get roomPeerMap, roomId and audio functions from context

  const updateURLParams = (audioState, videoState) => {
    const url = new URL(window.location);

    // Update audio and video parameters
    url.searchParams.set('audio', audioState ? 'enabled' : 'disabled');
    url.searchParams.set('video', videoState ? 'enabled' : 'disabled');

    // Update the URL without reloading the page
    window.history.replaceState({}, '', url);

    console.log('URL updated:', url.toString());
  };

  useEffect(() => {
    console.log('Local Audio chnaged', localAudioEnabled);
    console.log('Local Video changed:', localVideoEnabled);
    updateURLParams(localAudioEnabled, localVideoEnabled);
  }, [localAudioEnabled, localVideoEnabled]);

  const [peerCount, setPeerCount] = useState(0);
  const [showUsers, setShowUsers] = useState(false);

  useEffect(() => {
    if (roomId && roomPeerMap) {
      const peersInRoom = roomPeerMap[roomId] || [];
      setPeerCount(peersInRoom.length);
    }
  }, [roomPeerMap, roomId]);

  // Log and update peer count when roomPeerMap or roomId changes
  useEffect(() => {
    if (roomId && roomPeerMap) {
      const peersInRoom = roomPeerMap[roomId] || [];
      const count = peersInRoom.length;
      console.log(`Current Users in room "${roomId}":`, count);
      setPeerCount(count);
    }
  }, [roomPeerMap, roomId]);

  window.chatOpened = false;

  return (
    <>
      {!showUsers && (
        <div
          onClick={() => setShowUsers((prev) => !prev)}
          className='
        fixed
        right-0
        bottom-[13vh]
        -translate-y-1/2
        rounded-l-lg
        w-5
        h-16
        flex
        items-center
        justify-start
    
        z-50
        cursor-pointer
        hover:bg-opacity-80
        transition-all
        duration-200
      '
          style={{
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.4), rgba(0,0,0,0))',
            backdropFilter: 'blur(50px)',
            WebkitBackdropFilter: 'blur(50px)',
          }}
        >
          <img src='/arrow.svg' style={{ transform: 'rotate(-90deg)' }} />
        </div>
      )}

      <VideoChat show={showUsers} setShow={setShowUsers} hostMuted={!localAudioEnabled} />
      <div className='absolute bottom-[2%] left-[2.5%] w-[95%] h-[7vh] bg-[#2D2E2E] rounded-full shadow-md flex justify-evenly items-center z-50'>
        {/* Chat Button */}
        <div onClick={onOpenChat} className='relative text-center text-white cursor-pointer'>
          <img src='/Chat.svg' className='w-5 h-5 mx-auto' />
          {hasUnreadMessages && (
            <div className='absolute top-0 -right-[40%] w-2 h-2 bg-red-500 rounded-full'></div>
          )}
          <div className='text-xs mt-1'>Chat</div>
        </div>

        {/* Microphone Button */}
        <div className='text-center text-white cursor-pointer' onClick={toggleMicrophone}>
          <img
            src={localAudioEnabled ? '/AudioOff.svg' : '/AudioOn.svg'}
            alt={localAudioEnabled ? 'Unmute' : 'Muted'}
            className='w-5 h-5 mx-auto'
          />
          <div className='text-xs mt-1'>{!localAudioEnabled ? 'Unmute' : 'Mute'}</div>
        </div>
        <div className='text-center text-white cursor-pointer' onClick={() => toggleLocalVideo()}>
          <img
            src={localVideoEnabled ? '/videoon.svg' : '/videooff.svg'}
            className='w-5 h-5 mx-auto'
          />
          <div className='text-xs mt-1'>Video</div>
        </div>

        {/* Active Users Button with Badge */}
        <div
          className='relative text-center text-white cursor-pointer'
          onClick={() => setShowUsers((prev) => !prev)}
        >
          {/* Container for image and badge */}
          <div className='flex items-center gap-1'>
            {/* Image */}
            <img src='/Users.svg' className='w-5 h-5 mx-auto' alt='Active Users' />

            {/* Badge */}
            <div className='absolute right-[1px] flex items-center gap-[2px] px-[4px] py-[1px] bg-[#707070] rounded-full text-[8px]'>
              <div className='w-1 h-1 rounded-full bg-green-500'></div>
              <span className='text-white'>{peerCount + 1}</span>
            </div>
          </div>

          {/* Text */}
          <div className='text-xs mt-1'>Active Users</div>
        </div>
      </div>
    </>
  );
};

export default BottomControlBar;
