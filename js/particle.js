// Particle
//
// This class actually just represents a reference into an allocated
// ArrayBuffer maintained by the ParticleSet.

var index = new Symbol('index');
var set = new Symbol('set');
var view = new Symbol('view');

class Particle {
  constructor(idx, set) {
    this[index] = idx;
    this[set] = set;
  }

  get mass() {
    this[set][view].getUint16(14 * this[index]);
  }

  set mass(val) {
    this[set][view].setUint16(14 * this[index], val);
  }

  get x() {
    this[set][view].getFloat32((14 * this[index]) + 2);
  }

  set x(val) {
    this[set][view].setFloat32((14 * this[index]) + 2, val);
  }

  get y() {
    this[set][view].getFloat32((14 * this[index]) + 6);
  }

  get y(val) {
    this[set][view].setFloat32((14 * this[index]) + 6, val);
  }

  get z() {
    this[set][view].getFloat32((14 * this[index]) + 10);
  }

  set z(val) {
    this[set][view].setFloat32((14 * this[index]) + 10, val);
  }
}

class ParticleSet { 
  constructor(buffer) {
    this[view] = new DataView(buffer);
  }

  [Symbol.iterator]() {
    let idx = 0;
    let length = this[view].byteLength / 14;

    return {
      next() {
        if (idx < length) {
          return { value: new Particle(idx++, this) };
        } else {
          return { done: true };
        }
      }
    };
  }
}

export {ParticleSet};
