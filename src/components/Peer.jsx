import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import Peer from 'peerjs';
import * as pc from 'playcanvas';
import { setGlobalPeers } from './globalPeer';
const PeerContext = createContext({});
export const usePeer = () => useContext(PeerContext);

export const PeerProvider = ({ children }) => {
  const messageNotificationAudio = new Audio('/sounds/msg receive.mp3'); // Change this path to your MP3 file
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
  // Define a room ID - hardcoded as requested
  const ROOM_ID = '1';
  const roomId = ROOM_ID;
  const searchParams = new URLSearchParams(window.location.search);
  const urlUserId = searchParams.get('userId') || Math.floor(Math.random() * 1e11).toString();
  const userId = urlUserId;
  const generatedId = `${roomId}-${userId}`;

  const robotParam = searchParams.get('avatar'); // Add audio parameter handling

  // const searchParams = new URLSearchParams(window.location.search);

  const peer = useRef(null);
  const connections = useRef({});
  const connectionAttempts = useRef(new Set()); // Track ongoing connection attempts
  const peerState = useRef({}); // Track connection state for each peer
  const [peerId, setPeerId] = useState('');
  const [messageLog, setMessageLog] = useState([]);
  const [peerList, setPeerList] = useState([]);
  const [platform, setPlatform] = useState('desktop');
  const [isConnected, setIsConnected] = useState(false);
  const [roomPeers, setRoomPeers] = useState([]);
  const lastHeartbeats = useRef({});
  const heartbeatInterval = useRef(null);
  const heartbeatCheckInterval = useRef(null);
  const [peerAvatars, setPeerAvatars] = useState({});
  const [roomPeerMap, setRoomPeerMap] = useState({});
  const localStream = useRef(null);
  const mediaConnections = useRef({});
  const validatedPeers = useRef(new Set()); // Track peers that have been validated for room
  const movementTargets = useRef({});
  const animationFrameId = useRef(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [robotPeers, setRobotPeers] = useState({});

  const voiceDetectors = useRef({}); // Add this near your refs at top

  const setupVoiceActivityDetection = (stream, onSpeaking) => {
    if (!stream) return () => {};

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    let speaking = false;
    let lastSpeakingTime = 0;
    const silenceDelay = 1000; // ms before declaring silence

    // Define thresholds
    const noiseThreshold = 200; // below this = ignore noise (no speaking)
    const highVolumeThreshold = 60; // above this = fast flicker

    let flickerInterval = null;

    function updateFlicker(volume) {
      if (flickerInterval) {
        clearInterval(flickerInterval);
        flickerInterval = null;
      }

      let intervalTime = 600; // default slow flicker

      if (volume > highVolumeThreshold) {
        intervalTime = 150; // fast flicker for loud voice
      } else if (volume > noiseThreshold) {
        intervalTime = 400; // medium flicker for moderate voice
      }

      if (volume > noiseThreshold) {
        flickerInterval = setInterval(() => {
          onSpeaking((prev) => !prev); // toggle on/off for flicker effect
        }, intervalTime);
      } else {
        onSpeaking(false);
      }
    }

    function checkVolume() {
      analyser.getByteFrequencyData(dataArray);
      const maxVolume = Math.max(...dataArray);

      if (maxVolume > noiseThreshold) {
        lastSpeakingTime = Date.now();

        if (!speaking) {
          speaking = true;
          onSpeaking(true);
          updateFlicker(maxVolume);
        } else {
          // Update flicker speed dynamically while speaking
          updateFlicker(maxVolume);
        }
      } else if (speaking && Date.now() - lastSpeakingTime > silenceDelay) {
        speaking = false;
        onSpeaking(false);
        if (flickerInterval) {
          clearInterval(flickerInterval);
          flickerInterval = null;
        }
      }

      requestAnimationFrame(checkVolume);
    }

    checkVolume();

    return () => {
      if (flickerInterval) clearInterval(flickerInterval);
      audioCtx.close();
    };
  };

  useEffect(() => {
    const updatePlayerPositions = () => {
      const now = performance.now();

      // Process all pending movements
      Object.entries(movementTargets.current).forEach(([peerId, target]) => {
        const remote = window.remotePlayersRef?.current?.[peerId];
        if (!remote) return;

        // Calculate progress (0 to 1)
        const progress = Math.min(
          (now - target.startTime) / (target.endTime - target.startTime),
          1,
        );

        // Apply easing for smoother movement
        const easedProgress = progress * (2 - progress); // Quadratic ease-out

        if (progress < 1) {
          // Interpolate position
          remote.setPosition(
            target.startPosition.x + (target.position.x - target.startPosition.x) * easedProgress,
            target.startPosition.y + (target.position.y - target.startPosition.y) * easedProgress,
            target.startPosition.z + (target.position.z - target.startPosition.z) * easedProgress,
          );

          // Interpolate rotation (simple approach)
          const startQuat = new pc.Quat().setFromEulerAngles(
            target.startRotation.x,
            target.startRotation.y,
            target.startRotation.z,
          );

          const endQuat = new pc.Quat().setFromEulerAngles(
            target.rotation.x,
            target.rotation.y,
            target.rotation.z,
          );

          const smoothQuat = new pc.Quat();
          smoothQuat.slerp(startQuat, endQuat, easedProgress);

          remote.setRotation(smoothQuat);
        } else {
          // We've reached the target, set final position
          remote.setPosition(target.position.x, target.position.y, target.position.z);
          remote.setEulerAngles(target.rotation.x, target.rotation.y, target.rotation.z);

          // Remove from targets
          delete movementTargets.current[peerId];
        }
      });

      // Continue the animation loop
      animationFrameId.current = requestAnimationFrame(updatePlayerPositions);
    };

    // Start the animation loop
    animationFrameId.current = requestAnimationFrame(updatePlayerPositions);

    // Cleanup on unmount
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, []);
  // Media state refs
  const audioElements = useRef({});
  const [peerAudioStates, setPeerAudioStates] = useState({});
  const peerAudioStreams = useRef({});

  // New video state refs
  const videoElements = useRef({});
  const peerVideoStreams = useRef({});
  const [peerVideoStates, setPeerVideoStates] = useState({});
  // Use the video parameter to determine initial video state
  const getCurrentURLParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const audioParam = urlParams.get('audio');
    const videoParam = urlParams.get('video');

    return {
      audioEnabled: audioParam !== 'disabled',
      videoEnabled: videoParam !== 'disabled',
    };
  };

  // Initialize with current URL params
  const initialParams = getCurrentURLParams();
  const [localVideoEnabled, setLocalVideoEnabled] = useState(initialParams.videoEnabled);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(initialParams.audioEnabled);
  const VIDEO_CONSTRAINTS = {
    width: { min: 320, max: 640, ideal: 320 },
    height: { min: 240, max: 240, ideal: 240 },
    frameRate: {
      ideal: 24,
      min: 24,
      max: 24,
    }, // ideal keeps CPUs cooler; max is the hard cap
    aspectRatio: 1.333333334,
  };
  function enforceVideoProfile(stream) {
    stream
      .getVideoTracks()
      .forEach((track) => track.applyConstraints(VIDEO_CONSTRAINTS).catch(console.warn));
  }

  const logVideoStreamDetails = (stream, streamType = 'local') => {
    const videoTracks = stream.getVideoTracks();

    if (videoTracks.length === 0) {
      console.log(`📹 ${streamType} stream: No video tracks found`);
      return;
    }

    videoTracks.forEach((track, index) => {
      const settings = track.getSettings();
      const capabilities = track.getCapabilities();
      const constraints = track.getConstraints();

      console.log(`📹 ${streamType} Video Track ${index + 1}:`);
      console.log('  Actual Settings:', {
        width: settings.width,
        height: settings.height,
        frameRate: settings.frameRate,
        aspectRatio: settings.aspectRatio,
        facingMode: settings.facingMode,
        deviceId: settings.deviceId,
      });

      console.log('  Applied Constraints:', constraints);

      console.log('  Device Capabilities:', {
        width: capabilities.width,
        height: capabilities.height,
        frameRate: capabilities.frameRate,
        aspectRatio: capabilities.aspectRatio,
      });

      // Check if we got what we requested
      const requestedWidth = VIDEO_CONSTRAINTS.width.ideal;
      const requestedHeight = VIDEO_CONSTRAINTS.height.ideal;
      const requestedFrameRate = VIDEO_CONSTRAINTS.frameRate.ideal;

      if (settings.width !== requestedWidth || settings.height !== requestedHeight) {
        console.warn(
          `⚠️ Resolution mismatch! Requested: ${requestedWidth}x${requestedHeight}, Got: ${settings.width}x${settings.height}`,
        );
      } else {
        console.log(`✅ Got requested resolution: ${settings.width}x${settings.height}`);
      }

      if (Math.abs(settings.frameRate - requestedFrameRate) > 1) {
        console.warn(
          `⚠️ Frame rate mismatch! Requested: ${requestedFrameRate}fps, Got: ${settings.frameRate}fps`,
        );
      } else {
        console.log(`✅ Got requested frame rate: ${settings.frameRate}fps`);
      }
    });
  };

  // Get local media stream with both audio and video
  const getLocalMediaStream = async (videoEnabled = null) => {
    try {
      // If videoEnabled is not provided, get it from current URL
      const currentParams = getCurrentURLParams();
      const shouldEnableVideo = videoEnabled !== null ? videoEnabled : currentParams.videoEnabled;
      const shouldEnableAudio = currentParams.audioEnabled;

      console.log('Getting media stream with:', {
        video: shouldEnableVideo,
        audio: shouldEnableAudio,
      });

      // Request both audio and video, but make video optional
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: shouldEnableAudio,
        video: shouldEnableVideo ? VIDEO_CONSTRAINTS : false,
      });

      if (shouldEnableVideo) {
        // enforceVideoProfile(stream);
        logVideoStreamDetails(stream, 'Local');
      }

      localStream.current = stream;

      // Update local video state
      setLocalVideoEnabled(shouldEnableVideo);

      // Apply current audio state from URL
      stream.getAudioTracks().forEach((track) => {
        track.enabled = shouldEnableAudio;
      });
      setLocalAudioEnabled(shouldEnableAudio);

      return stream;
    } catch (err) {
      console.error('Failed to get media access:', err);

      // If video fails, try with audio only
      const currentParams = getCurrentURLParams();
      const shouldEnableAudio = currentParams.audioEnabled;

      if (videoEnabled !== false) {
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          localStream.current = audioOnlyStream;
          setLocalVideoEnabled(false);

          // Apply current audio state from URL
          audioOnlyStream.getAudioTracks().forEach((track) => {
            track.enabled = shouldEnableAudio;
          });
          setLocalAudioEnabled(shouldEnableAudio);

          return audioOnlyStream;
        } catch (audioErr) {
          console.error('Failed to get audio-only access:', audioErr);
          return null;
        }
      }
      return null;
    }
  };

  const updateRoomPeerMap = (roomId, peerId, action) => {
    setRoomPeerMap((prev) => {
      const currentPeers = prev[roomId] || [];

      let updatedPeers;
      if (action === 'add') {
        updatedPeers = [...new Set([...currentPeers, peerId])]; // Avoid duplicates
      } else if (action === 'remove') {
        updatedPeers = currentPeers.filter((id) => id !== peerId);
      }

      const updatedMap = {
        ...prev,
        [roomId]: updatedPeers,
      };

      // Optional: Log full map for debugging
      console.log('📊 Current Room-Peer Map:', updatedMap);

      return updatedMap;
    });
  };

  // Detect platform
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/iPad|iPhone|iPod/.test(userAgent)) setPlatform('ios');
    else if (/android/i.test(userAgent)) setPlatform('android');
    else setPlatform('desktop');
  }, []);

  // Periodically refresh peer list to discover new peers
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (peer.current && peer.current.id) {
        discoverAndConnect();
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  // Send heartbeats to all connected peers
  useEffect(() => {
    if (!peer.current || !peer.current.id) return;

    // Send heartbeats to all peers
    heartbeatInterval.current = setInterval(() => {
      Object.values(connections.current).forEach((conn) => {
        if (conn && conn.open) {
          try {
            conn.send({
              type: 'heartbeat',
              timestamp: Date.now(),
              senderId: peerId,
              roomId: ROOM_ID, // Include room ID in heartbeat
            });
          } catch (err) {
            console.log('Error sending heartbeat to:', conn.peer);
          }
        }
      });
    }, 3000);

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [peerId]);

  // Check for stale connections (no heartbeat received recently)
  useEffect(() => {
    if (!peer.current || !peer.current.id) return;

    heartbeatCheckInterval.current = setInterval(() => {
      const now = Date.now();
      const staleTimeout = 12000;

      Object.keys(lastHeartbeats.current).forEach((remotePeerId) => {
        const lastBeat = lastHeartbeats.current[remotePeerId];
        if (now - lastBeat > staleTimeout) {
          console.log('🔴 Peer timeout detected:', remotePeerId);

          // Clean up the stale connection
          if (connections.current[remotePeerId]) {
            console.log('Closing stale connection to:', remotePeerId);
            connections.current[remotePeerId].close();
            delete connections.current[remotePeerId];
          }

          // Clean up media elements for this peer
          cleanupPeerMedia(remotePeerId);

          // Remove from tracking
          delete lastHeartbeats.current[remotePeerId];
          delete peerState.current[remotePeerId];
          connectionAttempts.current.delete(remotePeerId);
          validatedPeers.current.delete(remotePeerId);

          // Update the peer list
          setPeerList((prev) => {
            const newList = prev.filter((id) => id !== remotePeerId);
            console.log('Updated peer list after timeout:', newList);
            return newList;
          });
        }
      });
    }, 4000);

    return () => {
      if (heartbeatCheckInterval.current) {
        clearInterval(heartbeatCheckInterval.current);
      }
    };
  }, [peerId]);

  // Handle window beforeunload to notify peers when we're leaving
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Send disconnect messages to all peers
      Object.values(connections.current).forEach((conn) => {
        if (conn && conn.open) {
          try {
            conn.send({
              type: 'disconnect',
              peerId: peerId,
              roomId: ROOM_ID,
              timestamp: Date.now(),
            });
          } catch (err) {
            // Ignore errors during page unload
          }
        }
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Clean up all media elements
      Object.keys({ ...audioElements.current, ...videoElements.current }).forEach(cleanupPeerMedia);
    };
  }, [peerId]);

  // Combined cleanup function for peer audio and video
  const cleanupPeerMedia = (remotePeerId) => {
    // Stop the audio track if it exists
    if (peerAudioStreams.current[remotePeerId]) {
      peerAudioStreams.current[remotePeerId].getTracks().forEach((track) => track.stop());
      delete peerAudioStreams.current[remotePeerId];
    }

    // Remove audio element if it exists
    if (audioElements.current[remotePeerId]) {
      const audio = audioElements.current[remotePeerId];
      audio.srcObject = null;
      audio.remove();
      delete audioElements.current[remotePeerId];
    }

    // Stop the video track if it exists
    if (peerVideoStreams.current[remotePeerId]) {
      peerVideoStreams.current[remotePeerId].getTracks().forEach((track) => track.stop());
      delete peerVideoStreams.current[remotePeerId];
    }

    // Remove video element if it exists
    if (videoElements.current[remotePeerId]) {
      const video = videoElements.current[remotePeerId];
      video.srcObject = null;
      delete videoElements.current[remotePeerId];
    }

    // Update audio states
    setPeerAudioStates((prev) => {
      const newStates = { ...prev };
      delete newStates[remotePeerId];
      return newStates;
    });

    // Update video states
    setPeerVideoStates((prev) => {
      const newStates = { ...prev };
      delete newStates[remotePeerId];
      return newStates;
    });

    // Remove from media connections
    if (mediaConnections.current[remotePeerId]) {
      const call = mediaConnections.current[remotePeerId];
      if (call && typeof call.close === 'function') {
        call.close();
      }
      delete mediaConnections.current[remotePeerId];
    }

    if (voiceDetectors.current[remotePeerId]) {
      voiceDetectors.current[remotePeerId]();
      delete voiceDetectors.current[remotePeerId];
    }
  };

  const [peerNames, setPeerNames] = useState({});
  useEffect(() => {
    // Initialize PeerJS and request media access
    const initializePeer = async () => {
      const currentParams = getCurrentURLParams();
      await getLocalMediaStream(currentParams.videoEnabled);

      // Initialize PeerJS
      const p = new Peer(generatedId, {
        host: 'multiplayer.tenant-7654b5-asrpods.ord1.ingress.coreweave.cloud',
        path: '/',
        secure: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            {
              urls: 'turn:207.53.234.73:80',
              username: 'Coturn',
              credential: 'Exarta@coturn',
            },
          ],
        },
        debug: 0, // Reduce debug level to prevent showing non-critical errors in console
      });

      peer.current = p;

      p.on('open', (id) => {
        console.log('🔌 Connected to PeerJS server with ID:', id);
        setPeerId(id);
        setIsConnected(true);
        const selfAvatar = `https://api.dicebear.com/6.x/fun-emoji/svg?seed=${userId}`;
        const selfName = `Player-${userId}`;
        setPeerAvatars((prev) => ({
          ...prev,
          [id]: selfAvatar,
        }));
        setPeerNames((prev) => ({
          ...prev,
          [id]: selfName,
        }));

        // Wait a moment before connecting to give other peers time to initialize
        setTimeout(() => {
          discoverAndConnect();
        }, 3000);
      });

      p.on('connection', handleIncomingConnection);

      p.on('call', async (call) => {
        try {
          console.log('📞 Incoming call from:', call.peer);

          // IMPORTANT FIX: Only answer calls from peers in the same room
          if (!validatedPeers.current.has(call.peer)) {
            console.log('❌ Rejecting call from non-validated peer:', call.peer);
            call.close();
            return;
          }

          console.log('✅ Answering call from validated peer in same room:', call.peer);

          const stream = localStream.current || (await getLocalMediaStream());
          if (stream) {
            localStream.current = stream;
            call.answer(stream);
          }

          call.on('stream', (remoteStream) => {
            handleRemoteMediaStream(call.peer, remoteStream);
          });

          call.on('close', () => {
            console.log('Call closed with peer:', call.peer);
            cleanupPeerMedia(call.peer);
          });

          call.on('error', () => {
            console.log('Call error with peer:', call.peer);
            cleanupPeerMedia(call.peer);
          });

          mediaConnections.current[call.peer] = call;
        } catch (err) {
          console.error('Failed to answer incoming call:', err);
        }
      });

      p.on('error', (err) => {
        // Completely suppress rendering of common connection errors in the console
        // We handle these internally without logging
      });

      p.on('disconnected', () => {
        console.log('Disconnected from PeerJS server, trying to reconnect...');
        setTimeout(() => p.reconnect(), 3000);
      });
    };

    initializePeer();

    return () => {
      console.log('🧹 Cleaning up peer...');

      // Stop local media stream if it exists
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => {
          track.stop();
        });
        localStream.current = null;
      }

      // Clean up audio and video
      Object.keys({ ...audioElements.current, ...videoElements.current }).forEach(cleanupPeerMedia);

      // Close connections
      Object.values(connections.current).forEach((conn) => {
        if (conn && typeof conn.close === 'function') {
          conn.close();
        }
      });

      // Close media connections
      Object.values(mediaConnections.current).forEach((call) => {
        if (call && typeof call.close === 'function') {
          call.close();
        }
      });

      connectionAttempts.current.clear();
      validatedPeers.current.clear();

      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }

      if (heartbeatCheckInterval.current) {
        clearInterval(heartbeatCheckInterval.current);
      }

      if (peer.current) {
        peer.current.destroy();
      }
      setIsConnected(false);
    };
  }, []);

  // Handle remote media stream with both audio and video
  const handleRemoteMediaStream = (remotePeerId, remoteStream) => {
    console.log('🎵🎥 Received media stream from peer:', remotePeerId);

    // Double-check peer is validated (in same room)
    if (!validatedPeers.current.has(remotePeerId)) {
      console.log('⚠️ Received media from non-validated peer, ignoring:', remotePeerId);
      return;
    }

    logVideoStreamDetails(remoteStream, `Remote (${remotePeerId})`);

    // Process audio track if present
    const audioTracks = remoteStream.getAudioTracks();
    if (audioTracks.length > 0) {
      // Check if audio is enabled by the remote peer
      const isAudioEnabled = audioTracks.some((track) => track.enabled);

      // Create an audio stream with just the audio tracks
      const audioStream = new MediaStream(audioTracks);
      peerAudioStreams.current[remotePeerId] = audioStream;

      // Create an audio element if it doesn't exist
      if (!audioElements.current[remotePeerId]) {
        const audio = new Audio();
        audio.autoplay = true;
        audio.muted = false; // Start unmuted
        audio.srcObject = audioStream;
        audioElements.current[remotePeerId] = audio;

        // Initialize with the enabled state based on the tracks
        setPeerAudioStates((prev) => ({
          ...prev,
          [remotePeerId]: { muted: false, enabled: isAudioEnabled, speaking: false },
        }));

        audio.onloadedmetadata = () => {
          audio.play().catch((err) => {
            console.warn('🔇 Audio play failed after metadata loaded:', remotePeerId, err);
          });
        };
      } else {
        // Update existing audio element with new stream
        audioElements.current[remotePeerId].srcObject = audioStream;

        // Update the audio state
        setPeerAudioStates((prev) => ({
          ...prev,
          [remotePeerId]: { ...prev[remotePeerId], enabled: isAudioEnabled },
        }));
      }

      // Setup voice activity detection for speaking indicator
      // Cleanup existing detector if any
      if (voiceDetectors.current[remotePeerId]) {
        voiceDetectors.current[remotePeerId](); // stop previous detector
      }
      voiceDetectors.current[remotePeerId] = setupVoiceActivityDetection(
        audioStream,
        (isSpeaking) => {
          setPeerAudioStates((prev) => ({
            ...prev,
            [remotePeerId]: {
              ...prev[remotePeerId],
              speaking: isSpeaking,
            },
          }));
        },
      );
    } else {
      // No audio tracks present
      setPeerAudioStates((prev) => ({
        ...prev,
        [remotePeerId]: { muted: false, enabled: false, speaking: false },
      }));

      // Cleanup VAD if any
      if (voiceDetectors.current[remotePeerId]) {
        voiceDetectors.current[remotePeerId]();
        delete voiceDetectors.current[remotePeerId];
      }
    }

    // Process video tracks if present
    const videoTracks = remoteStream.getVideoTracks();
    if (videoTracks.length > 0) {
      // Check if video tracks are actually enabled (not just present)
      const isVideoEnabled = videoTracks.some((track) => track.enabled);

      // Create a video stream with just the video tracks
      const videoStream = new MediaStream(videoTracks);
      peerVideoStreams.current[remotePeerId] = videoStream;

      // Update the video state based on track enabled state
      setPeerVideoStates((prev) => ({
        ...prev,
        [remotePeerId]: { enabled: isVideoEnabled },
      }));
    } else {
      // No video track? Mark video as disabled
      setPeerVideoStates((prev) => ({
        ...prev,
        [remotePeerId]: { enabled: false },
      }));
    }
  };

  const handleIncomingConnection = (conn) => {
    console.log('📥 Incoming connection from:', conn.peer);

    // Check if we already have a connection with this peer
    if (connections.current[conn.peer] && connections.current[conn.peer].open) {
      // If a connection already exists and is open, close the new one to avoid conflicts
      console.log('Connection already exists, avoiding duplicate:', conn.peer);
      return;
    }

    // Check if we're already trying to connect
    if (connectionAttempts.current.has(conn.peer)) {
      // Implement a coordination mechanism based on peer ID to prevent collisions
      // The peer with the lower ID will be the one to initiate the connection
      const shouldAccept = peerId < conn.peer;

      if (!shouldAccept) {
        console.log(
          'Connection coordination - waiting for peer to connect to us instead:',
          conn.peer,
        );
        return;
      }
    }

    // Track the connection state for this peer
    peerState.current[conn.peer] = 'connecting';

    // Set up the connection
    conn.on('open', () => {
      // Send room metadata to check if we're in the same room
      conn.send({
        type: 'room-metadata',
        roomId: ROOM_ID,
      });

      // Listen for the room metadata response
      conn.once('data', (data) => {
        try {
          // Check if the peer is in our room
          if (
            typeof data === 'object' &&
            data.type === 'room-metadata' &&
            data.roomId === ROOM_ID
          ) {
            console.log('✅ Peer is in our room:', conn.peer);
            updateRoomPeerMap(ROOM_ID, conn.peer, 'add');

            // Mark peer as validated for media
            validatedPeers.current.add(conn.peer);

            setupConnection(conn);

            // Confirm we're in the same room
            if (!data.accept) {
              conn.send({
                type: 'room-metadata',
                roomId: ROOM_ID,
                accept: true,
              });
            }
          } else {
            // Not in our room, close the connection
            console.log('❌ Peer is not in our room, closing connection:', conn.peer);
            conn.close();
            delete peerState.current[conn.peer];
          }
        } catch (err) {
          // Connection error, clean up
          conn.close();
          delete peerState.current[conn.peer];
        }
      });
    });

    // Handle connection errors
    conn.on('error', () => {
      delete peerState.current[conn.peer];
    });
  };

  // Start media call (audio + video) only after room validation
  const startMediaCall = (remotePeerId) => {
    console.log('🎤🎥 Starting media call with validated peer:', remotePeerId);

    if (!validatedPeers.current.has(remotePeerId)) {
      console.log('⚠️ Not starting media call - peer not validated:', remotePeerId);
      return;
    }

    // Ensure we have a media stream
    if (localStream.current && peer.current) {
      const call = peer.current.call(remotePeerId, localStream.current);
      mediaConnections.current[remotePeerId] = call;

      call.on('stream', (remoteStream) => {
        handleRemoteMediaStream(remotePeerId, remoteStream);
      });

      call.on('close', () => {
        console.log('Call closed with peer:', remotePeerId);
        cleanupPeerMedia(remotePeerId);
      });

      call.on('error', () => {
        console.log('Call error with peer:', remotePeerId);
        cleanupPeerMedia(remotePeerId);
      });
    } else {
      getLocalMediaStream().then((stream) => {
        if (stream && peer.current) {
          localStream.current = stream;
          const call = peer.current.call(remotePeerId, stream);
          mediaConnections.current[remotePeerId] = call;

          call.on('stream', (remoteStream) => {
            handleRemoteMediaStream(remotePeerId, remoteStream);
          });

          call.on('close', () => {
            console.log('Call closed with peer:', remotePeerId);
            cleanupPeerMedia(remotePeerId);
          });

          call.on('error', () => {
            console.log('Call error with peer:', remotePeerId);
            cleanupPeerMedia(remotePeerId);
          });
        }
      });
    }
  };

  // Inside setupConnection(conn) function, defer connection handling until avatar/name fetched

  const setupConnection = (conn) => {
    // Avoid duplicate connections
    if (connections.current[conn.peer] && connections.current[conn.peer].open) {
      connections.current[conn.peer].close();
    }

    connectionAttempts.current.delete(conn.peer);
    peerState.current[conn.peer] = 'connected';
    connections.current[conn.peer] = conn;
    lastHeartbeats.current[conn.peer] = Date.now();

    setPeerList((prev) => {
      if (!prev.includes(conn.peer)) {
        return [...prev, conn.peer];
      }
      return prev;
    });

    // Notify the new peer about our current video and audio state as soon as we connect
    conn.send({
      type: 'video-state-change',
      enabled: localVideoEnabled,
      peerId,
    });

    conn.send({
      type: 'audio-state-change',
      enabled: localAudioEnabled,
      peerId,
    });
    conn.send({
      type: 'avatar-param',
      robot: robotParam,
      peerId,
    });

    startMediaCall(conn.peer);

    const parts = conn.peer.split('-');
    const remoteUserId = parts[1]; // 👈 Extract the userId (between roomId and peer suffix)

    const avatarUrl = `https://api.dicebear.com/6.x/fun-emoji/svg?seed=${remoteUserId}`;
    const peerName = `Player-${remoteUserId}`;

    setPeerAvatars((prev) => ({
      ...prev,
      [conn.peer]: avatarUrl,
    }));

    setPeerNames((prev) => ({
      ...prev,
      [conn.peer]: peerName,
    }));

    updateRoomPeerMap(ROOM_ID, conn.peer, 'add');

    conn.on('data', (data) => {
      // Handle heartbeat messages
      if (typeof data === 'object' && data.type === 'heartbeat') {
        // Check if the heartbeat has the same roomId
        if (data.roomId && data.roomId !== ROOM_ID) {
          console.log('⚠️ Received heartbeat from different room, closing connection:', conn.peer);
          // Clean up connection
          if (connections.current[conn.peer]) {
            connections.current[conn.peer].close();
            delete connections.current[conn.peer];
          }
          // Clean up media
          cleanupPeerMedia(conn.peer);
          // Remove from tracking
          delete lastHeartbeats.current[conn.peer];
          delete peerState.current[conn.peer];
          connectionAttempts.current.delete(conn.peer);
          validatedPeers.current.delete(conn.peer);
          // Update peer list
          setPeerList((prev) => prev.filter((id) => id !== conn.peer));
          return;
        }

        // Update last heartbeat time for this peer
        lastHeartbeats.current[conn.peer] = Date.now();
        // Don't add heartbeats to message log
        return;
      }

      if (typeof data === 'object' && data.type === 'avatar-param') {
        console.log('ROBOTS - received from peer:', conn.peer, 'robot value:', data.robot);
        setRobotPeers((prev) => ({
          ...prev,
          [conn.peer]: {
            // ✅ Use conn.peer instead of data.peerId
            ...prev[conn.peer],
            robot: data.robot || `https://api.dicrebear.com/6.x/fun-emoji/svg?seed=${conn.peer}`,
          },
        }));
        return;
      }

      // Handle explicit disconnect messages
      if (typeof data === 'object' && data.type === 'disconnect') {
        console.log('👋 Peer explicitly disconnected:', conn.peer);
        updateRoomPeerMap(data.roomId || ROOM_ID, conn.peer, 'remove');

        // Clean up connection
        if (connections.current[conn.peer]) {
          connections.current[conn.peer].close();
          delete connections.current[conn.peer];
        }

        // Clean up media for this peer
        cleanupPeerMedia(conn.peer);

        // Remove from tracking
        delete lastHeartbeats.current[conn.peer];
        delete peerState.current[conn.peer];
        connectionAttempts.current.delete(conn.peer);
        validatedPeers.current.delete(conn.peer);

        // Update peer list
        setPeerList((prev) => prev.filter((id) => id !== conn.peer));
        setRobotPeers((prev) => {
          const next = { ...prev };
          delete next[conn.peer];
          return next;
        });
        return;
      }

      // Handle video state change messages
      if (typeof data === 'object' && data.type === 'video-state-change') {
        console.log('📹 Video state change from peer:', conn.peer, data.enabled);

        // Update our knowledge of the peer's video state
        setPeerVideoStates((prev) => ({
          ...prev,
          [conn.peer]: { enabled: data.enabled },
        }));

        return;
      }

      // Handle audio state change messages
      if (typeof data === 'object' && data.type === 'audio-state-change') {
        console.log('🎤 Audio state change from peer:', conn.peer, data.enabled);

        // Update our knowledge of the peer's audio state
        setPeerAudioStates((prev) => ({
          ...prev,
          [conn.peer]: { ...prev[conn.peer], enabled: data.enabled },
        }));

        return;
      }

      // Skip metadata messages for display
      if (typeof data === 'object' && data.type === 'room-metadata') {
        if (data.accept) {
          const roomId = data.roomId;

          // Only accept if the room ID matches
          if (roomId === ROOM_ID) {
            updateRoomPeerMap(roomId, conn.peer, 'add');
            validatedPeers.current.add(conn.peer);
          } else {
            console.log('⚠️ Received room acceptance from different room, ignoring:', conn.peer);
          }
        }
        return;
      }

      if (typeof data === 'object' && data.type === 'player-update') {
        const { peerId: remoteId, position, rotation } = data;
        const remote = window.remotePlayersRef?.current?.[remoteId];

        if (remote) {
          // Get current values - handle both PC.Vec3 and regular objects
          const currentPosition = remote.getPosition();
          const currentRotation = remote.getEulerAngles();

          // Store the target position/rotation
          movementTargets.current[remoteId] = {
            position: position,
            rotation: rotation,
            startPosition: {
              x: currentPosition.x || currentPosition.x,
              y: currentPosition.y || currentPosition.y,
              z: currentPosition.z || currentPosition.z,
            },
            startRotation: {
              x: currentRotation.x || currentRotation.x,
              y: currentRotation.y || currentRotation.y,
              z: currentRotation.z || currentRotation.z,
            },
            startTime: performance.now(),
            endTime: performance.now() + 120, // 120ms interpolation time (adjust as needed)
          };
        }
        return;
      }

      // Handle regular messages
      console.log('📨 Message from', conn.peer, ':', data);
      setMessageLog((prev) => [...prev, `${conn.peer}: ${data}`]);
      if (!window.chatOpened) {
        setHasUnreadMessages(true); // ✅ New unread message
        playMessageNotification(); // 🔊 Play notification sound
      }
    });

    conn.on('close', () => {
      console.log('❌ Connection closed:', conn.peer);
      updateRoomPeerMap(ROOM_ID, conn.peer, 'remove');

      // Clean up media for this peer
      cleanupPeerMedia(conn.peer);
      if (movementTargets.current[conn.peer]) {
        delete movementTargets.current[conn.peer];
      }

      delete connections.current[conn.peer];
      delete lastHeartbeats.current[conn.peer];
      delete peerState.current[conn.peer];
      connectionAttempts.current.delete(conn.peer);
      validatedPeers.current.delete(conn.peer);

      // Force peer list update on connection close
      setPeerList((prev) => {
        const newList = prev.filter((id) => id !== conn.peer);
        console.log('Updated peer list after connection close:', newList);
        return newList;
      });
      setRobotPeers((prev) => {
        const next = { ...prev };
        delete next[conn.peer];
        return next;
      });
    });

    conn.on('error', (err) => {
      console.log('Connection error with peer:', conn.peer, err.type || err);
      updateRoomPeerMap(ROOM_ID, conn.peer, 'remove');

      // Clean up media for this peer
      cleanupPeerMedia(conn.peer);

      delete connections.current[conn.peer];
      delete lastHeartbeats.current[conn.peer];
      delete peerState.current[conn.peer];
      connectionAttempts.current.delete(conn.peer);
      validatedPeers.current.delete(conn.peer);

      // Force peer list update on connection error
      setPeerList((prev) => {
        const newList = prev.filter((id) => id !== conn.peer);
        console.log('Updated peer list after connection error:', newList);
        return newList;
      });
    });
  };

  const connectToPeer = (id) => {
    if (
      id === peerId ||
      connections.current[id] ||
      connectionAttempts.current.has(id) ||
      peerState.current[id]
    ) {
      return;
    }

    // Implement connection coordination based on peer ID comparison
    // The peer with the lower ID will be the one to initiate the connection
    if (peerId > id) {
      console.log('📋 Connection coordination - waiting for peer to connect to us', id);
      return;
    }

    console.log('🔗 Connecting to peer:', id);
    connectionAttempts.current.add(id);
    peerState.current[id] = 'connecting';

    try {
      const conn = peer.current.connect(id, {
        reliable: true,
        serialization: 'json',
      });

      // Set timeout to clean up connection attempt if it doesn't succeed
      const connectionTimeout = setTimeout(() => {
        if (!connections.current[id]) {
          connectionAttempts.current.delete(id);
          delete peerState.current[id];
          if (conn && typeof conn.close === 'function') {
            conn.close();
          }
        }
      }, 10000);

      conn.on('open', () => {
        clearTimeout(connectionTimeout);
        console.log('✅ Connected to peer:', id);

        // Send room metadata as soon as the connection opens
        conn.send({
          type: 'room-metadata',
          roomId: ROOM_ID,
        });

        // Setup connection handling
        setupConnection(conn);
      });

      conn.on('error', (err) => {
        console.log('Error connecting to peer:', id);
        clearTimeout(connectionTimeout);
        connectionAttempts.current.delete(id);
        delete peerState.current[id];

        // Ensure peer is removed from lists
        setPeerList((prev) => prev.filter((peerId) => peerId !== id));
      });
    } catch (err) {
      console.log('Failed to connect to peer:', id);
      connectionAttempts.current.delete(id);
      delete peerState.current[id];
    }
  };

  const discoverAndConnect = async () => {
    if (!peer.current || !peer.current.id) return;

    try {
      const res = await fetch(
        'https://multiplayer.tenant-7654b5-asrpods.ord1.ingress.coreweave.cloud/peerjs/peers',
      );
      const peers = await res.json();

      setGlobalPeers(peers);

      // 🧠 Filter only peers for this room
      const roomPeers = peers.filter((id) => id.startsWith(ROOM_ID));

      // 🚫 Max peer limit check (exclude yourself)
      const currentPeerCount = roomPeers.includes(peer.current.id)
        ? roomPeers.length
        : roomPeers.length + 1;

      if (currentPeerCount > 5) {
        console.warn('❌ Room is full. Redirecting...');
        window.location.href = '/no-more-joins';
        return;
      }

      // 🔗 Connect to others if under the limit
      roomPeers.forEach((id) => {
        if (
          id !== peerId &&
          !connections.current[id] &&
          !connectionAttempts.current.has(id) &&
          !peerState.current[id]
        ) {
          connectToPeer(id);
        }
      });

      // Check for stale peers that are in our list but not in discovered peers
      setPeerList((currentList) => {
        const activePeers = [...peers, peerId];
        const stalePeers = currentList.filter((id) => !activePeers.includes(id));

        if (stalePeers.length > 0) {
          console.log('Found stale peers, removing:', stalePeers);

          // Clean up any connections to stale peers
          stalePeers.forEach((id) => {
            if (connections.current[id]) {
              connections.current[id].close();
              delete connections.current[id];
            }

            // Clean up media for stale peers
            cleanupPeerMedia(id);

            delete lastHeartbeats.current[id];
            delete peerState.current[id];
            validatedPeers.current.delete(id);
          });

          return currentList.filter((id) => !stalePeers.includes(id));
        }

        return currentList;
      });
    } catch (err) {
      console.error('Failed to discover peers:', err);
    }
  };

  const sendMessage = (msg) => {
    // Ensure we are connected to peers before sending
    if (Object.keys(connections.current).length === 0) {
      discoverAndConnect();
    }

    // Count successful sends
    let sentCount = 0;

    Object.values(connections.current).forEach((conn) => {
      if (conn && conn.open) {
        try {
          conn.send(msg);
          sentCount++;
        } catch (err) {
          // Silent fail, already handling disconnections elsewhere
        }
      }
    });

    // Only log user messages (strings), not objects like player updates
    if (typeof msg === 'string') {
      setMessageLog((prev) => [...prev, `Me: ${msg}`]);
    }

    if (sentCount === 0 && Object.keys(connections.current).length > 0) {
      console.warn('Message not sent to any peers. Attempting to reconnect...');
      discoverAndConnect();
    }
  };

  // Make periodic active checks of connection status to ensure UI is updated
  useEffect(() => {
    if (!peerId) return;

    const checkConnectionsInterval = setInterval(() => {
      // Force update the peer list based on actual open connections
      const activeConnections = Object.entries(connections.current)
        .filter(([_, conn]) => conn && conn.open)
        .map(([id]) => id);

      setPeerList((prev) => {
        // Only update if there's a difference
        if (
          prev.length !== activeConnections.length ||
          !prev.every((id) => activeConnections.includes(id))
        ) {
          console.log('Updating peer list from active check:', activeConnections);
          return activeConnections;
        }
        return prev;
      });
    }, 8000);

    return () => clearInterval(checkConnectionsInterval);
  }, [peerId]);

  // Audio control functions for local user
  const muteMicrophone = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => (track.enabled = false));
      setLocalAudioEnabled(false);

      // Notify all peers about audio state change
      Object.values(connections.current).forEach((conn) => {
        if (conn && conn.open) {
          conn.send({
            type: 'audio-state-change',
            enabled: false,
            peerId,
          });
        }
      });
    }
  };

  const unmuteMicrophone = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach((track) => (track.enabled = true));
      setLocalAudioEnabled(true);

      // Notify all peers about audio state change
      Object.values(connections.current).forEach((conn) => {
        if (conn && conn.open) {
          conn.send({
            type: 'audio-state-change',
            enabled: true,
            peerId,
          });
        }
      });
    }
  };

  const toggleMicrophone = () => {
    if (localAudioEnabled) {
      muteMicrophone();
      setLocalAudioEnabled(false);
    } else {
      unmuteMicrophone();
      setLocalAudioEnabled(true);
    }
  };

  // Video control functions for local user
  const toggleLocalVideo = async () => {
    try {
      const currentParams = getCurrentURLParams();
      const newVideoState = !currentParams.videoEnabled; // Use URL state, not React state

      // If video is currently enabled, disable it
      if (currentParams.videoEnabled) {
        if (localStream.current) {
          // Disable all video tracks
          localStream.current.getVideoTracks().forEach((track) => {
            track.enabled = false;
            track.stop(); // Actually stop the track to turn off camera
          });
        }
        setLocalVideoEnabled(false);

        // Notify all peers about video state change
        Object.values(connections.current).forEach((conn) => {
          if (conn && conn.open) {
            conn.send({
              type: 'video-state-change',
              enabled: false,
              peerId,
            });
          }
        });
      }
      // If video is currently disabled, enable it
      else {
        // Get a new stream with video
        const newStream = await getLocalMediaStream(true);
        // if (newStream) enforceVideoProfile(newStream);

        if (newStream) {
          // If we have existing audio tracks, add them to the new stream
          if (localStream.current) {
            const audioTracks = localStream.current.getAudioTracks();
            audioTracks.forEach((track) => {
              if (!newStream.getAudioTracks().includes(track)) {
                newStream.addTrack(track);
              }
            });
          }

          // Replace all existing media connections with the new stream
          Object.keys(mediaConnections.current).forEach((remotePeerId) => {
            // Close existing call
            if (mediaConnections.current[remotePeerId]) {
              mediaConnections.current[remotePeerId].close();
            }

            // Create new call with the updated stream
            if (peer.current && validatedPeers.current.has(remotePeerId)) {
              const call = peer.current.call(remotePeerId, newStream);
              mediaConnections.current[remotePeerId] = call;

              call.on('stream', (remoteStream) => {
                handleRemoteMediaStream(remotePeerId, remoteStream);
              });
            }
          });

          localStream.current = newStream;
          setLocalVideoEnabled(true);

          // Notify all peers about video state change
          Object.values(connections.current).forEach((conn) => {
            if (conn && conn.open) {
              conn.send({
                type: 'video-state-change',
                enabled: true,
                peerId,
              });
            }
          });
        }
      }

      // Update URL
    } catch (err) {
      console.error('Error toggling video:', err);
    }
  };
  // Functions to control remote peer audio
  const mutePeerAudio = (remotePeerId) => {
    console.log('Muting peer audio:', remotePeerId);

    if (audioElements.current[remotePeerId]) {
      audioElements.current[remotePeerId].muted = true;

      // Update the state
      setPeerAudioStates((prev) => ({
        ...prev,
        [remotePeerId]: { ...prev[remotePeerId], muted: true },
      }));
    }
  };

  const unmutePeerAudio = (remotePeerId) => {
    console.log('Unmuting peer audio:', remotePeerId);

    if (audioElements.current[remotePeerId]) {
      audioElements.current[remotePeerId].muted = false;

      // Try to play the audio if it's not already playing
      audioElements.current[remotePeerId].play().catch((err) => {
        console.warn('Failed to play audio after unmuting', err);
      });

      // Update the state
      setPeerAudioStates((prev) => ({
        ...prev,
        [remotePeerId]: { ...prev[remotePeerId], muted: false },
      }));
    }
  };

  const togglePeerAudio = (remotePeerId) => {
    const audioElement = audioElements.current[remotePeerId];
    const currentState = peerAudioStates[remotePeerId]?.muted || false;

    if (audioElement) {
      if (currentState) {
        unmutePeerAudio(remotePeerId);
      } else {
        mutePeerAudio(remotePeerId);
      }
    }
  };

  // Check if a peer is muted
  const isPeerMuted = (remotePeerId) => {
    return peerAudioStates[remotePeerId]?.muted || false;
  };

  // Check if peer has audio enabled (from their end)
  const isPeerAudioEnabled = (remotePeerId) => {
    return peerAudioStates[remotePeerId]?.enabled || false;
  };

  // Check if a peer has video enabled
  const isPeerVideoEnabled = (remotePeerId) => {
    return peerVideoStates[remotePeerId]?.enabled || false;
  };

  // Create a video element for a specific peer
  const createVideoElement = (remotePeerId) => {
    // If this peer has a video stream, we'll create a video element
    if (peerVideoStreams.current[remotePeerId]) {
      const videoRef = document.createElement('video');
      videoRef.autoplay = true;
      videoRef.playsInline = true;
      videoRef.muted = true; // Mute the video element (audio is handled separately)
      videoRef.srcObject = peerVideoStreams.current[remotePeerId];

      // Store the video element reference
      videoElements.current[remotePeerId] = videoRef;

      return videoRef;
    }

    return null;
  };

  // Get the video element for a specific peer
  const getPeerVideoElement = (remotePeerId) => {
    // If we already have a video element, return it
    if (videoElements.current[remotePeerId]) {
      return videoElements.current[remotePeerId];
    }

    // If not, try to create one
    return createVideoElement(remotePeerId);
  };

  return (
    <PeerContext.Provider
      value={{
        peerId,
        peerList,
        messageLog,
        sendMessage,
        platform,
        isConnected,
        roomId: ROOM_ID,
        peerAvatars,
        roomPeerMap,
        // Local audio controls
        muteMicrophone,
        unmuteMicrophone,
        toggleMicrophone,
        localAudioEnabled,
        // Local video controls
        localVideoEnabled,
        toggleLocalVideo,
        // Remote peer audio controls
        mutePeerAudio,
        unmutePeerAudio,
        togglePeerAudio,
        isPeerMuted,
        isPeerAudioEnabled,
        peerAudioStates,
        // Remote peer video controls
        isPeerVideoEnabled,
        peerVideoStates,
        // Video element handling
        getPeerVideoElement,
        createVideoElement,
        // Video streams
        peerVideoStreams: peerVideoStreams.current,
        hasUnreadMessages,
        setHasUnreadMessages,
        peerNames,
        robotPeers,
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export default PeerProvider;
