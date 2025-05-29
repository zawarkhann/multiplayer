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

const EndEventPrompt = ({ isOpen, isHost, onCancel }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isHost) {
      handleFinishEvent();
    } else {
      console.log('user cant finish event');
    }

    window.parent.postMessage(
      {
        type: 'REDIRECT_AMJAD_APP',
        message: 'eventEnded',
      },
      '*',
    );
    window.location.href =
      'https://pods-alpha-test.tenant-7654b5-asrpods.ord1.ingress.coreweave.cloud/';
  };
  useEffect(() => {
    window.hideJoystick = true;
  }, []);

  return (
    <div className='fixed inset-0 bg-black/80 flex items-center justify-center z-50'>
      <div className='bg-[#2F2F2F] rounded-xl w-[90vw] max-w-sm p-5 pt-10 text-center relative'>
        {/* Cross Button inside box */}
        <button
          onClick={onCancel}
          className='absolute top-3 right-3 text-white text-xl leading-none focus:outline-none'
        >
          &times;
        </button>

        {/* Heading */}
        <h2 className='text-white text-lg font-semibold mb-3'>
          {/* {isHost ? 'End Event?' : 'Leave Event?'} */}
          {isHost ? 'Leave Event?' : 'Leave Event?'}
        </h2>

        {/* Message */}
        <p className='text-[#CCCCCC] mr-[10%] ml-[10%] text-sm mb-6 text-center leading-relaxed'>
          {/* {isHost
            ? 'Are you sure you want to end the event? All participants will be disconnected, and the event will be closed.'
            : 'Are you sure you want to leave the event? You’ll be disconnected from the session.'} */}
          {isHost
            ? 'Are you sure you want to leave the event? You’ll be disconnected from the session.'
            : 'Are you sure you want to leave the event? You’ll be disconnected from the session.'}
        </p>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className='bg-[#FF5656] text-white w-[60%] py-2 rounded-full text-sm font-medium mb-3'
        >
          {isHost ? 'End Event' : 'Leave Event'}
        </button>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className='border border-gray-500 text-white w-[60%] py-2 rounded-full text-sm font-medium'
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default EndEventPrompt;
