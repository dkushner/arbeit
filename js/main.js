import _ from 'lodash';
import THREE from 'THREE';
import OrbitControls from 'OrbitControls';
import {ParticleSet} from './particleset';
import {Proxy} from './proxy';
import glMatrix from 'glMatrix';
import * as ts from 'threestrap';

const SOL = 1.98892e15;
const G = 6.67384e-8;

const N = 5000;
const DELTA = 1/60;

let particles = new ParticleSet(N);
let geometry = new THREE.Geometry();
let proxy = new Proxy('worker.js');

let tx = {
  sent: null,
  positions: new Float64Array(N * 3),
  velocities: new Float64Array(N * 3),
  accelerations: new Float64Array(N * 3),
  masses: new Float64Array(N)
};

export function run() {
  console.info('Starting the simulation...');

  // Bootstrap the THREE.js scene.
  let paused = false;
  let three = THREE.Bootstrap({
    plugins: ['core', 'stats', 'controls', 'fullscreen'],
    controls: {
      klass: THREE.OrbitControls
    },
    camera: {
      near: 0.1,
      far: 1e20
    },
    fullscreen: {
      key: 'f'
    }
  });
  three.camera.position.set(1300, 1300, 1300);

  // Build the point cloud that will render our points.
  let mat = new THREE.PointCloudMaterial({ 
    size: 1.0,
    vertexColors: THREE.VertexColors
  });
  let cloud = new THREE.PointCloud(geometry, mat);
  three.scene.add(cloud);

  // Add an axis helper to help orient ourselves.
  let helper = new THREE.AxisHelper(250);
  three.scene.add(helper);

  console.info('Generating %d points...', N);
  for (var i = 0; i < N; i++) {
    let theta = Math.random() * 2 * Math.PI;
    let phi = Math.random() * Math.PI - (Math.PI / 2);

    let x = 1.0e5 * Math.cos(theta) * Math.cos(phi);
    let y = 1.0e2 * Math.sin(phi);
    let z = 1.0e5 * Math.sin(theta) * Math.cos(phi);

    let p = particles.at(i);

    vec3.set(p.position, x, y, z);
    p.mass = 0.005 * Math.random() * SOL;

    let dist = vec3.length(p.position);
    let dir = vec3.cross(vec3.create(), p.position, [0, 1, 0]);
    vec3.normalize(dir, dir);
    vec3.scale(p.velocity, dir, Math.sqrt(G * (SOL + p.mass) / dist));
  }

  // Set a major orbital body at the center.
  vec3.set(particles.at(0).position, 0, 0, 0);
  particles.at(0).mass = SOL;
  vec3.set(particles.at(0).velocity, 0, 0, 0);

  tx.positions.set(particles.data.positions);
  tx.velocities.set(particles.data.velocities);
  tx.accelerations.set(particles.data.accelerations);
  tx.masses.set(particles.data.masses);

  geometry.vertices = Array.from(particles, p => {
    return new THREE.Vector3(p.position[0], p.position[1], p.position[2]);
  });

  geometry.colors = Array.from(particles, p => {
    let color = new THREE.Color();
    color.setHSL(p.mass / (0.005 * SOL), 1.0, 0.6);
    return color;
  });

  document.onkeypress = (evt) => {
    if (evt.which == 112) {
      if (paused) {
        console.info("Simulation resumed.");
      } else {
        console.info("Simulation paused.");
      }
      paused = !paused;
    }
  };

  // Long tick to re-build the BHTree and 
  three.on('update', function() {
    if (paused) return;

    var time = three.Time.now;
    var delta = three.Time.delta;

    for (var i = 0; i < particles.length; i++) {
      let p = particles.at(i);

      vec3.scaleAndAdd(p.velocity, p.velocity, p.acceleration, delta);
      vec3.scaleAndAdd(p.position, p.position, p.velocity, delta);
      
      geometry.vertices[i].fromArray(p.position);
    }

    helper.position.fromArray(particles.at(0).position);
    geometry.verticesNeedUpdate = true;
  });

  proxy.run().then(function(worker) {
    worker.onmessage = receive;
    send();
  });
}

function receive(evt) {
  tx.positions = evt.data.positions;
  tx.velocities = evt.data.velocities;
  tx.accelerations = evt.data.accelerations;
  tx.masses = evt.data.masses;

  particles.data.accelerations.set(tx.accelerations);

  let delay = Math.max(DELTA * 1000 - (Date.now() - tx.sent), 0);
  setTimeout(send, delay);
}

function send() {
  tx.positions.set(particles.data.positions);
  tx.velocities.set(particles.data.velocities);
  tx.accelerations.set(particles.data.accelerations);
  tx.masses.set(particles.data.masses);

  tx.sent = Date.now();

  proxy.send({
    count: N,
    delta: DELTA,
    positions: tx.positions,
    velocities: tx.velocities,
    accelerations: tx.accelerations,
    masses: tx.masses
  }, [
    tx.positions.buffer, 
    tx.velocities.buffer, 
    tx.accelerations.buffer,
    tx.masses.buffer
  ]);
}
