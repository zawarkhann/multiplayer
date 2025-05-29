import React, { useState, useEffect } from 'react';

const PortraitLock = ({ children }) => {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    // Check if screen orientation API is supported
    const checkScreenLockSupport = () => {
      return screen && screen.orientation && screen.orientation.lock;
    };

    // Lock screen to portrait orientation
    const lockToPortrait = async () => {
      if (checkScreenLockSupport()) {
        try {
          await screen.orientation.lock('portrait');
          console.log('Screen locked to portrait');
        } catch (error) {
          console.warn('Could not lock screen orientation:', error);
        }
      }
    };

    // Check current orientation
    const checkOrientation = () => {
      const orientation = window.innerWidth > window.innerHeight;
      setIsLandscape(orientation);
    };

    // Handle orientation change
    const handleOrientationChange = () => {
      setTimeout(() => {
        checkOrientation();
      }, 100); // Small delay to ensure accurate reading
    };

    // Initial check
    checkOrientation();

    // Try to lock orientation on mount
    lockToPortrait();

    // Add event listeners
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    // Cleanup
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // If in landscape mode, show rotation prompt
  if (isLandscape) {
    return (
      <div className='fixed inset-0 bg-[#191B1A] flex items-center justify-center z-50'>
        <div className='text-center text-white p-8'>
          <div className='mb-6'>
            {/* Rotate Phone Icon */}
            <div className='w-20 h-20 mx-auto mb-4 text-6xl animate-bounce'>📱</div>
          </div>

          <h2 className='text-2xl font-bold mb-4'>Please Rotate Your Device</h2>
          <p className='text-lg mb-4'>This app works best in portrait mode</p>
          <p className='text-sm text-gray-400'>Turn your device vertically to continue</p>

          {/* Visual rotation indicator */}
          <div className='mt-8 flex justify-center items-center'>
            <div className='relative'>
              <div className='w-24 h-16 border-2 border-white rounded-lg transition-transform duration-1000'></div>
              <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs'>
                📱
              </div>
            </div>
            <div className='mx-4 text-2xl'>→</div>
            <div className='relative'>
              <div className='w-16 h-24 border-2 border-green-400 rounded-lg transform -rotate-90'></div>
              <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs'>
                📱
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If in portrait mode, show the app
  return <>{children}</>;
};

export default PortraitLock;
