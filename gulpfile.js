const gulp = require('gulp');
const eslint = require('gulp-eslint');
const trimlines = require('gulp-trimlines');
const exec = require('child_process').exec;

gulp.task('browserify-createwallet', function(cb) {
  exec('npm run build-createwallet', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });  
});
gulp.task('browserify-sendmoney', function(cb) {
  exec('npm run build-sendmoney', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});
gulp.task('browserify-withdrawal', function(cb) {
  exec('npm run build-withdrawal', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});
gulp.task('browserify', ['browserify-createwallet', 'browserify-sendmoney', 'browserify-withdrawal'], function () {

});

gulp.task('deploytest', ['browserify'], function (cb) {
  exec('git push test master', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });   
});

gulp.task('trim-text', function() {
return gulp.src(['**/*.js','!node_modules/**','!public/dist/**'])
.pipe(trimlines({
    leading: false
  }))
.pipe(gulp.dest('./'));
});

gulp.task('lint', () => {
return gulp.src(['**/*.js','!node_modules/**','!public/dist/**'])
.pipe(eslint())
.pipe(eslint.format())
.pipe(eslint.failAfterError());
});

gulp.task('default', ['lint'], function () {

});