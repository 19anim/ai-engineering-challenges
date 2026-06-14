(function (root) {
  function resolveAlphabetJump(terms, letter) {
    const normalized = String(letter || "").trim().slice(0, 1).toUpperCase();
    const matches = terms.filter((term) =>
      term.name.toUpperCase().startsWith(normalized),
    );

    return {
      letter: normalized,
      status:
        matches.length === 0 ? "empty" : matches.length === 1 ? "single" : "multiple",
      matches,
    };
  }

  const api = { resolveAlphabetJump };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.GlossaryNavigation = api;
})(typeof window !== "undefined" ? window : globalThis);
