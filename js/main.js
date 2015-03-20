import _ from 'lodash';
import THREE from 'THREE';
import OrbitControls from 'OrbitControls';
import {BHTree} from './bhtree';
import * as ts from 'threestrap';

const THETA = 0.5;
const G = 6.6e-9;

export function run() {
  console.info('Starting the simulation...');

  // Bootstrap the THREE.js scene.
  let paused = true;
  let debug = false;
  let three = THREE.Bootstrap({
    plugins: ['core', 'stats', 'controls'],
    controls: {
      klass: THREE.OrbitControls
    }
  });
  three.camera.position.set(1300, 1300, 1300);

  // Build the point cloud that will render our points.
  let geom = new THREE.Geometry();
  let mat = new THREE.PointCloudMaterial({ size: 5.0 });
  let cloud = new THREE.PointCloud(geom, mat);
  three.scene.add(cloud);

  let helper = new THREE.AxisHelper(250);
  three.scene.add(helper);

  // Create our points and a bounding box to hold them.
  let points = [];
  let box = new THREE.Box3();
  let tree = null;
  for (var i = 0; i < 1000; i++) {
    let vec = new THREE.Vector3(Math.random() * 200 - 100,
                                Math.random() * 200 - 100,
                                Math.random() * 200 - 100);
    vec.mass = 1e10;
    vec.v = new THREE.Vector3();
    points.push(vec);
  }
  geom.vertices = points;

  let debugBoxes = [];
  let debugHelpers = [];
  let toggleDebugTree = () => {
    if (debugBoxes.length) {
      three.scene.remove.apply(three.scene, debugBoxes);
      three.scene.remove.apply(three.scene, debugHelpers);
      debugBoxes = [];
      debugHelpers = [];
    } else {
      for (var n of tree) {
        let size = n.octant.size();
        let box = new THREE.BoxGeometry(size.x, size.x, size.x);
        let cube = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ 
          wireframe: true
        }));
        debugBoxes.push(cube);

        let helper = new THREE.AxisHelper(25);
        debugHelpers.push(helper);

        three.scene.add(cube);
        three.scene.add(helper);

        let center = n.octant.center();
        cube.position.set(center.x, center.y, center.z);
        helper.position.set(n.com.x, n.com.y, n.com.z);
      }
    }
  };

  document.onkeypress = (evt) => {
    if (evt.which == 112) {
      if (paused) {
        console.info("Simulation resumed.");
      } else {
        console.info("Simulation paused.");
      }
      paused = !paused;
    }

    if (evt.which == 101) {
      toggleDebugTree();
    }
  };

  // Long tick to re-build the BHTree and 
  three.on('update', function() {
    if (paused) return;

    var time = three.Time.now;
    var delta = three.Time.delta;

    box.setFromPoints(points);
    tree = new BHTree(box);
    for (var p of points) {
      tree.insert(p);
    }

    for (var point of points) {
      // Set up the pruning predicate. This function determines whether or not
      // the iterator should continue traversing the children of the selected
      // node. True indicates that it should, false indicates that this node is
      // far enough away that we can use it as if it were a body.
      let pred = (node) => {
        let size = node.octant.size().x;
        return ((size * size) / point.distanceToSquared(node.com)) > THETA;
      }

      // Reset acceleration, calculate Newtonian gravitational force, divide by
      // mass of affected body.
      let acc = new THREE.Vector3();
      for (var node of tree.traverse(pred)) {
        let mag = G * point.mass * node.mass / point.distanceToSquared(node.com);
        acc.add(node.com.clone().sub(point).setLength(mag));
      }
      acc.divideScalar(point.mass);

      point.add(point.v.clone().multiplyScalar(delta));
      point.v.add(acc.multiplyScalar(delta));
      cloud.geometry.verticesNeedUpdate = true;
    }
  });

}
