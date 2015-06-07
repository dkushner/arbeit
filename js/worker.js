import _ from 'lodash';
import {BHTree} from './bhtree';
import {Proxy} from './proxy';
import {ParticleSet} from './particleset';
import glMatrix from 'glMatrix';

const G = 6.67384e-8;
const THETA = 1;

let particles;
let tree;

export function run() {
  console.info('Starting worker...');
  onmessage = receive;
  postMessage(1);
}

function build() {
  //console.time('Iteration');
  tree.build();

  // Iterate through the point set, updating the acceleration of each particle.
  for (var i = 0; i < particles.length; i++) {
    let point = particles.at(i);

    let pred = (node) => {
      let size = node.extent * 2;
      return (vec3.sqrDist(point.position, node.com) / (size * size)) < THETA;
    };

    let acc = vec3.create();
    for (var node of tree.traverse(pred)) {
      let mag = G * point.mass * node.mass / 
        vec3.sqrDist(point.position, node.com);
      
      let dir = vec3.create();
      vec3.normalize(dir, vec3.sub(dir, node.com, point.position));
      vec3.scaleAndAdd(acc, acc, dir, mag);
    }
    vec3.scale(point.acceleration, acc, 1 / point.mass);
  }
  //console.timeEnd('Iteration');
}

function receive(event) {
  let positions = event.data.positions;
  let velocities = event.data.velocities;
  let accelerations = event.data.accelerations;
  let masses = event.data.masses;

  if (!particles) {
    particles = new ParticleSet(event.data.count);
    tree = new BHTree(particles);
  }

  particles.data.positions.set(positions);
  particles.data.velocities.set(velocities);
  particles.data.accelerations.set(accelerations);
  particles.data.masses.set(masses);

  build();

  positions.set(particles.data.positions);
  velocities.set(particles.data.velocities);
  accelerations.set(particles.data.accelerations);
  masses.set(particles.data.masses);
  
  postMessage({
    positions: positions,
    velocities: velocities,
    accelerations: accelerations,
    masses: masses
  }, [
    positions.buffer, 
    velocities.buffer, 
    accelerations.buffer,
    masses.buffer
  ]);
}

