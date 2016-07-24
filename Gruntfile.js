module.exports = function(grunt) {

    grunt.loadNpmTasks("grunt-screeps");
    var parser = require('node-file-parser');
    var assets = parser.link('./configuration.ini');
    var data = assets.read().getContent();
    var credentials = data.section.credentials;
    console.log(credentials);
    grunt.initConfig({
        screeps: {
            options: {
                email: credentials.username,
                password: credentials.password,
                branch: 'tutorial-1',
                ptr: false
            },
            dist: {
                src: ['dist/*.js']
            }
        }
    });
}