(function() {
  function bootstrap(main) {
    return main.run();
  }

  function importError(err) {
    console.error('Error while importing: ', err);
  }

  function bootstrapError(err) {
    console.error('Error while bootstrapping: ', err.stack);
  }

  console.info('Bootstrapping Arbeit...');

  System.import('arbeit/main')
  .catch(importError)
  .then(bootstrap)
  .catch(bootstrapError);
})();
