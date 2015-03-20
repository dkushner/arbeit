importScripts('jspm_packages/traceur-runtime.js',
              'jspm_packages/traceur.js',
              'jspm_packages/es6-module-loader.js', 
              'jspm_packages/system.js', 
              'config.js');

System.baseURL = './';
System.import('arbeit/worker').catch( function(err) {
  console.error('Error during import: ', err);
}).then(function(w) {
  return w.run();
}).catch(function(err) { 
  console.error('Error during bootstrap: ', err);
});
