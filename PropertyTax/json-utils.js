// utility functions around json object.


const fns = {
  isEmpty: function(obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
  },

  setPropsFromObject: function (obj, alias) {
    
    // if obj is empty or undefined, return empty.
    if (obj === undefined || this.isEmpty(obj)) return "";

    let keys = Object.keys(obj);
    let propString = "";
    keys.map((key, index) => {
      if (index >0) propString += ", " ;  // after first, we need commas.
      propString += " " + alias + "." + key + "=\"" + escapeQuotes(obj[key]) + "\"";
    })
    return `SET ${propString}`;
  },

  /* removes keys which have **undefined** values */
  removeUndefined: function(obj) {
    let keys = Object.keys(obj);
    keys.forEach((key) => {
      if (obj[key] === undefined) delete obj[key];
    })
    return obj;
  },

  /** 
   * Emits a stringified version of obj, similar to util.inspect.
   * However, this version quotes overcomes the issue of double-quoting 
   * number, if they are already quoted within quotes.
   *  For example, When the object { number: "1234" } is stringified by
   *  using util.inspect, it will emit "{number: '"1234"'}".
   *
   *  Our version, does the correct thing: "{number:"1234"}"
   **/
  inspect: function(obj) {
    debugger;
    let keys = Object.keys(obj);
    let res = "";
    keys.forEach((key, index) => {
      if (index>0) res += ", ";

      let val = escapeBackslash(obj[key]);
      val = escapeQuotes(val);
      if (typeof(val) === "string" && val[0] !== '"') res += key + ":" + '"' + val + '"';
      else res += key + ":" + val;
    })
    res = `{ ${res} }`;
    return res;
  }
};


module.exports = fns;

/* escapes (i.e. adds backslash "\") to quotes and backslash chars */
function escapeBackslash(instr) {
  // if the type is not a string, just return the input as it is.
  if (typeof(instr) !== "string") return instr;

  //// escape double quotes
  //let out = instr.replace(/"/g, '%22');
  // escape backslashes
  let out = instr.replace(/\\/g, '\\\\');
  return out;
}


function escapeQuotes(instr) {
  // if the type is not a string, just return the input as it is.
  if (typeof(instr) !== "string") return instr;

  // escape double quotes
  let out = instr.replace(/"/g, '');
  return out;
}

