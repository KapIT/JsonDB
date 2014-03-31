'use strict';

module.exports = function(grunt) {
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);
    
    grunt.initConfig({
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            client: [ 'lib/**/*.js']
        },
        
        mocha_istanbul: {
            coverage: {
                src: 'test', // the folder, not the files,
                options: {
                    mask: '*-test.js',
                    reporter: 'spec',
                    coverage:true,
                    root: './lib',
                    reportFormats: ['html']
                }
            }
        }
    });
    grunt.registerTask('test', ['jshint', 'mocha_istanbul']);
    grunt.registerTask('default', [ 'test']);
};