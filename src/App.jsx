import React, { useEffect, useState, useRef } from 'react';
import { PeerProvider } from './components/Peer';
import Pods from './pages/pods';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
  Navigate,
} from 'react-router-dom';
import AvatarSelection from './components/AvatarSelection';
import AudioVideo from './components/AudioVideo';
import PortraitLock from './components/LandScapeLock';
import Alreadyjoined from './components/AlreadyJoined';

function AppRouter() {
  const location = useLocation();
  const navigate = useNavigate();
  const [podsProps, setPodsProps] = useState(null);
  const initializedRef = useRef(false);

  const searchParams = new URLSearchParams(location.search);
  const avatarChosen = searchParams.get('avatar');
  const audioSet = searchParams.get('audio');
  const vidSet = searchParams.get('video');
  let userId = searchParams.get('userId');

  // Only run these effects for the home route
  const isHomeRoute = location.pathname === '/';

  // Step 1: Append userId to URL if not present (only for home route)
  useEffect(() => {
    if (!isHomeRoute) return;

    if (!userId && !initializedRef.current) {
      initializedRef.current = true;
      const newUserId = Math.floor(Math.random() * 1e11).toString();
      searchParams.set('userId', newUserId);
      navigate({ pathname: '/', search: searchParams.toString() }, { replace: true });
    }
  }, [userId, navigate, searchParams, isHomeRoute]);

  // Step 2: Load pod data (only for home route)
  useEffect(() => {
    if (!isHomeRoute) return;

    const eventId = 21692442212;
    const postId = 163521764;
    userId = searchParams.get('userId');

    if (!userId) return;

    window.eventId = eventId;
    window.postId = postId;
    window.userId = userId;

    const fetchData = async () => {
      try {
        const postRes = await fetch(`${import.meta.env.VITE_LINK}/api/posts/${postId}`);
        const postData = await postRes.json();

        const podRes = await fetch(`${import.meta.env.VITE_LINK}/api/pods/${postData.podId}`);
        const podData = await podRes.json();

        setPodsProps({
          podData,
          glbFile: podData.podSettingsGlobal.podGlbUrl,
          skyboxFile: podData.podSettingsGlobal.skyboxUrl,
          postAssets: postData,
          Ids: postData,
          isPost: true,
          editMode: false,
          isHost: false,
        });
      } catch (error) {
        console.error('Error fetching pod data:', error);
      }
    };

    fetchData();
  }, [location.search, isHomeRoute]);

  // Only block rendering if we're on home route and don't have props yet
  if (isHomeRoute && !podsProps) return null;

  return (
    <Routes>
      <Route path='/no-more-joins' element={<Alreadyjoined />} />
      <Route path='/audio-video' element={<AudioVideo />} />
      <Route
        path='/'
        element={
          !avatarChosen ? (
            <AvatarSelection />
          ) : !audioSet || !vidSet ? (
            <Navigate to={`/audio-video${location.search}`} />
          ) : (
            <PeerProvider>
              <Pods {...podsProps} />
            </PeerProvider>
          )
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <PortraitLock>
      <Router>
        <AppRouter />
      </Router>
    </PortraitLock>
  );
}
