import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import ts from "typescript";

test("audio call layout uses APIs exported by the installed React Native SDK", () => {
  // Real installed declarations catch removed native exports that primitive
  // render mocks can accidentally invent. This is not a native layout test.
  const path = fileURLToPath(new URL("../components/calls/AudioCallLayout.jsx", import.meta.url));
  const program = ts.createProgram([path], {
    allowJs: true, checkJs: true, strict: false, noEmit: true, skipLibCheck: true,
    target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  });
  const errors = ts.getPreEmitDiagnostics(program).filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error);
  assert.deepEqual(errors.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")), []);
});
