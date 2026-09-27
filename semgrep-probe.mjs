// TEMPORARY, removed in the commit after this one.
//
// A green `static` tick cannot tell 0 findings from 0 files scanned, and this
// Forgejo exposes no job log to the API, so the count in `Ran N rules on M
// files` is unreadable from the hypervisor. This file answers the same question
// through the job's exit code instead: three patterns the javascript rules flag,
// in a .mjs file, which is the extension in doubt. A red run proves .mjs is read
// as JavaScript. Green would prove nothing either way, which is why it goes in
// and comes straight back out rather than staying as a fixture.
export function probe(input) {
  eval(input);
  new Function(input)();
  document.write(input);
}
