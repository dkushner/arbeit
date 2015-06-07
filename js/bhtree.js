import _ from "lodash";
import {ParticleSet} from "./particleset";
import glMatrix from "glMatrix";

export class BHTree {
  constructor(particles) {
    this.particles = particles;
    this.cells = new CellSet(particles.length * 2);
  }

  build() {
    // Reclaim all cells currently in use.
    this.cells.reclaim();

    // We begin building the BH tree by finding the maximum extents of our
    // particle set and using this to create our root node.
    let min = vec3.create();
    let max = vec3.create();

    for (var p of this.particles) {
      vec3.min(min, min, p.position);
      vec3.max(max, max, p.position);
    }

    this.root = this.cells.allocate();

    let span = vec3.sub(vec3.create(), max, min);
    this.root.extent = Math.max(span[0], span[1], span[2]);

    // Next we begin to insert our particles one at a time, 
    for (var p of this.particles) {
      this.root.insert(p);
    }
  }
  
  traverse(pred) {
    let left = [this.root];

    return {
      [Symbol.iterator]() {
        return {
          next() {
            let node = left.pop();

            if (!node) return { done: true };
          
            if (!pred(node)) {
              return { value: node, done: false };
            } else {
              Array.prototype.push.apply(left, _.compact(node.children));
              return this.next();
            }
          }
        }
      }
    };
  }

  debug() {
    console.groupCollapsed('BHTree');
    console.dir(this.root);
    console.groupEnd();
  }
}

/**
 * CellSet
 * 
 * Lazy access set of octree cells with aggressive pooling.
 */
class CellSet {
  constructor(size) {
    // Allocate the backing buffer to store the actual data referenced by our
    // cell proxies.
    this.data = {};
    this.data.positions = new Float64Array(size * 3);
    this.data.coms = new Float64Array(size * 3);
    this.data.extents = new Float64Array(size);
    this.data.masses = new Float64Array(size);

    // Maintain a preallocated reserve of cell proxies.
    this.reserve = new Array(size);

    // We fill the reserve and assign inidices incrementally, but its important
    // to remember that each cell stores its buffer reference independently and
    // it therefore does not matter how they are stored when they are returned
    // to the reserve.
    for (var i = 0; i < size; i++) {
      this.reserve[i] = new Cell(this.allocate.bind(this));
      this.reserve[i].attach(i, this.data);
    }
  }

  reclaim() {
    this.reserve.forEach(c => this.free(c));
  }

  expand() {
    let capacity = this.reserve.length * 2;
    console.info("Expanding cell buffer to %d.", capacity);

    // Store a reference to the old buffer and then create a new one with twice
    // the capacity.
    let positions = new Float64Array(capacity * 3);
    let coms = new Float64Array(capacity * 3);
    let extents = new Float64Array(capacity);
    let masses = new Float64Array(capacity);

    positions.set(this.data.positions);
    coms.set(this.data.coms);
    extents.set(this.data.extents);
    masses.set(this.data.masses);

    this.data.positions = positions;
    this.data.coms = coms;
    this.data.extents = extents;
    this.data.masses = masses;

    // Reinitialize existing nodes to reference the newly expanded array buffer.
    this.reserve.forEach(function(el, idx) {
      el.attach(idx, this.data);
    }, this);

    // Resize the reserve and allocate new cells to fill it.
    let extension = new Array(this.reserve.length);
    for (var i = 0; i < extension.length; i++) {
      let offset = i + this.reserve.length;
      extension[i] = new Cell(this.allocate.bind(this));
      extension[i].attach(offset, this.data);
    }
    Array.prototype.push.apply(this.reserve, extension);
    return;
  }

  allocate() {
    // Find the first inactive cell in the reserve.
    let alloc = this.reserve.find(function(cl) {
      return !cl.active;
    });

    // If our search is successful, return the cell. If not, expand then try
    // again.
    if (alloc) {
      alloc.active = true;
      return alloc;
    } else {
      this.expand();
      return this.allocate();
    }
  }

  free(cell) {
    cell.active = false;
    cell.reset();
  }
}

class Cell {
  constructor(allocator) {
    // Reference to the cell set's function for allocating new nodes.
    this.create = allocator;

    // Whether or not this cell is presently in use.
    this.active = false;

    // Reference to the particle that this node is holding.
    this.particle = null;

    // Array of descendants.
    this.children = new Array(8);
  }

  attach(index, data) {
    this.positionView = new Float64Array(data.positions.buffer, index * 24, 3);
    this.comView = new Float64Array(data.coms.buffer, index * 24, 3);
    this.extentView = new Float64Array(data.extents.buffer, index * 8, 1);
    this.massView = new Float64Array(data.masses.buffer, index * 8, 1);
  }

  get position() {
    return this.positionView;
  }

  get com() {
    return this.comView;
  }

  get extent() {
    return this.extentView[0];
  }

  set extent(value) {
    this.extentView[0] = value;
  }

  get mass() {
    return this.massView[0];
  }

  set mass(value) {
    return this.massView[0] = value;
  }

  octant(position) {
    let oct = 0x0;
    oct |= position[0] <= this.position[0] ? 0 : 1;
    oct |= position[1] <= this.position[1] ? 0 : 2;
    oct |= position[2] <= this.position[2] ? 0 : 4;
    return oct;
  }

  insert(p) {
    if (!p) debugger;
    if (!p.mass) {
      return;
    }

    // If the node has no mass presently, we must be empty. We simply assume
    // this particle's mass and set our COM to its position.
    if (!this.mass) {
      this.mass = p.mass;
      this.particle = p;
      vec3.set(this.com, p.position[0], p.position[1], p.position[2]);
      return;
    }

    // If we have a particle set, then this must be a leaf node. Before we can
    // add the inbound particle, we must subdivide ourselves to create an
    // interior node that will have two leaf nodes when we are done.
    if (!!this.particle) {
      let ours = this.octant(this.com);
      this.subdivide(ours);
      this.children[ours].insert(this.particle);
      this.particle = null;
    }

    let other = this.octant(p.position);
    if (!this.children[other]) {
      this.subdivide(other);
    }

    // Adjust this cell's COM to compensate for the newly added particle.
    let acom = vec3.clone(this.com);
    let bcom = vec3.clone(p.position);
    let tmass = this.mass + p.mass;

    vec3.scale(acom, acom, this.mass / tmass);
    vec3.scale(bcom, bcom, p.mass / tmass);
    vec3.add(this.com, acom, bcom);
    this.mass = tmass;

    return this.children[other].insert(p);
  }

  reset() {
    vec3.set(this.position, 0, 0, 0);
    vec3.set(this.com, 0, 0, 0);
    this.mass = 0;
    this.extent = 0;
    this.particle = null;
    this.children = new Array(8);
  }

  subdivide(octant) {
    let semi = this.extent * 0.5;
    let child = this.create();
    child.extent = semi;

    let offset = [
      !!(0x1 & octant) ? 1 : -1,
      !!(0x2 & octant) ? 1 : -1,
      !!(0x4 & octant) ? 1 : -1
    ];

    vec3.scale(offset, offset, semi);
    vec3.add(child.position, this.position, offset);
    this.children[octant] = child;
  }
}
