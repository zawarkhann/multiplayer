import * as pc from 'playcanvas';

export function FpsPlayer(app) {
  const existingPlayer = app.root.findByName('Player');
  if (existingPlayer) {
    existingPlayer.destroy();
  }

  console.log(app.root.findByName('iframePlane'));

  const playerCamera = new pc.Entity('Camera');
  const playerCameraPosition = new pc.Vec3(0, 1, 0);

  if (isMobileDevice()) {
    console.log('User is on a mobile device');
    window.fov = 65;

    playerCamera.addComponent('camera', {
      farClip: 1000,
      nearClip: 0.1,
      fov: window.fov,
    });

    playerCamera.setPosition(playerCameraPosition.x, 0.5, playerCameraPosition.z);
  } else {
    console.log('User is on a desktop/laptop');
    window.fov = 40;

    playerCamera.addComponent('camera', {
      farClip: 1000,
      nearClip: 0.1,
      fov: window.fov,
    });

    playerCamera.setPosition(playerCameraPosition.x, 0.8, playerCameraPosition.z);
  }

  playerCamera.camera.clearColorBuffer = true;
  playerCamera.camera.clearDepthBuffer = true;
  playerCamera.camera.clearColor = new pc.Color(0, 0, 0, 0);
  playerCamera.camera.frustumCulling = true;
  playerCamera.camera.toneMapping = pc.TONEMAP_ACES2;
  playerCamera.camera.gammaCorrection = pc.GAMMA_SRGB;

  const camComp = playerCamera.camera;
  const cameraFrame = new pc.CameraFrame(app, camComp);
  // const cameraFrame = new pc.CameraFrame(app, camComp);

  // Enable TAA
  cameraFrame.taa.enabled = true;
  // Optional: adjust jitter strength (higher = more pixel jitter)
  cameraFrame.taa.jitter = 1;

  // Optional: tweak sharpness (blurriness control)
  cameraFrame.rendering.sharpness = 1;
  cameraFrame.update();

  const player = new pc.Entity('Player');

  player.addComponent('model', { type: 'capsule' });

  // player.setLocalPosition(4.5, 0, 2.5);
  // player.setLocalPosition(10.344923973083496, 0.49666786193847656, 8.666194915771484);

  const randomInRange = (min, max) => Math.random() * (max - min) + min;

  const x = randomInRange(1, 10);
  const z = randomInRange(1, 8);

  // Apply to player
  player.setLocalPosition(x, 0.49666786193847656, z);
  console.log('Setting player to default front position');

  player.setLocalEulerAngles(0, 0, 0);
  player.addComponent('rigidbody', {
    type: 'dynamic',
    mass: 85,
  });
  player.addComponent('collision', {
    type: 'capsule',
    radius: 0.5,
    height: 1,
  });

  player.rigidbody.angularFactor = new pc.Vec3(0, 0, 0);
  player.rigidbody.angularDamping = 1;
  player.rigidbody.friction = 0.75;
  player.rigidbody.restitution = 0.5;
  player.rigidbody.linearDamping = 0.99;
  player.rigidbody.linearFactor = new pc.Vec3(1, 1, 1);

  player.addChild(playerCamera);

  player.addComponent('script');

  ////////////
  player.script.create('characterController', {
    attributes: {
      speed: 10,
      jumpImpulse: 400,
      rotationSmoothness: 25,
      camera: playerCamera,
    },
  });

  // firstPersonCamera
  player.script.create('firstPersonCamera', {
    attributes: {
      camera: playerCamera, // assuming 'Camera' is a reference to an entity or object
    },
  });

  // keyboardInput
  player.script.create('keyboardInput');

  // mouseInput
  player.script.create('mouseInput');

  // touchInput
  player.script.create('touchInput', {
    attributes: {
      deadZone: 0.3,
      turnSpeed: 150,
      radius: 50,
      doubleTapInterval: 300,
    },
  });

  app.root.addChild(player);

  return { player, playerCamera };
}

function isMobileDevice(mobileMaxWidth = 768) {
  // Method 1: Screen width detection
  const isSmallScreen = window.innerWidth <= mobileMaxWidth;

  // Method 2: User agent detection (fallback)
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUserAgent = mobileRegex.test(userAgent);

  // Method 3: Touch capability detection
  const hasTouchCapability =
    'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

  // Combine methods for better accuracy
  // If screen width is small OR has mobile user agent AND has touch capability
  return isSmallScreen || (isMobileUserAgent && hasTouchCapability);
}
