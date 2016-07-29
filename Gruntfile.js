module.exports = function(grunt) {

    grunt.loadNpmTasks("grunt-screeps");
    var parser = require('node-file-parser');
    var assets = parser.link('./configuration.ini');
    var data = assets.read().getContent();
    var credentials = data.section.credentials;
    grunt.initConfig({
        screeps: {
            options: {
                email: credentials.username,
                password: credentials.password,
                branch: 'default',
                ptr: false
            },
            dist: {
                src: ['javascript/*.js', 'javascript/**/*.js']
            }
        }
    });
}