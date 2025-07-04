import React, { useState, useRef, useEffect } from 'react';
import { usePeer } from './Peer';

const MaximizedVideo = () => {
  const {
    peerId,
    peerAvatars,
    isPeerMuted,
    localVideoEnabled,
    localAudioEnabled,
    isPeerVideoEnabled,
    isPeerAudioEnabled,
    peerVideoStreams,
    togglePeerAudio,
    host,
    muteMicrophone,
    unmuteMicrophone,
    toggleMicrophone,
    kickOutPeer,
    peerList,
  } = usePeer();

  // State to track which peer's video is maximized
  const [maximizedPeerId, setMaximizedPeerId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    // If we have a maximized peer that's not ourselves and not in the peer list anymore
    if (maximizedPeerId && maximizedPeerId !== peerId && !peerList.includes(maximizedPeerId)) {
      console.log('Peer was removed or left, closing maximized view');
      handleMinimizeVideo();
    }
  }, [peerList, maximizedPeerId, peerId]);
  // Listen for maximize video events
  useEffect(() => {
    const handleMaximizeVideo = (event) => {
      if (event.detail && event.detail.peerId) {
        setMaximizedPeerId(event.detail.peerId);
        setMenuOpen(false);
      }
    };

    window.addEventListener('maximizeVideo', handleMaximizeVideo);
    return () => {
      window.removeEventListener('maximizeVideo', handleMaximizeVideo);
    };
  }, []);

  // Listen for minimize video events from VideoChat
  useEffect(() => {
    const handleMinimizeVideoFromChat = (event) => {
      if (maximizedPeerId) {
        setMaximizedPeerId(null);
        setMenuOpen(false);
      }
    };

    window.addEventListener('minimizeVideoFromChat', handleMinimizeVideoFromChat);
    return () => {
      window.removeEventListener('minimizeVideoFromChat', handleMinimizeVideoFromChat);
    };
  }, [maximizedPeerId]);

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Set up video stream
  useEffect(() => {
    if (!maximizedPeerId || !videoRef.current) return;

    const setupVideoStream = async () => {
      if (maximizedPeerId === peerId) {
        if (localVideoEnabled) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } catch (err) {
            console.error('Error accessing camera:', err);
          }
        }
      } else {
        if (isPeerVideoEnabled(maximizedPeerId) && peerVideoStreams[maximizedPeerId]) {
          videoRef.current.srcObject = peerVideoStreams[maximizedPeerId];
        }
      }
    };

    setupVideoStream();
  }, [maximizedPeerId, peerId, localVideoEnabled, peerVideoStreams, isPeerVideoEnabled]);

  const handleMinimizeVideo = () => {
    // Dispatch an event to notify other components that video was minimized
    const minimizeEvent = new CustomEvent('minimizeVideo', {
      detail: { peerId: maximizedPeerId },
    });
    window.dispatchEvent(minimizeEvent);

    setMaximizedPeerId(null);
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleMuteToggle = () => {
    if (maximizedPeerId) {
      if (maximizedPeerId === peerId) {
        // Toggle self-mute using the new global toggle function
        toggleMicrophone();
      } else {
        // Toggle peer mute
        togglePeerAudio(maximizedPeerId);
      }
      setMenuOpen(false);
    }
  };

  // If no video is maximized, don't render anything
  if (!maximizedPeerId) return null;

  const avatarSrc =
    peerAvatars[maximizedPeerId] ||
    `https://api.dicebear.com/6.x/fun-emoji/svg?seed=${maximizedPeerId}`;

  // Use the correct audio state for own video and peer's audio
  const isAudioMuted =
    maximizedPeerId === peerId ? !localAudioEnabled : isPeerMuted(maximizedPeerId);

  // Use the correct audio enabled state for peers
  const isAudioEnabled =
    maximizedPeerId === peerId ? localAudioEnabled : isPeerAudioEnabled(maximizedPeerId);

  const hasVideo =
    maximizedPeerId === peerId ? localVideoEnabled : isPeerVideoEnabled(maximizedPeerId);
  const isHost = peerId === host;
  const isOwnVideo = maximizedPeerId === peerId;

  return (
    <div
      className='fixed top-[8%] left-4 z-50 w-30 h-44 rounded-xl bg-black/60 shadow-lg'
      style={{
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {/* Video or Avatar Container */}
      <div className='relative w-full h-full rounded-xl overflow-hidden'>
        {hasVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={maximizedPeerId === peerId}
            className='w-full h-full object-cover'
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center bg-gray-800'>
            <img
              src={avatarSrc}
              alt='avatar'
              className={`w-full h-full object-cover ${isAudioMuted || !isAudioEnabled ? 'opacity-50' : ''}`}
              style={{
                borderRadius: '0px', // Remove any rounding
                objectFit: 'cover', // Force fill
                objectPosition: 'center', // Center content
                display: 'block', // Remove any inline default gaps
              }}
            />
          </div>
        )}

        {/* Menu Button */}
        <div
          className='absolute top-2 right-2 w-8 h-8 rounded-xl bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/70'
          onClick={toggleMenu}
        >
          <div className='flex flex-row items-center gap-1'>
            <div className='w-1 h-1 bg-white rounded-full'></div>
            <div className='w-1 h-1 bg-white rounded-full'></div>
            <div className='w-1 h-1 bg-white rounded-full'></div>
          </div>
        </div>

        {/* Audio Status Indicator */}
        <div className='absolute bottom-2 left-2 flex items-center gap-2'>
          {(isAudioMuted || !isAudioEnabled) && (
            <div className='bg-red-500/70 px-2 py-1 rounded-lg text-white text-xs flex items-center gap-1'>
              <img src='/AudioOff.svg' className='w-3 h-3' alt='Muted' />
              <span>Muted</span>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Menu - placed OUTSIDE the overflow-hidden container */}
      {menuOpen && (
        <div
          ref={menuRef}
          className='absolute top-[30%] left-[30%] w-40 bg-gray-800/90 rounded-xl overflow-hidden text-sm z-10'
          style={{
            background: 'linear-gradient(to right, rgba(0, 0, 0, 0.5), rgba(0,0,0,0.5))',
            borderRadius: '12px',
            backdropFilter: 'blur(50px)',
            WebkitBackdropFilter: 'blur(50px)',
            width: '140px',
          }}
        >
          <div className='h-px bg-white/20 mx-2'></div>
          <div
            className='p-2 flex items-center gap-2 cursor-pointer hover:bg-white/10 text-white'
            onClick={handleMinimizeVideo}
          >
            <img src='/maximize.svg' className='w-4 h-4' alt='Minimize' />
            <span>Minimize Video</span>
          </div>

          <div className='h-px bg-white/20 mx-2'></div>

          <div
            className='p-2 flex items-center gap-2 cursor-pointer hover:bg-white/10 text-white'
            onClick={handleMuteToggle}
          >
            <img
              src={isAudioMuted || !isAudioEnabled ? '/AudioOn.svg' : '/AudioOff.svg'}
              className='w-4 h-4'
              alt={isAudioMuted || !isAudioEnabled ? 'Unmute' : 'Mute'}
            />
            <span>{isAudioMuted || !isAudioEnabled ? 'Unmute' : 'Mute'}</span>
          </div>

          {!isOwnVideo && isHost && maximizedPeerId !== host && (
            <>
              <div className='h-px bg-white/20 mx-2'></div>
              <div
                className='p-2 flex items-center gap-2 cursor-pointer hover:bg-white/10 text-white'
                onClick={() => kickOutPeer(maximizedPeerId)}
              >
                <img src='/kickout.svg' className='w-4 h-4' alt='Kick' />
                <span>Kick out</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MaximizedVideo;
