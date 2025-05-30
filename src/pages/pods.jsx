import React, { useEffect, useRef, useState } from 'react';
import * as pc from 'playcanvas';
import { Application, Mouse, Keyboard, ElementInput, Entity, Asset } from 'playcanvas';
import { initAmmo, loadDracoDecoder } from '../services/ammo-draco-loader';
import { MiniStats } from '../services/mini-stats';
import { OrbitCamera } from '../../public/scripts/orbitCamera.js';
import { MouseInput } from '../../public/scripts/mouse-input.js';
import { FpsPlaycanvas } from '../../public/scripts/fps-script.js';
import { FpsPlayer } from '../services/fps-player.js';
import { SetSkyboxDds } from '../services/set-skybox.js';
import { FirstPersonCamera } from '../../public/scripts/first-person-camera.js';
///
import { AddButtonToEditablesPost } from '../services/add-button-to-editables-post.jsx';
import { avatars, getAvatars } from '../components/AvatarSelection.jsx';

import { usePeer } from '../components/Peer';
import MessageToggle from '../components/MessageToggle';
import BottomControlBar from '../components/BottomBar.jsx';
import Music from '../components/Music.jsx';
import EndEventPrompt from '../components/endevent.jsx';
import FullscreenToggle from '../components/FullScreen.jsx';
import { SetCubeMapDds } from '../components/floor-cubemap.js';
import LoadingScreen from '../components/LoadingScreen.jsx';

const Pods = (children) => {
  const [hostAvatar, setHostAvatar] = useState('');
  const searchParams = new URLSearchParams(window.location.search);
  const hostId = searchParams.get('hostId');
  const userId = searchParams.get('userId');
  const [isHost, setIsHost] = useState(false);
  const [allRobots, setAllRobots] = useState([]);
  const [robotsLoading, setRobotsLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const loadedAssets = useRef(0);
  const totalAssetsToLoad = 1;

  useEffect(() => {
    const fetchAllRobots = async () => {
      try {
        setRobotsLoading(true);
        console.log('Fetching all robots...');

        const robots = await getAvatars();

        // Transform to the format needed for your app
        const robotsData = robots.map((robot) => ({
          robotId: robot.id,
          robotGlbUrl: robot.glb,
        }));

        setAllRobots(robotsData);
        console.log('All robots fetched:', robotsData);
      } catch (error) {
        console.error('Failed to fetch robots in main app:', error);
        setAllRobots([]);
      } finally {
        setRobotsLoading(false);
      }
    };

    fetchAllRobots();
  }, []); // Empty dependency array - runs once on mount

  useEffect(() => {
    console.log('ALL ROBOTS', allRobots);
  }, [allRobots]);

  useEffect(() => {
    if (hostId) {
      if (userId == hostId) {
        setIsHost(true);
      } else {
        setIsHost(false);
      }
    }
  }, []);

  const [soundUrl, setSoundUrl] = useState('empty');
  const [music, setmusic] = useState(false);
  useEffect(() => {
    if (children.postAssets?.postAssets?.ambientSound) {
      if (
        children.postAssets?.postAssets?.ambientSound.soundUrl == 'empty' ||
        children.postAssets?.postAssets?.ambientSound.soundUrl == 'https://sound_url.com'
      ) {
        console.log('No sound');
      } else {
        console.log('There is sound ');
        setSoundUrl(children.postAssets?.postAssets?.ambientSound.soundUrl);
        setmusic(true);
      }
    }
  }, []);

  localStorage.setItem('postData', JSON.stringify(children.postAssets));
  window.remotePlayersRef = useRef({});

  function createRemotePlayer(app, peerId) {
    console.log('Whole Peer:', peerId);

    // 1️⃣ extract your numeric user-id (if you still need it)
    const parts = peerId.split('-');
    const userId = parts[1]; // 👈 Changed to parts[1] since we're using roomId-userId format
    console.log('Extracted userId:', userId);

    // 2️⃣ look up the robot/ avatar‐id in your map
    //    fallback to "1" if it's missing
    const peerInfo = robotPeers[peerId];
    const avatarId = peerInfo?.robot;
    console.log(`Using avatarId=${avatarId} for peer=${peerId}`);

    // 3️⃣ find the matching GLB in your allRobots array using robotId
    const avatarData = allRobots.find((robot) => robot.robotId.toString() === avatarId?.toString());

    // Add fallback if avatar not found
    if (!avatarData) {
      console.warn(`Robot with ID ${avatarId} not found in allRobots. Using default robot.`);
    }

    const barImgAsset = new pc.Asset('speakingBarImg', 'texture', { url: 'public/unmuted.png' });

    app.assets.add(barImgAsset);
    app.assets.load(barImgAsset);

    const modelUrl = avatarData ? avatarData.robotGlbUrl : allRobots[0]?.robotGlbUrl;

    // Create capsule parent
    const capsule = new pc.Entity(`player-${peerId}`);
    capsule.addComponent('collision', {
      type: 'capsule',
      radius: 0.5,
      height: 1,
    });
    capsule.addComponent('rigidbody', {
      type: 'kinematic',
      mass: 85,
    });
    capsule.setLocalPosition(0, 1, 0);
    capsule.setLocalEulerAngles(0, 180, 0);

    // Load font
    let fontAsset = app.assets.find('Astera v2', 'font');
    if (!fontAsset) {
      fontAsset = new pc.Asset('Astera v2', 'font', {
        url: '/fonts/Astera/ASTERA v2.json',
      });
      app.assets.add(fontAsset);
      app.assets.load(fontAsset);
    }

    // Create a parent entity for the UI elements
    const uiParent = new pc.Entity(`uiParent-${peerId}`);
    capsule.addChild(uiParent);
    uiParent.setLocalPosition(0, 1.5, 0);

    // ------ FRONT FACING UI ------

    // Create avatar image entity (front facing)
    const avatarImageFront = new pc.Entity(`avatarImageFront-${peerId}`);
    avatarImageFront.addComponent('element', {
      type: 'image',
      width: 0.3,
      height: 0.3,
      opacity: 1,
    });
    avatarImageFront.setLocalPosition(-0.4, 1.05, 0);
    capsule.addChild(avatarImageFront);

    // Create nameplate background - front facing
    const nameBgFront = new pc.Entity(`nameBgFront-${peerId}`);
    nameBgFront.addComponent('element', {
      type: 'image',
      width: 0.8,
      height: 0.3,
      color: new pc.Color(0.2, 0.2, 0.2, 0.9),
      pivot: new pc.Vec2(0.5, 0.5),
      opacity: 1,
    });
    nameBgFront.setLocalPosition(0.3, -0.3, 0);
    uiParent.addChild(nameBgFront);

    // Name text on top of the background - front facing
    const nameTextFront = new pc.Entity(`nameTextFront-${peerId}`);
    nameTextFront.addComponent('element', {
      type: 'text',
      text: `Player-${userId.slice(0, 4)}`, // 👈 Use the extracted userId directly
      fontSize: 0.3,
      fontAsset: fontAsset,
      color: new pc.Color(1, 1, 1),
      pivot: new pc.Vec2(0.5, 0.5),
      width: 1.2,
      height: 0.3,
    });
    nameTextFront.setLocalPosition(0, 0, 0.01);
    nameTextFront.setLocalScale(0.3, 0.3, 0.5);
    nameBgFront.addChild(nameTextFront);

    // ------ BACK FACING UI (rotated 180 degrees) ------

    // Create a parent entity for the back-facing UI elements
    const uiParentBack = new pc.Entity(`uiParentBack-${peerId}`);
    capsule.addChild(uiParentBack);
    uiParentBack.setLocalPosition(0, 1.5, 0);
    uiParentBack.setLocalEulerAngles(0, 180, 0);

    // Create avatar image entity (back facing)
    const avatarImageBack = new pc.Entity(`avatarImageBack-${peerId}`);
    avatarImageBack.addComponent('element', {
      type: 'image',
      width: 0.3,
      height: 0.3,
      opacity: 1,
    });
    avatarImageBack.setLocalPosition(0.4, 1.05, 0);
    avatarImageBack.setLocalEulerAngles(0, 180, 0);
    capsule.addChild(avatarImageBack);

    // Create nameplate background - back facing
    const nameBgBack = new pc.Entity(`nameBgBack-${peerId}`);
    nameBgBack.addComponent('element', {
      type: 'image',
      width: 0.8,
      height: 0.3,
      color: new pc.Color(0.2, 0.2, 0.2, 0.9),
      pivot: new pc.Vec2(0.5, 0.5),
      opacity: 1,
    });
    nameBgBack.setLocalPosition(0.3, -0.3, 0);
    uiParentBack.addChild(nameBgBack);

    // Name text on top of the background - back facing
    const nameTextBack = new pc.Entity(`nameTextBack-${peerId}`);
    nameTextBack.addComponent('element', {
      type: 'text',
      text: `Player-${userId.slice(0, 4)}`, // 👈 Use the extracted userId directly
      fontSize: 0.3,
      fontAsset: fontAsset,
      color: new pc.Color(1, 1, 1),
      pivot: new pc.Vec2(0.5, 0.5),
      width: 1.2,
      height: 0.3,
    });
    nameTextBack.setLocalPosition(0, 0, 0.01);
    nameTextBack.setLocalScale(0.3, 0.3, 0.5);
    nameBgBack.addChild(nameTextBack);

    // Create a speaking indicator bar (a simple box or element)
    const speakingBar = new pc.Entity(`speakingBar-${peerId}`);
    speakingBar.addComponent('element', {
      type: 'image',
      width: 0.2,
      height: 0.2,
      color: new pc.Color(0, 1, 0),
      opacity: 0,
    });
    speakingBar.setLocalPosition(0.6, 1.2, 0.05);
    capsule.addChild(speakingBar);

    const speakingBarfront = new pc.Entity(`speakingBar-${peerId}`);
    speakingBarfront.addComponent('element', {
      type: 'image',
      width: 0.2,
      height: 0.2,
      color: new pc.Color(0, 1, 0),
      opacity: 0,
    });
    speakingBarfront.setLocalPosition(-0.6, 1.2, 0.05);
    speakingBarfront.setLocalEulerAngles(0, 180, 0);
    capsule.addChild(speakingBarfront);

    barImgAsset.ready(() => {
      speakingBar.element.textureAsset = barImgAsset;
      speakingBarfront.element.textureAsset = barImgAsset;
    });

    capsule.setSpeaking = (isSpeaking) => {
      if (isSpeaking) {
        speakingBar.opacity = 1;
        speakingBar.element.opacity = 1;
        speakingBarfront.opacity = 1;
        speakingBarfront.element.opacity = 1;
      } else {
        speakingBar.element.opacity = 0;
        speakingBarfront.element.opacity = 0;
      }
    };

    // Physics settings
    capsule.rigidbody.angularFactor = new pc.Vec3(0, 0, 0);
    capsule.rigidbody.angularDamping = 1;
    capsule.rigidbody.friction = 0.75;
    capsule.rigidbody.restitution = 0.5;
    capsule.rigidbody.linearDamping = 0.99;
    capsule.rigidbody.linearFactor = new pc.Vec3(1, 1, 1);

    app.root.addChild(capsule);

    // Load robot model
    const robotAsset = new pc.Asset(`${peerId}_robot`, 'container', {
      url: modelUrl,
    });

    robotAsset.on('load', () => {
      const container = robotAsset.resource;
      const model = container.instantiateRenderEntity();
      model.setLocalPosition(0, -0.9, 0);
      model.setLocalEulerAngles(0, 180, 0);
      capsule.addChild(model);
    });

    app.assets.add(robotAsset);
    app.assets.load(robotAsset);

    // Function to load avatar image using a proxy
    const loadAvatarImage = async () => {
      try {
        // Get the avatar URL from robotPeers (should be set in PeerProvider)
        const avatarUrl = `https://api.dicebear.com/6.x/fun-emoji/svg?seed=${userId}`;

        // Use a proxy server to fetch the image
        const proxyUrl = `https://amjad-pod-backend.tenant-7654b5-asrpods.ord1.ingress.coreweave.cloud/api/pods/media?url=${encodeURIComponent(avatarUrl)}`;

        const res = await fetch(proxyUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);

        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Important for CORS

        img.onload = () => {
          console.log(`Avatar image loaded successfully: ${img.width}x${img.height}`);

          // Create texture for both front and back images
          const tex = new pc.Texture(app.graphicsDevice);
          tex.setSource(img);
          tex.upload();

          // Apply texture directly to elements
          avatarImageFront.element.texture = tex;
          avatarImageBack.element.texture = tex;

          // Clean up blob URL when textures are loaded
          URL.revokeObjectURL(blobUrl);
        };

        img.onerror = (err) => {
          console.error('Failed to load avatar image:', err);
          URL.revokeObjectURL(blobUrl);
        };

        img.src = blobUrl;
      } catch (err) {
        console.error('Error loading avatar image:', err);
      }
    };

    // Load the avatar image
    loadAvatarImage();

    // Add a function to update player name (accessible from outside)
    capsule.setPlayerName = function (name) {
      // keep only three characters after the *first* dash
      const dash = name.indexOf('-');
      if (dash !== -1 && name.length > dash + 4) {
        name = name.slice(0, dash + 4); // dash itself (+1) + 3 chars
        // optionally add an ellipsis so users know it was trimmed:
        // name += '…';
      }

      nameTextFront.element.text = name;
      nameTextBack.element.text = name;
    };

    capsule.speakingBar = speakingBar;

    return capsule;
  }
  const [app, setApp] = useState(null);
  // const { peerId, peerList, messageLog, sendMessage, peerAudioStates } = usePeer();
  const { peerId, peerList, messageLog, sendMessage, robotPeers, peerAudioStates, peerNames } =
    usePeer();

  useEffect(() => {
    console.log('RObots changed', robotPeers);
  }, [robotPeers]);

  const deviceType = pc.DEVICETYPE_WEBGL2;

  const store = new pc.Asset('Pod', 'container', {
    url: 'public/models/Base_Cube.glb', // any name you like
  });

  const store1 = new pc.Asset('Pod1', 'container', {
    url: children.podData.podSettingsGlobal.podGlbUrl, // any name you like
    // url: 'public/models/model.glb', // any name you like
  });
  //////

  const initializeGame = async () => {
    try {
      const canvas = document.getElementById('application-canvas');
      if (!canvas) {
        console.error('Canvas element not found');
        setIsLoading(false);
        return;
      }

      const gfxOptions = {
        deviceTypes: [deviceType],
        glslangUrl: '/lib/glslang/glslang.js',
        twgslUrl: '/lib/twgsl/twgsl.js',
        antialias: true,
        powerPreference: 'high-performance',
        alpha: true,
      };

      // Initialize Ammo.js
      await initAmmo();

      //Load Draco.js
      await loadDracoDecoder(pc);

      // Create canvas configuration
      const devicePixelRatio = window.devicePixelRatio;
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;

      const device = await pc.createGraphicsDevice(canvas, gfxOptions);
      if (!device) {
        console.error('Failed to create WebGL device.');
        setIsLoading(false);
        return;
      }

      const createOptions = new pc.AppOptions();
      createOptions.graphicsDevice = device;
      createOptions.keyboard = new Keyboard(document.body);
      createOptions.mouse = new Mouse(canvas);
      createOptions.elementInput = new ElementInput(canvas);
      createOptions.touch = new pc.TouchDevice(canvas);

      createOptions.componentSystems = [
        pc.RenderComponentSystem,
        pc.CameraComponentSystem,
        pc.LightComponentSystem,
        pc.ScriptComponentSystem,
        pc.CollisionComponentSystem,
        pc.RigidBodyComponentSystem,
        pc.ElementComponentSystem,
        pc.ParticleSystemComponentSystem,
        pc.AnimComponent,
        pc.AnimComponentSystem,
        pc.ScreenComponentSystem,
        pc.ParticleSystemComponent,
      ];
      createOptions.resourceHandlers = [
        pc.TextureHandler,
        pc.ContainerHandler,
        pc.ScriptHandler,
        pc.JsonHandler,
        pc.FontHandler,
        pc.AnimClipHandler,
        pc.AnimStateGraphHandler,
        pc.CubemapHandler,
      ];
      const newApp = new Application(canvas, createOptions);

      newApp.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
      newApp.setCanvasResolution(pc.RESOLUTION_AUTO);

      const resizeCanvas = () => {
        const canvas = newApp.graphicsDevice.canvas;
        const devicePixelRatio = window.devicePixelRatio;
        canvas.width = window.innerWidth * devicePixelRatio;
        canvas.height = window.innerHeight * devicePixelRatio;
        newApp.graphicsDevice.updateClientRect();
      };
      newApp.on('resize', resizeCanvas);
      resizeCanvas();

      /** Scripts registering functions */
      FirstPersonCamera();

      setApp(newApp);
      window.pc_app = newApp;

      newApp.systems.add('rigidbody', {
        gravity: [0, -18, 0],
        maxSubSteps: 5,
        fixedTimeStep: 1 / 60,
      });

      newApp.start();
      const trackAssetLoading = () => {
        loadedAssets.current += 1;

        if (loadedAssets.current >= totalAssetsToLoad) {
          setTimeout(() => {
            setIsLoading(false);
          }, 500); // Give a small delay before hiding
        }
      };

      setTimeout(() => {
        initialVram(newApp);
      }, 1000);

      console.log('layers rendering order', newApp.scene.layers.layerList);

      // Configure scene
      await setupScene(newApp, trackAssetLoading, () => setIsLoading(false));
    } catch (error) {
      console.error('Error initializing game:', error);
      setIsLoading(false);
    }
  };

  const setupScene = async (app, onAssetLoaded, onLoadingFailed) => {
    // MiniStats(pc, app);
    console.log('SKYBOX IS:', children.skyboxFile);
    SetSkyboxDds(app, children.skyboxFile);
    const cubemap = await SetCubeMapDds(app, children);
    const timeout = setTimeout(() => {
      console.warn('Asset loading timed out');
      onLoadingFailed();
    }, 60000);

    // Create a promise to handle store loading
    const storeLoadPromise = new Promise((resolve) => {
      store.on('load', () => {
        const container = store.resource;
        const model = container.instantiateRenderEntity();

        const position = model.getPosition();

        model.setLocalPosition(position.x, position.y + 0.4, position.z);

        console.log('MODEL OF STORE INVISIBLE', model);
        const nodes = container.data.gltf.nodes;

        const renders = model.findComponents('render');

        if (children.postAssets.postAssets) AddButtonToEditablesPost(app, model);

        model.findComponents('render').forEach((render) => {
          const entity = render.entity;
          render.meshInstances[0].visible = false;

          entity.addComponent('rigidbody', {
            type: 'static',
          });
          entity.addComponent('collision', {
            type: 'mesh',
            renderAsset: render.asset,
          });
        });

        app.root.addChild(model);

        // Resolve the promise with the model, so it can be used later
        onAssetLoaded();
        resolve(model);
      });
    });

    // Add the store asset and start loading
    app.assets.add(store);
    app.assets.load(store);

    const store1LoadPromise = new Promise((resolve) => {
      store1.on('load', () => {
        const container = store1.resource;
        const model = container.instantiateRenderEntity();

        console.log('MODEL OF STORE', model);
        const nodes = container.data.gltf.nodes;

        const renders = model.findComponents('render');

        const outerFloor = model.findByName('Outer_Floor');
        const innerFloor = model.findByName('Inner_Floor');
        console.log('Outer Floor :', outerFloor);
        if (outerFloor?.render?.meshInstances?.[0]) {
          const mat = outerFloor.render.meshInstances[0].material.clone();
          const emissiveTexture = mat.emissiveMap;
          mat.cubeMap = cubemap;

          console.log('cubemap loaded as mat', cubemap);

          mat.cubeMapProjection = pc.CUBEPROJ_BOX;
          mat.cubeMapProjectionBox = new pc.BoundingBox(
            new pc.Vec3(0.35, 0.43, 2.68),
            new pc.Vec3(10.49, 14.48, 14.79),
          );
          mat.metalness = 0.1;
          mat.shininess = 60;
          mat.reflectivity = 0.1;
          mat.diffuse = new pc.Color(1, 1, 1); //////
          mat.emissiveIntensity = 0;
          mat.lightMap = emissiveTexture;
          mat.lightMapChannel = 'rgb';
          mat.lightMapUv = 0;
          console.log('lightmap', mat.lightMap);
          mat.emissiveMap = null;
          mat.update();
          outerFloor.render.meshInstances[0].material = mat;
          console.log('updated material with cubemap', mat);
          console.log('FLOOR MATERIAL', outerFloor.render);

          outerFloor.render.meshInstances[0].material = mat;
          console.log('Cubemap applied to Outer Floor');
        }
        if (innerFloor?.render?.meshInstances?.[0]) {
          const mat = innerFloor.render.meshInstances[0].material.clone();
          const emissiveTexture = mat.emissiveMap;
          console.log('original', cubemap);
          console.log('emissiveMap', emissiveTexture);
          console.log('MATERIAL:', mat);
          mat.cubeMap = cubemap;

          console.log('cubemap loaded as mat', cubemap);

          mat.cubeMapProjection = pc.CUBEPROJ_BOX;
          mat.cubeMapProjectionBox = new pc.BoundingBox(
            new pc.Vec3(0.35, 0.43, 2.68),
            new pc.Vec3(10.49, 14.48, 14.79),
          );
          mat.metalness = 0.1;
          mat.shininess = 60;
          mat.reflectivity = 0.1;
          mat.diffuse = new pc.Color(1, 1, 1);
          mat.emissiveIntensity = 0;
          mat.lightMap = emissiveTexture;
          mat.lightMapChannel = 'rgb';
          mat.lightMapUv = 0;
          console.log('lightmap', mat.lightMap);
          mat.emissiveMap = null;
          mat.update();
          innerFloor.render.meshInstances[0].material = mat;
          console.log('updated material with cubemap', mat);
          console.log('FLOOR MATERIAL', outerFloor.render);
          innerFloor.render.meshInstances[0].material = mat;
          console.log('Cubemap applied to Inner Floor');
        }

        // model.findComponents('render').forEach((render) => {
        //   const entity = render.entity;
        //   if (render.entity.name.includes('Wall')) {
        //     return;
        //   }
        //   entity.addComponent('rigidbody', {
        //     type: 'static',
        //   });
        //   entity.addComponent('collision', {
        //     type: 'mesh',
        //     renderAsset: render.asset,
        //   });
        // });

        app.root.addChild(model);

        // Resolve the promise with the model, so it can be used later
        onAssetLoaded();
        resolve(model);
      });
    });

    // Add the store asset and start loading
    app.assets.add(store1);
    app.assets.load(store1);

    try {
      // Wait for the store to load
      const model = await storeLoadPromise;
      await store1LoadPromise;
      onAssetLoaded();
      clearTimeout(timeout);

      // Now that the store is fully loaded, create the player
      const { player, playerCamera } = FpsPlayer(app);
    } catch (error) {
      console.error('Error during scene setup:', error);
    }
  };

  useEffect(() => {
    initializeGame().catch((error) => {
      console.error('Failed to initialize game:', error);
      setIsLoading(false);
    });

    return () => {
      console.log('Cleaning up game component...');

      const ammoScript = document.querySelector('script[src*="ammo.wasm.js"]');
      if (ammoScript) {
        ammoScript.remove();
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (app) {
        app.resizeCanvas();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [app]);

  useEffect(() => {
    if (!app) return;

    console.log('––––– remotePlayers:', window.remotePlayersRef.current);

    peerList.forEach((id) => {
      const hasSpawned = !!window.remotePlayersRef.current[id];
      const hasRobot = Boolean(robotPeers[id]?.robot);

      // only spawn if:
      //  • it isn’t yourself
      //  • we haven’t already spawned it
      //  • AND robotPeers[id].robot is defined
      if (id !== peerId && !hasSpawned && hasRobot) {
        const remote = createRemotePlayer(app, id);
        window.remotePlayersRef.current[id] = remote;
      }
    });

    // teardown disconnected peers as before
    Object.keys(window.remotePlayersRef.current).forEach((id) => {
      if (!peerList.includes(id)) {
        if (window.remotePlayersRef.current[id].setSpeaking) {
          window.remotePlayersRef.current[id].setSpeaking(false);
        }
        window.remotePlayersRef.current[id].destroy();
        delete window.remotePlayersRef.current[id];
      }
    });
  }, [peerList, app, robotPeers]);

  useEffect(() => {
    if (!app) return;

    const interval = setInterval(() => {
      const player = app.root.findByName('Player');
      if (!player) return;

      const pos = player.getPosition();
      const rot = player.getEulerAngles();

      sendMessage({
        type: 'player-update',
        peerId,
        position: { x: pos.x, y: pos.y, z: pos.z },
        rotation: { x: rot.x, y: rot.y, z: rot.z },
      });
    }, 100);

    return () => clearInterval(interval);
  }, [app, peerId]);

  useEffect(() => {
    if (!app) return;

    peerList.forEach((id) => {
      if (id === peerId) return; // skip local player if you want

      const speaking = peerAudioStates[id]?.speaking || false;
      const remotePlayer = window.remotePlayersRef.current[id];

      if (remotePlayer && typeof remotePlayer.setSpeaking === 'function') {
        remotePlayer.setSpeaking(speaking);
      }
    });
  }, [peerAudioStates, peerList, app, peerId]);

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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  return (
    <>
      <LoadingScreen isVisible={isLoading} onHide={() => setIsLoading(false)} />
      {/* <FullscreenToggle /> */}
      {!isMobileDevice() && (
        <>
          <canvas id='application-canvas' className='relative inset-0 w-full h-full top-0 left-0' />
        </>
      )}

      {isMobileDevice() && (
        <>
          {music && <Music soundUrl={soundUrl} top='8%' />}

          <div
            className='
    absolute inset-x-0 top-0
    h-[7%]
    flex items-center justify-between
    px-4
    z-20
    bg-[#191B1A]
    border border-[#191B1A]
  '
          >
            {/* Left group: back arrow + title */}
            <div className='flex items-center space-x-3'>
              {/* <img src='/images/back.png' alt='Back' className='w-6 h-6' /> */}
              <span
                className='text-[#FF5656] text-base font-medium'
                onClick={() => setShowPrompt(true)}
              >
                {isHost ? 'End Event' : 'Leave Meeting'}
              </span>
            </div>

            {/* Next button */}
          </div>
          <div
            className='
    absolute        /* position wherever you like */
    top-[7%]       /* or top-6, top-[10vh], etc */
    left-0 right-0  /* full width */
    h-[93%]        /* container is exactly 10% of viewport height */
    overflow-hidden /* clip anything taller */
    border-t-0
  '
          >
            <canvas
              id='application-canvas'
              className='
      absolute inset-0  /* fill the parent div */
      w-full h-full
    '
            />
          </div>
        </>
      )}
      {isChatOpen ? (
        <MessageToggle onClose={() => setIsChatOpen(false)} />
      ) : (
        <BottomControlBar onOpenChat={() => setIsChatOpen(true)} />
      )}
      <EndEventPrompt
        isOpen={showPrompt}
        isHost={isHost}
        onCancel={() => {
          setShowPrompt(false);
          window.hideJoystick = false;
        }}
      />
    </>
  );
};

export default Pods;
