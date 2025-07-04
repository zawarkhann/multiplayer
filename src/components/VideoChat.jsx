import React, { useState, useRef, useEffect } from 'react';
import { usePeer } from './Peer';
import { Video, VideoOff } from 'lucide-react';
import MaximizedVideo from './MaximizedVideo';

const VideoChat = ({ show, setShow, hostMuted }) => {
  const {
    peerId,
    peerAvatars,
    roomId,
    roomPeerMap,
    togglePeerAudio,
    isPeerMuted,
    localVideoEnabled,
    localAudioEnabled,
    toggleLocalVideo,
    toggleMicrophone,
    isPeerVideoEnabled,
    isPeerAudioEnabled,
    peerVideoStreams,
    muteMicrophone,
    unmuteMicrophone,
    host,
    peerNames,
    kickOutPeer,
  } = usePeer();

  const peers = roomPeerMap[roomId] || [];
  const allPeers = [peerId, ...peers.filter((id) => id !== peerId)];
  const [selectedUser, setSelectedUser] = useState(null);
  const videoRefs = useRef({});
  const userRefs = useRef({});
  const [isExpanded, setIsExpanded] = useState(show);

  // Track maximized video
  const [maximizedVideoId, setMaximizedVideoId] = useState(null);

  useEffect(() => {
    setIsExpanded(show);
  }, [show]);

  // Listen for minimize video events from MaximizedVideo
  useEffect(() => {
    const handleMinimizeVideo = (event) => {
      if (event.detail && event.detail.peerId) {
        setMaximizedVideoId(null);
        // Close the menu if it's open for the same peer
        if (selectedUser === event.detail.peerId) {
          setSelectedUser(null);
        }
      }
    };

    window.addEventListener('minimizeVideo', handleMinimizeVideo);
    return () => {
      window.removeEventListener('minimizeVideo', handleMinimizeVideo);
    };
  }, [selectedUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectedUser && userRefs.current[selectedUser]) {
        const node = userRefs.current[selectedUser];
        if (node && !node.contains(event.target)) {
          setSelectedUser(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedUser]);

  useEffect(() => {
    allPeers.forEach((id) => {
      if (id === peerId) {
        if (localVideoEnabled && videoRefs.current[peerId]) {
          navigator.mediaDevices
            .getUserMedia({ video: true })
            .then((stream) => {
              if (videoRefs.current[peerId]) {
                videoRefs.current[peerId].srcObject = stream;
              }
            })
            .catch((err) => console.error('Error accessing camera:', err));
        }
      } else {
        const hasVideo = isPeerVideoEnabled(id);
        if (hasVideo && peerVideoStreams[id] && videoRefs.current[id]) {
          videoRefs.current[id].srcObject = peerVideoStreams[id];
        }
      }
    });
  }, [peerId, allPeers, peerVideoStreams, isPeerVideoEnabled, localVideoEnabled]);

  const handleUserClick = (id) => {
    setSelectedUser((prev) => (prev === id ? null : id));
  };

  const handleLocalMuteToggle = (event) => {
    if (event) event.stopPropagation();
    toggleMicrophone();
  };

  const handleAudioToggle = (id, event) => {
    event.stopPropagation();

    if (id === peerId) {
      // Toggle self-mute using the global function
      toggleMicrophone();
    } else {
      // Toggle peer mute
      togglePeerAudio(id);
    }
  };

  const handleMaximizeVideo = (id, event) => {
    if (event) event.stopPropagation();
    setSelectedUser(null); // Close the menu
    setMaximizedVideoId(id);

    // Dispatch event for the MaximizedVideo component to pick up
    const maximizeEvent = new CustomEvent('maximizeVideo', {
      detail: { peerId: id },
    });
    window.dispatchEvent(maximizeEvent);
  };

  const handleMinimizeVideoFromChat = (id, event) => {
    if (event) event.stopPropagation();

    // Only if this is the currently maximized video
    if (id === maximizedVideoId) {
      setMaximizedVideoId(null);
      setSelectedUser(null); // Important: Close the menu

      // Dispatch event to close the maximized video
      const minimizeEvent = new CustomEvent('minimizeVideoFromChat', {
        detail: { peerId: id },
      });
      window.dispatchEvent(minimizeEvent);
    }
  };

  // Fixed function to get peer name
  const getPeerName = (id) => {
    if (id === peerId) return 'You';

    // Debug logging
    console.log(`Getting name for peer ${id}:`, {
      peerNamesEntry: peerNames[id],
      allPeerNames: peerNames,
    });

    // Return the actual peer name or fallback to Player-XXX
    return `P-${id.slice(3, 5)}`;
  };

  return (
    <>
      {/* This will always be rendered, even when VideoChat is hidden */}
      <MaximizedVideo />

      <div
        className={`fixed right-0 bottom-[14vh] flex flex-col gap-3 z-50 transition-all duration-300 ${
          show ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        style={{
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7), rgba(0,0,0,0))',
          borderRadius: '12px 0px 0px 12px',
          backdropFilter: 'blur(50px)',
          WebkitBackdropFilter: 'blur(50px)',
          padding: '15px',
          boxShadow: '0px -4px 12px rgba(0, 0, 0, 0.2)',
        }}
      >
        {isExpanded && (
          <div
            className='absolute -left-6 -bottom-[2vh] transform -translate-y-1/2
          w-6 h-16 flex items-center justify-center z-50 cursor-pointer
          rounded-l-lg transition-all duration-200 hover:opacity-80'
            style={{
              background: 'linear-gradient(to top, rgba(0, 0, 0, 0.4), rgba(0,0,0,0))',
              backdropFilter: 'blur(50px)',
              WebkitBackdropFilter: 'blur(50px)',
              willChange: 'transform',
              WebkitTransform: 'translateZ(0)',
            }}
            onClick={() => {
              setShow(false);
              setSelectedUser(null); // Close any open menus when hiding the sidebar
            }}
          >
            <img src='/arrow.svg' style={{ transform: 'rotate(90deg)' }} alt='Hide' />
          </div>
        )}
        {allPeers.map((id, index) => {
          const isSelected = selectedUser === id;
          const avatarSrc =
            peerAvatars[id] || `https://api.dicebear.com/6.x/fun-emoji/svg?seed=${id}`;

          // Use proper audio states
          const isAudioMuted = id === peerId ? !localAudioEnabled : isPeerMuted(id);
          const isAudioEnabled = id === peerId ? localAudioEnabled : isPeerAudioEnabled(id);

          const hasVideo = id === peerId ? localVideoEnabled : isPeerVideoEnabled(id);
          const isMaximized = maximizedVideoId === id;

          return (
            <div key={id + index} className='relative flex flex-col items-center'>
              <div
                onClick={() => handleUserClick(id)}
                className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer relative overflow-hidden ${
                  isMaximized ? 'ring-2 ring-blue-400' : ''
                }`}
              >
                {isSelected ? (
                  <div className='w-12 h-12 rounded-full bg-[#2D2E2E42] flex items-center justify-center'>
                    <span className='text-white text-lg font-bold'>✕</span>
                  </div>
                ) : (
                  <>
                    {hasVideo ? (
                      <div className='relative w-12 h-12 rounded-full overflow-hidden bg-gray-800'>
                        <video
                          ref={(el) => {
                            if (!el) return;
                            videoRefs.current[id] = el;

                            const assignStream = (stream) => {
                              if (el.srcObject !== stream) {
                                el.srcObject = stream;

                                // Wait for metadata before playing
                                el.onloadedmetadata = () => {
                                  el.play().catch((err) => {
                                    console.warn('Failed to play video:', err.message);
                                  });
                                };
                              }
                            };

                            if (id !== peerId && peerVideoStreams[id]) {
                              assignStream(peerVideoStreams[id]);
                            }

                            if (id === peerId && localVideoEnabled) {
                              navigator.mediaDevices
                                .getUserMedia({ video: true })
                                .then(assignStream)
                                .catch((err) => console.error('Error accessing camera:', err));
                            }
                          }}
                          autoPlay
                          playsInline
                          muted
                          className='w-full h-full object-cover'
                        />
                      </div>
                    ) : (
                      <img
                        src={avatarSrc}
                        alt='avatar'
                        className={`w-12 h-12 rounded-full ${isAudioMuted || !isAudioEnabled ? 'opacity-50' : ''}`}
                      />
                    )}

                    {/* Show audio status indicator based on both muted and enabled states */}
                    {(isAudioMuted || !isAudioEnabled) && (
                      <div className='absolute bottom-0 right-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center'>
                        <img src='/AudioOff.svg' className='w-3 h-3' alt='Muted' />
                      </div>
                    )}
                  </>
                )}
              </div>

              <span className='text-white text-xs mt-1'>{getPeerName(id).slice(0, 6)}</span>

              {isSelected && id !== peerId && (
                <div
                  className='absolute top-1 mr-70 rounded-xl overflow-hidden text-sm z-10'
                  ref={(el) => {
                    if (el) userRefs.current[id] = el;
                  }}
                  style={{
                    background: 'linear-gradient(to right, rgba(0, 0, 0, 0.5), rgba(0,0,0,0.5))',
                    borderRadius: '12px',
                    backdropFilter: 'blur(50px)',
                    WebkitBackdropFilter: 'blur(50px)',
                    width: '140px',
                  }}
                >
                  {isMaximized ? (
                    // Show minimize option if video is maximized
                    <>
                      <div className='h-[1px] bg-white/20 mx-2'></div>
                      <div
                        className='p-2 flex items-center gap-2 cursor-pointer hover:bg-white/10 text-white'
                        onClick={(e) => handleMinimizeVideoFromChat(id, e)}
                      >
                        <img src='/maximize.svg' className='w-4 h-4' alt='Minimize' />
                        <span>Minimize Video</span>
                      </div>
                    </>
                  ) : (
                    // Show maximize option if video is not maximized
                    <>
                      <div className='h-[1px] bg-white/20 mx-2'></div>
                      <div
                        className='p-2 flex items-center gap-2 cursor-pointer hover:bg-white/10 text-white'
                        onClick={(e) => handleMaximizeVideo(id, e)}
                      >
                        <img src='/maximize.svg' className='w-4 h-4' alt='Maximize' />
                        <span>Maximize Video</span>
                      </div>
                    </>
                  )}
                  <div className='h-[1px] bg-white/20 mx-2'></div>
                  <div
                    className='p-2 flex items-center gap-2 cursor-pointer hover:bg-white/10 text-white'
                    onClick={(e) => handleAudioToggle(id, e)}
                  >
                    <img
                      src={
                        isAudioMuted || !isAudioEnabled
                          ? '/AudioOn.svg'
                          : '/AudioOff.svg'
                      }
                      className='w-4 h-4'
                      alt={isAudioMuted || !isAudioEnabled ? 'Unmute' : 'Mute'}
                    />
                    <span>{isAudioMuted || !isAudioEnabled ? 'Unmute' : 'Mute'}</span>
                  </div>
                </div>
              )}

              {isSelected && id === peerId && (
                <div
                  ref={(el) => {
                    if (el) userRefs.current[id] = el;
                  }}
                  className='absolute top-1 mr-70 rounded-xl overflow-hidden text-sm z-10'
                  style={{
                    background: 'linear-gradient(to right, rgba(0, 0, 0, 0.5), rgba(0,0,0,0.5))',
                    borderRadius: '12px',
                    backdropFilter: 'blur(50px)',
                    WebkitBackdropFilter: 'blur(50px)',
                    width: '140px',
                  }}
                >
                  {isMaximized ? (
                    // Show minimize option if video is maximized
                    <div
                      className='p-2 flex items-center gap-2 cursor-pointer hover:bg-white/10 text-white'
                      onClick={(e) => handleMinimizeVideoFromChat(id, e)}
                    >
                      <img src='/maximize.svg' className='w-4 h-4' alt='Minimize' />
                      <span>Minimize Video</span>
                    </div>
                  ) : (
                    // Show maximize option if video is not maximized
                    <div
                      className='p-2 flex items-center gap-2 cursor-pointer hover:bg-white/10 text-white'
                      onClick={(e) => handleMaximizeVideo(id, e)}
                    >
                      <img src='/maximize.svg' className='w-4 h-4' alt='Maximize' />
                      <span>Maximize Video</span>
                    </div>
                  )}
                  <div className='h-[1px] bg-white/20 mx-2'></div>
                  <div
                    className='p-2 flex items-center gap-2 cursor-pointer hover:bg-white/10 text-white'
                    onClick={(e) => handleLocalMuteToggle(e)}
                  >
                    <img
                      src={!localAudioEnabled ? '/AudioOn.svg' : '/AudioOff.svg'}
                      className='w-4 h-4'
                      alt={!localAudioEnabled ? 'Unmute' : 'Mute'}
                    />
                    <span>{!localAudioEnabled ? 'Unmute' : 'Mute'}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default VideoChat;
