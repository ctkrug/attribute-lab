// Property-based coverage for lab-core.mjs, complementing the example-based
// tests in lab-core.test.mjs. These generate hundreds of random inputs per
// run to find edge cases hand-written examples miss (see docs/ARCHITECTURE.md
// for which specific edge cases this already turned up).
import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import {
  SWAP_STYLES,
  TARGET_PRESETS,
  TRIGGER_PRESETS,
  demoUrl,
  encodePresetState,
  decodePresetState,
  escapeHtml,
  splitHighlightSegments,
  nextRadioIndex,
} from "./lab-core.mjs";

const presetStateArb = fc.record({
  swap: fc.constantFrom(...SWAP_STYLES),
  trigger: fc.constantFrom(...TRIGGER_PRESETS),
  target: fc.constantFrom(...TARGET_PRESETS),
  select: fc.boolean(),
  indicator: fc.boolean(),
});

test("property: encodePresetState/decodePresetState round-trip for any valid preset state", () => {
  fc.assert(
    fc.property(presetStateArb, (state) => {
      // Spread to a plain object first: fast-check's fc.record() values carry
      // a null prototype, which assert.deepEqual (strict) treats as
      // unequal to decodePresetState's plain-object-literal return even when
      // every field matches.
      assert.deepEqual(decodePresetState(encodePresetState(state)), { ...state });
    })
  );
});

test("property: demoUrl always starts with api/demo? and carries swap+target for any valid combination", () => {
  fc.assert(
    fc.property(
      fc.constantFrom(...SWAP_STYLES),
      fc.constantFrom(...TARGET_PRESETS),
      fc.boolean(),
      fc.boolean(),
      (swap, target, select, indicator) => {
        const url = demoUrl({ swap, target, select, indicator });
        assert.match(url, /^api\/demo\?/);
        assert.match(url, new RegExp(`swap=${swap}`));
        assert.match(url, new RegExp(`target=${target}`));
      }
    )
  );
});

test("property: escapeHtml output never contains a raw < or > for any input", () => {
  fc.assert(
    fc.property(fc.string(), (input) => {
      const escaped = escapeHtml(input);
      assert.equal(escaped.includes("<"), false);
      assert.equal(escaped.includes(">"), false);
    })
  );
});

test("property: splitHighlightSegments segments always reconstruct the original markup exactly", () => {
  fc.assert(
    fc.property(fc.string(), fc.oneof(fc.integer(), fc.string()), (markup, gen) => {
      const segments = splitHighlightSegments(markup, gen);
      const rebuilt = segments.map((s) => s.text).join("");
      assert.equal(rebuilt, markup);
    })
  );
});

test("property: nextRadioIndex always returns an in-range index for a positive count", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 32 }),
      fc.integer({ min: 0, max: 31 }),
      fc.constantFrom("ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End", "Enter", "a"),
      (count, rawIndex, key) => {
        const currentIndex = rawIndex % count;
        const next = nextRadioIndex(currentIndex, key, count);
        assert.ok(next >= 0 && next < count, `next=${next} out of range for count=${count}`);
      }
    )
  );
});
