'use strict';

var Q = require('q');
var optimist = require('optimist');
var cordovaUtils = require('../../utils/cordova');
var os = require('os');
var IonicAppLib = require('ionic-app-lib');
var ConfigXml = IonicAppLib.configXml;
var log = IonicAppLib.logging.logger;
var emulate = require('../emulate');
var npmScripts = require('../../utils/npmScripts');

describe('emulate command', function() {
  beforeEach(function() {
    spyOn(log, 'error');
    spyOn(ConfigXml, 'setConfigXml').and.returnValue(Q(true));
  });

  describe('command settings', function() {

    it('should have a title', function() {
      expect(emulate.title).toBeDefined();
      expect(emulate.title).not.toBeNull();
      expect(emulate.title.length).toBeGreaterThan(0);
    });

    it('should have a summary', function() {
      expect(emulate.summary).toBeDefined();
      expect(emulate.summary).not.toBeNull();
      expect(emulate.summary.length).toBeGreaterThan(0);
    });

    it('should have a set of options with boolean defaults to true', function() {
      expect(emulate.options).toEqual(jasmine.any(Object));
      expect(emulate.options['--consolelogs|-c']).toEqual(jasmine.any(Object));
      expect(emulate.options['--consolelogs|-c'].boolean).toEqual(true);
      expect(emulate.options['--serverlogs|-s']).toEqual(jasmine.any(Object));
      expect(emulate.options['--serverlogs|-s'].boolean).toEqual(true);
      expect(emulate.options['--debug|--release']).toEqual(jasmine.any(Object));
      expect(emulate.options['--debug|--release'].boolean).toEqual(true);
    });
  });


  describe('cordova platform checks', function() {

    var appDirectory = '/ionic/app/path';
    var processArguments = ['node', 'ionic', 'emulate', '-n'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    beforeEach(function() {
      spyOn(process, 'cwd').and.returnValue(appDirectory);
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);
      spyOn(npmScripts, 'hasIonicScript').and.returnValue(Q(false));
    });

    it('should default to iOS for the platform', function(done) {
      spyOn(os, 'platform').and.returnValue('darwin');

      emulate.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.isPlatformInstalled).toHaveBeenCalledWith('ios', appDirectory);
        done();
      });
    });

    it('should fail if the system is not Mac and the platform is iOS', function(done) {
      spyOn(os, 'platform').and.returnValue('windows');

      emulate.run(null, argv, rawCliArguments).then(function() {
        expect(log.error).toHaveBeenCalledWith('✗ You cannot run iOS unless you are on Mac OSX.');
        done();
      });
    });
  });


  describe('cordova platform and plugin checks', function() {

    var appDirectory = '/ionic/app/path';
    var processArguments = ['node', 'ionic', 'emulate', 'ios', '-n'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    beforeEach(function() {
      spyOn(os, 'platform').and.returnValue('darwin');
      spyOn(process, 'cwd').and.returnValue(appDirectory);
      spyOn(cordovaUtils, 'installPlatform').and.returnValue(Q(true));
      spyOn(cordovaUtils, 'installPlugins').and.returnValue(Q(true));
      spyOn(npmScripts, 'hasIonicScript').and.returnValue(Q(false));
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(true));
    });

    it('should try to install the cordova platform if it is not installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(false);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);

      emulate.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.installPlatform).toHaveBeenCalledWith('ios');
        done();
      });
    });

    it('should not try to install the cordova platform if it is installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);

      emulate.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.installPlatform).not.toHaveBeenCalledWith();
        done();
      });
    });

    it('should install plugins if they are not installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(false);

      emulate.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.arePluginsInstalled).toHaveBeenCalledWith(appDirectory);
        expect(cordovaUtils.installPlugins).toHaveBeenCalledWith();
        done();
      });
    });

    it('should not install plugins if they are installed', function(done) {
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);

      emulate.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.arePluginsInstalled).toHaveBeenCalledWith(appDirectory);
        expect(cordovaUtils.installPlugins).not.toHaveBeenCalledWith();
        done();
      });
    });
  });

  describe('execute cordova command', function() {
    var appDirectory = '/ionic/app/path';

    beforeEach(function() {
      spyOn(process, 'cwd').and.returnValue(appDirectory);
      spyOn(os, 'platform').and.returnValue('darwin');
      spyOn(npmScripts, 'hasIonicScript').and.returnValue(Q(false));
    });

    it('should fail if any functions throw', function(done) {
      var processArguments = ['node', 'ionic', 'emulate', '-n'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = new Error('error occurred');
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q.reject(error));

      emulate.run({}, argv, rawCliArguments).then(function() {
        expect(log.error).toHaveBeenCalledWith(error);
        done();
      });
    });

    it('should fail if any functions throw and not log if not an instance of an Error', function(done) {
      var processArguments = ['node', 'ionic', 'emulate', '-n'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      var error = 1;
      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q.reject(error));

      emulate.run({}, argv, rawCliArguments).then(function() {
        expect(log.error).not.toHaveBeenCalled();
        done();
      });
    });

    it('should execute the command against the cordova util', function(done) {
      var processArguments = ['node', 'ionic', 'emulate', '-n'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(true));

      emulate.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['emulate', 'ios', '-n'], false, true);
        done();
      });
    });

    it('should execute the command against the cordova util using the platform provided', function(done) {
      var processArguments = ['node', 'ionic', 'emulate', 'android'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(true));

      emulate.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['emulate', 'android'], false, true);
        done();
      });
    });

    it('should execute the command against the cordova util using the platform provided', function(done) {
      var processArguments = ['node', 'ionic', 'emulate', 'android', '--livereload'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;

      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'setupLiveReload').and.returnValue(Q({
        blah: 'blah'
      }));
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(true));

      emulate.run(null, argv, rawCliArguments).then(function() {
        expect(cordovaUtils.setupLiveReload).toHaveBeenCalledWith(argv, appDirectory);
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(
          ['emulate', 'android'], true, { blah: 'blah' });
        done();
      });
    });
  });

  describe('npmScripts check', function() {
    var processArguments = ['node', 'ionic', 'emulate', 'android'];
    var rawCliArguments = processArguments.slice(2);
    var argv = optimist(rawCliArguments).argv;

    beforeEach(function() {
      var appDirectory = '/ionic/app/path';
      spyOn(process, 'cwd').and.returnValue(appDirectory);
      spyOn(os, 'platform').and.returnValue('darwin');

      spyOn(cordovaUtils, 'isPlatformInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'arePluginsInstalled').and.returnValue(true);
      spyOn(cordovaUtils, 'execCordovaCommand').and.returnValue(Q(true));
    });

    it('should not call runIonicScript if hasIonicScript for build and serve are both false', function(done) {
      spyOn(npmScripts, 'hasIonicScript').and.callFake(function(task) {
        if (task === 'build') {
          return Q(false);
        } else if (task === 'serve') {
          return Q(false);
        }
      });
      spyOn(npmScripts, 'runIonicScript');

      emulate.run(null, argv, rawCliArguments).then(function() {
        expect(npmScripts.runIonicScript).not.toHaveBeenCalled();
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['emulate', 'android'], false, true);
        done();
      }).catch(function(e) {
        console.log(e);
      });
    });

    it('should call runIonicScript(build) if ' +
      'hasIonicScript(build) is true and hasIonicScript(build) is false', function(done) {
      spyOn(npmScripts, 'hasIonicScript').and.callFake(function(task) {
        if (task === 'build') {
          return Q(true);
        } else if (task === 'serve') {
          return Q(false);
        }
      });
      spyOn(npmScripts, 'runIonicScript').and.returnValue(Q(true));

      emulate.run(null, argv, rawCliArguments).then(function() {
        expect(npmScripts.runIonicScript).toHaveBeenCalledWith('build', rawCliArguments.slice(2));
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['emulate', 'android'], false, true);
        done();
      }).catch(function(e) {
        console.log(e);
      });
    });

    it('should call runIonicScript(build) if ' +
      'hasIonicScript(build) is true and hasIonicScript(build) is true and liveReload is not passed', function(done) {
      spyOn(npmScripts, 'hasIonicScript').and.callFake(function(task) {
        if (task === 'build') {
          return Q(true);
        } else if (task === 'serve') {
          return Q(true);
        }
      });
      spyOn(npmScripts, 'runIonicScript').and.returnValue(Q(true));

      emulate.run(null, argv, rawCliArguments).then(function() {
        expect(npmScripts.runIonicScript).toHaveBeenCalledWith('build', rawCliArguments.slice(2));
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['emulate', 'android'], false, true);
        done();
      }).catch(function(e) {
        console.log(e);
      });
    });

    it('should call runIonicScript(build) if ' +
      'hasIonicScript(build) is true and hasIonicScript(build) is true and liveReload is passed', function(done) {
      var processArguments = ['node', 'ionic', 'emulate', 'android', '--livereload'];
      var rawCliArguments = processArguments.slice(2);
      var argv = optimist(rawCliArguments).argv;


      spyOn(npmScripts, 'hasIonicScript').and.callFake(function(task) {
        if (task === 'build') {
          return Q(true);
        } else if (task === 'serve') {
          return Q(true);
        }
      });
      spyOn(npmScripts, 'runIonicScript').and.returnValue(Q(true));

      emulate.run(null, argv, rawCliArguments).then(function() {
        expect(npmScripts.hasIonicScript).toHaveBeenCalledWith('build');
        expect(npmScripts.runIonicScript).toHaveBeenCalledWith('serve', [
          '--runLivereload', '--isPlatformServe', '--livereload',
          '--port', jasmine.any(Number),
          '--livereload-port', jasmine.any(Number),
          '--address', jasmine.any(String),
          '--iscordovaserve',
          '--nobrowser'
        ]);
        expect(cordovaUtils.execCordovaCommand).toHaveBeenCalledWith(['emulate', 'android'], true, true);
        done();
      }).catch(function(e) {
        console.log(e);
      });
    });
  });
});
