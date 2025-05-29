import * as pc from 'playcanvas';
export function ScreenShot() {
  var Screenshot = pc.createScript('screenshot');
  Screenshot.attributes.add('cameraEntity', {
    type: 'entity',
    description:
      'The camera entity to use for taking the screenshot with. Whatever, this camera renders will be in the screen capture.',
  });

  Screenshot.prototype.initialize = function () {
    this.createNewRenderTexture();

    this.app.graphicsDevice.on(
      'resizecanvas',
      function (w, h) {
        this.secsSinceSameSize = 0;
      },
      this,
    );

    var device = this.app.graphicsDevice;
    this.lastWidth = device.width;
    this.lastHeight = device.height;

    this.secsSinceSameSize = 0;

    this.triggerScreenshot = false;

    var onTakeScreenshot = function () {
      this.triggerScreenshot = true;
      this.cameraEntity.enabled = true;
    };

    this.app.on('ui:takeScreenshot', onTakeScreenshot, this);
    this.app.on('postrender', this.postRender, this);

    // Disable the screenshot camera as we only want it enabled when we take the screenshot itself
    this.cameraEntity.enabled = false;

    // Ensure it gets rendered first so not to interfere with other cameras
    this.cameraEntity.camera.priority = -1;

    // Add a <a> to use to download an image file
    var linkElement = document.createElement('a');
    linkElement.id = 'link';
    window.document.body.appendChild(linkElement);

    // Clean up resources if script is destroyed
    this.on(
      'destroy',
      function () {
        this.app.off('ui:takeScreenshot', onTakeScreenshot, this);
        this.app.off('postrender', this.postRender, this);

        window.document.body.removeChild(linkElement);

        if (this.renderTarget) {
          this.renderTarget.destroy();
          this.renderTarget = null;
        }

        if (this.colorTexture) {
          this.colorTexture.destroy();
          this.colorTexture = null;
        }

        if (this.depthTexture) {
          this.depthTexture.destroy();
          this.depthTexture = null;
        }

        this.canvas = null;
        this.context = null;
      },
      this,
    );
  };

  // update code called every frame
  Screenshot.prototype.update = function (dt) {
    // We don't want to be constantly creating an new texture if the window is constantly
    // changing size (e.g a user that is dragging the corner of the browser over a period)
    // of time.

    // We wait for the the canvas width and height to stay the same for short period of time
    // before creating a new texture to render against.

    var device = this.app.graphicsDevice;

    if (device.width == this.lastWidth && device.height == this.lastHeight) {
      this.secsSinceSameSize += dt;
    }

    if (this.secsSinceSameSize > 0.25) {
      if (
        this.unScaledTextureWidth != device.width ||
        this.unScaledTextureHeight != device.height
      ) {
        this.createNewRenderTexture();
      }
    }

    this.lastWidth = device.width;
    this.lastHeight = device.height;
  };

  Screenshot.prototype.postRender = function () {
    if (this.triggerScreenshot) {
      this.takeScreenshot('screenshot');
      this.triggerScreenshot = false;
      this.cameraEntity.enabled = false;
    }
  };

  Screenshot.prototype.createNewRenderTexture = function () {
    var device = this.app.graphicsDevice;

    // Make sure we clean up the old textures first and remove
    // any references
    if (this.colorTexture && this.depthTexture && this.renderTarget) {
      var oldRenderTarget = this.renderTarget;
      var oldColorTexture = this.colorTexture;
      var oldDepthTexture = this.depthTexture;

      this.renderTarget = null;
      this.colorTexture = null;
      this.depthTexture = null;

      oldRenderTarget.destroy();
      oldColorTexture.destroy();
      oldDepthTexture.destroy();
    }

    // Create a new texture based on the current width and height
    var colorBuffer = new pc.Texture(device, {
      width: device.width,
      height: device.height,
      format: pc.PIXELFORMAT_R8_G8_B8_A8,
      autoMipmap: true,
    });

    var depthBuffer = new pc.Texture(device, {
      format: pc.PIXELFORMAT_DEPTHSTENCIL,
      width: device.width,
      height: device.height,
      mipmaps: false,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE,
      addressV: pc.ADDRESS_CLAMP_TO_EDGE,
    });

    colorBuffer.minFilter = pc.FILTER_LINEAR;
    colorBuffer.magFilter = pc.FILTER_LINEAR;
    var renderTarget = new pc.RenderTarget({
      colorBuffer: colorBuffer,
      depthBuffer: depthBuffer,
      samples: 4, // Enable anti-alias
    });

    this.cameraEntity.camera.renderTarget = renderTarget;

    this.unScaledTextureWidth = device.width;
    this.unScaledTextureHeight = device.height;

    this.colorTexture = colorBuffer;
    this.depthTexture = depthBuffer;
    this.renderTarget = renderTarget;

    var cb = this.renderTarget.colorBuffer;

    if (!this.canvas) {
      // Create a canvas context to render the screenshot to
      this.canvas = window.document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
    }

    this.canvas.width = cb.width;
    this.canvas.height = cb.height;

    // The render is upside down and back to front so we need to correct it
    this.context.globalCompositeOperation = 'copy';
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.scale(1, -1);
    this.context.translate(0, -this.canvas.height);

    this.pixels = new Uint8Array(colorBuffer.width * colorBuffer.height * 4);
  };

  // From https://forum.playcanvas.com/t/save-specific-rendered-entities-to-image/2855/4
  Screenshot.prototype.takeScreenshot = function (filename) {
    var colorBuffer = this.renderTarget.colorBuffer;
    var depthBuffer = this.renderTarget.depthBuffer;

    // Fix for WebKit: https://github.com/playcanvas/developer.playcanvas.com/issues/268
    // context must be cleared otherwise the first screenshot is always used

    // https://stackoverflow.com/a/6722031/8648403
    // Store the current transformation matrix
    this.context.save();

    // Use the identity matrix while clearing the canvas
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.clearRect(0, 0, colorBuffer.width, colorBuffer.height);

    // Restore the transform
    this.context.restore();

    var gl = this.app.graphicsDevice.gl;
    var fb = this.app.graphicsDevice.gl.createFramebuffer();
    var pixels = this.pixels;

    // We are accessing a private property here that has changed between
    // Engine v1.51.7 and v1.52.2
    var colorGlTexture = colorBuffer.impl ? colorBuffer.impl._glTexture : colorBuffer._glTexture;
    var depthGlTexture = depthBuffer.impl ? depthBuffer.impl._glTexture : depthBuffer._glTexture;

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorGlTexture, 0);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.DEPTH_STENCIL_ATTACHMENT,
      gl.TEXTURE_2D,
      depthGlTexture,
      0,
    );
    gl.readPixels(0, 0, colorBuffer.width, colorBuffer.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    gl.deleteFramebuffer(fb);

    // first, create a new ImageData to contain our pixels
    var imgData = this.context.createImageData(colorBuffer.width, colorBuffer.height); // width x height
    var data = imgData.data;

    // Get a pointer to the current location in the image.
    var palette = this.context.getImageData(0, 0, colorBuffer.width, colorBuffer.height); //x,y,w,h

    // Wrap your array as a Uint8ClampedArray
    palette.data.set(new Uint8ClampedArray(pixels)); // assuming values 0..255, RGBA, pre-mult.

    // Repost the data.
    this.context.putImageData(palette, 0, 0);
    this.context.drawImage(this.canvas, 0, 0);

    var image = this.canvas.toDataURL('image/png');
    var b64 = this.canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');

    // Thanks https://stackoverflow.com/a/44487883
    var link = document.getElementById('link');
    link.setAttribute('download', filename + '.png');
    link.setAttribute('href', b64);
    link.click();
  };
}
