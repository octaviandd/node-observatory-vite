// vite.config.ts
import { defineConfig } from "file:///Users/octaviandavid/Desktop/node-observatory-backend-vite/node_modules/vite/dist/node/index.js";
import react from "file:///Users/octaviandavid/Desktop/node-observatory-backend-vite/node_modules/@vitejs/plugin-react/dist/index.mjs";

// node_modules/@tailwindcss/vite/dist/index.mjs
import { compile as M, env as _, Features as v, Instrumentation as P, normalizePath as B, optimize as U } from "file:///Users/octaviandavid/Desktop/node-observatory-backend-vite/node_modules/@tailwindcss/node/dist/index.mjs";
import { clearRequireCache as V } from "file:///Users/octaviandavid/Desktop/node-observatory-backend-vite/node_modules/@tailwindcss/node/dist/require-cache.js";
import { Scanner as G } from "file:///Users/octaviandavid/Desktop/node-observatory-backend-vite/node_modules/@tailwindcss/oxide/index.js";
import w from "node:fs/promises";
import p from "node:path";
var C = (r, e) => (e = Symbol[r]) ? e : Symbol.for("Symbol." + r);
var D = (r) => {
  throw TypeError(r);
};
var b = (r, e, s) => {
  if (e != null) {
    typeof e != "object" && typeof e != "function" && D("Object expected");
    var i, o;
    s && (i = e[C("asyncDispose")]), i === void 0 && (i = e[C("dispose")], s && (o = i)), typeof i != "function" && D("Object not disposable"), o && (i = function() {
      try {
        o.call(this);
      } catch (n) {
        return Promise.reject(n);
      }
    }), r.push([s, i, e]);
  } else s && r.push([s]);
  return e;
};
var S = (r, e, s) => {
  var i = typeof SuppressedError == "function" ? SuppressedError : function(a, d, u, t) {
    return t = Error(u), t.name = "SuppressedError", t.error = a, t.suppressed = d, t;
  }, o = (a) => e = s ? new i(a, e, "An error was suppressed during disposal") : (s = true, a), n = (a) => {
    for (; a = r.pop(); ) try {
      var d = a[1] && a[1].call(a[2]);
      if (a[0]) return Promise.resolve(d).then(n, (u) => (o(u), n()));
    } catch (u) {
      o(u);
    }
    if (s) throw e;
  };
  return n();
};
var f = _.DEBUG;
var J = /[?&](?:worker|sharedworker|raw|url)\b/;
var A = /\?commonjs-proxy/;
var K = /[?&]index\=\d+\.css$/;
function O() {
  let r = [], e = null, s = false, i = false, o = new y((n) => {
    let a = e.createResolver({ ...e.resolve, extensions: [".css"], mainFields: ["style"], conditions: ["style", "development|production"], tryIndex: false, preferRelative: true });
    function d(l, c) {
      return a(l, c, true, s);
    }
    let u = e.createResolver(e.resolve);
    function t(l, c) {
      return u(l, c, true, s);
    }
    return new R(n, e.root, d, t);
  });
  return [{ name: "@tailwindcss/vite:scan", enforce: "pre", configureServer(n) {
    r.push(n);
  }, async configResolved(n) {
    e = n, i = e.build.cssMinify !== false, s = e.build.ssr !== false && e.build.ssr !== void 0;
  } }, { name: "@tailwindcss/vite:generate:serve", apply: "serve", enforce: "pre", async transform(n, a, d) {
    var c = [];
    try {
      if (!x(a)) return;
      let u = b(c, new P());
      f && u.start("[@tailwindcss/vite] Generate CSS (serve)");
      let t = o.get(a);
      let l = await t.generate(n, (F) => this.addWatchFile(F), u);
      if (!l) return o.delete(a), n;
      f && u.end("[@tailwindcss/vite] Generate CSS (serve)");
      return { code: l };
    } catch (m) {
      var g = m, h = true;
    } finally {
      S(c, g, h);
    }
  } }, { name: "@tailwindcss/vite:generate:build", apply: "build", enforce: "pre", async transform(n, a) {
    var l = [];
    try {
      if (!x(a)) return;
      let d = b(l, new P());
      f && d.start("[@tailwindcss/vite] Generate CSS (build)");
      let u = o.get(a);
      let t = await u.generate(n, (h) => this.addWatchFile(h), d);
      if (!t) return o.delete(a), n;
      f && d.end("[@tailwindcss/vite] Generate CSS (build)");
      f && d.start("[@tailwindcss/vite] Optimize CSS");
      t = U(t, { minify: i });
      f && d.end("[@tailwindcss/vite] Optimize CSS");
      return { code: t };
    } catch (c) {
      var m = c, g = true;
    } finally {
      S(l, m, g);
    }
  } }];
}
function T(r) {
  let [e] = r.split("?", 2);
  return p.extname(e).slice(1);
}
function x(r) {
  return r.includes("/.vite/") ? void 0 : (T(r) === "css" || r.includes("&lang.css") || r.match(K)) && !J.test(r) && !A.test(r);
}
function E(r) {
  return p.resolve(r.replace(/\?.*$/, ""));
}
var y = class extends Map {
  constructor(s) {
    super();
    this.factory = s;
  }
  get(s) {
    let i = super.get(s);
    return i === void 0 && (i = this.factory(s, this), this.set(s, i)), i;
  }
};
var R = class {
  constructor(e, s, i, o) {
    this.id = e;
    this.base = s;
    this.customCssResolver = i;
    this.customJsResolver = o;
  }
  compiler;
  scanner;
  candidates = /* @__PURE__ */ new Set();
  buildDependencies = /* @__PURE__ */ new Map();
  async generate(e, s, i) {
    let o = E(this.id);
    function n(t) {
      t !== o && (/[\#\?].*\.svg$/.test(t) || s(t));
    }
    let a = this.requiresBuild(), d = p.dirname(p.resolve(o));
    if (!this.compiler || !this.scanner || await a) {
      V(Array.from(this.buildDependencies.keys())), this.buildDependencies.clear(), this.addBuildDependency(E(o)), f && i.start("Setup compiler");
      let t = [];
      this.compiler = await M(e, { base: d, shouldRewriteUrls: true, onDependency: (c) => {
        n(c), t.push(this.addBuildDependency(c));
      }, customCssResolver: this.customCssResolver, customJsResolver: this.customJsResolver }), await Promise.all(t), f && i.end("Setup compiler"), f && i.start("Setup scanner");
      let l = (this.compiler.root === "none" ? [] : this.compiler.root === null ? [{ base: this.base, pattern: "**/*", negated: false }] : [{ ...this.compiler.root, negated: false }]).concat(this.compiler.sources);
      this.scanner = new G({ sources: l }), f && i.end("Setup scanner");
    } else for (let t of this.buildDependencies.keys()) n(t);
    if (!(this.compiler.features & (v.AtApply | v.JsPluginCompat | v.ThemeFunction | v.Utilities))) return false;
    if (this.compiler.features & v.Utilities) {
      f && i.start("Scan for candidates");
      for (let t of this.scanner.scan()) this.candidates.add(t);
      f && i.end("Scan for candidates");
    }
    if (this.compiler.features & v.Utilities) {
      for (let t of this.scanner.files) n(t);
      for (let t of this.scanner.globs) {
        if (t.pattern[0] === "!") continue;
        let l = p.relative(this.base, t.base);
        l[0] !== "." && (l = "./" + l), l = B(l), n(p.posix.join(l, t.pattern));
        let c = this.compiler.root;
        if (c !== "none" && c !== null) {
          let m = B(p.resolve(c.base, c.pattern));
          if (!await w.stat(m).then((h) => h.isDirectory(), () => false)) throw new Error(`The path given to \`source(\u2026)\` must be a directory but got \`source(${m})\` instead.`);
        }
      }
    }
    f && i.start("Build CSS");
    let u = this.compiler.build([...this.candidates]);
    return f && i.end("Build CSS"), u;
  }
  async addBuildDependency(e) {
    let s = null;
    try {
      s = (await w.stat(e)).mtimeMs;
    } catch {
    }
    this.buildDependencies.set(e, s);
  }
  async requiresBuild() {
    for (let [e, s] of this.buildDependencies) {
      if (s === null) return true;
      try {
        if ((await w.stat(e)).mtimeMs > s) return true;
      } catch {
        return true;
      }
    }
    return false;
  }
};

// vite.config.ts
import tsconfigPaths from "file:///Users/octaviandavid/Desktop/node-observatory-backend-vite/node_modules/vite-tsconfig-paths/dist/index.js";
import * as path from "path";
var __vite_injected_original_dirname = "/Users/octaviandavid/Desktop/node-observatory-backend-vite";
var vite_config_default = defineConfig({
  root: "./src/client",
  server: {
    port: 3e3,
    hmr: {
      port: 3001
    }
  },
  plugins: [react(), O(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src/client")
    }
  },
  define: {
    "process.env": JSON.stringify(process.env)
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAibm9kZV9tb2R1bGVzL0B0YWlsd2luZGNzcy92aXRlL2Rpc3QvaW5kZXgubWpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL29jdGF2aWFuZGF2aWQvRGVza3RvcC9ub2RlLW9ic2VydmF0b3J5LWJhY2tlbmQtdml0ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL29jdGF2aWFuZGF2aWQvRGVza3RvcC9ub2RlLW9ic2VydmF0b3J5LWJhY2tlbmQtdml0ZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvb2N0YXZpYW5kYXZpZC9EZXNrdG9wL25vZGUtb2JzZXJ2YXRvcnktYmFja2VuZC12aXRlL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3RcIjtcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICcuL25vZGVfbW9kdWxlcy9AdGFpbHdpbmRjc3Mvdml0ZS9kaXN0L2luZGV4Lm1qcyc7XG5pbXBvcnQgdHNjb25maWdQYXRocyBmcm9tIFwidml0ZS10c2NvbmZpZy1wYXRoc1wiO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcm9vdDogXCIuL3NyYy9jbGllbnRcIixcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICBobXI6IHtcbiAgICAgIHBvcnQ6IDMwMDEsXG4gICAgfSxcbiAgfSxcbiAgcGx1Z2luczogW3JlYWN0KCksIHRhaWx3aW5kY3NzKCksIHRzY29uZmlnUGF0aHMoKV0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmMvY2xpZW50XCIpLFxuICAgIH0sXG4gIH0sXG4gIGRlZmluZToge1xuICAgICdwcm9jZXNzLmVudic6IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52KSxcbiAgfSxcbn0pO1xuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvb2N0YXZpYW5kYXZpZC9EZXNrdG9wL25vZGUtb2JzZXJ2YXRvcnktYmFja2VuZC12aXRlL25vZGVfbW9kdWxlcy9AdGFpbHdpbmRjc3Mvdml0ZS9kaXN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvb2N0YXZpYW5kYXZpZC9EZXNrdG9wL25vZGUtb2JzZXJ2YXRvcnktYmFja2VuZC12aXRlL25vZGVfbW9kdWxlcy9AdGFpbHdpbmRjc3Mvdml0ZS9kaXN0L2luZGV4Lm1qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvb2N0YXZpYW5kYXZpZC9EZXNrdG9wL25vZGUtb2JzZXJ2YXRvcnktYmFja2VuZC12aXRlL25vZGVfbW9kdWxlcy9AdGFpbHdpbmRjc3Mvdml0ZS9kaXN0L2luZGV4Lm1qc1wiO3ZhciBDPShyLGUpPT4oZT1TeW1ib2xbcl0pP2U6U3ltYm9sLmZvcihcIlN5bWJvbC5cIityKSxEPXI9Pnt0aHJvdyBUeXBlRXJyb3Iocil9O3ZhciBiPShyLGUscyk9PntpZihlIT1udWxsKXt0eXBlb2YgZSE9XCJvYmplY3RcIiYmdHlwZW9mIGUhPVwiZnVuY3Rpb25cIiYmRChcIk9iamVjdCBleHBlY3RlZFwiKTt2YXIgaSxvO3MmJihpPWVbQyhcImFzeW5jRGlzcG9zZVwiKV0pLGk9PT12b2lkIDAmJihpPWVbQyhcImRpc3Bvc2VcIildLHMmJihvPWkpKSx0eXBlb2YgaSE9XCJmdW5jdGlvblwiJiZEKFwiT2JqZWN0IG5vdCBkaXNwb3NhYmxlXCIpLG8mJihpPWZ1bmN0aW9uKCl7dHJ5e28uY2FsbCh0aGlzKX1jYXRjaChuKXtyZXR1cm4gUHJvbWlzZS5yZWplY3Qobil9fSksci5wdXNoKFtzLGksZV0pfWVsc2UgcyYmci5wdXNoKFtzXSk7cmV0dXJuIGV9LFM9KHIsZSxzKT0+e3ZhciBpPXR5cGVvZiBTdXBwcmVzc2VkRXJyb3I9PVwiZnVuY3Rpb25cIj9TdXBwcmVzc2VkRXJyb3I6ZnVuY3Rpb24oYSxkLHUsdCl7cmV0dXJuIHQ9RXJyb3IodSksdC5uYW1lPVwiU3VwcHJlc3NlZEVycm9yXCIsdC5lcnJvcj1hLHQuc3VwcHJlc3NlZD1kLHR9LG89YT0+ZT1zP25ldyBpKGEsZSxcIkFuIGVycm9yIHdhcyBzdXBwcmVzc2VkIGR1cmluZyBkaXNwb3NhbFwiKToocz0hMCxhKSxuPWE9Pntmb3IoO2E9ci5wb3AoKTspdHJ5e3ZhciBkPWFbMV0mJmFbMV0uY2FsbChhWzJdKTtpZihhWzBdKXJldHVybiBQcm9taXNlLnJlc29sdmUoZCkudGhlbihuLHU9PihvKHUpLG4oKSkpfWNhdGNoKHUpe28odSl9aWYocyl0aHJvdyBlfTtyZXR1cm4gbigpfTtpbXBvcnR7Y29tcGlsZSBhcyBNLGVudiBhcyBfLEZlYXR1cmVzIGFzIHYsSW5zdHJ1bWVudGF0aW9uIGFzIFAsbm9ybWFsaXplUGF0aCBhcyBCLG9wdGltaXplIGFzIFV9ZnJvbVwiQHRhaWx3aW5kY3NzL25vZGVcIjtpbXBvcnR7Y2xlYXJSZXF1aXJlQ2FjaGUgYXMgVn1mcm9tXCJAdGFpbHdpbmRjc3Mvbm9kZS9yZXF1aXJlLWNhY2hlXCI7aW1wb3J0e1NjYW5uZXIgYXMgR31mcm9tXCJAdGFpbHdpbmRjc3Mvb3hpZGVcIjtpbXBvcnQgdyBmcm9tXCJub2RlOmZzL3Byb21pc2VzXCI7aW1wb3J0IHAgZnJvbVwibm9kZTpwYXRoXCI7dmFyIGY9Xy5ERUJVRyxKPS9bPyZdKD86d29ya2VyfHNoYXJlZHdvcmtlcnxyYXd8dXJsKVxcYi8sQT0vXFw/Y29tbW9uanMtcHJveHkvLEs9L1s/Jl1pbmRleFxcPVxcZCtcXC5jc3MkLztmdW5jdGlvbiBPKCl7bGV0IHI9W10sZT1udWxsLHM9ITEsaT0hMSxvPW5ldyB5KG49PntsZXQgYT1lLmNyZWF0ZVJlc29sdmVyKHsuLi5lLnJlc29sdmUsZXh0ZW5zaW9uczpbXCIuY3NzXCJdLG1haW5GaWVsZHM6W1wic3R5bGVcIl0sY29uZGl0aW9uczpbXCJzdHlsZVwiLFwiZGV2ZWxvcG1lbnR8cHJvZHVjdGlvblwiXSx0cnlJbmRleDohMSxwcmVmZXJSZWxhdGl2ZTohMH0pO2Z1bmN0aW9uIGQobCxjKXtyZXR1cm4gYShsLGMsITAscyl9bGV0IHU9ZS5jcmVhdGVSZXNvbHZlcihlLnJlc29sdmUpO2Z1bmN0aW9uIHQobCxjKXtyZXR1cm4gdShsLGMsITAscyl9cmV0dXJuIG5ldyBSKG4sZS5yb290LGQsdCl9KTtyZXR1cm5be25hbWU6XCJAdGFpbHdpbmRjc3Mvdml0ZTpzY2FuXCIsZW5mb3JjZTpcInByZVwiLGNvbmZpZ3VyZVNlcnZlcihuKXtyLnB1c2gobil9LGFzeW5jIGNvbmZpZ1Jlc29sdmVkKG4pe2U9bixpPWUuYnVpbGQuY3NzTWluaWZ5IT09ITEscz1lLmJ1aWxkLnNzciE9PSExJiZlLmJ1aWxkLnNzciE9PXZvaWQgMH19LHtuYW1lOlwiQHRhaWx3aW5kY3NzL3ZpdGU6Z2VuZXJhdGU6c2VydmVcIixhcHBseTpcInNlcnZlXCIsZW5mb3JjZTpcInByZVwiLGFzeW5jIHRyYW5zZm9ybShuLGEsZCl7dmFyIGM9W107dHJ5e2lmKCF4KGEpKXJldHVybjtsZXQgdT1iKGMsbmV3IFApO2YmJnUuc3RhcnQoXCJbQHRhaWx3aW5kY3NzL3ZpdGVdIEdlbmVyYXRlIENTUyAoc2VydmUpXCIpO2xldCB0PW8uZ2V0KGEpO2xldCBsPWF3YWl0IHQuZ2VuZXJhdGUobixGPT50aGlzLmFkZFdhdGNoRmlsZShGKSx1KTtpZighbClyZXR1cm4gby5kZWxldGUoYSksbjtmJiZ1LmVuZChcIltAdGFpbHdpbmRjc3Mvdml0ZV0gR2VuZXJhdGUgQ1NTIChzZXJ2ZSlcIik7cmV0dXJue2NvZGU6bH19Y2F0Y2gobSl7dmFyIGc9bSxoPSEwfWZpbmFsbHl7UyhjLGcsaCl9fX0se25hbWU6XCJAdGFpbHdpbmRjc3Mvdml0ZTpnZW5lcmF0ZTpidWlsZFwiLGFwcGx5OlwiYnVpbGRcIixlbmZvcmNlOlwicHJlXCIsYXN5bmMgdHJhbnNmb3JtKG4sYSl7dmFyIGw9W107dHJ5e2lmKCF4KGEpKXJldHVybjtsZXQgZD1iKGwsbmV3IFApO2YmJmQuc3RhcnQoXCJbQHRhaWx3aW5kY3NzL3ZpdGVdIEdlbmVyYXRlIENTUyAoYnVpbGQpXCIpO2xldCB1PW8uZ2V0KGEpO2xldCB0PWF3YWl0IHUuZ2VuZXJhdGUobixoPT50aGlzLmFkZFdhdGNoRmlsZShoKSxkKTtpZighdClyZXR1cm4gby5kZWxldGUoYSksbjtmJiZkLmVuZChcIltAdGFpbHdpbmRjc3Mvdml0ZV0gR2VuZXJhdGUgQ1NTIChidWlsZClcIik7ZiYmZC5zdGFydChcIltAdGFpbHdpbmRjc3Mvdml0ZV0gT3B0aW1pemUgQ1NTXCIpO3Q9VSh0LHttaW5pZnk6aX0pO2YmJmQuZW5kKFwiW0B0YWlsd2luZGNzcy92aXRlXSBPcHRpbWl6ZSBDU1NcIik7cmV0dXJue2NvZGU6dH19Y2F0Y2goYyl7dmFyIG09YyxnPSEwfWZpbmFsbHl7UyhsLG0sZyl9fX1dfWZ1bmN0aW9uIFQocil7bGV0W2VdPXIuc3BsaXQoXCI/XCIsMik7cmV0dXJuIHAuZXh0bmFtZShlKS5zbGljZSgxKX1mdW5jdGlvbiB4KHIpe3JldHVybiByLmluY2x1ZGVzKFwiLy52aXRlL1wiKT92b2lkIDA6KFQocik9PT1cImNzc1wifHxyLmluY2x1ZGVzKFwiJmxhbmcuY3NzXCIpfHxyLm1hdGNoKEspKSYmIUoudGVzdChyKSYmIUEudGVzdChyKX1mdW5jdGlvbiBFKHIpe3JldHVybiBwLnJlc29sdmUoci5yZXBsYWNlKC9cXD8uKiQvLFwiXCIpKX12YXIgeT1jbGFzcyBleHRlbmRzIE1hcHtjb25zdHJ1Y3RvcihzKXtzdXBlcigpO3RoaXMuZmFjdG9yeT1zfWdldChzKXtsZXQgaT1zdXBlci5nZXQocyk7cmV0dXJuIGk9PT12b2lkIDAmJihpPXRoaXMuZmFjdG9yeShzLHRoaXMpLHRoaXMuc2V0KHMsaSkpLGl9fSxSPWNsYXNze2NvbnN0cnVjdG9yKGUscyxpLG8pe3RoaXMuaWQ9ZTt0aGlzLmJhc2U9czt0aGlzLmN1c3RvbUNzc1Jlc29sdmVyPWk7dGhpcy5jdXN0b21Kc1Jlc29sdmVyPW99Y29tcGlsZXI7c2Nhbm5lcjtjYW5kaWRhdGVzPW5ldyBTZXQ7YnVpbGREZXBlbmRlbmNpZXM9bmV3IE1hcDthc3luYyBnZW5lcmF0ZShlLHMsaSl7bGV0IG89RSh0aGlzLmlkKTtmdW5jdGlvbiBuKHQpe3QhPT1vJiYoL1tcXCNcXD9dLipcXC5zdmckLy50ZXN0KHQpfHxzKHQpKX1sZXQgYT10aGlzLnJlcXVpcmVzQnVpbGQoKSxkPXAuZGlybmFtZShwLnJlc29sdmUobykpO2lmKCF0aGlzLmNvbXBpbGVyfHwhdGhpcy5zY2FubmVyfHxhd2FpdCBhKXtWKEFycmF5LmZyb20odGhpcy5idWlsZERlcGVuZGVuY2llcy5rZXlzKCkpKSx0aGlzLmJ1aWxkRGVwZW5kZW5jaWVzLmNsZWFyKCksdGhpcy5hZGRCdWlsZERlcGVuZGVuY3koRShvKSksZiYmaS5zdGFydChcIlNldHVwIGNvbXBpbGVyXCIpO2xldCB0PVtdO3RoaXMuY29tcGlsZXI9YXdhaXQgTShlLHtiYXNlOmQsc2hvdWxkUmV3cml0ZVVybHM6ITAsb25EZXBlbmRlbmN5OmM9PntuKGMpLHQucHVzaCh0aGlzLmFkZEJ1aWxkRGVwZW5kZW5jeShjKSl9LGN1c3RvbUNzc1Jlc29sdmVyOnRoaXMuY3VzdG9tQ3NzUmVzb2x2ZXIsY3VzdG9tSnNSZXNvbHZlcjp0aGlzLmN1c3RvbUpzUmVzb2x2ZXJ9KSxhd2FpdCBQcm9taXNlLmFsbCh0KSxmJiZpLmVuZChcIlNldHVwIGNvbXBpbGVyXCIpLGYmJmkuc3RhcnQoXCJTZXR1cCBzY2FubmVyXCIpO2xldCBsPSh0aGlzLmNvbXBpbGVyLnJvb3Q9PT1cIm5vbmVcIj9bXTp0aGlzLmNvbXBpbGVyLnJvb3Q9PT1udWxsP1t7YmFzZTp0aGlzLmJhc2UscGF0dGVybjpcIioqLypcIixuZWdhdGVkOiExfV06W3suLi50aGlzLmNvbXBpbGVyLnJvb3QsbmVnYXRlZDohMX1dKS5jb25jYXQodGhpcy5jb21waWxlci5zb3VyY2VzKTt0aGlzLnNjYW5uZXI9bmV3IEcoe3NvdXJjZXM6bH0pLGYmJmkuZW5kKFwiU2V0dXAgc2Nhbm5lclwiKX1lbHNlIGZvcihsZXQgdCBvZiB0aGlzLmJ1aWxkRGVwZW5kZW5jaWVzLmtleXMoKSluKHQpO2lmKCEodGhpcy5jb21waWxlci5mZWF0dXJlcyYodi5BdEFwcGx5fHYuSnNQbHVnaW5Db21wYXR8di5UaGVtZUZ1bmN0aW9ufHYuVXRpbGl0aWVzKSkpcmV0dXJuITE7aWYodGhpcy5jb21waWxlci5mZWF0dXJlcyZ2LlV0aWxpdGllcyl7ZiYmaS5zdGFydChcIlNjYW4gZm9yIGNhbmRpZGF0ZXNcIik7Zm9yKGxldCB0IG9mIHRoaXMuc2Nhbm5lci5zY2FuKCkpdGhpcy5jYW5kaWRhdGVzLmFkZCh0KTtmJiZpLmVuZChcIlNjYW4gZm9yIGNhbmRpZGF0ZXNcIil9aWYodGhpcy5jb21waWxlci5mZWF0dXJlcyZ2LlV0aWxpdGllcyl7Zm9yKGxldCB0IG9mIHRoaXMuc2Nhbm5lci5maWxlcyluKHQpO2ZvcihsZXQgdCBvZiB0aGlzLnNjYW5uZXIuZ2xvYnMpe2lmKHQucGF0dGVyblswXT09PVwiIVwiKWNvbnRpbnVlO2xldCBsPXAucmVsYXRpdmUodGhpcy5iYXNlLHQuYmFzZSk7bFswXSE9PVwiLlwiJiYobD1cIi4vXCIrbCksbD1CKGwpLG4ocC5wb3NpeC5qb2luKGwsdC5wYXR0ZXJuKSk7bGV0IGM9dGhpcy5jb21waWxlci5yb290O2lmKGMhPT1cIm5vbmVcIiYmYyE9PW51bGwpe2xldCBtPUIocC5yZXNvbHZlKGMuYmFzZSxjLnBhdHRlcm4pKTtpZighYXdhaXQgdy5zdGF0KG0pLnRoZW4oaD0+aC5pc0RpcmVjdG9yeSgpLCgpPT4hMSkpdGhyb3cgbmV3IEVycm9yKGBUaGUgcGF0aCBnaXZlbiB0byBcXGBzb3VyY2UoXFx1MjAyNilcXGAgbXVzdCBiZSBhIGRpcmVjdG9yeSBidXQgZ290IFxcYHNvdXJjZSgke219KVxcYCBpbnN0ZWFkLmApfX19ZiYmaS5zdGFydChcIkJ1aWxkIENTU1wiKTtsZXQgdT10aGlzLmNvbXBpbGVyLmJ1aWxkKFsuLi50aGlzLmNhbmRpZGF0ZXNdKTtyZXR1cm4gZiYmaS5lbmQoXCJCdWlsZCBDU1NcIiksdX1hc3luYyBhZGRCdWlsZERlcGVuZGVuY3koZSl7bGV0IHM9bnVsbDt0cnl7cz0oYXdhaXQgdy5zdGF0KGUpKS5tdGltZU1zfWNhdGNoe310aGlzLmJ1aWxkRGVwZW5kZW5jaWVzLnNldChlLHMpfWFzeW5jIHJlcXVpcmVzQnVpbGQoKXtmb3IobGV0W2Usc11vZiB0aGlzLmJ1aWxkRGVwZW5kZW5jaWVzKXtpZihzPT09bnVsbClyZXR1cm4hMDt0cnl7aWYoKGF3YWl0IHcuc3RhdChlKSkubXRpbWVNcz5zKXJldHVybiEwfWNhdGNoe3JldHVybiEwfX1yZXR1cm4hMX19O2V4cG9ydHtPIGFzIGRlZmF1bHR9O1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVyxTQUFTLG9CQUFvQjtBQUM3WCxPQUFPLFdBQVc7OztBQ0R3c0MsU0FBTyxXQUFXLEdBQUUsT0FBTyxHQUFFLFlBQVksR0FBRSxtQkFBbUIsR0FBRSxpQkFBaUIsR0FBRSxZQUFZLFNBQU07QUFBb0IsU0FBTyxxQkFBcUIsU0FBTTtBQUFrQyxTQUFPLFdBQVcsU0FBTTtBQUFxQixPQUFPLE9BQU07QUFBbUIsT0FBTyxPQUFNO0FBQS9pQyxJQUFJLElBQUUsQ0FBQyxHQUFFLE9BQUssSUFBRSxPQUFPLENBQUMsS0FBRyxJQUFFLE9BQU8sSUFBSSxZQUFVLENBQUM7QUFBbkQsSUFBcUQsSUFBRSxPQUFHO0FBQUMsUUFBTSxV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
