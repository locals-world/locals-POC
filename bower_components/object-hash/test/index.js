var test = require('tape');
var crypto = require('crypto');
var hash = require('../index');
var validSha1 = /^[0-9a-f]{40}$/i;

test('throws when nothing to hash', function (assert) {
  assert.plan(2);
  assert.throws(hash, 'no arguments');
  assert.throws(function(){
    hash(undefined, {algorithm: 'md5'});
  }, 'undefined');
});

test('throws when passed an invalid options', function(assert){
  assert.plan(2);
  assert.throws(function(){
    hash({foo: 'bar'}, {algorithm: 'shalala'});
  }, 'bad algorithm');
  assert.throws(function(){
    hash({foo: 'bar'}, {encoding: 'base16'});
  }, 'bad encoding');
});

test('hashes non-object types', function(assert){
  assert.plan(4);
  var func = function(a){ return a + 1; };
  assert.ok(validSha1.test(hash('Shazbot!')), 'hash string');
  assert.ok(validSha1.test(hash(42)), 'hash number');
  assert.ok(validSha1.test(hash(true)), 'hash bool');
  assert.ok(validSha1.test(hash(func)), 'hash function');
});

test('hashes special object types', function(assert){
  assert.plan(9);
  var dt = new Date();
  dt.setDate(dt.getDate() + 1);

  assert.ok(validSha1.test(hash([1,2,3,4])), 'hash array');
  assert.notEqual(hash([1,2,3,4]), hash([4,3,2,1]), 'different arrays not equal');
  assert.ok(validSha1.test(hash(new Date())), 'hash date');
  assert.notEqual(hash(new Date()), hash(dt), 'different dates not equal');
  assert.ok(validSha1.test(hash(null)), 'hash Null');
  assert.ok(validSha1.test(hash(Number.NaN)), 'hash NaN');
  assert.ok(validSha1.test(hash({ foo: undefined })), 'hash Undefined value');
  assert.ok(validSha1.test(hash(new RegExp())), 'hash regex');
  assert.ok(validSha1.test(hash(new Error())), 'hash error');
});

if (typeof Symbol !== 'undefined')
test('hashes Symbols', function(assert){
  assert.plan(1);
  assert.ok(validSha1.test(hash(Symbol('Banana'))), 'hash error');
});

test('hashes a simple object', function(assert){
  assert.plan(1);
  assert.ok(validSha1.test(hash({foo: 'bar', bar: 'baz'})), 'hash object');
});

test('hashes identical objects with different key ordering', function(assert){
  assert.plan(2);
  var hash1 = hash({foo: 'bar', bar: 'baz'});
  var hash2 = hash({bar: 'baz', foo: 'bar'});
  var hash3 = hash({bar: 'foo', foo: 'baz'});
  assert.equal(hash1, hash2, 'hashes are equal');
  assert.notEqual(hash1, hash3, 'different objects not equal');
});

test('hashes only object keys when excludeValues option is set', function(assert){
  assert.plan(2);
  var hash1 = hash({foo: false, bar: 'OK'}, { excludeValues: true });
  var hash2 = hash({foo: true, bar: 'NO'}, { excludeValues: true });
  var hash3 = hash({foo: true, bar: 'OK', baz: false}, { excludeValues: true });
  assert.equal(hash1, hash2, 'values not in hash digest');
  assert.notEqual(hash1, hash3, 'different keys not equal');
});

test('array values are hashed', function(assert){
  assert.plan(1);
  var hash1 = hash({foo: ['bar', 'baz'], bax: true });
  var hash2 = hash({foo: ['baz', 'bar'], bax: true });
  assert.notEqual(hash1, hash2, 'different array orders are unique');
});

test('nested object values are hashed', function(assert){
  assert.plan(2);
  var hash1 = hash({foo: {bar: true, bax: 1}});
  var hash2 = hash({foo: {bar: true, bax: 1}});
  var hash3 = hash({foo: {bar: false, bax: 1}});
  assert.equal(hash1, hash2, 'hashes are equal');
  assert.notEqual(hash1, hash3, 'different objects not equal');
});

test('sugar methods should be equivalent', function(assert){
  assert.plan(3);
  var obj = {foo: 'bar', baz: true};
  assert.equal(hash.keys(obj), hash(obj, {excludeValues: true}), 'keys');
  assert.equal(hash.MD5(obj), hash(obj, {algorithm: 'md5'}), 'md5');
  assert.equal(hash.keysMD5(obj),
    hash(obj, {algorithm: 'md5', excludeValues: true}), 'keys md5');
});


test('array of nested object values are hashed', function(assert){
  assert.plan(2);
  var hash1 = hash({foo: [ {bar: true, bax: 1}, {bar: false, bax: 2} ] });
  var hash2 = hash({foo: [ {bar: true, bax: 1}, {bar: false, bax: 2} ] });
  var hash3 = hash({foo: [ {bar: false, bax: 2} ] });
  assert.equal(hash1, hash2, 'hashes are equal');
  assert.notEqual(hash1, hash3, 'different objects not equal');
});

test("recursive objects don't blow up stack", function(assert) {
  assert.plan(1);
  var hash1 = {foo: 'bar'};
  hash1.recursive = hash1;
  assert.doesNotThrow(function(){hash(hash1);}, /Maximum call stack size exceeded/, 'Should not throw an stack size exceeded exception');
});

test("recursive arrays don't blow up stack", function(assert) {
  assert.plan(1);
  var hash1 = ['foo', 'bar'];
  hash1.push(hash1);
  assert.doesNotThrow(function(){hash(hash1);}, /Maximum call stack size exceeded/, 'Should not throw an stack size exceeded exception');
});

test("recursive handling tracks identity", function(assert) {
  assert.plan(1);
  var hash1 = {k1: {k: 'v'}, k2: {k: 'k2'}};
  hash1.k1.r1 = hash1.k1;
  hash1.k2.r2 = hash1.k2;
  var hash2 = {k1: {k: 'v'}, k2: {k: 'k2'}};
  hash2.k1.r1 = hash2.k2;
  hash2.k2.r2 = hash2.k1;
  assert.notEqual(hash(hash1), hash(hash2), "order of recursive objects should matter");
});

test("null and 'Null' string produce different hashes", function(assert) {
  assert.plan(1);
  var hash1 = hash({foo: null});
  var hash2 = hash({foo: 'Null'});
  assert.notEqual(hash1, hash2, "null and 'Null' should not produce identical hashes");
});

test("object types are hashed", function(assert) {
  assert.plan(1);
  var hash1 = hash({foo: 'bar'});
  var hash2 = hash(['foo', 'bar']);
  assert.notEqual(hash1, hash2, "arrays and objects should not produce identical hashes");
});

test("utf8 strings are hashed correctly", function(assert) {
  assert.plan(1);
  var hash1 = hash('\u03c3'); // cf 83 in utf8
  var hash2 = hash('\u01c3'); // c7 83 in utf8
  assert.notEqual(hash1, hash2, "different strings with similar utf8 encodings should produce different hashes");
});

test("various hashes in crypto.getHashes() should be supported", function(assert) {
  var hashes = ['sha1', 'md5'];
  
  if (crypto.getHashes) {
    // take all hashes from crypto.getHashes() starting with MD or SHA
    hashes = crypto.getHashes().filter(RegExp.prototype.test.bind(/^(md|sha)/i));
  }
  
  assert.plan(hashes.length);
  var obj = {randomText: 'bananas'};
  
  for (var i = 0; i < hashes.length; i++) {
    assert.ok(hash(obj, {algorithm: hashes[i]}), 'Algorithm ' + hashes[i] + ' should be supported');
  }
});

if (typeof Buffer !== 'undefined') {
test("Buffers can be hashed", function(assert) {
  assert.plan(1);
  assert.ok(validSha1.test(hash(new Buffer('Banana'))), 'hashes Buffers');
});
}

if (typeof Uint8Array !== 'undefined') {
test("Typed arrays can be hashed", function(assert) {
  assert.plan(10);
  
  assert.ok(validSha1.test(hash(new Uint8Array([1,2,3,4]))), 'hashes Uint8Array');
  assert.ok(validSha1.test(hash(new  Int8Array([1,2,3,4]))), 'hashes  Int8Array');
  assert.ok(validSha1.test(hash(new Uint16Array([1,2,3,4]))), 'hashes Uint16Array');
  assert.ok(validSha1.test(hash(new  Int16Array([1,2,3,4]))), 'hashes  Int16Array');
  assert.ok(validSha1.test(hash(new Uint32Array([1,2,3,4]))), 'hashes Uint32Array');
  assert.ok(validSha1.test(hash(new  Int32Array([1,2,3,4]))), 'hashes  Int32Array');
  assert.ok(validSha1.test(hash(new Float32Array([1,2,3,4]))), 'hashes Float32Array');
  assert.ok(validSha1.test(hash(new Float64Array([1,2,3,4]))), 'hashes Float64Array');
  assert.ok(validSha1.test(hash(new Uint8ClampedArray([1,2,3,4]))), 'hashes Uint8ClampedArray');
  assert.ok(validSha1.test(hash(new Uint8Array([1,2,3,4]).buffer)), 'hashes ArrayBuffer');
});
}

test('Distinguish functions based on their properties', function(assert) {
  assert.plan(3);

  var a, b, c, d;
  function Foo() {}
  a = hash(Foo);

  Foo.foo = 22;
  b = hash(Foo);

  Foo.bar = "42";
  c = hash(Foo);

  Foo.foo = "22";
  d = hash(Foo);

  assert.notEqual(a,b, 'adding a property changes the hash');
  assert.notEqual(b,c, 'adding another property changes the hash');
  assert.notEqual(c,d, 'changing a property changes the hash');
});

test('respectFunctionProperties = false', function(assert) {
  assert.plan(1);

  var a, b;
  function Foo() {}
  a = hash(Foo, {respectFunctionProperties: false});

  Foo.foo = 22;
  b = hash(Foo, {respectFunctionProperties: false});

  assert.equal(a,b, 'function properties are ignored');
});

test('Distinguish functions based on prototype properties', function(assert) {
  assert.plan(3);

  var a, b, c, d;
  function Foo() {}
  a = hash(Foo);

  Foo.prototype.foo = 22;
  b = hash(Foo);

  Foo.prototype.bar = "42";
  c = hash(Foo);

  Foo.prototype.foo = "22";
  d = hash(Foo);

  assert.notEqual(a,b, 'adding a property to the prototype changes the hash');
  assert.notEqual(b,c, 'adding another property to the prototype changes the hash');
  assert.notEqual(c,d, 'changing a property in the prototype changes the hash');
});

test('Distinguish objects based on their type', function(assert) {
  assert.plan(2);

  function Foo() {}
  function Bar() {}

  var f = new Foo(), b = new Bar();

  assert.notEqual(hash(Foo), hash(Bar), 'Functions with different names should produce a different Hash.');
  assert.notEqual(hash(f), hash(b), 'Objects with different constructor should have a different Hash.');
});

test('respectType = false', function(assert) {
  var opt = { respectType: false };
  assert.plan(2);


  function Foo() {}
  function Bar() {}

  var f = new Foo(), b = new Bar();
  assert.equal(hash(f, opt), hash(b, opt), 'Hashing should disregard the different constructor');


  var ha, hb;
  function F() {}
  ha = hash(F, opt);

  F.prototype.meaningOfLife = 42;
  hb = hash(F, opt);

  assert.equal(ha, hb, 'Hashing should disregard changes in the function\'s prototype');
});
