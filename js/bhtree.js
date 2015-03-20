import _ from "lodash";
import THREE from "THREE";

const EMPTY = 0;
const LEAF = 1;
const BRANCH = 2;

// BHNode
//
// An object that represents a single node on the extended, Barnes-Hut octree.
// It stores an aggregate mass and center of mass for its descendendants. 
export class BHNode {
  constructor(octant) {
    this.mass = 0;
    this.state = EMPTY;
    this.com = null;
    this.octant = octant;
    this.subtrees = new Array(8);
  }

  subdivide(region) {
    // Clone our octant.
    let box = this.octant.clone();

    // Get a vector that represents a half-extent offset.
    let size = box.size().divideScalar(2);
    let center = box.size().divideScalar(4);
    !(region & 4) && center.setZ(center.z * -1);
    !(region & 2) && center.setY(center.y * -1);
    !(region & 1) && center.setX(center.x * -1);
    center.add(box.center());

    return box.setFromCenterAndSize(center, size);
  }

  insert(particle) {
    // If we don't have a particle, 
    switch (this.state) {
      case EMPTY: {
        this.mass = particle.mass;
        this.com = new THREE.Vector3(particle.x, particle.y, particle.z);
        this.state = LEAF;
      } break;
      case LEAF: {
        // Get octant index for self.
        param = this.octant.getParameter(this.com);
        let si = ((param.z >= 0.5) ? 4 : 0) | ((param.y >= 0.5) ? 2 : 0) |
          ((param.x >= 0.5) ? 1 : 0);

        // If this node's particle and the inserted particle are not going into
        // the same octant, we need to create a new tree node for ourselves.
        let snode = new BHNode(this.subdivide(si));
        snode.mass = this.mass;
        snode.com = this.com.clone();
        snode.state = LEAF;

        this.subtrees[si] = snode;
        this.state = BRANCH;
        this.insert(particle);
      } break;
      case BRANCH: {
        let param = this.octant.getParameter(particle);
        let i = ((param.z > 0.5) ? 4 : 0) | ((param.y > 0.5) ? 2 : 0) |
          ((param.x > 0.5) ? 1 : 0);

        if (this.subtrees[i]) {
          this.subtrees[i].insert(particle);
        } else {
          let node = new BHNode(this.subdivide(i));
          node.mass = particle.mass;
          node.com = new THREE.Vector3(particle.x, particle.y, particle.z);
          node.state = LEAF;
          this.subtrees[i] = node;
        }

        var target = this.subtrees[i];
        this.com.addVectors(this.com.clone().multiplyScalar(this.mass),
                            target.com.clone().multiplyScalar(target.mass));
        this.com.divideScalar(this.mass + target.mass);
        this.mass += target.mass
      }
      default: break;
    }
  }
}

// BHTree
//
// Implementation of a Barnes-Hut extended octree. Maintains a fixed-length
// typed buffer 
export class BHTree {
  constructor(quad) {
    this.root = new BHNode(quad);
  }

  insert(particle) {
    this.root.insert(particle);
  }

  [Symbol.iterator]() {
    let todo = [this.root];
    return {
      next: function() {
        let node = todo.pop();
        if (!node) {
          return { done: true };
        }

        for (var s of node.subtrees) {
          if (s) { 
            todo.push(s);
          }
        }
        return { value: node };
      }
    };
  }

  traverse(fn) {
    let root = this.root;
    return {
      [Symbol.iterator]() {
        let todo = [root];
        return {
          next: function() {
            let node = todo.pop();
            if (!node) {
              return { done: true };
            }

            if (!fn(node)) {
              return { value: node };
            } else {
              for (var i = 0; i < node.subtrees.length; i++) {
                node.subtrees[i] && todo.push(node.subtrees[i]);
              }
              return this.next();
            }
          }
        };
      }
    };
  }
}
