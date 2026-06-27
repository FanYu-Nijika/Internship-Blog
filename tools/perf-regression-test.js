const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "..", "app.js");
const cssPath = path.join(__dirname, "..", "styles.css");
const htmlPath = path.join(__dirname, "..", "index.html");
const source = fs.readFileSync(appPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");
const html = fs.readFileSync(htmlPath, "utf8");

function getFunctionBody(name) {
  const start = source.indexOf(`function ${name}(`);
  if (start === -1) {
    throw new Error(`Missing function ${name}`);
  }

  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(bodyStart + 1, index);
  }

  throw new Error(`Could not parse function ${name}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(`  ${error.message}`);
    process.exitCode = 1;
  }
}

test("filter click handler is bound once outside renderFilters", () => {
  const renderFiltersBody = getFunctionBody("renderFilters");
  assert(
    !/addEventListener\(\s*["']click["']/.test(renderFiltersBody),
    "renderFilters currently binds a click listener while rendering"
  );
  assert(
    /function setupFilters\(\)/.test(source),
    "expected a setupFilters function to own the filter click listener"
  );
});

test("tilt-card pointermove batches DOM writes with requestAnimationFrame", () => {
  const bindTiltCardsBody = getFunctionBody("bindTiltCards");
  assert(
    /requestAnimationFrame/.test(bindTiltCardsBody),
    "pointermove should batch style writes with requestAnimationFrame"
  );
});

test("GSAP reveal animations are not registered twice for the same elements", () => {
  const setupAnimationsBody = getFunctionBody("setupAnimations");
  assert(
    !/gsap\.to\(\s*["']\.reveal["']/.test(setupAnimationsBody),
    "setupAnimations should not animate all .reveal nodes and then each node again"
  );
});

test("runtime does not load GSAP or ScrollTrigger for simple reveal effects", () => {
  assert(
    !/gsap|ScrollTrigger/i.test(html),
    "index.html should not load GSAP/ScrollTrigger for this static page"
  );
  assert(
    !/window\.gsap|ScrollTrigger/.test(source),
    "app.js should use the lightweight IntersectionObserver path"
  );
});

test("scrolling surfaces avoid expensive live blur effects", () => {
  assert(
    !/backdrop-filter\s*:/.test(css),
    "CSS should avoid backdrop-filter on cards and sticky navigation"
  );
  assert(
    !/filter\s*:\s*blur/.test(css),
    "CSS should avoid fixed blurred ambient layers during scroll"
  );
});

test("decorative infinite animations are disabled by default", () => {
  const riskyAnimations = /animation\s*:[^;]*(floatBlob|floaty|shimmer|pulse|infinite)/;
  assert(
    !riskyAnimations.test(css),
    "decorative infinite animations should not run by default"
  );
});
