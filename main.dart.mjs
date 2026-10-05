// Compiles a dart2wasm-generated main module from `source` which can then
// be instantiated via the `instantiate` method.
//
// `source` needs to be a `Response` object (or promise thereof) e.g. created
// via the `fetch()` JS API.
export async function compileStreaming(source) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(
      await WebAssembly.compileStreaming(source, builtins), builtins);
}

// Compiles a dart2wasm-generated wasm module from `bytes` which is then
// instantiable via the `instantiate` method.
export async function compile(bytes) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(await WebAssembly.compile(bytes, builtins), builtins);
}

class CompiledApp {
  constructor(module, builtins) {
    this.module = module;
    this.builtins = builtins;
  }

  // The second argument is an options object containing:
  // `loadDeferredModules` is a JS function that takes an array of module names
  //   matching wasm files produced by the dart2wasm compiler. It also takes a
  //   callback that should be invoked for each loaded module with 2 arguments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDeferredId` is a JS function that takes load ID produced by the
  //   compiler when the `use-load-ids` option is passed. Each load ID maps to
  //   one or more wasm files as specified in the emitted JSON file. It also
  //   takes a callback that should be invoked for each loaded module with 2
  //   arguments: (1) the module name, (2) the loaded module in a format
  //   supported by `WebAssembly.compile` or `WebAssembly.compileStreaming`.
  //   The callback returns a Promise that resolves when the module is
  //   instantiated.
  //   loadDeferredId should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  async instantiate(additionalImports, {loadDeferredModules, loadDeferredId} = {}) {
    let dartInstance;

    // Prints to the console
    function printToConsole(value) {
      if (typeof dartPrint == "function") {
        dartPrint(value);
        return;
      }
      if (typeof console == "object" && typeof console.log != "undefined") {
        console.log(value);
        return;
      }
      if (typeof print == "function") {
        print(value);
        return;
      }

      throw "Unable to print message: " + value;
    }

    // A special symbol attached to functions that wrap Dart functions.
    const jsWrappedDartFunctionSymbol = Symbol("JSWrappedDartFunction");

    function finalizeWrapper(dartFunction, wrapped) {
      wrapped.dartFunction = dartFunction;
      wrapped[jsWrappedDartFunctionSymbol] = true;
      return wrapped;
    }

    // Imports
    const dart2wasm = {
            AB: o => o,
      AC: Function.prototype.call.bind(DataView.prototype.setFloat64),
      AD: o => o.length,
      AE: (x0,x1) => x0.removeProperty(x1),
      AF: (x0,x1) => { x0.noValidate = x1 },
      AG: x0 => x0.offsetY,
      AH: x0 => x0.height,
      AI: x0 => x0.stopPropagation(),
      AJ: x0 => x0.height,
      AK: x0 => x0.length,
      B: s => printToConsole(s),
      BB: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'boolean') return 1;
        return 2;
      },
      BC: o => o.byteOffset,
      BD: o => {
        if (o === undefined) return 1;
        var type = typeof o;
        if (type === 'boolean') return 2;
        if (type === 'number') return 3;
        if (type === 'string') return 4;
        if (o instanceof Array) return 5;
        if (ArrayBuffer.isView(o)) {
          if (o instanceof Int8Array) return 6;
          if (o instanceof Uint8Array) return 7;
          if (o instanceof Uint8ClampedArray) return 8;
          if (o instanceof Int16Array) return 9;
          if (o instanceof Uint16Array) return 10;
          if (o instanceof Int32Array) return 11;
          if (o instanceof Uint32Array) return 12;
          if (o instanceof Float32Array) return 13;
          if (o instanceof Float64Array) return 14;
          if (o instanceof DataView) return 15;
        }
        if (o instanceof ArrayBuffer) return 16;
        // Feature check for `SharedArrayBuffer` before doing a type-check.
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
            return 17;
        }
        if (o instanceof Promise) return 18;
        return 19;
      },
      BE: (x0,x1) => x0.appendChild(x1),
      BF: (x0,x1) => x0.removeAttribute(x1),
      BG: x0 => x0.offsetX,
      BH: x0 => x0.clientHeight,
      BI: x0 => x0.disabled,
      BJ: x0 => x0.width,
      BK: x0 => x0.getReader(),
      C: Function.prototype.call.bind(Number.prototype.toString),
      CB: (a, i, v) => a[i] = v,
      CC: o => o.buffer,
      CD: x0 => x0.state,
      CE: x0 => x0.debugShowSemanticsNodes,
      CF: x0 => x0.isConnected,
      CG: x0 => x0.type,
      CH: x0 => x0.innerWidth,
      CI: (x0,x1) => { x0.min = x1 },
      CJ: x0 => x0.rasterEndMilliseconds,
      CK: x0 => x0.value,
      D: Function.prototype.call.bind(BigInt.prototype.toString),
      DB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI8ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      DC: (b, o) => new DataView(b, o),
      DD: x0 => x0.hash,
      DE: (o, c) => o instanceof c,
      DF: x0 => x0.click(),
      DG: x0 => x0.hasFocus(),
      DH: x0 => x0.width,
      DI: (x0,x1) => { x0.max = x1 },
      DJ: x0 => x0.rasterStartMilliseconds,
      DK: x0 => x0.done,
      E: (exn) => {
        let stackString = exn.toString();
        let frames = stackString.split('\n');
        let drop = 4;
        if (frames[0].startsWith('Error')) {
            drop += 1;
        }
        return frames.slice(drop).join('\n');
      },
      EB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI16ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      EC: (b, o, l) => new DataView(b, o, l),
      ED: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      EE: x0 => x0.vendor,
      EF: (x0,x1) => x0.getElementsByClassName(x1),
      EG: x0 => x0.shiftKey,
      EH: x0 => x0.clientWidth,
      EI: (x0,x1) => { x0.disabled = x1 },
      EJ: x0 => x0.imageBitmaps,
      EK: x0 => x0.read(),
      F: () => new Error().stack,
      FB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      FC: Function.prototype.call.bind(DataView.prototype.getUint8),
      FD: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      FE: (x0,x1) => x0.createTextNode(x1),
      FF: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      FG: x0 => x0.visibilityState,
      FH: (x0,x1) => x0.removeChild(x1),
      FI: (x0,x1) => { x0.scrollLeft = x1 },
      FJ: x0 => x0.canvasKitMaximumSurfaces,
      FK: x0 => x0.body,
      G: s => JSON.stringify(s),
      GB: Function.prototype.call.bind(String.prototype.toLowerCase),
      GC: Function.prototype.call.bind(DataView.prototype.setUint8),
      GD: x0 => x0.state,
      GE: (x0,x1) => { x0.nonce = x1 },
      GF: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      GG: x0 => x0.disconnect(),
      GH: x0 => x0.firstChild,
      GI: (x0,x1) => { x0.spellcheck = x1 },
      GJ: (x0,x1) => x0.createElement(x1),
      GK: (x0,x1) => new OffscreenCanvas(x0,x1),
      H: Function.prototype.call.bind(Number.prototype.toString),
      HB: (o, p, r) => o.replace(p, () => r),
      HC: Function.prototype.call.bind(DataView.prototype.getFloat64),
      HD: (x0,x1,x2) => x0.addEventListener(x1,x2),
      HE: x0 => x0.nonce,
      HF: (x0,x1) => x0.contains(x1),
      HG: x0 => new Intl.Locale(x0),
      HH: x0 => x0.viewConstraints,
      HI: (x0,x1) => { x0.disabled = x1 },
      HJ: (x0,x1) => x0.append(x1),
      HK: x0 => x0.assetBase,
      I: Function.prototype.call.bind(String.prototype.indexOf),
      IB: (x0,x1) => { x0.lastIndex = x1 },
      IC: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float64Array) return 1;
        return 2;
      },
      ID: (x0,x1) => x0.go(x1),
      IE: () => globalThis.window.flutterConfiguration,
      IF: (s) => +s,
      IG: x0 => x0.region,
      IH: x0 => x0.hostElement,
      II: (x0,x1) => x0.getRandomValues(x1),
      IJ: (x0,x1,x2) => x0.insertRule(x1,x2),
      IK: x0 => x0.loader,
      J: (s, p, i) => s.lastIndexOf(p, i),
      JB: (s, m) => {
        try {
          return new RegExp(s, m);
        } catch (e) {
          return String(e);
        }
      },
      JC: (t, s) => t.set(s),
      JD: (x0,x1) => x0.append(x1),
      JE: (x0,x1) => x0.attachShadow(x1),
      JF: x0 => x0.target,
      JG: x0 => x0.script,
      JH: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      JI: () => globalThis.crypto,
      JJ: (x0,x1) => x0.add(x1),
      JK: () => globalThis._flutter,
      K: (exn) => {
        if (exn instanceof Error) {
          return exn.stack;
        } else {
          return null;
        }
      },
      KB: o => o instanceof RegExp,
      KC: Function.prototype.call.bind(DataView.prototype.setFloat32),
      KD: (x0,x1) => { x0.textContent = x1 },
      KE: x0 => x0.preventDefault(),
      KF: (x0,x1) => x0.dispatchEvent(x1),
      KG: x0 => x0.language,
      KH: x0 => ({runApp: x0}),
      KI: l => new DataView(new ArrayBuffer(l)),
      KJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      L: o => o === undefined,
      LB: x0 => x0.dotAll,
      LC: Function.prototype.call.bind(DataView.prototype.getFloat32),
      LD: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      LE: (x0,x1) => x0.contains(x1),
      LF: (x0,x1) => x0.createEvent(x1),
      LG: x0 => x0.languages,
      LH: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      LI: (map, o) => map.get(o),
      LJ: (x0,x1,x2) => x0.addEventListener(x1,x2),
      M: o => String(o),
      MB: x0 => x0.unicode,
      MC: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float32Array) return 1;
        return 2;
      },
      MD: x0 => x0.parentElement,
      ME: (x0,x1) => x0.focus(x1),
      MF: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      MG: (x0,x1) => x0.observe(x1),
      MH: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      MI: x0 => x0.debugSkipFontRetryDelay,
      MJ: x0 => x0.preventDefault(),
      N: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      NB: x0 => x0.ignoreCase,
      NC: Function.prototype.call.bind(DataView.prototype.getUint32),
      ND: (x0,x1) => x0.querySelectorAll(x1),
      NE: (x0,x1) => x0.closest(x1),
      NF: () => globalThis.window,
      NG: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      NH: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      NI: (x0,x1,x2) => x0.set(x1,x2),
      NJ: x0 => x0.createRange(),
      O: (x0,x1) => x0.didCreateEngineInitializer(x1),
      OB: x0 => x0.multiline,
      OC: Function.prototype.call.bind(DataView.prototype.setUint32),
      OD: x0 => x0.length,
      OE: (x0,x1) => x0.getAttribute(x1),
      OF: x0 => x0.readText(),
      OG: x0 => new ResizeObserver(x0),
      OH: () => typeof dartUseDateNowForTicks !== "undefined",
      OI: x0 => x0.fontFallbackBaseUrl,
      OJ: (x0,x1) => x0.selectNode(x1),
      P: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      PB: (o, p, r) => o.replaceAll(p, () => r),
      PC: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint32Array) return 1;
        return 2;
      },
      PD: (x0,x1) => x0.item(x1),
      PE: x0 => x0.activeElement,
      PF: x0 => x0.clipboard,
      PG: x0 => globalThis.parseFloat(x0),
      PH: () => Date.now(),
      PI: (handle) => clearInterval(handle),
      PJ: x0 => x0.getSelection(),
      Q: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      QB: (x0,x1) => x0[x1],
      QC: Function.prototype.call.bind(DataView.prototype.getInt32),
      QD: x0 => x0.userAgent,
      QE: (x0,x1) => x0.add(x1),
      QF: (x0,x1) => x0.writeText(x1),
      QG: (x0,x1) => x0.getComputedStyle(x1),
      QH: () => 1000 * performance.now(),
      QI: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      QJ: x0 => x0.removeAllRanges(),
      R: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      RB: x0 => x0.length,
      RC: Function.prototype.call.bind(DataView.prototype.setInt32),
      RD: x0 => x0.maxTouchPoints,
      RE: x0 => x0.classList,
      RF: x0 => x0.unlock(),
      RG: x0 => x0.documentElement,
      RH: x0 => new Uint8Array(x0),
      RI: () => Date.now(),
      RJ: (x0,x1) => x0.addRange(x1),
      S: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      SB: (x0,x1) => x0.exec(x1),
      SC: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int32Array) return 1;
        return 2;
      },
      SD: x0 => x0.platform,
      SE: x0 => x0.data,
      SF: (x0,x1) => x0.lock(x1),
      SG: x0 => x0.computedStyleMap(),
      SH: (x0,x1,x2) => x0.slice(x1,x2),
      SI: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      SJ: () => globalThis.window,
      T: x0 => new Promise(x0),
      TB: x0 => x0.index,
      TC: o => o instanceof Uint16Array,
      TD: x0 => x0.navigator,
      TE: x0 => x0.scrollTop,
      TF: x0 => x0.orientation,
      TG: (x0,x1) => x0.get(x1),
      TH: (x0,x1) => x0.decode(x1),
      TI: (a, s, e) => a.slice(s, e),
      TJ: (x0,x1) => { x0.innerText = x1 },
      U: (x0,x1,x2) => x0.call(x1,x2),
      UB: x0 => x0.flags,
      UC: Function.prototype.call.bind(DataView.prototype.getUint16),
      UD: s => new Date(s * 1000).getTimezoneOffset() * 60,
      UE: (handle) => clearTimeout(handle),
      UF: (x0,x1) => x0.querySelector(x1),
      UG: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      UH: (x0,x1) => x0.adoptText(x1),
      UI: (x0,x1) => x0.revokeObjectURL(x1),
      UJ: x0 => x0.offsetY,
      V: (constructor, args) => {
        const factoryFunction = constructor.bind.apply(
            constructor, [null, ...args]);
        return new factoryFunction();
      },
      VB: s => s.trim(),
      VC: Function.prototype.call.bind(DataView.prototype.setUint16),
      VD: Date.now,
      VE: (x0,x1) => { x0.scrollTop = x1 },
      VF: (x0,x1) => { x0.content = x1 },
      VG: x0 => x0.matches,
      VH: x0 => x0.first(),
      VI: (x0,x1) => { x0.src = x1 },
      VJ: x0 => x0.offsetX,
      W: x0 => new Array(x0),
      WB: (a, s) => a.join(s),
      WC: o => o instanceof Int16Array,
      WD: (x0,x1,x2) => x0.setAttribute(x1,x2),
      WE: x0 => x0.tagName,
      WF: x0 => x0.head,
      WG: (x0,x1) => x0.matchMedia(x1),
      WH: x0 => x0.next(),
      WI: (x0,x1,x2,x3,x4) => globalThis.createImageBitmap(x0,x1,x2,x3,x4),
      WJ: x0 => x0.button,
      X: o => [o],
      XB: (x0,x1) => x0.error(x1),
      XC: Function.prototype.call.bind(DataView.prototype.getInt16),
      XD: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      XE: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      XF: (x0,x1) => { x0.name = x1 },
      XG: x0 => x0.matches,
      XH: x0 => x0.current(),
      XI: x0 => x0.naturalHeight,
      XJ: x0 => x0.classList,
      Y: (o0, o1) => [o0, o1],
      YB: () => globalThis.console,
      YC: Function.prototype.call.bind(DataView.prototype.setInt16),
      YD: x0 => x0.style,
      YE: (x0,x1) => { x0.value = x1 },
      YF: (x0,x1) => { x0.title = x1 },
      YG: x0 => x0.timeStamp,
      YH: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      YI: x0 => x0.naturalWidth,
      YJ: (x0,x1) => { x0.height = x1 },
      Z: (o0, o1, o2) => [o0, o1, o2],
      ZB: s => s.trimRight(),
      ZC: o => o instanceof Uint8ClampedArray,
      ZD: (x0,x1) => x0.createElement(x1),
      ZE: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      ZF: () => globalThis.document,
      ZG: (x0,x1) => x0.hasAttribute(x1),
      ZH: x0 => x0.v8BreakIterator,
      ZI: x0 => x0.decode(),
      ZJ: (x0,x1) => { x0.width = x1 },
      a: (o0, o1, o2, o3) => [o0, o1, o2, o3],
      aB: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      aC: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint8Array) return 1;
        return 2;
      },
      aD: x0 => x0.body,
      aE: (x0,x1) => { x0.value = x1 },
      aF: (x0,x1) => x0.vibrate(x1),
      aG: x0 => x0.buttons,
      aH: () => globalThis.Intl,
      aI: (x0,x1) => { x0.decoding = x1 },
      aJ: x0 => x0.style,
      b: (x0,x1,x2) => { x0[x1] = x2 },
      bB: () => ({}),
      bC: Function.prototype.call.bind(DataView.prototype.setInt8),
      bD: x0 => x0.remove(),
      bE: x0 => x0.relatedTarget,
      bF: (o, p) => p in o,
      bG: x0 => x0.ctrlKey,
      bH: (x0,x1) => x0.segment(x1),
      bI: (x0,x1) => { x0.crossOrigin = x1 },
      bJ: x0 => x0.sheet,
      c: o => o,
      cB: (o, p, v) => o[p] = v,
      cC: Function.prototype.call.bind(DataView.prototype.getInt8),
      cD: (x0,x1) => x0.getPropertyValue(x1),
      cE: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      cF: x0 => x0.arrayBuffer(),
      cG: x0 => x0.y,
      cH: x0 => x0.index,
      cI: (x0,x1) => x0.createObjectURL(x1),
      cJ: x0 => x0.head,
      d: (o, p) => o[p],
      dB: () => [],
      dC: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int8Array) return 1;
        return 2;
      },
      dD: (x0,x1) => x0.warn(x1),
      dE: x0 => x0.value,
      dF: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof ArrayBuffer) return 1;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 2;
        }
        return 3;
      },
      dG: x0 => x0.x,
      dH: x0 => x0.next(),
      dI: x0 => x0.URL,
      dJ: () => globalThis.document,
      e: () => globalThis,
      eB: (a, i) => a.push(i),
      eC: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      eD: x0 => x0.console,
      eE: x0 => x0.selectionDirection,
      eF: x0 => x0.status,
      eG: x0 => x0.offsetTop,
      eH: x0 => x0.value,
      eI: x0 => new Blob(x0),
      eJ: x0 => x0.nextSibling,
      f: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      fB: b => !!b,
      fC: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      fD: (x0,x1) => { x0.id = x1 },
      fE: x0 => x0.selectionStart,
      fF: (x0,x1) => x0.fetch(x1),
      fG: x0 => x0.scrollLeft,
      fH: x0 => x0.done,
      fI: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      fJ: (x0,x1) => x0.debug(x1),
      g: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      gB: x0 => new Int8Array(x0),
      gC: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      gD: (x0,x1) => x0.requestAnimationFrame(x1),
      gE: x0 => x0.selectionEnd,
      gF: x0 => x0.content,
      gG: x0 => x0.offsetLeft,
      gH: (o, m, a) => o[m].apply(o, a),
      gI: x0 => new window.ImageDecoder(x0),
      gJ: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      h: (x0,x1) => ({addView: x0,removeView: x1}),
      hB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI8ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      hC: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      hD: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      hE: x0 => x0.value,
      hF: x0 => x0.document,
      hG: x0 => x0.offsetParent,
      hH: x0 => x0.iterator,
      hI: x0 => x0.name,
      hJ: x0 => x0.hostElement,
      i: (l, r) => l === r,
      iB: x0 => new Uint8Array(x0),
      iC: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      iD: x0 => x0.now(),
      iE: x0 => x0.selectionDirection,
      iF: x0 => x0.language,
      iG: x0 => x0.deltaMode,
      iH: () => globalThis.Symbol,
      iI: x0 => x0.repetitionCount,
      iJ: x0 => x0.location,
      j: x0 => x0.random(),
      jB: x0 => new Uint8ClampedArray(x0),
      jC: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      jD: x0 => x0.performance,
      jE: x0 => x0.selectionStart,
      jF: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      jG: x0 => x0.deltaY,
      jH: (x0,x1) => new Intl.Segmenter(x0,x1),
      jI: x0 => x0.frameCount,
      jJ: (x0,x1) => x0.getModifierState(x1),
      k: o => o,
      kB: x0 => new Int16Array(x0),
      kC: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      kD: (x0,x1) => x0.unregister(x1),
      kE: x0 => x0.selectionEnd,
      kF: (x0,x1) => x0.prepend(x1),
      kG: x0 => x0.deltaX,
      kH: x0 => x0.Segmenter,
      kI: x0 => x0.selectedTrack,
      kJ: x0 => x0.metaKey,
      l: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'number') return 1;
        return 2;
      },
      lB: x0 => new Uint16Array(x0),
      lC: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      lD: () => globalThis.window.FinalizationRegistry,
      lE: x0 => x0.keyCode,
      lF: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      lG: x0 => x0.wheelDeltaY,
      lH: x0 => x0.buffer,
      lI: x0 => x0.completed,
      lJ: x0 => x0.altKey,
      m: () => globalThis.Math,
      mB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI16ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      mC: x0 => x0.history,
      mD: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      mE: (x0,x1) => x0.scrollIntoView(x1),
      mF: (x0,x1) => x0.querySelector(x1),
      mG: x0 => x0.wheelDeltaX,
      mH: x0 => x0.wasmMemory,
      mI: x0 => x0.ready,
      mJ: x0 => x0.ctrlKey,
      n: (string, token) => string.split(token),
      nB: x0 => new Int32Array(x0),
      nC: x0 => x0.search,
      nD: x0 => new window.FinalizationRegistry(x0),
      nE: x0 => x0.multiViewEnabled,
      nF: (x0,x1) => x0.querySelectorAll(x1),
      nG: x0 => x0.key,
      nH: () => globalThis.window._flutter_skwasmInstance,
      nI: x0 => x0.tracks,
      nJ: x0 => x0.isComposing,
      o: o => o instanceof Array,
      oB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      oC: o => {
        if (o === null || o === undefined) return 0;
        if (typeof(o) === 'string') return 1;
        return 2;
      },
      oD: x0 => x0.scale,
      oE: x0 => x0.parent,
      oF: x0 => x0.tabIndex,
      oG: x0 => x0.identifier,
      oH: () => new TextDecoder(),
      oI: x0 => x0.close(),
      oJ: x0 => x0.code,
      p: (a, i) => a[i],
      pB: x0 => new Uint32Array(x0),
      pC: x0 => x0.location,
      pD: x0 => x0.visualViewport,
      pE: (x0,x1) => x0.replaceWith(x1),
      pF: x0 => x0.parentNode,
      pG: x0 => x0.touches,
      pH: x0 => new WeakRef(x0),
      pI: (x0,x1) => ({frameIndex: x0,completeFramesOnly: x1}),
      pJ: x0 => x0.repeat,
      q: a => a.length,
      qB: x0 => new Float32Array(x0),
      qC: x0 => x0.pathname,
      qD: x0 => x0.devicePixelRatio,
      qE: (x0,x1) => { x0.type = x1 },
      qF: x0 => x0.clientY,
      qG: x0 => x0.pressure,
      qH: x0 => x0.deref(),
      qI: (x0,x1) => x0.decode(x1),
      qJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      r: (string, times) => string.repeat(times),
      rB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      rC: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      rD: (d, digits) => d.toFixed(digits),
      rE: (x0,x1) => { x0.className = x1 },
      rF: x0 => x0.clientX,
      rG: x0 => x0.tiltY,
      rH: () => globalThis.WeakRef,
      rI: x0 => x0.displayHeight,
      rJ: x0 => x0.userAgent,
      s: (decoder, codeUnits) => decoder.decode(codeUnits),
      sB: x0 => new Float64Array(x0),
      sC: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      sD: x0 => x0.maxHeight,
      sE: (x0,x1) => { x0.tabIndex = x1 },
      sF: x0 => x0.getBoundingClientRect(),
      sG: x0 => x0.tiltX,
      sH: (a, i) => a.splice(i, 1),
      sI: x0 => x0.displayWidth,
      sJ: x0 => x0.navigator,
      t: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      tB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF64ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      tC: o => Object.keys(o),
      tD: x0 => x0.maxWidth,
      tE: (x0,x1) => { x0.name = x1 },
      tF: x0 => x0.bottom,
      tG: x0 => x0.pointerType,
      tH: a => a.pop(),
      tI: x0 => x0.duration,
      tJ: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      u: () => new TextDecoder("utf-8", {fatal: true}),
      uB: x0 => new ArrayBuffer(x0),
      uC: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      uD: x0 => x0.minHeight,
      uE: (x0,x1) => { x0.placeholder = x1 },
      uF: x0 => x0.top,
      uG: x0 => x0.pointerId,
      uH: (map, o, v) => map.set(o, v),
      uI: x0 => x0.image,
      uJ: () => globalThis.window,
      v: () => new TextDecoder("utf-8", {fatal: false}),
      vB: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      vC: f => f.dartFunction,
      vD: x0 => x0.minWidth,
      vE: (x0,x1) => { x0.autocomplete = x1 },
      vF: x0 => x0.right,
      vG: x0 => x0.getCoalescedEvents(),
      vH: () => new WeakMap(),
      vI: () => globalThis.window.ImageDecoder,
      vJ: (x0,x1) => x0.getItem(x1),
      w: s => s.trimLeft(),
      wB: (x0,x1,x2) => new DataView(x0,x1,x2),
      wC: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      wD: x0 => x0.height,
      wE: (x0,x1) => { x0.name = x1 },
      wF: x0 => x0.left,
      wG: (x0,x1) => x0.getModifierState(x1),
      wH: (x0,x1,x2) => x0.insertBefore(x1,x2),
      wI: (x0,x1) => x0.transferFromImageBitmap(x1),
      wJ: x0 => x0.localStorage,
      x: s => s.toUpperCase(),
      xB: (o, p) => o[p],
      xC: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      xD: x0 => x0.width,
      xE: (x0,x1) => { x0.placeholder = x1 },
      xF: x0 => x0.clientY,
      xG: x0 => x0.blur(),
      xH: x0 => x0.id,
      xI: (x0,x1) => x0.getContext(x1),
      xJ: (x0,x1) => x0.key(x1),
      y: Object.is,
      yB: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      yC: (p, s, f) => p.then(s, (e) => f(e, e === undefined)),
      yD: x0 => x0.screen,
      yE: (x0,x1) => { x0.action = x1 },
      yF: x0 => x0.clientX,
      yG: x0 => x0.button,
      yH: x0 => x0.offsetHeight,
      yI: (x0,x1) => { x0.height = x1 },
      yJ: x0 => x0.length,
      z: (x0,x1) => x0.test(x1),
      zB: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      zC: (o, i) => o[i],
      zD: s => {
        if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(s)) {
          return NaN;
        }
        return parseFloat(s);
      },
      zE: (x0,x1) => { x0.method = x1 },
      zF: x0 => x0.changedTouches,
      zG: x0 => x0.innerHeight,
      zH: x0 => x0.offsetWidth,
      zI: (x0,x1) => { x0.width = x1 },
      zJ: (x0,x1,x2) => x0.setItem(x1,x2),

    };

    const baseImports = {
      _: dart2wasm,
      Math: Math,
      Date: Date,
      Object: Object,
      Array: Array,
      Reflect: Reflect,
      WebAssembly: {
        JSTag: WebAssembly.JSTag,
      },
      "": new Proxy({}, { get(_, prop) { return prop; } }),

    };

    const jsStringPolyfill = {
      "charCodeAt": (s, i) => s.charCodeAt(i),
      "compare": (s1, s2) => {
        if (s1 < s2) return -1;
        if (s1 > s2) return 1;
        return 0;
      },
      "concat": (s1, s2) => s1 + s2,
      "equals": (s1, s2) => s1 === s2,
      "fromCharCode": (i) => String.fromCharCode(i),
      "length": (s) => s.length,
      "substring": (s, a, b) => s.substring(a, b),
      "fromCharCodeArray": (a, start, end) => {
        if (end <= start) return '';

        const read = dartInstance.exports.$wasmI16ArrayGet;
        let result = '';
        let index = start;
        const chunkLength = Math.min(end - index, 500);
        let array = new Array(chunkLength);
        while (index < end) {
          const newChunkLength = Math.min(end - index, 500);
          for (let i = 0; i < newChunkLength; i++) {
            array[i] = read(a, index++);
          }
          if (newChunkLength < chunkLength) {
            array = array.slice(0, newChunkLength);
          }
          result += String.fromCharCode(...array);
        }
        return result;
      },
      "intoCharCodeArray": (s, a, start) => {
        if (s === '') return 0;

        const write = dartInstance.exports.$wasmI16ArraySet;
        for (var i = 0; i < s.length; ++i) {
          write(a, start++, s.charCodeAt(i));
        }
        return s.length;
      },
      "test": (s) => typeof s == "string",
    };


    

    dartInstance = await WebAssembly.instantiate(this.module, {
      ...baseImports,
      ...additionalImports,
      
      "wasm:js-string": jsStringPolyfill,
    });

    return new InstantiatedApp(this, dartInstance);
  }
}

class InstantiatedApp {
  constructor(compiledApp, instantiatedModule) {
    this.compiledApp = compiledApp;
    this.instantiatedModule = instantiatedModule;
  }

  // Call the main function with the given arguments.
  invokeMain(...args) {
    this.instantiatedModule.exports.$invokeMain(args);
  }
}
