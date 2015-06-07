export class ParticleSet {
  constructor(size) {
    this.data = {};
    this.data.positions = new Float64Array(size * 3);
    this.data.velocities = new Float64Array(size * 3);
    this.data.accelerations = new Float64Array(size * 3);
    this.data.masses = new Float64Array(size);

    this.proxies = new Array(size);
    for (var i = 0; i < size; i++) {
      this.proxies[i] = new Particle(i, this.data);
    }
  }

  [Symbol.iterator]() {
    let cur = 0, value;
    let proxies = this.proxies;
    return {
      next() {
        if (cur < proxies.length) {
          [value, cur] = [proxies[cur], cur + 1];
          return { value: value, done: false };
        } else {
          return { done: true };
        }
      }
    };
  }

  get length() {
    return this.proxies.length;
  }

  at(i) {
    return this.proxies[i];
  }
}

class Particle {
  constructor(i, data) {
    this.index = i;
    this.positionView = new Float64Array(data.positions.buffer, i * 24, 3);
    this.velocityView = new Float64Array(data.velocities.buffer, i * 24, 3);
    this.accelerationView = new Float64Array(data.accelerations.buffer, i * 24, 3);
    this.massView = new Float64Array(data.masses.buffer, i * 8, 1);
  }

  get position() {
    return this.positionView;
  }

  get velocity() {
    return this.velocityView;
  }

  get acceleration() {
    return this.accelerationView;
  }

  get mass() {
    return this.massView[0];
  }

  set mass(value) {
    return this.massView[0] = value;
  }

  debug() {
    console.group('Particle %d', this.index);
    console.log("Position { %d, %d, %d }", 
      this.position[0], this.position[1], this.position[2]);
    console.log("Velocity { %d, %d, %d }",
      this.velocity[0], this.velocity[1], this.velocity[2]);
    console.log("Mass { %d }", this.mass);
    console.groupEnd();
  }
}
