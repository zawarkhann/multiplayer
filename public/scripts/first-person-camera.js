import * as pc from 'playcanvas';

export function FirstPersonCamera() {
  var CharacterController = pc.createScript('characterController');

  CharacterController.attributes.add('speed', { type: 'number', default: 5 });
  CharacterController.attributes.add('jumpImpulse', { type: 'number', default: 400 });

  // initialize code called once per entity
  CharacterController.prototype.initialize = function () {
    this.groundCheckRay = new pc.Vec3(0, -1.2, 0);
    this.rayEnd = new pc.Vec3();

    this.groundNormal = new pc.Vec3();
    this.onGround = true;
    this.jumping = false;
  };

  CharacterController.prototype.move = function (direction) {
    if (this.onGround && !this.jumping) {
      var tmp = new pc.Vec3();

      var length = direction.length();
      if (length > 0) {
        // calculate new forward vec parallel to the current ground surface
        tmp.cross(this.groundNormal, direction).cross(tmp, this.groundNormal);
        tmp.normalize().scale(length * this.speed);
      }
      this.entity.rigidbody.linearVelocity = tmp;
    }
  };

  CharacterController.prototype.jump = function () {
    if (this.onGround && !this.jumping) {
      this.entity.rigidbody.applyImpulse(0, this.jumpImpulse, 0);
      this.onGround = false;
      this.jumping = true;
      setTimeout(
        function () {
          this.jumping = false;
        }.bind(this),
        500,
      );
    }
  };

  // update code called every frame
  CharacterController.prototype.update = function (dt) {
    var pos = this.entity.getPosition();
    // console.log('CHRCTR POSITION', this.entity);
    this.rayEnd.add2(pos, this.groundCheckRay);

    // Fire a ray straight down to just below the bottom of the rigid body,
    // if it hits something then the character is standing on something.
    var result = this.app.systems.rigidbody.raycastFirst(pos, this.rayEnd);
    this.onGround = !!result;
    if (result) {
      this.groundNormal.copy(result.normal);
    }
  };

  ////////////////////////////////////////////////////////////////////////////////
  //         First Person Controls That Drive a Character Controller            //
  ////////////////////////////////////////////////////////////////////////////////
  var FirstPersonCamera = pc.createScript('firstPersonCamera');

  FirstPersonCamera.attributes.add('camera', {
    title: 'Camera',
    description:
      'The camera controlled by this first person view. It should be a child of the entity to which this script is assigned. If no camera is assigned, the script will create one for you.',
    type: 'entity',
  });

  FirstPersonCamera.prototype.initialize = function () {
    var app = this.app;

    // Check the user has set a camera entity for the FPS view
    if (!this.camera) {
      // If not look for a chile of the character controller called 'Camera'
      this.camera = this.entity.findByName('Camera');
      if (!this.camera) {
        // Still don't have a camera so just create one!
        this.camera = new pc.Entity('FPS Camera');
        this.camera.addComponent('camera');
      }
    }

    this.x = new pc.Vec3();
    this.z = new pc.Vec3();
    this.heading = new pc.Vec3();
    this.magnitude = new pc.Vec2();

    this.azimuth = 0;
    this.elevation = 0;

    // Calculate camera azimuth/elevation
    var temp = this.camera.forward.clone();
    temp.y = 0;
    temp.normalize();
    this.azimuth = Math.atan2(-temp.x, -temp.z) * (180 / Math.PI);

    var rot = new pc.Mat4().setFromAxisAngle(pc.Vec3.UP, -this.azimuth);
    rot.transformVector(this.camera.forward, temp);
    this.elevation = Math.atan(temp.y, temp.z) * (180 / Math.PI);

    this.forward = 0;
    this.strafe = 0;
    this.jump = false;
    this.cnt = 0;

    app.on(
      'firstperson:forward',
      function (value) {
        this.forward = value;
      },
      this,
    );
    app.on(
      'firstperson:strafe',
      function (value) {
        this.strafe = value;
      },
      this,
    );
    app.on(
      'firstperson:look',
      function (azimuthDelta, elevationDelta) {
        this.azimuth += azimuthDelta;
        this.elevation += elevationDelta;
        this.elevation = pc.math.clamp(this.elevation, -90, 90);
      },
      this,
    );
    app.on(
      'firstperson:jump',
      function () {
        this.jump = true;
      },
      this,
    );
  };

  FirstPersonCamera.prototype.postUpdate = function (dt) {
    // Update the camera's orientation
    // this.camera.setEulerAngles(this.elevation, this.azimuth, 0);

    // Yaw on the entity (so the whole character turns)
    this.entity.setEulerAngles(0, this.azimuth, 0);

    // Pitch on the camera (so it looks up/down)
    this.camera.setLocalEulerAngles(this.elevation, 0, 0);

    // Calculate the camera's heading in the XZ plane
    this.z.copy(this.entity.forward);
    this.z.y = 0;
    this.z.normalize();

    this.x.copy(this.entity.right);
    this.x.y = 0;
    this.x.normalize();

    this.heading.set(0, 0, 0);

    // Move forwards/backwards
    if (this.forward !== 0) {
      this.z.scale(this.forward);
      this.heading.add(this.z);
    }

    // Strafe left/right
    if (this.strafe !== 0) {
      this.x.scale(this.strafe);
      this.heading.add(this.x);
    }

    if (this.heading.length() > 0.0001) {
      this.magnitude.set(this.forward, this.strafe);
      this.heading.normalize().scale(this.magnitude.length());
    }

    if (this.jump) {
      this.entity.script.characterController.jump();
      this.jump = false;
    }

    this.entity.script.characterController.move(this.heading);

    var pos = this.camera.getPosition();
    this.app.fire('cameramove', pos);
  };

  ////////////////////////////////////////////////////////////////////////////////
  //  FPS Keyboard Controls (Movement Only - Work Alongside Mouse Look Script)  //
  ////////////////////////////////////////////////////////////////////////////////
  var KeyboardInput = pc.createScript('keyboardInput');

  KeyboardInput.prototype.initialize = function () {
    var app = this.app;

    var updateMovement = function (keyCode, value) {
      switch (keyCode) {
        case 38: // Up arrow
        case 87: // W
          app.fire('firstperson:forward', value);
          break;
        case 40: // Down arrow
        case 83: // S
          app.fire('firstperson:forward', -value);
          break;
        case 37: // Left arrow
        case 65: // A
          app.fire('firstperson:strafe', -value);
          break;
        case 39: // Right arrow
        case 68: // D
          app.fire('firstperson:strafe', value);
          break;
      }
    };

    var keyDown = function (e) {
      if (!e.repeat) {
        updateMovement(e.keyCode, 1);

        if (e.keyCode === 32) {
          // Space
          app.fire('firstperson:jump');
        }
      }
    };

    var keyUp = function (e) {
      updateMovement(e.keyCode, 0);
    };

    // Manage DOM event listeners
    var addEventListeners = function () {
      window.addEventListener('keydown', keyDown, true);
      window.addEventListener('keyup', keyUp, true);
    };
    var removeEventListeners = function () {
      window.removeEventListener('keydown', keyDown, true);
      window.removeEventListener('keyup', keyUp, true);
    };

    this.on('enable', addEventListeners);
    this.on('disable', removeEventListeners);

    addEventListeners();
  };

  ////////////////////////////////////////////////////////////////////////////////
  //                         FPS Mouse Look Controls                            //
  ////////////////////////////////////////////////////////////////////////////////
  var MouseInput = pc.createScript('mouseInput');

  MouseInput.attributes.add('sensitivity', {
    title: 'Mouse Sensitivity',
    description: 'How sensitive the mouse controls are',
    type: 'number',
    default: 0.2,
  });

  MouseInput.prototype.initialize = function () {
    var app = this.app;
    var canvas = app.graphicsDevice.canvas;

    // Track if mouse is down to enable dragging
    this.isMouseDown = false;
    this.lastX = 0;
    this.lastY = 0;

    // Mouse down handler - starts the drag
    var mouseDown = function (e) {
      this.isMouseDown = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;

      // Change cursor to grabbing style
      canvas.style.cursor = 'grabbing';
    }.bind(this);

    // Mouse up handler - ends the drag
    var mouseUp = function (e) {
      this.isMouseDown = false;

      // Change cursor back to grab style when not dragging
      canvas.style.cursor = 'grab';
    }.bind(this);

    // Mouse move handler - calculate rotation when dragging
    var mouseMove = function (e) {
      if (this.isMouseDown) {
        // Calculate movement delta
        var deltaX = e.clientX - this.lastX;
        var deltaY = e.clientY - this.lastY;

        // Update last position
        this.lastX = e.clientX;
        this.lastY = e.clientY;

        // Apply sensitivity and fire look event
        app.fire('firstperson:look', -deltaX * this.sensitivity, -deltaY * this.sensitivity);
      }
    }.bind(this);

    // Leave handler - handle case when mouse leaves canvas
    var mouseLeave = function (e) {
      this.isMouseDown = false;
      canvas.style.cursor = 'grab';
    }.bind(this);

    // Set the initial cursor style
    canvas.style.cursor = 'grab';

    // Manage DOM event listeners
    var addEventListeners = function () {
      canvas.addEventListener('mousedown', mouseDown, false);
      canvas.addEventListener('mouseup', mouseUp, false);
      canvas.addEventListener('mousemove', mouseMove, false);
      canvas.addEventListener('mouseleave', mouseLeave, false);

      // Prevent context menu when right-clicking
      canvas.addEventListener(
        'contextmenu',
        function (e) {
          e.preventDefault();
        },
        false,
      );
    };

    var removeEventListeners = function () {
      canvas.removeEventListener('mousedown', mouseDown, false);
      canvas.removeEventListener('mouseup', mouseUp, false);
      canvas.removeEventListener('mousemove', mouseMove, false);
      canvas.removeEventListener('mouseleave', mouseLeave, false);

      // Reset cursor
      canvas.style.cursor = 'auto';
    };

    this.on('enable', addEventListeners);
    this.on('disable', removeEventListeners);

    addEventListeners();
  };

  // Utility function for both touch and gamepad handling of deadzones
  // Takes a 2-axis joystick position in the range -1 to 1 and applies
  // an upper and lower radial deadzone, remapping values in the legal
  // range from 0 to 1.
  function applyRadialDeadZone(pos, remappedPos, deadZoneLow, deadZoneHigh) {
    var magnitude = pos.length();

    if (magnitude > deadZoneLow) {
      var legalRange = 1 - deadZoneHigh - deadZoneLow;
      var normalizedMag = Math.min(1, (magnitude - deadZoneLow) / legalRange);
      var scale = normalizedMag / magnitude;
      remappedPos.copy(pos).scale(scale);
    } else {
      remappedPos.set(0, 0);
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  //                     Device Detection Utility                               //
  ////////////////////////////////////////////////////////////////////////////////

  // Helper function to detect if the device is mobile
  function isMobileDevice() {
    // Check if the device supports touch events
    const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Check if the user agent contains mobile indicators
    const userAgentCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

    // Consider tablets as mobile devices for touch controls
    return hasTouchSupport && userAgentCheck;
  }

  ////////////////////////////////////////////////////////////////////////////////
  //                 Visual Joystick FPS Touch Controls                         //
  ////////////////////////////////////////////////////////////////////////////////
  var TouchInput = pc.createScript('touchInput');

  TouchInput.attributes.add('deadZone', {
    title: 'Dead Zone',
    description:
      'Radial thickness of inner dead zone of the virtual joysticks. This dead zone ensures the virtual joysticks report a value of 0 even if a touch deviates a small amount from the initial touch.',
    type: 'number',
    min: 0,
    max: 0.4,
    default: 0.3,
  });
  TouchInput.attributes.add('turnSpeed', {
    title: 'Turn Speed',
    description: 'Maximum turn speed in degrees per second',
    type: 'number',
    default: 150,
  });
  TouchInput.attributes.add('joystickSizePercent', {
    title: 'Joystick Size',
    description:
      'Size of the joystick as a percentage of the smaller screen dimension (width or height)',
    type: 'number',
    default: 12,
    min: 5,
    max: 30,
  });
  TouchInput.attributes.add('knobSizePercent', {
    title: 'Knob Size',
    description: 'Size of the inner knob as a percentage of the joystick size',
    type: 'number',
    default: 50,
    min: 30,
    max: 70,
  });
  TouchInput.attributes.add('doubleTapInterval', {
    title: 'Double Tap Interval',
    description:
      'The time in milliseconds between two taps for a double tap to register. A double tap will trigger a jump.',
    type: 'number',
    default: 300,
  });
  TouchInput.attributes.add('joystickColor', {
    title: 'Joystick Color',
    description: 'The color of the joystick outer circle',
    type: 'string',
    default: 'rgba(0, 0, 0, 0.3)', // Change to a darker, semi-transparent color
  });

  TouchInput.attributes.add('knobColor', {
    title: 'Knob Color',
    description: 'The color of the joystick inner knob',
    type: 'string',
    default: 'rgba(150, 150, 150, 0.5)', // Gray, semi-transparent for the knob
  });
  TouchInput.attributes.add('joystickPositionX', {
    title: 'Joystick Position X',
    description:
      'Horizontal position of the joystick from the left edge (in percentage of screen width, 0-100)',
    type: 'number',
    default: 20,
    min: 5,
    max: 95,
  });
  TouchInput.attributes.add('joystickPositionY', {
    title: 'Joystick Position Y',
    description:
      'Vertical position of the joystick from the bottom edge (in percentage of screen height, 0-100)',
    type: 'number',
    default: 25,
    min: 5,
    max: 95,
  });

  // Add new attributes for the "Move" label
  TouchInput.attributes.add('showMoveLabel', {
    title: 'Show Move Label',
    description: 'Whether to show the "Move" label below the joystick',
    type: 'boolean',
    default: true,
  });

  TouchInput.attributes.add('labelDistancePercent', {
    title: 'Label Distance',
    description:
      'Distance of the label from the bottom of the joystick (as percentage of joystick size)',
    type: 'number',
    default: 30,
    min: 10,
    max: 100,
  });

  TouchInput.attributes.add('labelWidth', {
    title: 'Label Width',
    description: 'Width of the move label in pixels',
    type: 'number',
    default: 80,
  });

  TouchInput.attributes.add('labelHeight', {
    title: 'Label Height',
    description: 'Height of the move label in pixels',
    type: 'number',
    default: 30,
  });

  TouchInput.attributes.add('labelFontSize', {
    title: 'Label Font Size',
    description: 'Font size for the move label',
    type: 'number',
    default: 14,
  });

  // Define the calculateJoystickDimensions method on the prototype
  TouchInput.prototype.calculateJoystickDimensions = function () {
    // Use the smaller dimension (width or height) to base the joystick size
    var minDimension = Math.min(this.joystickCanvas.width, this.joystickCanvas.height);

    // Calculate outer radius based on percentage of the min dimension
    this.outerRadius = (minDimension * this.joystickSizePercent) / 100;

    // Calculate inner radius based on percentage of outer radius
    this.innerRadius = this.outerRadius * (this.knobSizePercent / 100);

    // Calculate label dimensions
    this.labelWidth = this.labelWidth || 80; // Default width if not set
    this.labelHeight = this.labelHeight || 30; // Default height if not set
  };

  TouchInput.prototype.initialize = function () {
    var app = this.app;
    var graphicsDevice = app.graphicsDevice;
    var canvas = graphicsDevice.canvas;

    // Check if we're on a mobile device - if not, don't initialize the touch controls
    this.isMobile = isMobileDevice();

    if (!this.isMobile) {
      console.log('Not a mobile device - touch controls disabled');
      return; // Exit initialization if not on mobile
    }

    console.log('Mobile device detected - initializing touch controls');

    this.remappedPos = new pc.Vec2();
    this.lastStrafe = 0;
    this.lastForward = 0;

    // Create a new canvas for drawing the joystick UI
    this.joystickCanvas = document.createElement('canvas');
    this.joystickCanvas.width = canvas.clientWidth;
    this.joystickCanvas.height = canvas.clientHeight;
    this.joystickCanvas.style.position = 'absolute';
    this.joystickCanvas.style.left = '0';
    this.joystickCanvas.style.top = '0';
    this.joystickCanvas.style.pointerEvents = 'none'; // Allow touch events to pass through
    this.joystickCanvas.style.zIndex = '100';
    document.body.appendChild(this.joystickCanvas);
    this.joystickCtx = this.joystickCanvas.getContext('2d');

    // Calculate dynamic joystick sizes based on screen dimensions
    this.calculateJoystickDimensions();

    // Set fixed position for the joystick based on configured position
    var posX = (this.joystickPositionX / 100) * canvas.clientWidth;
    var posY = canvas.clientHeight - (this.joystickPositionY / 100) * canvas.clientHeight;

    this.leftStick = {
      identifier: -1,
      center: new pc.Vec2(posX, posY),
      pos: new pc.Vec2(0, 0),
      active: false,
    };
    this.rightStick = {
      identifier: -1,
      center: new pc.Vec2(),
      pos: new pc.Vec2(),
    };

    this.lastRightTap = 0;

    var touchStart = function (e) {
      e.preventDefault();

      var touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        var touch = touches[i];

        // Check if the touch is within the joystick area
        if (this.isPointInJoystick(touch.pageX, touch.pageY) && this.leftStick.identifier === -1) {
          // Touch is on the joystick for movement
          this.leftStick.identifier = touch.identifier;
          this.leftStick.active = true;

          // Calculate initial position relative to the center
          var deltaX = touch.pageX - this.leftStick.center.x;
          var deltaY = touch.pageY - this.leftStick.center.y;

          // Calculate the distance
          var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          // Clamp to outer radius
          if (distance > this.outerRadius) {
            var scale = this.outerRadius / distance;
            deltaX *= scale;
            deltaY *= scale;
          }

          // Update position for movement calculation
          this.leftStick.pos.set(deltaX / this.outerRadius, deltaY / this.outerRadius);

          // Redraw the joystick
          this.drawJoystick();
        } else if (
          !this.isPointInJoystick(touch.pageX, touch.pageY) &&
          this.rightStick.identifier === -1
        ) {
          // Any touch outside the joystick area is for camera rotation
          this.rightStick.identifier = touch.identifier;
          this.rightStick.center.set(touch.pageX, touch.pageY);
          this.rightStick.pos.set(0, 0);

          // See how long since the last tap to detect a double tap (jump)
          var now = Date.now();
          if (now - this.lastRightTap < this.doubleTapInterval) {
            app.fire('firstperson:jump');
          }
          this.lastRightTap = now;
        }
      }
    }.bind(this);

    var touchMove = function (e) {
      e.preventDefault();

      var touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        var touch = touches[i];

        // Update the current positions of the two virtual joysticks
        if (touch.identifier === this.leftStick.identifier) {
          // Calculate the delta from the center
          var deltaX = touch.pageX - this.leftStick.center.x;
          var deltaY = touch.pageY - this.leftStick.center.y;

          // Calculate the distance
          var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          // Clamp to outer radius
          if (distance > this.outerRadius) {
            var scale = this.outerRadius / distance;
            deltaX *= scale;
            deltaY *= scale;
          }

          // Update position for movement calculation
          this.leftStick.pos.set(deltaX / this.outerRadius, deltaY / this.outerRadius);

          // Redraw the joystick
          this.drawJoystick();
        } else if (touch.identifier === this.rightStick.identifier) {
          this.rightStick.pos.set(touch.pageX, touch.pageY);
          this.rightStick.pos.sub(this.rightStick.center);
          this.rightStick.pos.scale(1 / this.outerRadius);
        }
      }
    }.bind(this);

    var touchEnd = function (e) {
      e.preventDefault();

      var touches = e.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        var touch = touches[i];

        // If this touch is one of the sticks, get rid of it...
        if (touch.identifier === this.leftStick.identifier) {
          this.leftStick.identifier = -1;
          this.leftStick.active = false;
          this.leftStick.pos.set(0, 0); // Reset position to center
          app.fire('firstperson:forward', 0);
          app.fire('firstperson:strafe', 0);
          this.drawJoystick(); // Redraw the joystick in its default state
        } else if (touch.identifier === this.rightStick.identifier) {
          this.rightStick.identifier = -1;
        }
      }
    }.bind(this);

    // Helper function to check if a point is within the joystick area
    this.isPointInJoystick = function (x, y) {
      var dist = Math.sqrt(
        Math.pow(x - this.leftStick.center.x, 2) + Math.pow(y - this.leftStick.center.y, 2),
      );
      return dist <= this.outerRadius * 1.5; // Slightly larger touch area for better usability
    };

    // Manage DOM event listeners
    var addEventListeners = function () {
      canvas.addEventListener('touchstart', touchStart, false);
      canvas.addEventListener('touchmove', touchMove, false);
      canvas.addEventListener('touchend', touchEnd, false);

      // Listen for window resize to adjust the joystick canvas size
      window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }.bind(this);

    var removeEventListeners = function () {
      canvas.removeEventListener('touchstart', touchStart, false);
      canvas.removeEventListener('touchmove', touchMove, false);
      canvas.removeEventListener('touchend', touchEnd, false);
      window.removeEventListener('resize', this.onWindowResize.bind(this), false);

      // Remove the joystick canvas
      if (this.joystickCanvas && this.joystickCanvas.parentNode) {
        this.joystickCanvas.parentNode.removeChild(this.joystickCanvas);
      }
    }.bind(this);

    this.on('enable', addEventListeners);
    this.on('disable', removeEventListeners);

    addEventListeners();

    // Initial draw to show the joystick
    this.drawJoystick();
  };

  TouchInput.prototype.onWindowResize = function () {
    // If not on mobile, don't do anything
    if (!this.isMobile) return;

    var canvas = this.app.graphicsDevice.canvas;
    this.joystickCanvas.width = canvas.clientWidth;
    this.joystickCanvas.height = canvas.clientHeight;

    // Recalculate joystick dimensions when screen size changes
    this.calculateJoystickDimensions();

    // Update the joystick center position when window resizes
    var posX = (this.joystickPositionX / 100) * canvas.clientWidth;
    var posY = canvas.clientHeight - (this.joystickPositionY / 100) * canvas.clientHeight;

    this.leftStick.center.set(posX, posY);

    this.drawJoystick();
  };

  TouchInput.prototype.drawJoystick = function () {
    // If not on mobile or joystick canvas doesn't exist, don't draw anything
    if (!this.isMobile || !this.joystickCtx || window.chatOpened || window.hideJoystick) return;

    if (window.chatOpened || window.hideJoystick) {
      this.joystickCtx.clearRect(0, 0, this.joystickCanvas.width, this.joystickCanvas.height);
      return;
    }
    // Clear the canvas
    this.joystickCtx.clearRect(0, 0, this.joystickCanvas.width, this.joystickCanvas.height);

    // Draw the outer circle (base)
    this.joystickCtx.beginPath();
    this.joystickCtx.arc(
      this.leftStick.center.x,
      this.leftStick.center.y,
      this.outerRadius,
      0,
      Math.PI * 2,
    );
    this.joystickCtx.fillStyle = 'rgba(45,46,46,255)'; // Dark, semi-transparent background
    this.joystickCtx.fill();
    this.joystickCtx.strokeStyle = 'rgba(50, 50, 50, 0.4)';
    this.joystickCtx.lineWidth = 1;
    this.joystickCtx.stroke();

    // Calculate the knob position
    var knobX = this.leftStick.center.x + this.leftStick.pos.x * this.outerRadius;
    var knobY = this.leftStick.center.y + this.leftStick.pos.y * this.outerRadius;

    // Draw the inner knob first
    this.joystickCtx.beginPath();
    this.joystickCtx.arc(knobX, knobY, this.innerRadius, 0, Math.PI * 2);
    this.joystickCtx.fillStyle = 'rgba(80,80,80,255)';
    this.joystickCtx.fill();
    this.joystickCtx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
    this.joystickCtx.lineWidth = 1.5;
    this.joystickCtx.stroke();

    // Draw the 4 dots inside the knob in a cross pattern
    // Position dots closer to the edge (80% from center to edge)
    var dotDistance = this.innerRadius * 0.75;
    // Make dots smaller (8% of inner radius instead of 15%)
    var dotSize = this.innerRadius * 0.08;

    var dotPositions = [
      { x: 0, y: -dotDistance }, // top
      { x: dotDistance, y: 0 }, // right
      { x: 0, y: dotDistance }, // bottom
      { x: -dotDistance, y: 0 }, // left
    ];

    for (var i = 0; i < dotPositions.length; i++) {
      var dotX = knobX + dotPositions[i].x;
      var dotY = knobY + dotPositions[i].y;

      this.joystickCtx.beginPath();
      this.joystickCtx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
      this.joystickCtx.fillStyle = 'rgba(180, 180, 180, 0.6)';
      this.joystickCtx.fill();
    }

    // Draw "Move" label below the joystick
    if (this.showMoveLabel) {
      this.drawMoveLabel();
    }
  };

  // New method to draw the "Move" label
  TouchInput.prototype.drawMoveLabel = function () {
    if (!this.joystickCtx) return;

    // Calculate label position below joystick
    var labelX = this.leftStick.center.x - this.labelWidth / 2;
    var labelDistance = (this.outerRadius * this.labelDistancePercent) / 100;
    var labelY = this.leftStick.center.y + this.outerRadius + labelDistance;

    // Draw label background (rectangle)
    this.joystickCtx.fillStyle = 'rgba(45,46,46,255)'; // Match joystick color
    this.joystickCtx.strokeStyle = 'rgba(80,80,80,255)'; // Slightly lighter border
    this.joystickCtx.lineWidth = 1;

    // Draw rounded rectangle for the label
    this.roundRect(
      this.joystickCtx,
      labelX,
      labelY,
      this.labelWidth,
      this.labelHeight,
      8, // Corner radius
    );

    // Draw the text "Move"
    this.joystickCtx.fillStyle = 'rgba(200,200,200,255)'; // Light text color
    this.joystickCtx.font = this.labelFontSize + 'px Arial';
    this.joystickCtx.textAlign = 'center';
    this.joystickCtx.textBaseline = 'middle';
    this.joystickCtx.fillText('Move', this.leftStick.center.x, labelY + this.labelHeight / 2);
  };

  // Helper method to draw rounded rectangles
  TouchInput.prototype.roundRect = function (ctx, x, y, width, height, radius) {
    if (typeof radius === 'undefined') {
      radius = 5;
    }

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();
  };

  TouchInput.prototype.update = function (dt) {
    if (!this.isMobile) return;
    if (window.chatOpened || window.hideJoystick) {
      if (this.joystickCtx) {
        this.joystickCtx.clearRect(0, 0, this.joystickCanvas.width, this.joystickCanvas.height);
      }
      return;
    } else {
      this.drawJoystick();
    }
    var app = this.app;

    // Moving
    if (this.leftStick && this.leftStick.identifier !== -1) {
      // Apply a lower radial dead zone. We don't need an upper zone like with a real joypad
      applyRadialDeadZone(this.leftStick.pos, this.remappedPos, this.deadZone, 0);

      var strafe = this.remappedPos.x;
      if (this.lastStrafe !== strafe) {
        app.fire('firstperson:strafe', strafe);
        this.lastStrafe = strafe;
      }
      var forward = -this.remappedPos.y;
      if (this.lastForward !== forward) {
        app.fire('firstperson:forward', forward);
        this.lastForward = forward;
      }
    }

    // Looking
    if (this.rightStick && this.rightStick.identifier !== -1) {
      // Apply a lower radial dead zone. We don't need an upper zone like with a real joypad
      applyRadialDeadZone(this.rightStick.pos, this.remappedPos, this.deadZone, 0);

      var lookLeftRight = -this.remappedPos.x * this.turnSpeed * dt;
      var lookUpDown = -this.remappedPos.y * this.turnSpeed * dt;
      app.fire('firstperson:look', lookLeftRight, lookUpDown);
    }
  };

  ///////////////////////////////////////////////////////////////
  var SwipeCameraRotation = pc.createScript('swipeCameraRotation');

  SwipeCameraRotation.attributes.add('camera', {
    title: 'Camera',
    description: 'The camera to be rotated by swipe or mouse movements',
    type: 'entity',
  });

  SwipeCameraRotation.attributes.add('sensitivity', {
    title: 'Sensitivity',
    description: 'How sensitive the rotation controls are',
    type: 'number',
    default: 0.2,
  });

  SwipeCameraRotation.attributes.add('turnSpeed', {
    title: 'Turn Speed',
    description: 'Maximum turn speed in degrees per second for touch swipes',
    type: 'number',
    default: 150,
  });

  SwipeCameraRotation.prototype.initialize = function () {
    var app = this.app;
    var canvas = app.graphicsDevice.canvas;

    // Check if the user has set a camera entity
    if (!this.camera) {
      // If not, look for a child called 'Camera'
      this.camera = this.entity.findByName('Camera');
      if (!this.camera) {
        // Still don't have a camera so create one
        this.camera = new pc.Entity('Swipe Camera');
        this.camera.addComponent('camera');
        this.entity.addChild(this.camera);
      }
    }

    this.azimuth = 0; // Horizontal rotation angle
    this.isMobile = this.isMobileDevice();

    // Initialize mouse control variables
    this.isMouseDown = false;
    this.lastX = 0;

    // Initialize touch control variables
    this.touchId = -1;
    this.lastTouchX = 0;

    // Mouse event handlers
    var mouseDown = function (e) {
      this.isMouseDown = true;
      this.lastX = e.clientX;
      canvas.style.cursor = 'grabbing';
    }.bind(this);

    var mouseUp = function (e) {
      this.isMouseDown = false;
      canvas.style.cursor = 'grab';
    }.bind(this);

    var mouseMove = function (e) {
      if (this.isMouseDown) {
        // Calculate horizontal movement delta
        var deltaX = e.clientX - this.lastX;
        this.lastX = e.clientX;

        // Only apply horizontal rotation
        this.azimuth -= deltaX * this.sensitivity;

        // Update entity rotation immediately
        this.entity.setEulerAngles(0, this.azimuth, 0);
      }
    }.bind(this);

    var mouseLeave = function (e) {
      this.isMouseDown = false;
      canvas.style.cursor = 'grab';
    }.bind(this);

    // Touch event handlers
    var touchStart = function (e) {
      e.preventDefault();

      // Only track the first touch
      if (this.touchId === -1 && e.changedTouches.length > 0) {
        var touch = e.changedTouches[0];
        this.touchId = touch.identifier;
        this.lastTouchX = touch.clientX;
      }
    }.bind(this);

    var touchMove = function (e) {
      e.preventDefault();

      // Find our tracked touch
      for (var i = 0; i < e.changedTouches.length; i++) {
        var touch = e.changedTouches[i];

        if (touch.identifier === this.touchId) {
          // Calculate swipe distance
          var deltaX = touch.clientX - this.lastTouchX;
          this.lastTouchX = touch.clientX;

          // Apply horizontal rotation based on swipe
          this.azimuth -= deltaX * this.sensitivity;

          // Update entity rotation immediately
          this.entity.setEulerAngles(0, this.azimuth, 0);
          break;
        }
      }
    }.bind(this);

    var touchEnd = function (e) {
      e.preventDefault();

      // Check if our tracked touch ended
      for (var i = 0; i < e.changedTouches.length; i++) {
        var touch = e.changedTouches[i];

        if (touch.identifier === this.touchId) {
          this.touchId = -1;
          break;
        }
      }
    }.bind(this);

    // Set initial cursor style
    canvas.style.cursor = 'grab';

    // Event listener management
    var addEventListeners = function () {
      // Mouse events
      canvas.addEventListener('mousedown', mouseDown, false);
      canvas.addEventListener('mouseup', mouseUp, false);
      canvas.addEventListener('mousemove', mouseMove, false);
      canvas.addEventListener('mouseleave', mouseLeave, false);

      // Touch events
      canvas.addEventListener('touchstart', touchStart, false);
      canvas.addEventListener('touchmove', touchMove, false);
      canvas.addEventListener('touchend', touchEnd, false);
      canvas.addEventListener('touchcancel', touchEnd, false);

      // Prevent context menu
      canvas.addEventListener(
        'contextmenu',
        function (e) {
          e.preventDefault();
        },
        false,
      );
    };

    var removeEventListeners = function () {
      // Mouse events
      canvas.removeEventListener('mousedown', mouseDown, false);
      canvas.removeEventListener('mouseup', mouseUp, false);
      canvas.removeEventListener('mousemove', mouseMove, false);
      canvas.removeEventListener('mouseleave', mouseLeave, false);

      // Touch events
      canvas.removeEventListener('touchstart', touchStart, false);
      canvas.removeEventListener('touchmove', touchMove, false);
      canvas.removeEventListener('touchend', touchEnd, false);
      canvas.removeEventListener('touchcancel', touchEnd, false);

      // Reset cursor
      canvas.style.cursor = 'auto';
    };

    this.on('enable', addEventListeners);
    this.on('disable', removeEventListeners);

    addEventListeners();
  };

  // Helper function to detect if the device is mobile
  SwipeCameraRotation.prototype.isMobileDevice = function () {
    const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const userAgentCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
    return hasTouchSupport && userAgentCheck;
  };
}
