
export class Tracker {
  constructor() {
    this.iterations = [];
    this.current = null;
  }

  start() {
    this.current = {
      start: Date.now()
    };
  }

  count(label) {
    this.current[label]++;
  }

  average(label) {
    let sum = _.reduce(this.iterations, function(mem, el) {
      return mem + el[label];
    }, 0);

    return !this.iterations.length ? 0 : sum / this.iterations.length;
  }

  end() {
    this.current.end = Date.now();
    this.iterations.push(this.current);
  }
}
