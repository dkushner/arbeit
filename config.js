System.config({
  "paths": {
    "arbeit/*": "js/*.js",
    "*": "*.js",
    "github:*": "jspm_packages/github/*.js",
    "npm:*": "jspm_packages/npm/*.js"
  }
});

System.config({
  "meta": {
    "github:mrdoob/three.js@master/build/three": {
      "format": "global",
      "exports": "THREE"
    }
  }
});

System.config({
  "map": {
    "THREE": "github:mrdoob/three.js@master/build/three",
    "OrbitControls": "github:mrdoob/three.js@master/examples/js/controls/OrbitControls",
    "lodash": "npm:lodash@3.5.0",
    "three": "github:mrdoob/three.js@master",
    "threestrap": "github:unconed/threestrap@0.0.9",
    "traceur-runtime": "github:jmcriffey/bower-traceur-runtime@0.0.87",
    "github:jspm/nodelibs-process@0.1.1": {
      "process": "npm:process@0.10.1"
    },
    "github:unconed/threestrap@0.0.9": {
      "three": "github:mrdoob/three.js@master"
    },
    "npm:lodash@3.5.0": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    }
  }
});

