import * as pc from 'playcanvas';
export function SetCubeMapDds(app, postData) {
  return new Promise((resolve, reject) => {
    const reflectionAsset = new pc.Asset('reflection', 'cubemap', {
      //url: 'https://object.ord1.coreweave.com/pods-bucket/pods/ZenRetreat301/cubemap.dds',
      url: postData.podData?.podSettingsGlobal?.floorCubemapUrl,
    });

    let reflectionLoaded = false;
    let reflectionCubemap = null;

    function checkDone() {
      if (reflectionLoaded) {
        resolve(reflectionCubemap);
      }
    }

    reflectionAsset.once('load', () => {
      reflectionCubemap = reflectionAsset.resources?.[1];
      if (!reflectionCubemap) {
        reject(new Error('Reflection cubemap missing'));
        return;
      }

      reflectionLoaded = true;
      checkDone();
    });

    reflectionAsset.once('error', reject);

    app.assets.add(reflectionAsset);
    app.assets.load(reflectionAsset);
  });
}
