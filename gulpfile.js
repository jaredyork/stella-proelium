const program = require('commander');
const express = require('express');
const path = require('path');
const browserSync = require('browser-sync').create();

const gulp = require('gulp');

const gutil = require('gulp-util');
const lintHTML = require('gulp-htmllint');
const lintCSS = require('gulp-stylelint');
const lintJS = require('gulp-eslint');
const deleteFiles = require('gulp-rimraf');
const minifyHTML = require('gulp-minify-html');
const minifyCSS = require('gulp-clean-css');
const minifyJS = require('gulp-terser');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const replaceHTML = require('gulp-html-replace');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const imageminOptipng = require('imagemin-optipng');
const mozjpeg = require('imagemin-mozjpeg');
const zip = require('gulp-zip');
const advzip = require('gulp-advzip');
const checkFileSize = require('gulp-check-filesize');

var prod = !!program.prod;

const paths = {
    src: {
        html: 'src/**.html',
        css: 'src/css/**.css',
        js: 'src/js/**.js',
        images: 'src/images/**'
    },
    dist: {
        dir: 'dist',
        css: 'style.min.css',
        js: 'script.min.js',
        images: 'dist/images'
    }
};

gulp.task('lintHTML', () => {
    return gulp.src('src/**.html')
        .pipe(lintHTML());
});

gulp.task('lintCSS', () => {
    return gulp.src(paths.src.css)
        .pipe(lintCSS({
            reporters: [{ formatter: 'string', console: true }]
        }));
});

gulp.task('lintJS', () => {
    return gulp.src(paths.src.js)
        .pipe(lintJS())
        .pipe(lintJS.failAfterError());
});

gulp.task('cleanDist', () => {
    return gulp.src('dist', { allowEmpty: true })
        .pipe(deleteFiles());
});

gulp.task('buildHTML', () => {
    return gulp.src(paths.src.html)
        .pipe(replaceHTML({
            css: paths.dist.css,
            js: paths.dist.js
        }))
        .pipe(minifyHTML())
        .pipe(gulp.dest(paths.dist.dir));
});

gulp.task('buildCSS', () => {
    return gulp.src(paths.src.css)
        .pipe(concat(paths.dist.css))
        .pipe(minifyCSS())
        .pipe(gulp.dest(paths.dist.dir));
});

gulp.task('buildJS', () => {
    return gulp.src(paths.src.js)
        .pipe(concat(paths.dist.js))
        .pipe(minifyJS({
            ecma: 6,
            compress: true,
            keep_fnames: false,
            mangle: {
              toplevel: true,
              //properties: {}
            },
        }))
        .pipe(gulp.dest(paths.dist.dir));
});

gulp.task('optimizeImages', () => {
    return gulp.src(paths.src.images)
        .pipe(imagemin({ progressive: true, 
            use:[
                imageminOptipng({
                    optimizationLevel: 7,
                    bitDepthReduction: true,
                    colorTypeReduction: true,
                    paletteReduction: true,
                    interlaced: true
                }),
            mozjpeg({quality: '70'})],
            verbose: true}))
        .pipe(gulp.dest(paths.dist.images));
});

gulp.task('zip', () => {
    //const thirteenKb = 13 * 1024;
    const thirteenKb = 10 * 1024; // 10 for now!

    gulp.src('zip/*')
        .pipe(deleteFiles());

    return gulp.src(`${paths.dist.dir}/**`)
        .pipe(zip('game.zip'))
        .pipe(advzip({
            optimizationLevel: 4,
            iterations: 40
        }))
        .pipe(gulp.dest('zip'))
        .pipe(checkFileSize({ fileSizeLimit: thirteenKb }));
});


function watch() {
    gulp.watch(paths.src.html, gulp.series('buildHTML', 'zip'));
    gulp.watch(paths.src.css, gulp.series('buildCSS', 'zip'));
    gulp.watch(paths.src.js, gulp.series('buildJS', 'zip'));
    gulp.watch(paths.src.images, gulp.series('optimizeImages', 'zip'));
}

gulp.task('serve', function() {
    browserSync.init({
        server: "./dist"
        // or
        // proxy: 'yourserver.dev'
    });

    watch();
    gulp.watch('dist/*').on('change', browserSync.reload);
});

gulp.task('test', gulp.parallel(
    'lintHTML',
    'lintCSS',
    'lintJS'
));

gulp.task('build', gulp.series(
    'cleanDist',
    gulp.series('buildHTML', 'buildCSS', 'buildJS', 'optimizeImages', 'serve'),
    'zip'
));

gulp.task('dist', gulp.series('cleanDist', 'buildHTML', 'buildCSS', 'buildJS', 'optimizeImages', 'zip') );

gulp.task('watch', watch);

gulp.task('default', gulp.series(
    'build',
    'watch'
));
