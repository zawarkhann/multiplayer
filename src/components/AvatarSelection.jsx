// Hardcoded robot data
const HARDCODED_ROBOTS_DATA = {
  documents: [
    {
      "id": "robot:9154",
      "value": {
        "robotId": 9154,
        "robotName": "Angry",
        "robotGlbUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/Angry/Angry.glb",
        "robotImageUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/Angry/Angry.png"
      }
    },
    {
      "id": "robot:9155",
      "value": {
        "robotId": 9155,
        "robotName": "ArcadeTokens",
        "robotGlbUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/ArcadeTokens/ArcadeTokens.glb",
        "robotImageUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/ArcadeTokens/ArcadeTokens.png"
      }
    },
    {
      "id": "robot:9156",
      "value": {
        "robotId": 9156,
        "robotName": "ArcaneSpark",
        "robotGlbUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/ArcaneSpark/ArcaneSpark.glb",
        "robotImageUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/ArcaneSpark/ArcaneSpark.png"
      }
    },
    {
      "id": "robot:9157",
      "value": {
        "robotId": 9157,
        "robotName": "ArtyAna",
        "robotGlbUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/ArtyAna/ArtyAna.glb",
        "robotImageUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/ArtyAna/ArtyAna.png"
      }
    },
    {
      "id": "robot:9158",
      "value": {
        "robotId": 9158,
        "robotName": "BalloonBeasts",
        "robotGlbUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/BalloonBeasts/BalloonBeasts.glb",
        "robotImageUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/BalloonBeasts/BalloonBeasts.png"
      }
    },
    {
      "id": "robot:9159",
      "value": {
        "robotId": 9159,
        "robotName": "BioluminescentPlantPods",
        "robotGlbUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/BioluminescentPlantPods/BioluminescentPlantPods.glb",
        "robotImageUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/BioluminescentPlantPods/BioluminescentPlantPods.png"
      }
    },
    {
      "id": "robot:9160",
      "value": {
        "robotId": 9160,
        "robotName": "BlobCritters",
        "robotGlbUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/BlobCritters/BlobCritters.glb",
        "robotImageUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/BlobCritters/BlobCritters.png"
      }
    },
    {
      "id": "robot:9161",
      "value": {
        "robotId": 9161,
        "robotName": "Bobaloo",
        "robotGlbUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/Bobaloo/Bobaloo.glb",
        "robotImageUrl": "https://object.ord1.coreweave.com/pods-bucket/robot/Bobaloo/Bobaloo.png"
      }
    }
  ]
};

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './avatar-scrollbar.css';

const AvatarSelection = () => {
  const [robots, setRobots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Load hardcoded robot data instead of fetching from API
  useEffect(() => {
    const loadRobots = () => {
      try {
        setLoading(true);
        
        // Use the hardcoded data directly
        const data = HARDCODED_ROBOTS_DATA;

        // Transform the data to match our avatar structure
        const transformedRobots = data.documents.map((doc) => ({
          id: doc.value.robotId,
          name: doc.value.robotName,
          img: doc.value.robotImageUrl,
          glb: doc.value.robotGlbUrl,
        }));

        setRobots(transformedRobots);

        // Set default selection to first robot if none selected
        if (transformedRobots.length > 0) {
          setSelected(transformedRobots[0]);
        }
      } catch (error) {
        console.error('Failed to load robots:', error);
        setRobots([]);
      } finally {
        setLoading(false);
      }
    };

    loadRobots();
  }, []);

  // Load the avatar from URL params if available
  useEffect(() => {
    const avatarParam = new URLSearchParams(location.search).get('avatar');
    if (avatarParam && robots.length > 0) {
      const found = robots.find((robot) => robot.id.toString() === avatarParam);
      if (found) setSelected(found);
    }
  }, [location.search, robots]);

  const handleSave = () => {
    if (!selected) return;

    // Clone the existing query parameters
    const params = new URLSearchParams(location.search);
    // Add or update the avatar parameter with robotId
    params.set('avatar', selected.id.toString());

    // Add default audio and video parameters (both disabled by default)
    params.set('audio', 'disabled');
    params.set('video', 'disabled');

    // Navigate to the AudioVideo page while preserving all query parameters
    navigate(`/audio-video?${params.toString()}`);
  };

  const handleBack = () => {
   
  };

  if (loading) {
    return (
      <div className='relative h-screen w-screen bg-[#191B1A] flex items-center justify-center'>
        <div className='text-white text-lg'>Loading avatars...</div>
      </div>
    );
  }

  if (robots.length === 0) {
    return (
      <div className='relative h-screen w-screen bg-[#191B1A] flex items-center justify-center'>
        <div className='text-white text-lg'>No avatars available</div>
      </div>
    );
  }

  return (
    <div className='relative h-screen w-screen max-w-md bg-[#191B1A] flex flex-col'>
      {/* Header - 10% of screen height */}
      <div className='h-[10%] flex items-center px-3 text-white space-x-2'>
        <button
          onClick={handleBack}
          className='flex items-center justify-center p-2 rounded-full bg-[#2D2E2E] hover:bg-[#404241] transition-colors'
        >
          <img src='/back.png' alt='back' className='w-4 h-4' />
        </button>
        <span className='text-lg font-medium'>Select your Avatar</span>
      </div>

      {/* Preview - 30% of screen height */}
      <div className='h-[30%] mx-auto w-[90%] rounded-xl bg-[#2D2E2E] flex items-center justify-center'>
        {selected && (
          <img
            src={selected.img}
            alt={selected.name}
            className='h-[90%] object-contain'
            onError={(e) => {
              e.target.src = '/avatars/default.png'; // Fallback image
            }}
          />
        )}
      </div>

      {/* Grid - 30% of screen height with custom scrollbar */}
      <div className='h-[30%] px-[4%] mt-[5%] overflow-hidden'>
        <div
          className='h-full p-1 overflow-y-auto scrollbar-custom'
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#9356FF #2D2E2E',
          }}
        >
          <div className='grid grid-cols-3 gap-2 pb-4'>
            {robots.map((robot) => (
              <button
                key={robot.id}
                onClick={() => setSelected(robot)}
                className={`rounded-xl p-1 bg-[#2D2E2E] ${
                  selected && robot.id === selected.id ? 'ring-1 ring-[#9356FF]' : ''
                }`}
              >
                <img
                  src={robot.img}
                  alt={robot.name}
                  className='object-contain w-full h-full'
                  onError={(e) => {
                    e.target.src = '/avatars/default.png'; // Fallback image
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CTA - 20% of screen height */}
      <div className='h-[20%] p-4 flex items-center'>
        <button
          onClick={handleSave}
          disabled={!selected}
          className={`w-full py-3 rounded-2xl text-white text-base font-semibold ${
            selected ? 'bg-[#B583FF] hover:bg-[#9356FF]' : 'bg-gray-500 cursor-not-allowed'
          }`}
        >
          Save &amp; Continue
        </button>
      </div>
    </div>
  );
};

// Export the robots array for use in other components
export let avatars = [];

// Function to get avatars (robots) - can be called from other components
export const getAvatars = async () => {
  try {
    // Use hardcoded data instead of API call
    const data = HARDCODED_ROBOTS_DATA;

    const transformedRobots = data.documents.map((doc) => ({
      name: doc.value.robotId.toString(), // Use robotId as name for compatibility
      id: doc.value.robotId,
      robotName: doc.value.robotName,
      img: doc.value.robotImageUrl,
      glb: doc.value.robotGlbUrl,
    }));

    avatars = transformedRobots;
    return transformedRobots;
  } catch (error) {
    console.error('Failed to load hardcoded robots:', error);
    return [];
  }
};

export default AvatarSelection;