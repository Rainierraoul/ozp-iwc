/*
 * The MIT License (MIT) Copyright (c) 2012 Mike Ihbe
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated 
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or substantial 
 * portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO 
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, 
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/*
 * Original code owned by Mike Ihbe.  Modifications licensed under same terms.
 */
var ozpIwc=ozpIwc || {};
ozpIwc.metricsStats=ozpIwc.metricsStats || {};

ozpIwc.metricsStats.DEFAULT_POOL_SIZE=1028;

ozpIwc.metricsStats.Sample = function(){
	this.clear();
};

ozpIwc.metricsStats.Sample.prototype.update = function(val){ 
	this.values.push(val); 
};

ozpIwc.metricsStats.Sample.prototype.clear = function(){ 
	this.values = []; 
	this.count = 0; 
};
ozpIwc.metricsStats.Sample.prototype.size = function(){ 
	return this.values.length;
};

ozpIwc.metricsStats.Sample.prototype.getValues = function(){ 
	return this.values; 
};


/**
 *  Take a uniform sample of size size for all values
 *  @class
 *  @param {Number} [size=ozpIwc.metricsStats.DEFAULT_POOL_SIZE] - The size of the sample pool.
 */
ozpIwc.metricsStats.UniformSample=ozpIwc.util.extend(ozpIwc.metricsStats.Sample,function(size) {
	ozpIwc.metricsStats.Sample.apply(this);
  this.limit = size || ozpIwc.metricsStats.DEFAULT_POOL_SIZE;
});

ozpIwc.metricsStats.UniformSample.prototype.update = function(val) {
  this.count++;
  if (this.size() < this.limit) {
    this.values.push(val);
  } else {
    var rand = parseInt(Math.random() * this.count);
    if (rand < this.limit) {
      this.values[rand] = val;
    }
  }
};
