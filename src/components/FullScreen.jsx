import React, { useState, useEffect } from 'react';

export default function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);
  }, []);

  const toggleFullscreen = () => {
    if (isIOS) {
      // For iOS, show instructions or handle differently
      alert(
        'To enter fullscreen on iOS:\n1. Tap the Share button\n2. Select "Add to Home Screen"\n3. Open from home screen for fullscreen experience',
      );
      return;
    }

    // Standard fullscreen API for other browsers
    if (!document.fullscreenElement) {
      const element = document.documentElement;

      // Try different fullscreen methods for browser compatibility
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(console.error);
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        ),
      );
    };

    // Listen for fullscreen change events
    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);
    document.addEventListener('mozfullscreenchange', handleChange);
    document.addEventListener('MSFullscreenChange', handleChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
      document.removeEventListener('mozfullscreenchange', handleChange);
      document.removeEventListener('MSFullscreenChange', handleChange);
    };
  }, []);

  // Don't render on iOS since it's not supported
  if (isIOS) {
    return null;
  }

  return (
    <button
      onClick={toggleFullscreen}
      className='fixed top-[8%] right-[2%] w-10 h-10 bg-[#2D2E2E] bg-opacity-80 text-white rounded-full flex items-center justify-center z-50 hover:bg-opacity-100 focus:outline-none border border-gray-600'
      aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
    >
      {isFullscreen ? '🞬' : '⛶'}
    </button>
  );
}
