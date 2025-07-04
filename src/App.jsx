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

// Hardcoded pod data
const HARDCODED_POD_DATA = {
  "podId": 4519,
  "podName": "ArabesqueCourtyard101",
  "podDescription": "ArabesqueCourtyard101 Pod",
  "podDisplayImage": "https://object.ord1.coreweave.com/pods-bucket/pods/ArabesqueCourtyard101/render.jpg",
  "podTags": [
    "tag1",
    "tag2",
    "tag3"
  ],
  "podSettingsGlobal": {
    "podGlbUrl": "https://object.ord1.coreweave.com/pods-bucket/pods/ArabesqueCourtyard101/model.glb",
    "skyboxUrl": "https://object.ord1.coreweave.com/pods-bucket/pods/ArabesqueCourtyard101/skybox.dds",
    "floorCubemapUrl": "https://object.ord1.coreweave.com/pods-bucket/pods/ArabesqueCourtyard101/cubemap.dds",
    "defaultCameraSettingsSimple": {
      "fov": 75,
      "nearClip": 0.1,
      "farClip": 1000,
      "position": {
        "x": 0,
        "y": 0,
        "z": 0
      },
      "rotation": {
        "x": 0,
        "y": 0,
        "z": 0
      }
    },
    "defaultCameraSettingsFps": {
      "fov": 75,
      "nearClip": 0.1,
      "farClip": 1000,
      "position": {
        "x": 0,
        "y": 0.8,
        "z": -0.5
      },
      "rotation": {
        "x": 0,
        "y": 0,
        "z": 0
      }
    }
  }
};

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

  // Step 2: Set hardcoded pod data (only for home route)
  useEffect(() => {
    if (!isHomeRoute) return;

   
    userId = searchParams.get('userId');

    if (!userId) return;

    
    window.userId = userId;

    // Use hardcoded pod data instead of fetching
    setPodsProps({
      podData: HARDCODED_POD_DATA,
      glbFile: HARDCODED_POD_DATA.podSettingsGlobal.podGlbUrl,
      skyboxFile: HARDCODED_POD_DATA.podSettingsGlobal.skyboxUrl,
    
      isPost: false,
      editMode: false,
      isHost: false,
    });
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