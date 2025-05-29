// import React, { useEffect } from 'react';
// import axios from 'axios';

// window.eventId = 21692442212;
// window.hostId = 19944102672;
// window.userId = 19944102672;
// window.postId = 686392238;

// export default function AppContent({ onValidate }) {
//   const preventMultipleTabs = (userId, eventId) => {
//     const key = `event_${eventId}_user_${userId}`;
//     if (localStorage.getItem(key)) {
//       return false;
//     } else {
//       localStorage.setItem(key, 'joined');
//       window.addEventListener('beforeunload', () => {
//         localStorage.removeItem(key);
//       });
//       return true;
//     }
//   };

//   useEffect(() => {
//     const runValidation = async () => {
//       const searchParams = new URLSearchParams(window.location.search);
//       const userId = searchParams.get('userId');
//       const hostId = searchParams.get('hostId');
//       const eventId = searchParams.get('eventId');
//       const podIdParam = searchParams.get('podId');

//       const roomId = `${eventId}-${hostId}`;
//       const generatedHostId = `${roomId}-${hostId}`;
//       const generatedUserId = `${roomId}-${userId}`;

//       if (!userId || !hostId || !eventId) {
//         console.error('❌ Missing query params');
//         onValidate(false);
//         return;
//       }

//       try {
//         const peerListRes = await fetch(
//           'https://multiplayer.tenant-7654b5-asrpods.ord1.ingress.coreweave.cloud/peerjs/peers',
//         );
//         const activePeers = await peerListRes.json();
//         console.log('🔍 Active Peers:', activePeers);

//         if (activePeers.includes(generatedUserId)) {
//           console.warn('🚫 User is already in the meeting. Redirecting...');
//           window.location.href = '/already-joined';
//           return;
//         }
//       } catch (err) {
//         console.error('❌ Failed to fetch peer list:', err);
//         onValidate(false);
//         return;
//       }

//       try {
//         const res = await fetch(
//           `https://amjad-pod-backend.tenant-7654b5-asrpods.ord1.ingress.coreweave.cloud/api/users/event/${hostId}/${eventId}`,
//         );

//         // const event = await res.json();
//         if (!res.ok) {
//           console.warn(`⚠️  Event fetch failed: ${res.status} ${res.statusText}`);
//           // If the reason is “expired”, skip straight to /time-up
//           if (res.status === 410) {
//             // <- example status
//             window.location.replace('/time-up');
//             return;
//           }
//           onValidate(false);
//           return;
//         }

//         const event = await res.json().catch(() => null);
//         if (!event) {
//           console.warn('⚠️  No JSON returned – maybe event expired');
//           window.location.replace('/time-up');
//           return;
//         }
//         // Build an ISO-8601 timestamp trimmed to seconds
//         const [, ts] = event.eventStatus.split('-'); // ["started", "1747728798"]
//         window.eventStartedTime = Number(ts); // => 1747728798

//         const elapsed = Math.floor(Date.now() / 1000) - window.eventStartedTime;
//         if (elapsed >= 3600) {
//           console.warn('🕛 Event exceeded 1-hour limit - redirecting.');
//           window.location.replace('/time-up'); // stops the flow for everyone
//           return; // never reach onValidate()
//         }
//         console.log('📄 Event data fetched:', event);

//         const isHost = String(hostId) === String(userId);

//         if (!event) {
//           console.warn('⚠️ Event not found.');
//           onValidate(false);
//           return;
//         }

//         if (event.eventStatus === 'pending') {
//           console.warn('🚫 Event is still pending. No access allowed.');
//           onValidate(false);
//           return;
//         }

//         if (event.eventStatus === 'finished') {
//           console.warn('🚫 Event has already finished.');
//           window.location.replace('/time-up');
//           return;
//         }

//         const invitees = event.guests.map((g) => String(g.userId));

//         if (isHost) {
//           console.log('👑 User is the host.');
//         } else if (!invitees.includes(String(userId))) {
//           console.warn('🚫 User is not invited.');
//           onValidate(false);
//           return;
//         } else if (!preventMultipleTabs(userId, eventId)) {
//           console.warn('🚫 Already joined from another tab.');
//           onValidate(false);
//           return;
//         }

//         const postId = event.postId;

//         if (postId) {
//           const postRes = await axios.get(`${import.meta.env.VITE_LINK}/api/posts/${postId}`);
//           const postData = postRes.data;
//           console.log('📦 Post data fetched:', postData);

//           const podId = postData.podId;
//           const podRes = await axios.get(`${import.meta.env.VITE_LINK}/api/pods/${podId}`);
//           const podData = podRes.data;
//           console.log('🔧 Pod data loaded:', podData);

//           onValidate(true, {
//             podData,
//             glbFile: podData.podSettingsGlobal.podGlbUrl,
//             skyboxFile: podData.podSettingsGlobal.skyboxUrl,
//             postAssets: postData,
//             Ids: postData,
//             isPost: true,
//             editMode: false,
//             isHost,
//           });
//         } else if (podIdParam) {
//           const podRes = await axios.get(`${import.meta.env.VITE_LINK}/api/pods/${podIdParam}`);
//           const podData = podRes.data;
//           console.log('🔧 Pod data loaded (no post):', podData);

//           onValidate(true, {
//             podData,
//             glbFile: podData.podSettingsGlobal.podGlbUrl,
//             skyboxFile: podData.podSettingsGlobal.skyboxUrl,
//             postAssets: null,
//             Ids: null,
//             isPost: false,
//             editMode: false,
//             isHost,
//           });
//         } else {
//           console.warn('⚠️ Neither postId nor podId provided.');
//           onValidate(false);
//         }
//       } catch (err) {
//         console.error('❌ Error during validation:', err);
//         onValidate(false);
//       }
//     };

//     runValidation();
//   }, [onValidate]);

//   return null;
// }
