import * as pc from 'playcanvas';
const FONT_DEFS = {
  Astera: '/public/fonts/Astera/ASTERA v2.json',
  Poppins: '/public/fonts/Poppins/Poppins-Regular.json',
  // add more here …
};

/* ────────────────────────────────────────────────────────────────────────────
   0.  CORS‑safe fetch helpers
   ───────────────────────────────────────────────────────────────────────── */

async function loadTextureCrossOrigin(app, url, assetName) {
  const res = await fetch(url, { mode: 'cors' });
  const blob = await res.blob(); // image → Blob
  const blobUrl = URL.createObjectURL(blob);

  const tex = new pc.Asset(assetName, 'texture', { url: blobUrl });
  app.assets.add(tex);

  return new Promise((resolve, reject) => {
    tex.once('load', () => resolve(tex));
    tex.once('error', reject);
    tex.once('remove', () => URL.revokeObjectURL(blobUrl));
    app.assets.load(tex);
  });
}

/* GLB with the same trick -------------------------------------------------- */
async function loadGlbCrossOrigin(app, url, assetName) {
  const res = await fetch(url, { mode: 'cors' });
  const arr = await res.arrayBuffer();
  const blob = new Blob([arr], { type: 'model/gltf-binary' });
  const blobUrl = URL.createObjectURL(blob);

  const glb = new pc.Asset(assetName, 'container', { url: blobUrl });
  app.assets.add(glb);

  return new Promise((resolve, reject) => {
    glb.once('load', () => resolve(glb));
    glb.once('error', reject);
    glb.once('remove', () => URL.revokeObjectURL(blobUrl));
    app.assets.load(glb);
  });
}

/* Video helper with the same CORS protection ---------------------------- */
async function loadVideoCrossOrigin(app, url, assetId) {
  // Fetch the video with CORS handling
  const res = await fetch(url, { mode: 'cors' });
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);

  // Create video element
  const videoId = `video_${assetId || Date.now()}`;
  const videoElem = document.createElement('video');
  videoElem.id = videoId;
  videoElem.src = blobUrl;
  videoElem.loop = true;
  videoElem.muted = false; // Start muted to allow autoplay
  videoElem.autoplay = true;
  videoElem.playsInline = true;
  videoElem.crossOrigin = 'anonymous';
  videoElem.style.display = 'none';
  document.body.appendChild(videoElem);

  // Create a PlayCanvas video texture
  const videoTexture = new pc.Texture(app.graphicsDevice, {
    format: pc.PIXELFORMAT_RGBA8,
    mipmaps: false,
    minFilter: pc.FILTER_LINEAR,
    magFilter: pc.FILTER_LINEAR,
    addressU: pc.ADDRESS_CLAMP_TO_EDGE,
    addressV: pc.ADDRESS_CLAMP_TO_EDGE,
  });

  // Wait for video metadata to load
  await new Promise((resolve) => {
    if (videoElem.readyState >= 1) {
      resolve();
    } else {
      videoElem.addEventListener('loadedmetadata', resolve, { once: true });
    }
  });

  // Resize texture to match video dimensions
  videoTexture.resize(videoElem.videoWidth, videoElem.videoHeight);

  // Initial texture source setting
  videoTexture.setSource(videoElem);

  // Create update function for per-frame texture upload
  const updateVideoTexture = () => {
    if (videoElem.readyState >= 2) {
      // HAVE_CURRENT_DATA or higher
      videoTexture.upload();
    }
  };

  // Start the video
  try {
    await videoElem.play();
  } catch (err) {
    console.warn('Autoplay prevented, will try on user interaction:', err);
    const playOnInteraction = () => {
      videoElem.play().catch((e) => console.error('Video play error:', e));
      document.removeEventListener('click', playOnInteraction);
      document.removeEventListener('touchstart', playOnInteraction);
    };
    document.addEventListener('click', playOnInteraction, { once: true });
    document.addEventListener('touchstart', playOnInteraction, { once: true });
  }

  // Register the update callback
  app.on('update', updateVideoTexture);

  // Create cleanup function
  const cleanup = () => {
    app.off('update', updateVideoTexture);
    if (videoElem.parentNode) {
      videoElem.pause();
      videoElem.parentNode.removeChild(videoElem);
    }
    URL.revokeObjectURL(blobUrl);
  };

  return { texture: videoTexture, cleanup, videoElem };
}

function setupAmbientAudioUI(soundUrl) {
  // 1. Create hidden audio element
  let audioElem = document.getElementById('ambientAudio');
  if (!audioElem) {
    audioElem = document.createElement('audio');
    audioElem.id = 'ambientAudio';
    audioElem.style.display = 'none';
    audioElem.loop = true;
    audioElem.muted = true; // Start muted
    audioElem.setAttribute('playsinline', 'true');
    audioElem.crossOrigin = 'anonymous';
    document.body.appendChild(audioElem);
  }

  // 2. Create control button
  let btn = document.getElementById('audioToggleBtn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'audioToggleBtn';
    btn.textContent = '🔇 Unmute Music';
    btn.style.position = 'fixed';
    btn.style.top = '10px';
    btn.style.left = '10px';
    btn.style.zIndex = '100';
    btn.style.padding = '6px 10px';
    btn.style.fontSize = '14px';
    btn.style.background = '#333';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';

    document.body.appendChild(btn);
  }

  // 3. Load audio blob and assign src
  fetch(soundUrl, { mode: 'cors' })
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      audioElem.src = blobUrl;
    })
    .catch((err) => {
      console.error('Error loading ambient audio:', err);
    });

  // 4. Toggle mute/unmute on button click
  btn.addEventListener('click', async () => {
    if (audioElem.muted) {
      audioElem.muted = false;
      try {
        await audioElem.play();
        btn.textContent = '🔊 Mute Music';
      } catch (err) {
        console.error('Playback failed:', err);
      }
    } else {
      audioElem.muted = true;
      audioElem.pause();
      btn.textContent = '🔇 Unmute Music';
    }
  });
}
/* ────────────────────────────────────────────────────────────────────────────
   1.  Text rotation properties based on parent wall/floor/roof
   ───────────────────────────────────────────────────────────────────────── */

// Define correct text rotations for each surface
const TEXT_WALL_PROPS = {
  Back_Left_Wall: { rotation: [0, -180, 0] },
  Back_Right_Wall: { rotation: [0, -90, 0] },
  Front_Right_Wall: { rotation: [0, 0, 0] },
  Front_Left_Wall: { rotation: [0, 90, 0] },
  Floor: { rotation: [-90, 0, 0] },
  Roof: { rotation: [90, 0, 0] },
};

/* ────────────────────────────────────────────────────────────────────────────
   2.  Main entry
   ───────────────────────────────────────────────────────────────────────── */

export function AddButtonToEditablesPost(app, model) {
  // Load the font asset early to ensure it's available when needed

  const raw = localStorage.getItem('postData');

  // Parse it back to an object (fall back to empty object if nothing there)
  const postData = raw ? JSON.parse(raw) : {};
  console.log('Music', postData.postAssets.ambientSound.soundUrl);

  if (
    postData.postAssets.ambientSound.soundUrl == 'empty' ||
    postData.postAssets.ambientSound.soundUrl == 'https://sound_url.com'
  ) {
    console.log('Do nothing with Music');
  } else {
    // setupAmbientAudioUI(postData.postAssets.ambientSound.soundUrl);
  }

  const frames = postData.postAssets?.frames || [];
  const assets3d = postData.postAssets?.Assets3d || [];
  const textAssets = postData.postAssets?.textAssets || [];

  /* grab the "editable" container (same as before) ------------------------ */
  const pod = model;
  const editable = pod;
  if (!editable) {
    console.warn('[AddAssets] editable container not found');
    return;
  }

  /* quick name → entity table -------------------------------------------- */
  const childByName = {};
  editable.children.forEach((ch) => (childByName[ch.name] = ch));

  /* parse "…url‑with‑dashes‑ParentName" ---------------------------------- */
  const splitUrl = (full) => {
    const i = full.lastIndexOf('-');
    return i === -1
      ? { url: full, parent: null }
      : { url: full.slice(0, i), parent: full.slice(i + 1) };
  };

  /* add mesh collision so you can pick the new objects later ------------- */
  const addPhysics = (e) => {
    e.findComponents('render').forEach((r) => {
      const ent = r.entity;
      if (!ent.collision) ent.addComponent('collision', { type: 'mesh', renderAsset: r.asset });
      if (!ent.rigidbody) ent.addComponent('rigidbody', { type: 'static' });
    });
  };

  /* Helper function to parse textFont format (#rrggbb-size) -------------- */

  ////////////////////////////////////
  async function preloadFontAssets() {
    const fontPromises = [];

    // Loop through all defined fonts and load them
    for (const fontName in FONT_DEFS) {
      const fontUrl = FONT_DEFS[fontName];

      // Check if font is already loaded
      let fontAsset = app.assets.find(fontName, 'font');
      if (!fontAsset) {
        // Create and load the font asset
        fontAsset = new pc.Asset(fontName, 'font', { url: fontUrl });
        app.assets.add(fontAsset);

        // Create a promise for font loading
        const fontPromise = new Promise((resolve, reject) => {
          fontAsset.once('load', () => {
            console.log(`Font loaded: ${fontName}`);
            resolve(fontAsset);
          });
          fontAsset.once('error', (err) => {
            console.error(`Failed to load font ${fontName}:`, err);
            reject(err);
          });
        });

        app.assets.load(fontAsset);
        fontPromises.push(fontPromise);
      }
    }

    return Promise.all(fontPromises)
      .then(() => console.log('All fonts preloaded successfully'))
      .catch((err) => console.error('Font preloading had some errors:', err));
  }
  function parseTextFont(textFont) {
    // Format should be "fontName-#rrggbb-fontSize-lineHeight"
    const parts = textFont.split('-');

    // Default values
    const result = {
      fontName: 'Astera',
      color: '#FFFFFF',
      fontSize: 0.8,
      lineHeight: 1.0,
    };

    // Parse the parts
    if (parts.length >= 1) result.fontName = parts[0];
    if (parts.length >= 2) result.color = parts[1];
    if (parts.length >= 3) result.fontSize = parseFloat(parts[2]);
    if (parts.length >= 4) result.lineHeight = parseFloat(parts[3]);

    return result;
  }

  // Helper function to convert hex color to pc.Color
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return new pc.Color(r, g, b);
  }

  // Function to convert alignment string to alignment vector
  function getAlignmentVector(alignStr) {
    switch (alignStr) {
      case 'left':
        return [0, 0.5];
      case 'center':
        return [0.5, 0.5];
      case 'right':
        return [1, 0.5];
      default:
        return [0.5, 0.5]; // Default to center
    }
  }

  /* async IIFE so we can use await inside -------------------------------- */
  (async () => {
    /* ───── Frames (image or video placed inside Frame.glb) ───────────── */
    for (const F of frames) {
      const { url: assetUrl, parent: parentName } = splitUrl(F.assetUrl);
      const parent = childByName[parentName];
      if (!parent) {
        console.warn(`[AddAssets] parent "${parentName}" not found for frame`);
        continue;
      }

      /* 1 ▸ create a 1×1 plane --------------------------------------------------- */
      const ent = new pc.Entity('framePlane');
      ent.addComponent('render', { type: 'plane' });

      /* 2 ▸ build a material (image or video) ----------------------------------- */
      const mat = new pc.StandardMaterial();
      mat.useLighting = false; // keep colours true‑to‑file

      const isVideo = /\.(mp4|webm|mov)$/i.test(assetUrl);
      try {
        if (isVideo) {
          /* ─── video ─── */
          console.log(`[AddAssets] Loading video for frame: ${assetUrl}`);

          const { texture, cleanup } = await loadVideoCrossOrigin(
            app,
            assetUrl,
            F.frameId || Date.now(),
          );

          mat.diffuseMap = texture; // put video on the plane
          ent.on('destroy', cleanup); // tidy up when the plane is removed
        } else {
          /* ─── image ─── */
          console.log(`[AddAssets] Loading image for frame: ${assetUrl}`);

          const tex = await loadTextureCrossOrigin(
            app,
            assetUrl,
            `frameTex_${F.frameId || Date.now()}`,
          );

          mat.diffuseMap = tex.resource;
        }
        mat.update();
      } catch (err) {
        console.error('[AddAssets] texture load failed:', err);
        continue; // skip this asset but keep going
      }

      ent.render.material = mat;

      /* 3 ▸ position, rotation, scale (already saved in F) ---------------------- */
      ent.setLocalPosition(F.position.x, F.position.y, F.position.z);
      ent.setLocalEulerAngles(F.rotation.x, F.rotation.y, F.rotation.z);
      ent.setLocalScale(F.scale.x, F.scale.y, F.scale.z);

      /* 4 ▸ physics / bookkeeping ---------------------------------------------- */
      addPhysics(ent); // <- your existing helper
      parent.addChild(ent);
    }

    /* ───── 3‑D Assets (external GLB) ─────────────────────────────────── */
    for (const A of assets3d) {
      const { url: modelUrl, parent: parentName } = splitUrl(A.Asset3dUrl);
      const parent = childByName[parentName];
      if (!parent) {
        console.warn(`[AddAssets] parent "${parentName}" not found for asset`);
        continue;
      }

      try {
        const glb = await loadGlbCrossOrigin(app, modelUrl, `asset3d_${A.assetId || Date.now()}`);
        const ent = glb.resource.instantiateRenderEntity();

        ent.setLocalPosition(A.position.x, A.position.y, A.position.z);
        ent.setLocalEulerAngles(A.rotation.x, A.rotation.y, A.rotation.z);
        ent.setLocalScale(A.scale.x, A.scale.y, A.scale.z);
        ent.findComponents('render').forEach((render) => {
          const entity = render.entity;

          entity.addComponent('rigidbody', {
            type: 'static',
          });
          entity.addComponent('collision', {
            type: 'mesh',
            renderAsset: render.asset,
          });
        });

        addPhysics(ent);
        parent.addChild(ent);
        const anim = ent.addComponent('anim', {
          activate: true,
        });

        glb.resource.animations.forEach((animAsset) => {
          anim.assignAnimation(
            animAsset.name, // state name
            animAsset.resource, // AnimTrack (must be the .resource!)
            /* layerName */ undefined,
            /* speed */ 1.0,
            /* loop */ true,
          );
        });
      } catch (err) {
        console.error('[AddAssets] 3‑D asset failed:', err);
      }
    }

    /* ───── Text Assets ───────────────────────────────────────────────── */
    // for (const T of textAssets) {
    //   const parentName = T.textAssetName;
    //   const parent = childByName[parentName];

    //   if (!parent) {
    //     console.warn(`[AddAssets] parent "${parentName}" not found for text asset`);
    //     continue;
    //   }

    //   try {
    //     // Parse text font string to get color and font size
    //     const { color, fontSize } = parseTextFont(T.textFont);

    //     // Function to convert alignment string to alignment vector [x, y]
    //     const getAlignmentVector = (alignStr) => {
    //       switch (alignStr) {
    //         case 'left':
    //           return [0, 0.5];
    //         case 'center':
    //           return [0.5, 0.5];
    //         case 'right':
    //           return [1, 0.5];
    //         default:
    //           return [0.5, 0.5]; // Default to center if not specified
    //       }
    //     };

    //     // Get alignment from the JSON or default to center
    //     const alignmentVector = getAlignmentVector(T.textAssetAlignment || 'center');

    //     // Create text entity
    //     const textEntity = new pc.Entity(`text-${T.textAssetId || Date.now()}`);

    //     // Add text element component
    //     textEntity.addComponent('element', {
    //       type: 'text',
    //       text: T.textAssetText,
    //       fontSize: fontSize, // Scale font size appropriately
    //       fontAsset: fontAsset,
    //       color: hexToRgb(color),
    //       pivot: new pc.Vec2(0.5, 0.5),
    //       width: 2,
    //       height: 1,
    //       alignment: alignmentVector, // Use alignment from JSON
    //     });

    //     // Use position, rotation and scale from the JSON
    //     textEntity.setLocalPosition(
    //       T.textAssetPosition.x,
    //       T.textAssetPosition.y,
    //       T.textAssetPosition.z,
    //     );

    //     // If rotation is provided in the JSON, use it
    //     if (T.textAssetRotation) {
    //       textEntity.setLocalEulerAngles(
    //         T.textAssetRotation.x,
    //         T.textAssetRotation.y,
    //         T.textAssetRotation.z,
    //       );
    //     } else {
    //       // Otherwise use the predefined rotation based on the parent wall/surface
    //       const rotation = TEXT_WALL_PROPS[parentName]?.rotation || [0, 0, 0];
    //       textEntity.setLocalEulerAngles(rotation[0], rotation[1], rotation[2]);
    //     }

    //     textEntity.setLocalScale(T.textAssetScale.x, T.textAssetScale.y, T.textAssetScale.z);

    //     // Add userData for physics handling
    //     textEntity.userData = {
    //       textAssetId: T.textAssetId,
    //       isText: true,
    //     };

    //     // Add physics for selection/interaction
    //     addPhysics(textEntity);

    //     // Add to parent
    //     parent.addChild(textEntity);

    //     console.log(
    //       `[AddAssets] Added text: "${T.textAssetText.substring(0, 20)}${T.textAssetText.length > 20 ? '...' : ''}" to ${parentName} with alignment: ${T.textAssetAlignment || 'center'}`,
    //     );
    //   } catch (err) {
    //     console.error('[AddAssets] Text asset failed:', err);
    //   }
    // }
    //cdcdcxdc

    await preloadFontAssets();
    for (const T of textAssets) {
      const parentName = T.textAssetName;
      const parent = childByName[parentName];

      if (!parent) {
        console.warn(`[AddAssets] parent "${parentName}" not found for text asset`);
        continue;
      }

      try {
        // Parse text font string to get font name, color, font size, and line height
        const { fontName, color, fontSize, lineHeight } = parseTextFont(T.textFont);

        // Get the font asset
        let fontAsset = app.assets.find(fontName, 'font');
        if (!fontAsset) {
          console.warn(`Font "${fontName}" not found, falling back to Astera`);
          fontAsset = app.assets.find('Astera', 'font');

          // If even the fallback font doesn't exist, skip this text asset
          if (!fontAsset) {
            console.error(`Fallback font "Astera" not found, skipping text asset`);
            continue;
          }
        }

        // Get alignment vector
        const alignmentVector = getAlignmentVector(T.textAssetAlignment || 'center');

        // Create text entity
        const textEntity = new pc.Entity(`text-${T.textAssetId || Date.now()}`);

        // Add text element component with line height
        textEntity.addComponent('element', {
          type: 'text',
          text: T.textAssetText,
          fontSize: fontSize,
          fontAsset: fontAsset,
          color: hexToRgb(color),
          pivot: new pc.Vec2(0.5, 0.5),
          width: 4, // Increased from 2 to 4 for more text space
          height: 1,
          alignment: alignmentVector,
          lineHeight: lineHeight, // Apply line height from parsed font string
        });

        // Use position, rotation and scale from the JSON
        textEntity.setLocalPosition(
          T.textAssetPosition.x,
          T.textAssetPosition.y,
          T.textAssetPosition.z,
        );

        // If rotation is provided in the JSON, use it
        if (T.textAssetRotation) {
          textEntity.setLocalEulerAngles(
            T.textAssetRotation.x,
            T.textAssetRotation.y,
            T.textAssetRotation.z,
          );
        } else {
          // Otherwise use the predefined rotation based on the parent wall/surface
          const rotation = TEXT_WALL_PROPS[parentName]?.rotation || [0, 0, 0];
          textEntity.setLocalEulerAngles(rotation[0], rotation[1], rotation[2]);
        }

        textEntity.setLocalScale(T.textAssetScale.x, T.textAssetScale.y, T.textAssetScale.z);

        // Add userData for physics handling
        textEntity.userData = {
          textAssetId: T.textAssetId,
          isText: true,
        };

        // Add physics for selection/interaction
        addPhysics(textEntity);

        // Add to parent
        parent.addChild(textEntity);

        console.log(
          `[AddAssets] Added text: "${T.textAssetText.substring(0, 20)}${
            T.textAssetText.length > 20 ? '...' : ''
          }" to ${parentName} using font: ${fontName}, line height: ${lineHeight}`,
        );
      } catch (err) {
        console.error('[AddAssets] Text asset failed:', err);
      }
    }
    console.log(
      `[AddAssets] placed ${frames.length} frame(s) + ${assets3d.length} model(s) + ${textAssets.length} text(s)`,
    );
  })();
}
