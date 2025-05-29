import React, { useEffect } from 'react';

export async function updateEventStatus(status = 'finished') {
  const searchParams = new URLSearchParams(window.location.search);
  const hostId = searchParams.get('hostId');
  const eventId = searchParams.get('eventId');
  try {
    const res = await fetch(
      `${import.meta.env.VITE_LINK}/api/users/update-event-status/${hostId}/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventStatus: status }),
      },
    );

    if (!res.ok) {
      const errorData = await res.json();
      console.error('❌ Failed to update event status:', errorData);
      return { success: false, error: errorData };
    }

    const data = await res.json();
    console.log('✅ Event status updated successfully:', data);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Error in updateEventStatus:', err);
    return { success: false, error: err.message };
  }
}

export const handleFinishEvent = async () => {
  const result = await updateEventStatus();
  if (result.success) {
    console.log('Event finished!');
  } else {
    console.warn('Failed to finish event.');
  }
};

export default function TimeUpPage() {
  useEffect(() => {
    console.warn('⏰ Meeting time has ended');
  }, []);

  useEffect(() => {
    handleFinishEvent();
    const timer = setTimeout(() => {
      window.parent.postMessage(
        {
          type: 'REDIRECT_AMJAD_APP',
          message: 'eventEnded',
        },
        '*',
      );
      console.log('MEssage sent');
      window.hideJoystick = true;
    }, 3000); // 2 000 ms = 2 seconds
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className='flex min-h-screen w-full flex-col items-center justify-center bg-black px-4 text-center text-white'>
      <h1 className='mb-2 text-3xl font-semibold sm:text-4xl lg:text-5xl'>Meeting Time Expired</h1>

      <div className='mb-4 text-6xl sm:text-7xl lg:text-8xl'>⏰</div>

      <p className='mb-1 text-base sm:text-lg lg:text-xl'>The meeting time has ended.</p>
      <p className='text-base sm:text-lg lg:text-xl'>
        The host&rsquo;s allocated time for this session has run out.
      </p>
    </div>
  );
}
